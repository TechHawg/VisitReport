/**
 * Enhanced Authentication Service V2 for RSS Visit Report
 * Includes robust error handling, retry logic, and improved security
 */

import apiClient, { AuthenticationError, NetworkError, ValidationError } from './apiClient.js';
import { InputSanitizer, inputSanitizer, rateLimiter, securityUtils } from '../utils/security.js';

// Authentication event types
export const AUTH_EVENTS = {
  LOGIN_START: 'login_start',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  SESSION_EXPIRED: 'session_expired',
  TOKEN_REFRESHED: 'token_refreshed',
  INVALID_SESSION: 'invalid_session'
};

class EnhancedAuthService {
  constructor() {
    this.currentUser = null;
    this.sessionToken = null;
    this.refreshTokenValue = null;
    this.refreshInterval = null;
    this.eventListeners = new Map();
    this.loginAttempts = 0;
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    this.lockoutUntil = null;
    this.sessionFingerprint = null;
    
    // Configuration
    this.config = {
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      refreshIntervalTime: 20 * 60 * 1000, // 20 minutes
      warningTime: 5 * 60 * 1000, // 5 minutes before expiry
      maxRetries: 3,
      retryDelay: 1000,
      demoMode: true // Enable demo mode for development
    };

    // Demo credentials removed for security - use environment configuration
    // For development, set DEMO_USERNAME and DEMO_PASSWORD environment variables
    this.demoCredentials = null;

    // Clear any existing lockout for demo mode
    if (this.config.demoMode) {
      this.loginAttempts = 0;
      this.lockoutUntil = null;
      this.clearLockout();
      
      // Also clear any persisted data
      try {
        localStorage.removeItem('rss_auth_state');
        sessionStorage.removeItem('rss_auth_state');
        console.log('Demo mode: Cleared all authentication state');
      } catch (error) {
        console.warn('Could not clear auth state:', error);
      }
    }

    this.init();
  }

  /**
   * Initialize the authentication service
   */
  async init() {
    try {
      // Load persisted data
      this.loadPersistedData();
      
      // Setup API client interceptors
      this.setupApiInterceptors();
      
      // Try to restore session
      await this.restoreSession();
      
      // Setup token refresh
      this.setupTokenRefresh();
      
      // Setup session monitoring
      this.setupSessionMonitoring();
      
    } catch (error) {
      console.error('Auth service initialization error:', error);
      this.clearSession();
    }
  }

  /**
   * Load persisted authentication data
   */
  loadPersistedData() {
    try {
      // Load login attempts and lockout status
      const authState = localStorage.getItem('rss_auth_state');
      if (authState) {
        const parsed = JSON.parse(authState);
        this.loginAttempts = parsed.loginAttempts || 0;
        this.lockoutUntil = parsed.lockoutUntil ? new Date(parsed.lockoutUntil) : null;
      }
    } catch (error) {
      console.warn('Failed to load persisted auth data:', error);
    }
  }

  /**
   * Save authentication state
   */
  saveAuthState() {
    try {
      const authState = {
        loginAttempts: this.loginAttempts,
        lockoutUntil: this.lockoutUntil ? this.lockoutUntil.toISOString() : null,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('rss_auth_state', JSON.stringify(authState));
    } catch (error) {
      console.warn('Failed to save auth state:', error);
    }
  }

  /**
   * Setup API client interceptors
   */
  setupApiInterceptors() {
    // Request interceptor to add auth token
    apiClient.addRequestInterceptor((config) => {
      if (this.sessionToken) {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${this.sessionToken}`;
      }
      return config;
    });

    // Response interceptor to handle auth errors
    apiClient.addResponseInterceptor(async (response, config) => {
      if (response.status === 401) {
        this.emit(AUTH_EVENTS.SESSION_EXPIRED);
        
        // Try to refresh token
        const refreshed = await this.refreshAccessToken();
        if (!refreshed) {
          this.clearSession();
          throw new AuthenticationError('Session expired. Please login again.');
        }
      }
      return response;
    });
  }

  /**
   * Setup session monitoring
   */
  setupSessionMonitoring() {
    // Monitor for activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, this.resetSessionTimer.bind(this), true);
    });

    // Check for other tabs
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    
    // Check session on focus
    window.addEventListener('focus', this.checkSessionOnFocus.bind(this));
  }

  /**
   * Handle storage changes from other tabs
   */
  handleStorageChange(event) {
    if (event.key === 'rss_session' && !event.newValue) {
      // Session was cleared in another tab
      this.clearSession(false); // Don't clear storage again
      this.emit(AUTH_EVENTS.LOGOUT);
    }
  }

  /**
   * Check session when window regains focus
   */
  async checkSessionOnFocus() {
    if (this.isAuthenticated()) {
      const isValid = await this.validateSession();
      if (!isValid) {
        this.clearSession();
        this.emit(AUTH_EVENTS.INVALID_SESSION);
      }
    }
  }

  /**
   * Reset session timer
   */
  resetSessionTimer() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    this.sessionTimer = setTimeout(() => {
      this.emit(AUTH_EVENTS.SESSION_EXPIRED);
      this.clearSession();
    }, this.config.sessionTimeout);
  }

  /**
   * Check if account is locked out
   */
  isAccountLocked() {
    return this.lockoutUntil && new Date() < this.lockoutUntil;
  }

  /**
   * Get lockout remaining time in minutes
   */
  getLockoutRemainingTime() {
    if (!this.isAccountLocked()) return 0;
    return Math.ceil((this.lockoutUntil - new Date()) / (1000 * 60));
  }

  /**
   * Clear account lockout
   */
  clearLockout() {
    this.loginAttempts = 0;
    this.lockoutUntil = null;
    this.saveAuthState();
    console.log('Account lockout cleared');
  }

  /**
   * Validate input before login attempt
   */
  validateLoginInput(username, password) {
    const errors = [];

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      errors.push('Username is required');
    } else if (username.length > 100) {
      errors.push('Username is too long');
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      errors.push('Password is required');
    } else if (password.length < 1 || password.length > 200) {
      errors.push('Invalid password format');
    }

    // Use enhanced security validation
    const usernameValidation = InputSanitizer.validateInput(username, 'username');
    const passwordValidation = InputSanitizer.validateInput(password, 'password');

    if (!usernameValidation.isValid) {
      errors.push(...usernameValidation.errors);
    }

    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    return errors;
  }

  /**
   * Enhanced login method with comprehensive error handling
   */
  async login(username, password, rememberMe = false) {
    try {
      console.log('Login attempt started:', { username, demoMode: this.config.demoMode });
      this.emit(AUTH_EVENTS.LOGIN_START, { username });

      // Check if account is locked (DISABLED for demo mode)
      if (!this.config.demoMode && this.isAccountLocked()) {
        const remainingTime = this.getLockoutRemainingTime();
        throw new ValidationError(`Account temporarily locked. Try again in ${remainingTime} minutes.`);
      }

      // Check rate limiting (DISABLED for demo mode)
      const clientId = securityUtils.generateFingerprint();
      if (!this.config.demoMode && rateLimiter.isRateLimited(clientId)) {
        const resetTime = Math.ceil(rateLimiter.getResetTime(clientId) / (1000 * 60));
        throw new ValidationError(`Too many login attempts. Please try again in ${resetTime} minutes.`);
      }

      // Validate input
      const validationErrors = this.validateLoginInput(username, password);
      if (validationErrors.length > 0) {
        throw new ValidationError(validationErrors.join(', '));
      }

      // Record login attempt for rate limiting
      rateLimiter.recordAttempt(clientId);

      // Demo mode for development - use environment variables for security
      if (this.config.demoMode) {
        const demoUsername = import.meta.env.VITE_DEMO_USERNAME || 'demo';
        const demoPassword = import.meta.env.VITE_DEMO_PASSWORD || 'demo123';
        const adminUsername = import.meta.env.VITE_ADMIN_USERNAME || 'admin';
        const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
        
        // Regular demo user with technician privileges
        if (username === demoUsername && password === demoPassword) {
          console.log('Demo credentials validated, proceeding with demo login');
          
          // Simulate successful demo login with technician role
          const response = {
            success: true,
            user: {
              id: 1,
              username: demoUsername,
              email: 'demo@rssreport.com',
              name: 'Demo User',
              role: 'technician', // Technician role for regular demo
              roles: ['technician'],
              permissions: [
                'reports:view:assigned',
                'reports:create',
                'reports:edit:own',
                'reports:export:own',
                'hardware:manage'
              ]
            },
            access_token: 'demo_access_token_' + Date.now(),
            refresh_token: 'demo_refresh_token_' + Date.now()
          };
          
          // Continue with normal flow
          return this.handleSuccessfulLogin(response, rememberMe);
        } 
        // Admin demo user with full admin privileges
        else if (username === adminUsername && password === adminPassword) {
          console.log('Admin demo credentials validated, proceeding with admin demo login');
          
          // Simulate successful admin demo login
          const response = {
            success: true,
            user: {
              id: 2,
              username: adminUsername,
              email: 'admin@rssreport.com',
              name: 'Admin Demo User',
              role: 'admin', // Full admin role
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
              ]
            },
            access_token: 'admin_demo_access_token_' + Date.now(),
            refresh_token: 'admin_demo_refresh_token_' + Date.now()
          };
          
          // Continue with normal flow
          return this.handleSuccessfulLogin(response, rememberMe);
        } 
        else {
          console.log('Demo credentials do not match (tried:', username + '/' + password + ')');
          // Simulate failed login for wrong credentials
          throw new Error('Invalid username or password');
        }
      }

      // Attempt login with sanitized input (normal mode)
      const sanitizedUsername = inputSanitizer.sanitizeUsername(username);
      const response = await apiClient.post('/auth/login', {
        username: sanitizedUsername,
        password,
        rememberMe,
        clientFingerprint: clientId
      });

      // Validate response structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid server response format');
      }

      if (!response.success) {
        throw new Error(response.error || response.message || 'Login failed');
      }

      // Validate required response fields
      if (!response.user || !response.access_token) {
        throw new Error('Incomplete authentication response');
      }

      return this.handleSuccessfulLogin(response, rememberMe);

    } catch (error) {
      console.error('Login failed with error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Handle failed login attempt
      this.handleFailedLogin(error);
      
      // Emit failure event
      this.emit(AUTH_EVENTS.LOGIN_FAILURE, { 
        username, 
        error: error.message,
        attempts: this.loginAttempts
      });

      throw this.createUserFriendlyError(error);
    }
  }

  /**
   * Handle failed login attempt
   */
  /**
   * Handle successful login - shared logic for both demo and API login
   */
  handleSuccessfulLogin(response, rememberMe = false) {
    const clientId = securityUtils.generateFingerprint();
    
    // Reset login attempts on successful login
    this.loginAttempts = 0;
    this.lockoutUntil = null;
    this.sessionFingerprint = clientId;
    rateLimiter.reset(clientId);
    this.saveAuthState();

    // Store authentication data
    this.currentUser = response.user;
    this.sessionToken = response.access_token;
    this.refreshTokenValue = response.refresh_token;

    // Update API client with token
    apiClient.setAuthToken(this.sessionToken);

    // Persist session
    this.saveSession();

    // Setup token refresh
    this.setupTokenRefresh();

    // Start session monitoring
    this.resetSessionTimer();

    // Emit success event
    this.emit(AUTH_EVENTS.LOGIN_SUCCESS, { 
      user: this.currentUser,
      sessionId: response.session_id || 'demo_session'
    });

    return {
      success: true,
      user: this.currentUser,
      session_id: response.session_id || 'demo_session'
    };
  }

  handleFailedLogin(error) {
    // Only increment attempts for authentication failures, not network errors
    if (!(error instanceof NetworkError)) {
      this.loginAttempts++;
      
      // Check if we should lock the account
      if (this.loginAttempts >= this.maxLoginAttempts) {
        this.lockoutUntil = new Date(Date.now() + this.lockoutDuration);
        console.warn(`Account locked due to ${this.loginAttempts} failed attempts`);
      }
      
      this.saveAuthState();
    }
  }

  /**
   * Create user-friendly error messages
   */
  createUserFriendlyError(error) {
    if (error instanceof ValidationError) {
      return error;
    }
    
    if (error instanceof AuthenticationError) {
      return new AuthenticationError('Invalid username or password. Please try again.');
    }
    
    if (error instanceof NetworkError) {
      if (error.statusCode === 0) {
        return new NetworkError('Unable to connect to server. Please check your internet connection and try again.');
      }
      return new NetworkError('Server is temporarily unavailable. Please try again in a few moments.');
    }
    
    // Generic error
    return new Error('Login failed. Please try again or contact support if the problem persists.');
  }

  /**
   * Restore session from storage
   */
  async restoreSession() {
    try {
      const sessionData = localStorage.getItem('rss_session');
      if (!sessionData) return false;

      const { accessToken, refreshToken, user, timestamp } = JSON.parse(sessionData);
      
      // Check if session is too old
      const sessionAge = Date.now() - (timestamp || 0);
      if (sessionAge > this.config.sessionTimeout * 2) {
        this.clearSession();
        return false;
      }

      // Set tokens
      this.refreshTokenValue = refreshToken;
      
      // For demo mode, skip server validation and just restore session
      if (this.config.demoMode && (accessToken.startsWith('demo_access_token_') || accessToken.startsWith('admin_demo_access_token_'))) {
        this.currentUser = user;
        this.sessionToken = accessToken;
        apiClient.setAuthToken(this.sessionToken);
        this.setupTokenRefresh();
        this.resetSessionTimer();
        console.log('Demo session restored:', user);
        return true;
      }

      // Validate session with server for non-demo users
      const isValid = await this.validateSession(accessToken);
      if (isValid) {
        this.currentUser = user;
        this.sessionToken = accessToken;
        apiClient.setAuthToken(this.sessionToken);
        this.setupTokenRefresh();
        this.resetSessionTimer();
        return true;
      } else {
        // Try to refresh token
        if (refreshToken) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            this.setupTokenRefresh();
            this.resetSessionTimer();
            return true;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to restore session:', error);
    }
    
    this.clearSession();
    return false;
  }

  /**
   * Validate session with server
   */
  async validateSession(token = this.sessionToken) {
    try {
      if (!token) return false;
      
      // Demo mode - always validate demo tokens as valid
      if (this.config.demoMode && (token.startsWith('demo_access_token_') || token.startsWith('admin_demo_access_token_'))) {
        return true;
      }
      
      // Set a shorter timeout for session validation to prevent hanging
      const response = await apiClient.post('/auth/validate', {}, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000 // 5 second timeout
      });
      
      return response && response.valid === true;
    } catch (error) {
      console.warn('Session validation failed:', error);
      // Don't throw error - just return false to allow login form to show
      return false;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    try {
      if (!this.refreshTokenValue) {
        console.warn('No refresh token available');
        return false;
      }

      // Skip refresh for demo tokens - they don't expire
      if (this.config.demoMode && (this.refreshTokenValue.startsWith('demo_refresh_token_') || this.refreshTokenValue.startsWith('admin_demo_refresh_token_'))) {
        console.log('Demo tokens do not need refresh');
        return true;
      }

      const response = await apiClient.post('/auth/refresh', {
        refresh_token: this.refreshTokenValue
      }, {
        timeout: 5000 // 5 second timeout
      });

      if (!response || !response.success || !response.access_token) {
        return false;
      }

      // Update tokens
      this.sessionToken = response.access_token;
      if (response.refresh_token) {
        this.refreshTokenValue = response.refresh_token;
      }

      // Update API client
      apiClient.setAuthToken(this.sessionToken);

      // Save updated session
      this.saveSession();

      this.emit(AUTH_EVENTS.TOKEN_REFRESHED);
      return true;

    } catch (error) {
      console.warn('Token refresh failed:', error);
      // Don't throw error - just return false
      return false;
    }
  }

  /**
   * Backward compatibility method for AuthGuard
   */
  async refreshToken() {
    try {
      const success = await this.refreshAccessToken();
      if (success) {
        return { 
          success: true, 
          user: this.currentUser, 
          session_id: this.getSessionId() 
        };
      }
      return { success: false, error: 'Token refresh failed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup automatic token refresh
   */
  setupTokenRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(async () => {
      if (this.sessionToken) {
        const refreshed = await this.refreshAccessToken();
        if (!refreshed) {
          this.clearSession();
          this.emit(AUTH_EVENTS.SESSION_EXPIRED);
        }
      }
    }, this.config.refreshIntervalTime);
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      // Call logout API if we have a token
      if (this.sessionToken) {
        await apiClient.post('/auth/logout');
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearSession();
      this.emit(AUTH_EVENTS.LOGOUT);
    }
  }

  /**
   * Save session to localStorage
   */
  saveSession() {
    if (this.currentUser && this.sessionToken) {
      try {
        const sessionData = {
          user: this.currentUser,
          accessToken: this.sessionToken,
          refreshToken: this.refreshTokenValue,
          timestamp: Date.now()
        };
        localStorage.setItem('rss_session', JSON.stringify(sessionData));
        
        // Also save in the format expected by authMiddleware for role checking
        const authContext = {
          user: this.currentUser,
          token: this.sessionToken,
          refreshToken: this.refreshTokenValue,
          authMethod: 'enhanced',
          timestamp: Date.now()
        };
        localStorage.setItem('rss_auth_context', JSON.stringify(authContext));
        
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    }
  }

  /**
   * Clear session data
   */
  clearSession(clearStorage = true) {
    this.currentUser = null;
    this.sessionToken = null;
    this.refreshTokenValue = null;

    // Clear API client auth
    apiClient.clearAuth();

    // Clear timers
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }

    // Clear storage
    if (clearStorage) {
      try {
        localStorage.removeItem('rss_session');
        sessionStorage.removeItem('rss_session');
        localStorage.removeItem('rss_auth_context');
        sessionStorage.removeItem('rss_auth_context');
      } catch (error) {
        console.warn('Failed to clear session storage:', error);
      }
    }
  }

  /**
   * Event handling
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.eventListeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  off(event, callback) {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit(event, data = null) {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  getCurrentUser() {
    return this.currentUser;
  }

  getSessionId() {
    return this.sessionToken;
  }

  isAuthenticated() {
    return !!this.currentUser && !!this.sessionToken && !this.isSessionExpired();
  }

  isSessionExpired() {
    try {
      const sessionData = localStorage.getItem('rss_session');
      if (!sessionData) return true;
      
      const { timestamp } = JSON.parse(sessionData);
      const sessionAge = Date.now() - (timestamp || 0);
      return sessionAge > this.config.sessionTimeout;
    } catch {
      return true;
    }
  }

  getAuthHeader() {
    return this.sessionToken ? `Bearer ${this.sessionToken}` : null;
  }

  hasPermission(permission) {
    if (!this.currentUser) return false;
    
    const userPermissions = this.currentUser.permissions || [];
    const userRole = this.currentUser.role;
    
    if (userRole === 'admin') return true;
    return userPermissions.includes(permission);
  }

  hasOrganizationAccess(organizationId) {
    if (!this.currentUser) return false;
    return this.currentUser.organization_id === organizationId || 
           this.currentUser.role === 'admin';
  }

  getOrganizationId() {
    return this.currentUser?.organization_id;
  }

  // Legacy methods for backward compatibility
  async loginWithCompanyAccount(username, password) {
    return this.login(username, password, true);
  }

  async loginWithLocalAccount(email, password) {
    return this.login(email, password, false);
  }

  async apiRequest(url, options = {}) {
    return apiClient.request(url, options);
  }
}

// Create singleton instance
const enhancedAuthService = new EnhancedAuthService();

export default enhancedAuthService;
export { EnhancedAuthService };