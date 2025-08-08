/**
 * RSS Visit Report - Enterprise Authentication Middleware
 * Integrates Active Directory authentication with the existing React app
 */

import adAuthService from '../services/adAuthService.js';
import authService from '../services/authService.js';
import { settings } from '../utils/settings.js';

class AuthMiddleware {
  constructor() {
    this.isInitialized = false;
    this.currentStrategy = 'hybrid'; // 'ad', 'local', 'hybrid'
    this.authCallbacks = new Set();
    
    this.init();
  }

  /**
   * Initialize authentication middleware
   */
  async init() {
    try {
      // Determine authentication strategy
      this.currentStrategy = this.determineAuthStrategy();
      
      // Setup authentication event listeners
      this.setupEventListeners();
      
      // Test AD connection if enabled
      if (adAuthService.isADEnabled()) {
        await this.testADConnection();
      }
      
      this.isInitialized = true;
      console.log(`Authentication middleware initialized with strategy: ${this.currentStrategy}`);
      
    } catch (error) {
      console.error('Authentication middleware initialization failed:', error);
      this.currentStrategy = 'local'; // Fallback to local auth
      this.isInitialized = true;
    }
  }

  /**
   * Determine authentication strategy based on configuration
   */
  determineAuthStrategy() {
    const adEnabled = adAuthService.isADEnabled();
    const allowLocalAuth = settings.get('auth.allowLocalAuth', true);
    
    if (adEnabled && allowLocalAuth) {
      return 'hybrid';
    } else if (adEnabled) {
      return 'ad';
    } else {
      return 'local';
    }
  }

  /**
   * Authenticate user with appropriate strategy
   * @param {string} username - Username
   * @param {string} password - Password
   * @param {boolean} rememberMe - Remember session
   * @param {string} authType - Optional: 'ad', 'local', 'auto'
   */
  async authenticate(username, password, rememberMe = false, authType = 'auto') {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      // Determine which authentication method to use
      const method = authType === 'auto' ? this.selectAuthMethod(username) : authType;
      
      let result;
      
      switch (method) {
        case 'ad':
          result = await this.authenticateWithAD(username, password, rememberMe);
          break;
          
        case 'local':
          result = await this.authenticateWithLocal(username, password, rememberMe);
          break;
          
        case 'hybrid':
          // Try AD first, fallback to local
          try {
            result = await this.authenticateWithAD(username, password, rememberMe);
          } catch (adError) {
            console.warn('AD authentication failed, trying local auth:', adError.message);
            result = await this.authenticateWithLocal(username, password, rememberMe);
          }
          break;
          
        default:
          throw new Error('Invalid authentication method');
      }
      
      if (result.success) {
        // Store authentication context
        this.storeAuthContext(result, method);
        
        // Trigger authentication callbacks
        this.triggerAuthCallbacks('login', result.user);
        
        // Log successful authentication
        await this.logAuthEvent('login_success', username, method);
      }
      
      return result;
      
    } catch (error) {
      // Log failed authentication
      await this.logAuthEvent('login_failed', username, null, error.message);
      throw error;
    }
  }

  /**
   * Authenticate with Active Directory
   * @param {string} username - Username
   * @param {string} password - Password
   * @param {boolean} rememberMe - Remember session
   */
  async authenticateWithAD(username, password, rememberMe) {
    if (!adAuthService.isADEnabled()) {
      throw new Error('Active Directory authentication is not enabled');
    }

    const result = await adAuthService.authenticateUser(username, password);
    
    if (result.success) {
      // Store session information
      const sessionData = {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
        sessionId: result.sessionId,
        authMethod: 'ad',
        expiresAt: Date.now() + (settings.get('auth.sessionTimeout', 1800) * 1000)
      };
      
      this.storeSession(sessionData, rememberMe);
    }
    
    return result;
  }

  /**
   * Authenticate with local authentication
   * @param {string} username - Username
   * @param {string} password - Password
   * @param {boolean} rememberMe - Remember session
   */
  async authenticateWithLocal(username, password, rememberMe) {
    if (this.currentStrategy === 'ad') {
      throw new Error('Local authentication is disabled in AD-only mode');
    }

    return await authService.login(username, password, rememberMe);
  }

  /**
   * Select authentication method based on username
   * @param {string} username - Username
   */
  selectAuthMethod(username) {
    // If username contains domain separator, prefer AD
    if (username.includes('@') || username.includes('\\')) {
      return 'ad';
    }
    
    // If hybrid mode and looks like AD username format
    if (this.currentStrategy === 'hybrid') {
      const adDomainUsers = settings.get('auth.adDomainUsers', []);
      if (adDomainUsers.length === 0 || adDomainUsers.includes(username)) {
        return 'ad';
      }
    }
    
    return this.currentStrategy === 'ad' ? 'ad' : 'local';
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      const authContext = this.getAuthContext();
      
      if (authContext) {
        if (authContext.authMethod === 'ad') {
          await adAuthService.logout(authContext.token, authContext.sessionId);
        } else {
          await authService.logout();
        }
        
        // Log logout event
        await this.logAuthEvent('logout', authContext.user?.username);
      }
      
      // Clear stored context
      this.clearAuthContext();
      
      // Trigger authentication callbacks
      this.triggerAuthCallbacks('logout');
      
    } catch (error) {
      console.warn('Logout error:', error);
      // Clear context anyway
      this.clearAuthContext();
    }
  }

  /**
   * Validate current session
   */
  async validateSession() {
    try {
      const authContext = this.getAuthContext();
      
      if (!authContext) {
        return false;
      }
      
      // Check expiration
      if (Date.now() > authContext.expiresAt) {
        await this.logout();
        return false;
      }
      
      // Validate with appropriate service
      let isValid = false;
      
      if (authContext.authMethod === 'ad') {
        isValid = await adAuthService.validateSession(authContext.token, authContext.sessionId);
      } else {
        isValid = authService.isAuthenticated();
      }
      
      if (!isValid) {
        await this.logout();
      }
      
      return isValid;
      
    } catch (error) {
      console.warn('Session validation failed:', error);
      await this.logout();
      return false;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken() {
    try {
      const authContext = this.getAuthContext();
      
      if (!authContext) {
        return false;
      }
      
      let refreshed = false;
      
      if (authContext.authMethod === 'ad') {
        // AD token refresh would need to be implemented on the server
        // For now, validate session instead
        refreshed = await adAuthService.validateSession(authContext.token, authContext.sessionId);
      } else {
        refreshed = await authService.refreshToken();
      }
      
      if (refreshed) {
        // Update expiration time
        authContext.expiresAt = Date.now() + (settings.get('auth.sessionTimeout', 1800) * 1000);
        this.storeSession(authContext, authContext.rememberMe);
      }
      
      return refreshed;
      
    } catch (error) {
      console.warn('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    const authContext = this.getAuthContext();
    return authContext?.user || null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const authContext = this.getAuthContext();
    return authContext && Date.now() < authContext.expiresAt;
  }

  /**
   * Check user permissions
   * @param {string} permission - Permission to check
   */
  hasPermission(permission) {
    const user = this.getCurrentUser();
    
    if (!user) return false;
    
    // Admin users have all permissions
    if (user.role === 'admin') return true;
    
    // Check specific permissions
    const userPermissions = user.permissions || [];
    return userPermissions.includes(permission) || userPermissions.includes('*');
  }

  /**
   * Check if user has role
   * @param {string} role - Role to check
   */
  hasRole(role) {
    const user = this.getCurrentUser();
    
    if (!user) return false;
    
    if (Array.isArray(user.roles)) {
      return user.roles.includes(role);
    }
    
    return user.role === role;
  }

  /**
   * Store authentication context
   * @param {Object} authResult - Authentication result
   * @param {string} method - Authentication method used
   */
  storeAuthContext(authResult, method) {
    const context = {
      user: authResult.user,
      token: authResult.token,
      refreshToken: authResult.refreshToken,
      sessionId: authResult.sessionId,
      authMethod: method,
      expiresAt: Date.now() + (settings.get('auth.sessionTimeout', 1800) * 1000),
      timestamp: Date.now()
    };
    
    this.storeSession(context, false);
  }

  /**
   * Store session data
   * @param {Object} sessionData - Session data
   * @param {boolean} rememberMe - Whether to persist in localStorage
   */
  storeSession(sessionData, rememberMe) {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('rss_auth_context', JSON.stringify(sessionData));
  }

  /**
   * Get stored authentication context
   */
  getAuthContext() {
    try {
      const stored = sessionStorage.getItem('rss_auth_context') || 
                    localStorage.getItem('rss_auth_context');
      
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to parse auth context:', error);
    }
    
    return null;
  }

  /**
   * Clear authentication context
   */
  clearAuthContext() {
    sessionStorage.removeItem('rss_auth_context');
    localStorage.removeItem('rss_auth_context');
  }

  /**
   * Test Active Directory connection
   */
  async testADConnection() {
    try {
      const result = await adAuthService.testConnection();
      
      if (result.success) {
        console.log('AD connection test successful:', result.message);
      } else {
        console.warn('AD connection test failed:', result.message);
        
        // If AD is required but failing, this is a critical error
        if (this.currentStrategy === 'ad') {
          throw new Error(`AD connection required but failed: ${result.message}`);
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('AD connection test error:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for storage changes (multi-tab support)
    window.addEventListener('storage', (event) => {
      if (event.key === 'rss_auth_context') {
        if (!event.newValue) {
          // Session was cleared in another tab
          this.triggerAuthCallbacks('logout');
        } else {
          // Session was updated in another tab
          this.triggerAuthCallbacks('update');
        }
      }
    });
    
    // Setup periodic session validation
    setInterval(async () => {
      if (this.isAuthenticated()) {
        const isValid = await this.validateSession();
        if (!isValid) {
          this.triggerAuthCallbacks('session-expired');
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Register authentication callback
   * @param {Function} callback - Callback function
   */
  onAuthChange(callback) {
    this.authCallbacks.add(callback);
    
    // Return unregister function
    return () => {
      this.authCallbacks.delete(callback);
    };
  }

  /**
   * Trigger authentication callbacks
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  triggerAuthCallbacks(event, data = null) {
    this.authCallbacks.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.warn('Auth callback error:', error);
      }
    });
  }

  /**
   * Log authentication events
   * @param {string} eventType - Event type
   * @param {string} username - Username
   * @param {string} method - Auth method
   * @param {string} details - Additional details
   */
  async logAuthEvent(eventType, username, method = null, details = '') {
    try {
      const logData = {
        eventType,
        username,
        authMethod: method,
        details,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        // Additional context would be added on the server side
      };
      
      // Send to audit service if available
      const response = await fetch(settings.getApiUrl('audit/auth-event'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(logData)
      });
      
      if (!response.ok) {
        console.warn('Failed to log auth event:', response.status);
      }
      
    } catch (error) {
      console.warn('Auth event logging failed:', error);
    }
  }

  /**
   * Get authentication configuration
   */
  getConfig() {
    return {
      strategy: this.currentStrategy,
      adEnabled: adAuthService.isADEnabled(),
      allowLocalAuth: settings.get('auth.allowLocalAuth', true),
      sessionTimeout: settings.get('auth.sessionTimeout', 1800),
      adConfig: adAuthService.getConfig()
    };
  }
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

export default authMiddleware;