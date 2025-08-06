/**
 * Enhanced Authentication Service for Company Integration
 * Handles Active Directory authentication, database persistence, and session management
 * Frontend version - communicates with backend API
 */

class EnhancedAuthService {
  // Ensure class has a refreshToken method defined on the prototype
  constructor() {
    // Prefer relative /api so Vite proxy handles dev and same-origin handles prod
    this.apiUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
    this.currentUser = null;
    this.sessionToken = null;
    // Avoid naming collision with method name "refreshToken"
    this.refreshTokenValue = null;
    this.refreshInterval = null;
    
    this.init();
  }

  /**
   * Unified login method matching backend contract
   */
  async login(username, password, rememberMe = false) {
    try {
      // Use relative /api path to hit Vite proxy in development
      // Always hit API under /api... path
      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Login failed');
      }

      // Map server response fields
      this.currentUser = data.user;
      this.sessionToken = data.access_token;
      this.refreshTokenValue = data.refresh_token;

      // Persist to localStorage
      this.saveSession();

      // Setup token refresh
      this.setupTokenRefresh();

      return {
        success: true,
        user: data.user,
        session_id: data.session_id
      };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async init() {
    // Try to restore session from storage
    await this.restoreSession();
    
    // Setup automatic token refresh
    this.setupTokenRefresh();
  }

  /**
   * Restore session from local storage
   */
  async restoreSession() {
    try {
      const sessionData = localStorage.getItem('rss_session');
      if (sessionData) {
        const { accessToken, refreshToken, user } = JSON.parse(sessionData);
        
        // carry forward saved refresh token into the renamed field
        this.refreshTokenValue = refreshToken || null;

        // Validate session with server
        const isValid = await this.validateSession(accessToken);
        if (isValid) {
          this.currentUser = user;
          this.sessionToken = accessToken;
          return true;
        } else {
          // Try to refresh token
          const refreshed = await this.refreshAccessToken();
          return refreshed;
        }
      }
    } catch (error) {
      console.warn('Failed to restore session:', error);
      this.clearSession();
    }
    return false;
  }

  /**
   * Login with company credentials (Active Directory)
   */
  async loginWithCompanyAccount(username, password) {
    // For now, delegate to unified login; backend ignores authType
    return this.login(username, password, true);
  }

  /**
   * Login with local account (fallback)
   */
  async loginWithLocalAccount(email, password) {
    // Support email-as-username by delegating
    return this.login(email, password, false);
  }

  /**
   * Logout and clear session
   */
  async logout() {
    try {
      // Call logout API to invalidate server session
      if (this.sessionToken) {
        await fetch(`${this.apiUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }

    // Clear local session
    this.clearSession();
  }

  /**
   * Save session to localStorage
   */
  saveSession() {
    if (this.currentUser && this.sessionToken) {
      const sessionData = {
        user: this.currentUser,
        accessToken: this.sessionToken,
        refreshToken: this.refreshTokenValue,
        timestamp: Date.now()
      };
      localStorage.setItem('rss_session', JSON.stringify(sessionData));
    }
  }

  /**
   * Clear session data
   */
  clearSession() {
    this.currentUser = null;
    this.sessionToken = null;
    this.refreshTokenValue = null;

    try { localStorage.removeItem('rss_session'); } catch {}
    try { sessionStorage.removeItem('rss_session'); } catch {}
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Validate session token with server
   */
  async validateSession(token) {
    try {
      const response = await fetch(`${this.apiUrl}/auth/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * Refresh access token
   * Note: Do NOT name any instance field "refreshToken" to avoid shadowing this.refreshToken() method.
   */
  async refreshAccessToken() {
    try {
      if (!this.refreshTokenValue) {
        // no stored refresh token; cannot refresh
        return false;
      }

      const response = await fetch(`${this.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshTokenValue })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return false;
      }

      // Server returns access_token
      this.sessionToken = data.access_token;

      // Persist updated token alongside existing refreshTokenValue
      this.saveSession();
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Backward-compatible refreshToken() used by AuthGuard
   * Calls refreshAccessToken() and returns a normalized result.
   */
  async refreshToken() {
    // Backward-compatible wrapper used by AuthGuard
    try {
      const ok = await this.refreshAccessToken();
      if (ok) {
        return { success: true, user: this.currentUser, session_id: this.getSessionId() };
      }
      return { success: false, error: 'Token refresh failed' };
    } catch (error) {
      console.error('Refresh token error:', error);
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

    // Refresh token every 20 minutes
    this.refreshInterval = setInterval(async () => {
      if (this.sessionToken) {
        await this.refreshAccessToken();
      }
    }, 20 * 60 * 1000);
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get session ID (token)
   */
  getSessionId() {
    return this.sessionToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.currentUser && !!this.sessionToken;
  }

  /**
   * Get authorization header
   */
  getAuthHeader() {
    return this.sessionToken ? `Bearer ${this.sessionToken}` : null;
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(url, options = {}) {
    const authHeader = this.getAuthHeader();
    if (!authHeader) {
      throw new Error('Not authenticated');
    }

    const defaultHeaders = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const response = await fetch(url, { ...options, headers: defaultHeaders });

    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        const retryHeaders = {
          ...defaultHeaders,
          'Authorization': this.getAuthHeader()
        };
        return await fetch(url, { ...options, headers: retryHeaders });
      }
      this.clearSession();
      throw new Error('Session expired. Please login again.');
    }

    return response;
  }

  /**
   * Check user permissions
   */
  hasPermission(permission) {
    if (!this.currentUser) return false;
    
    const userPermissions = this.currentUser.permissions || [];
    const userRole = this.currentUser.role;
    
    // Admin has all permissions
    if (userRole === 'admin') return true;
    
    // Check specific permission
    return userPermissions.includes(permission);
  }

  /**
   * Check if user has access to organization
   */
  hasOrganizationAccess(organizationId) {
    if (!this.currentUser) return false;
    
    return this.currentUser.organization_id === organizationId || 
           this.currentUser.role === 'admin';
  }

  /**
   * Get user's organization ID
   */
  getOrganizationId() {
    return this.currentUser?.organization_id;
  }
}

// Create singleton instance
const enhancedAuthService = new EnhancedAuthService();

export default enhancedAuthService;
