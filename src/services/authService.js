/**
 * RSS Visit Report - Authentication Service
 * Handles user authentication, session management, and Active Directory integration
 */

import { settings } from '../utils/settings.js';
import { memory } from '../utils/memoryManager.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.sessionTimeout = null;
    this.loginAttempts = new Map();
    this.tokenRefreshInterval = null;
    
    this.init();
  }
  
  /**
   * Initialize authentication service
   */
  init() {
    // Restore session if available
    this.restoreSession();
    
    // Setup automatic token refresh
    this.setupTokenRefresh();
    
    // Setup session timeout
    this.setupSessionTimeout();
    
    // Setup event listeners
    this.setupEventListeners();
  }
  
  /**
   * Restore session from storage
   */
  restoreSession() {
    try {
      const sessionData = memory.getItem('user_session', { storage: 'sessionStorage' });
      if (sessionData) {
        const { user, token, expiresAt } = sessionData;
        
        // Check if session is still valid
        if (Date.now() < expiresAt) {
          this.currentUser = user;
          this.setupSessionTimeout(expiresAt - Date.now());
          return true;
        } else {
          this.clearSession();
        }
      }
    } catch (error) {
      console.warn('Failed to restore session:', error);
      this.clearSession();
    }
    return false;
  }
  
  /**
   * Authenticate user with credentials
   * @param {string} username - Username or email
   * @param {string} password - Password
   * @param {boolean} rememberMe - Whether to persist session
   */
  async login(username, password, rememberMe = false) {
    try {
      // Check login attempts for rate limiting
      if (this.isAccountLocked(username)) {
        throw new Error('Account temporarily locked due to too many failed attempts');
      }
      
      // Validate input
      if (!username || !password) {
        throw new Error('Username and password are required');
      }
      
      // Call authentication API
      const response = await this.authenticateWithAPI(username, password);
      
      if (response.success) {
        // Clear failed attempts
        this.loginAttempts.delete(username);
        
        // Set current user
        this.currentUser = response.user;
        
        // Store session
        const sessionData = {
          user: response.user,
          token: response.token,
          expiresAt: Date.now() + (settings.get('auth.sessionTimeout', 1800) * 1000)
        };
        
        const storageType = rememberMe ? 'localStorage' : 'sessionStorage';
        memory.setItem('user_session', sessionData, { 
          storage: storageType,
          ttl: settings.get('auth.sessionTimeout', 1800) * 1000
        });
        
        // Setup session timeout
        this.setupSessionTimeout();
        
        // Log successful login
        this.logAuthEvent('login_success', username);
        
        return {
          success: true,
          user: response.user,
          token: response.token
        };
        
      } else {
        // Record failed attempt
        this.recordFailedAttempt(username);
        
        // Log failed login
        this.logAuthEvent('login_failed', username);
        
        throw new Error(response.message || 'Authentication failed');
      }
      
    } catch (error) {
      // Record failed attempt for security
      this.recordFailedAttempt(username);
      
      // Log error
      this.logAuthEvent('login_error', username, error.message);
      
      throw error;
    }
  }
  
  /**
   * Authenticate with backend API
   * @param {string} username - Username
   * @param {string} password - Password
   */
  async authenticateWithAPI(username, password) {
    // Demo user fallback for development/testing
    if (username.toLowerCase() === 'demo' && password === 'demo123') {
      const demoUser = {
        success: true,
        user: {
          id: 'demo-user-001',
          username: 'demo',
          email: 'demo@rss-reports.local',
          displayName: 'Demo User',
          role: 'technician', // Technician role allows access to most features except Admin
          roles: ['technician'],
          permissions: [
            'reports:view:assigned',
            'reports:view:all', // Added for Import/Export
            'reports:create',
            'reports:edit:own',
            'reports:export:own',
            'hardware:manage'
            // Removed wildcard '*' to prevent admin access
          ],
          authMethod: 'local'
        },
        token: 'demo-token-' + Date.now(),
        sessionId: 'demo-session-' + Date.now()
      };
      
      // Debug logging for demo user
      console.log('🔍 Demo user authentication successful:', demoUser);
      return demoUser;
    }
    
    // Admin demo user for full system demonstration
    if (username.toLowerCase() === 'admin' && password === 'admin123') {
      const adminDemoUser = {
        success: true,
        user: {
          id: 'admin-demo-001',
          username: 'admin',
          email: 'admin@rss-reports.local',
          displayName: 'Admin Demo User',
          role: 'admin', // Full admin role with all privileges
          roles: ['admin'],
          permissions: [
            '*', // Wildcard for full access
            'admin:*',
            'system:settings',
            'reports:view:all',
            'reports:create',
            'reports:edit:any',
            'reports:export:all',
            'hardware:manage',
            'users:manage',
            'system:backup'
          ],
          authMethod: 'local'
        },
        token: 'admin-demo-token-' + Date.now(),
        sessionId: 'admin-demo-session-' + Date.now()
      };
      
      // Debug logging for admin demo user
      console.log('🔍 Admin demo user authentication successful:', adminDemoUser);
      return adminDemoUser;
    }
    
    const apiUrl = settings.getApiUrl('auth/login');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        username: this.sanitizeInput(username),
        password,  // Don't sanitize password
        adEnabled: settings.get('auth.adEnabled', false),
        domain: settings.get('auth.adDomain', '')
      })
    });
    
    if (!response.ok) {
      throw new Error(`Authentication request failed: ${response.status}`);
    }
    
    return await response.json();
  }
  
  /**
   * Logout current user
   */
  async logout() {
    try {
      if (this.currentUser) {
        // Call logout API
        await this.logoutWithAPI();
        
        // Log logout
        this.logAuthEvent('logout', this.currentUser.username);
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear local session regardless of API call
      this.clearSession();
    }
  }
  
  /**
   * Logout with backend API
   */
  async logoutWithAPI() {
    const apiUrl = settings.getApiUrl('auth/logout');
    const token = this.getToken();
    
    if (token) {
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    }
  }
  
  /**
   * Clear current session
   */
  clearSession() {
    this.currentUser = null;
    
    // Clear stored session data
    memory.removeItem('user_session', { storage: 'localStorage' });
    memory.removeItem('user_session', { storage: 'sessionStorage' });
    
    // Clear timeouts and intervals
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
    
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
    
    // Dispatch logout event
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.currentUser !== null;
  }
  
  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }
  
  /**
   * Get authentication token
   */
  getToken() {
    const sessionData = memory.getItem('user_session', { storage: 'sessionStorage' }) ||
                       memory.getItem('user_session', { storage: 'localStorage' });
    return sessionData?.token || null;
  }
  
  /**
   * Check user permissions
   * @param {string} permission - Permission to check
   */
  hasPermission(permission) {
    if (!this.currentUser) return false;
    
    const userPermissions = this.currentUser.permissions || [];
    const userRoles = this.currentUser.roles || [];
    
    // Check direct permission
    if (userPermissions.includes(permission)) return true;
    
    // Check role-based permissions
    const rolePermissions = this.getRolePermissions(userRoles);
    return rolePermissions.includes(permission);
  }
  
  /**
   * Get permissions for roles
   * @param {Array} roles - User roles
   */
  getRolePermissions(roles) {
    const roleMap = {
      'admin': ['*'], // All permissions
      'manager': [
        'reports:view:all', 
        'reports:create', 
        'reports:edit:own', 
        'reports:export:own',
        'reports:export:all',
        'hardware:manage'
      ],
      'technician': [
        'reports:view:assigned', 
        'reports:create', 
        'reports:edit:own', 
        'reports:export:own',
        'hardware:manage'
      ],
      'viewer': [
        'reports:view:assigned'
      ]
    };
    
    const permissions = new Set();
    
    roles.forEach(role => {
      const rolePerms = roleMap[role.toLowerCase()] || [];
      rolePerms.forEach(perm => permissions.add(perm));
    });
    
    return Array.from(permissions);
  }
  
  /**
   * Refresh authentication token
   */
  async refreshToken() {
    try {
      const currentToken = this.getToken();
      if (!currentToken) return false;
      
      const apiUrl = settings.getApiUrl('auth/refresh');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update stored session
        const sessionData = memory.getItem('user_session', { storage: 'sessionStorage' }) ||
                           memory.getItem('user_session', { storage: 'localStorage' });
        
        if (sessionData) {
          sessionData.token = data.token;
          sessionData.expiresAt = Date.now() + (settings.get('auth.sessionTimeout', 1800) * 1000);
          
          const storageType = memory.getItem('user_session', { storage: 'localStorage' }) ? 'localStorage' : 'sessionStorage';
          memory.setItem('user_session', sessionData, { storage: storageType });
        }
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.warn('Token refresh failed:', error);
      return false;
    }
  }
  
  /**
   * Setup automatic token refresh
   */
  setupTokenRefresh() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
    
    // Refresh token every 15 minutes
    this.tokenRefreshInterval = setInterval(async () => {
      if (this.isAuthenticated()) {
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          // Force logout if refresh fails
          this.logout();
        }
      }
    }, 15 * 60 * 1000);
  }
  
  /**
   * Setup session timeout
   * @param {number} timeout - Timeout in milliseconds
   */
  setupSessionTimeout(timeout = null) {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
    
    const sessionTimeoutMs = timeout || (settings.get('auth.sessionTimeout', 1800) * 1000);
    
    this.sessionTimeout = setTimeout(() => {
      this.logout();
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
    }, sessionTimeoutMs);
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for user activity to reset session timeout
    const resetTimeout = () => {
      if (this.isAuthenticated()) {
        this.setupSessionTimeout();
      }
    };
    
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      document.addEventListener(event, resetTimeout, { passive: true });
    });
    
    // Listen for storage changes (multi-tab support)
    window.addEventListener('storage', (event) => {
      if (event.key === 'rss_user_session' && !event.newValue) {
        // Session was cleared in another tab
        this.clearSession();
      }
    });
  }
  
  /**
   * Check if account is locked
   * @param {string} username - Username to check
   */
  isAccountLocked(username) {
    const attempts = this.loginAttempts.get(username);
    if (!attempts) return false;
    
    const maxAttempts = settings.get('auth.maxLoginAttempts', 5);
    const lockoutDuration = settings.get('auth.lockoutDuration', 900) * 1000; // Convert to ms
    
    if (attempts.count >= maxAttempts) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
      return timeSinceLastAttempt < lockoutDuration;
    }
    
    return false;
  }
  
  /**
   * Record failed login attempt
   * @param {string} username - Username
   */
  recordFailedAttempt(username) {
    const attempts = this.loginAttempts.get(username) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.loginAttempts.set(username, attempts);
    
    // Clean up old attempts periodically
    this.cleanupOldAttempts();
  }
  
  /**
   * Clean up old login attempts
   */
  cleanupOldAttempts() {
    const lockoutDuration = settings.get('auth.lockoutDuration', 900) * 1000;
    const now = Date.now();
    
    for (const [username, attempts] of this.loginAttempts.entries()) {
      if (now - attempts.lastAttempt > lockoutDuration) {
        this.loginAttempts.delete(username);
      }
    }
  }
  
  /**
   * Sanitize user input
   * @param {string} input - Input to sanitize
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>"'&]/g, '') // Remove potentially dangerous characters
      .substring(0, 100); // Limit length
  }
  
  /**
   * Log authentication events
   * @param {string} event - Event type
   * @param {string} username - Username
   * @param {string} details - Additional details
   */
  logAuthEvent(event, username, details = '') {
    if (settings.get('security.auditLogging', true)) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        event,
        username: this.sanitizeInput(username),
        ip: this.getClientIP(),
        userAgent: navigator.userAgent,
        details
      };
      
      // Store in memory for potential sending to server
      const authLogs = memory.cacheGet('auth_logs') || [];
      authLogs.push(logEntry);
      
      // Keep only last 100 entries
      if (authLogs.length > 100) {
        authLogs.splice(0, authLogs.length - 100);
      }
      
      memory.cacheSet('auth_logs', authLogs, 24 * 60 * 60 * 1000); // 24 hours
      
      // Send to server if available
      this.sendAuditLog(logEntry);
    }
  }
  
  /**
   * Get client IP address (best effort)
   */
  getClientIP() {
    // This is limited in browsers, would need server-side detection
    return 'client-side-unknown';
  }
  
  /**
   * Send audit log to server
   * @param {Object} logEntry - Log entry
   */
  async sendAuditLog(logEntry) {
    try {
      const apiUrl = settings.getApiUrl('audit/log');
      
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      // Silently fail for audit logs to not disrupt user experience
      if (settings.isDebugMode()) {
        console.warn('Failed to send audit log:', error);
      }
    }
  }
  
  /**
   * Destroy auth service
   */
  destroy() {
    this.clearSession();
    this.loginAttempts.clear();
  }
}

// Create singleton instance
const authService = new AuthService();

// Export convenience functions
export const auth = {
  login: (username, password, rememberMe) => authService.login(username, password, rememberMe),
  logout: () => authService.logout(),
  isAuthenticated: () => authService.isAuthenticated(),
  getCurrentUser: () => authService.getCurrentUser(),
  getToken: () => authService.getToken(),
  hasPermission: (permission) => authService.hasPermission(permission),
  refreshToken: () => authService.refreshToken()
};

export default authService;