/**
 * RSS Visit Report - Active Directory Authentication Service
 * Handles AD/LDAP authentication, user synchronization, and role mapping
 */

import { settings } from '../utils/settings.js';

class ADAuthService {
  constructor() {
    this.ldapConfig = {
      url: settings.get('auth.ldap.url', 'ldap://dc.company.local:389'),
      baseDN: settings.get('auth.ldap.baseDN', 'DC=company,DC=local'),
      bindDN: settings.get('auth.ldap.bindDN', 'CN=rss-service,OU=ServiceAccounts,DC=company,DC=local'),
      bindPassword: settings.get('auth.ldap.bindPassword', ''),
      searchFilter: settings.get('auth.ldap.searchFilter', '(sAMAccountName={{username}})'),
      groupFilter: settings.get('auth.ldap.groupFilter', '(member={{userDN}})'),
      attributes: ['sAMAccountName', 'mail', 'displayName', 'givenName', 'sn', 'memberOf', 'objectGUID'],
      roleMapping: {
        'CN=RSS-Admins,OU=Groups,DC=company,DC=local': 'admin',
        'CN=RSS-Managers,OU=Groups,DC=company,DC=local': 'manager',
        'CN=RSS-Technicians,OU=Groups,DC=company,DC=local': 'technician',
        'CN=RSS-Users,OU=Groups,DC=company,DC=local': 'viewer'
      }
    };
    
    this.apiUrl = settings.getApiUrl('auth');
    this.isEnabled = settings.get('auth.adEnabled', false);
  }

  /**
   * Check if Active Directory authentication is enabled
   */
  isADEnabled() {
    return this.isEnabled;
  }

  /**
   * Authenticate user against Active Directory
   * @param {string} username - Username (without domain)
   * @param {string} password - User password
   * @param {string} domain - Optional domain override
   */
  async authenticateUser(username, password, domain = null) {
    if (!this.isEnabled) {
      throw new Error('Active Directory authentication is not enabled');
    }

    try {
      const response = await fetch(`${this.apiUrl}/ad-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          username: this.sanitizeInput(username),
          password, // Don't sanitize password
          domain: domain || settings.get('auth.adDomain', 'COMPANY'),
          ldapConfig: this.ldapConfig
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `AD authentication failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Process AD user data
        const userData = await this.processADUser(result.user, result.groups);
        
        return {
          success: true,
          user: userData,
          token: result.token,
          refreshToken: result.refreshToken,
          sessionId: result.sessionId
        };
      } else {
        throw new Error(result.message || 'Authentication failed');
      }

    } catch (error) {
      console.error('AD Authentication error:', error);
      throw error;
    }
  }

  /**
   * Process Active Directory user data
   * @param {Object} adUser - AD user object
   * @param {Array} adGroups - AD group memberships
   */
  async processADUser(adUser, adGroups = []) {
    // Map AD attributes to application user model
    const userData = {
      id: adUser.objectGUID || null,
      username: adUser.sAMAccountName,
      email: adUser.mail || `${adUser.sAMAccountName}@${settings.get('auth.adDomain', 'company.local').toLowerCase()}`,
      displayName: adUser.displayName || `${adUser.givenName || ''} ${adUser.sn || ''}`.trim(),
      firstName: adUser.givenName,
      lastName: adUser.sn,
      role: this.mapADGroupsToRole(adGroups),
      permissions: this.mapADGroupsToPermissions(adGroups),
      adDomain: settings.get('auth.adDomain', 'COMPANY'),
      adGroups: adGroups.map(group => group.dn || group),
      isADUser: true,
      lastSync: new Date().toISOString()
    };

    // Sync user to local database
    await this.syncUserToDatabase(userData);

    return userData;
  }

  /**
   * Map AD groups to application role
   * @param {Array} adGroups - AD group memberships
   */
  mapADGroupsToRole(adGroups) {
    if (!Array.isArray(adGroups)) return 'viewer';

    // Check for admin role first (highest precedence)
    for (const group of adGroups) {
      const groupDN = typeof group === 'object' ? group.dn : group;
      if (this.ldapConfig.roleMapping[groupDN] === 'admin') {
        return 'admin';
      }
    }

    // Check for manager role
    for (const group of adGroups) {
      const groupDN = typeof group === 'object' ? group.dn : group;
      if (this.ldapConfig.roleMapping[groupDN] === 'manager') {
        return 'manager';
      }
    }

    // Check for technician role
    for (const group of adGroups) {
      const groupDN = typeof group === 'object' ? group.dn : group;
      if (this.ldapConfig.roleMapping[groupDN] === 'technician') {
        return 'technician';
      }
    }

    // Default to viewer role
    return 'viewer';
  }

  /**
   * Map AD groups to application permissions
   * @param {Array} adGroups - AD group memberships
   */
  mapADGroupsToPermissions(adGroups) {
    const role = this.mapADGroupsToRole(adGroups);
    
    const rolePermissions = {
      'admin': [
        'admin:*',
        'reports:create',
        'reports:edit:all',
        'reports:view:all',
        'reports:delete:all',
        'reports:export:all',
        'users:manage',
        'system:settings'
      ],
      'manager': [
        'reports:create',
        'reports:edit:own',
        'reports:edit:team',
        'reports:view:all',
        'reports:export:own',
        'reports:export:team',
        'users:view:team'
      ],
      'technician': [
        'reports:create',
        'reports:edit:own',
        'reports:view:assigned',
        'reports:export:own',
        'hardware:manage'
      ],
      'viewer': [
        'reports:view:assigned',
        'reports:export:own'
      ]
    };

    return rolePermissions[role] || rolePermissions['viewer'];
  }

  /**
   * Sync AD user to local database
   * @param {Object} userData - Processed user data
   */
  async syncUserToDatabase(userData) {
    try {
      const response = await fetch(`${this.apiUrl}/sync-ad-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          userData,
          syncTimestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        console.warn('Failed to sync user to database:', response.status);
      } else {
        const result = await response.json();
        userData.id = result.userId; // Update with database ID
      }

    } catch (error) {
      console.warn('User sync failed:', error);
      // Don't fail authentication if sync fails
    }
  }

  /**
   * Validate AD user session
   * @param {string} token - JWT token
   * @param {string} sessionId - Session ID
   */
  async validateSession(token, sessionId) {
    try {
      const response = await fetch(`${this.apiUrl}/validate-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });

      if (response.ok) {
        const result = await response.json();
        return result.valid === true;
      }

      return false;

    } catch (error) {
      console.warn('Session validation failed:', error);
      return false;
    }
  }

  /**
   * Refresh user data from Active Directory
   * @param {string} username - Username
   */
  async refreshUserData(username) {
    try {
      const response = await fetch(`${this.apiUrl}/ad-refresh-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          username: this.sanitizeInput(username),
          ldapConfig: this.ldapConfig
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return await this.processADUser(result.user, result.groups);
        }
      }

      return null;

    } catch (error) {
      console.warn('User refresh failed:', error);
      return null;
    }
  }

  /**
   * Get AD groups for user
   * @param {string} username - Username
   */
  async getUserGroups(username) {
    try {
      const response = await fetch(`${this.apiUrl}/ad-user-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          username: this.sanitizeInput(username),
          ldapConfig: this.ldapConfig
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.groups || [];
      }

      return [];

    } catch (error) {
      console.warn('Failed to get user groups:', error);
      return [];
    }
  }

  /**
   * Test LDAP connection
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.apiUrl}/ad-test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          ldapConfig: this.ldapConfig
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: result.success,
          message: result.message,
          serverInfo: result.serverInfo
        };
      }

      return {
        success: false,
        message: `Connection test failed: ${response.status}`
      };

    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error.message}`
      };
    }
  }

  /**
   * Logout AD user and invalidate session
   * @param {string} token - JWT token
   * @param {string} sessionId - Session ID
   */
  async logout(token, sessionId) {
    try {
      const response = await fetch(`${this.apiUrl}/ad-logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });

      return response.ok;

    } catch (error) {
      console.warn('AD logout failed:', error);
      return false;
    }
  }

  /**
   * Get Windows authentication token (if available)
   * This would be used with Windows Integrated Authentication
   */
  async getWindowsAuthToken() {
    try {
      // This would typically involve NTLM or Kerberos
      // For now, return null as this requires server-side implementation
      return null;
    } catch (error) {
      console.warn('Windows authentication not available:', error);
      return null;
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
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .replace(/[\\\/\[\]]/g, '') // Remove LDAP injection characters
      .substring(0, 100); // Limit length
  }

  /**
   * Update LDAP configuration
   * @param {Object} config - New LDAP configuration
   */
  updateConfig(config) {
    this.ldapConfig = { ...this.ldapConfig, ...config };
    
    // Update settings
    Object.keys(config).forEach(key => {
      settings.set(`auth.ldap.${key}`, config[key]);
    });
  }

  /**
   * Get current LDAP configuration (sanitized)
   */
  getConfig() {
    const sanitizedConfig = { ...this.ldapConfig };
    
    // Don't expose sensitive information
    delete sanitizedConfig.bindPassword;
    
    return sanitizedConfig;
  }
}

// Create singleton instance
const adAuthService = new ADAuthService();

export default adAuthService;