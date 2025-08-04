/**
 * RSS Visit Report - Settings Management
 * Centralized configuration and environment variable handling
 */

class SettingsManager {
  constructor() {
    this.cache = new Map();
    this.watchers = new Map();
    this.loadEnvironmentVariables();
  }

  /**
   * Load and validate environment variables
   */
  loadEnvironmentVariables() {
    const env = import.meta.env;
    
    // Application Configuration
    this.config = {
      app: {
        name: env.VITE_APP_NAME || 'RSS Visit Report',
        version: env.VITE_APP_VERSION || '1.0.0',
        environment: env.VITE_APP_ENVIRONMENT || 'development',
        debugMode: env.VITE_DEBUG_MODE === 'true',
        logLevel: env.VITE_LOG_LEVEL || 'info'
      },
      
      // API Configuration
      api: {
        baseUrl: env.VITE_API_BASE_URL || 'http://localhost:3001/api',
        timeout: parseInt(env.VITE_API_TIMEOUT) || 30000,
        version: env.VITE_API_VERSION || 'v1'
      },
      
      // Authentication Configuration
      auth: {
        enabled: env.VITE_AUTH_ENABLED === 'true',
        jwtExpiry: parseInt(env.VITE_JWT_EXPIRY) || 3600,
        sessionTimeout: parseInt(env.VITE_SESSION_TIMEOUT) || 1800,
        maxLoginAttempts: parseInt(env.VITE_MAX_LOGIN_ATTEMPTS) || 5,
        lockoutDuration: parseInt(env.VITE_LOCKOUT_DURATION) || 900,
        adEnabled: env.VITE_AD_ENABLED === 'true',
        adDomain: env.VITE_AD_DOMAIN || '',
        adBaseDN: env.VITE_AD_BASE_DN || ''
      },
      
      // File Upload Configuration
      files: {
        maxSize: parseInt(env.VITE_MAX_FILE_SIZE) || 10485760, // 10MB
        allowedTypes: env.VITE_ALLOWED_FILE_TYPES?.split(',') || ['.jpg', '.jpeg', '.png', '.pdf'],
        uploadEndpoint: env.VITE_UPLOAD_ENDPOINT || '/api/v1/files/upload'
      },
      
      // Security Configuration
      security: {
        cspEnabled: env.VITE_CSP_ENABLED === 'true',
        securityHeaders: env.VITE_SECURITY_HEADERS === 'true',
        auditLogging: env.VITE_AUDIT_LOGGING === 'true',
        performanceMonitoring: env.VITE_PERFORMANCE_MONITORING === 'true',
        httpsEnabled: env.VITE_ENABLE_HTTPS === 'true',
        hstsMaxAge: parseInt(env.VITE_HSTS_MAX_AGE) || 31536000
      },
      
      // Network Configuration
      network: {
        internalNetworkOnly: env.VITE_INTERNAL_NETWORK_ONLY === 'true',
        allowedIpRanges: env.VITE_ALLOWED_IP_RANGES?.split(',') || [],
        corsOrigins: env.VITE_CORS_ORIGINS?.split(',') || []
      },
      
      // Memory Management Configuration
      memory: {
        cacheSize: parseInt(env.VITE_MEMORY_CACHE_SIZE) || 50,
        storageQuotaMB: parseInt(env.VITE_STORAGE_QUOTA_MB) || 100,
        autoCleanupEnabled: env.VITE_AUTO_CLEANUP_ENABLED === 'true',
        cleanupIntervalHours: parseInt(env.VITE_CLEANUP_INTERVAL_HOURS) || 24
      },
      
      // Email Configuration
      email: {
        enabled: env.VITE_EMAIL_ENABLED === 'true',
        smtpFrom: env.VITE_SMTP_FROM || '',
        templatePath: env.VITE_EMAIL_TEMPLATE_PATH || '/templates'
      }
    };
    
    this.validateConfiguration();
  }
  
  /**
   * Validate critical configuration settings
   */
  validateConfiguration() {
    const errors = [];
    
    if (!this.config.api.baseUrl) {
      errors.push('API base URL is required');
    }
    
    if (this.config.auth.enabled && !this.config.auth.adDomain) {
      console.warn('Authentication enabled but AD domain not configured');
    }
    
    if (this.config.files.maxSize > 100 * 1024 * 1024) { // 100MB
      console.warn('File upload size limit is very high, consider reducing for security');
    }
    
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }
  
  /**
   * Get a configuration value by path
   * @param {string} path - Dot notation path (e.g., 'auth.enabled')
   * @param {*} defaultValue - Default value if not found
   */
  get(path, defaultValue = null) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }
  
  /**
   * Set a configuration value (runtime only, not persisted)
   * @param {string} path - Dot notation path
   * @param {*} value - Value to set
   */
  set(path, value) {
    const keys = path.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    const lastKey = keys[keys.length - 1];
    const oldValue = current[lastKey];
    current[lastKey] = value;
    
    // Notify watchers
    this.notifyWatchers(path, value, oldValue);
  }
  
  /**
   * Watch for changes to a configuration value
   * @param {string} path - Dot notation path to watch
   * @param {Function} callback - Callback function
   */
  watch(path, callback) {
    if (!this.watchers.has(path)) {
      this.watchers.set(path, new Set());
    }
    this.watchers.get(path).add(callback);
    
    // Return unwatch function
    return () => {
      const callbacks = this.watchers.get(path);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.watchers.delete(path);
        }
      }
    };
  }
  
  /**
   * Notify watchers of configuration changes
   */
  notifyWatchers(path, newValue, oldValue) {
    const callbacks = this.watchers.get(path);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error(`Error in settings watcher for ${path}:`, error);
        }
      });
    }
  }
  
  /**
   * Get all configuration as a read-only object
   */
  getAll() {
    return Object.freeze(JSON.parse(JSON.stringify(this.config)));
  }
  
  /**
   * Check if running in development mode
   */
  isDevelopment() {
    return this.config.app.environment === 'development';
  }
  
  /**
   * Check if running in production mode
   */
  isProduction() {
    return this.config.app.environment === 'production';
  }
  
  /**
   * Check if authentication is enabled
   */
  isAuthEnabled() {
    return this.config.auth.enabled;
  }
  
  /**
   * Check if debug mode is enabled
   */
  isDebugMode() {
    return this.config.app.debugMode;
  }
  
  /**
   * Get API endpoint URL
   * @param {string} endpoint - Endpoint path
   */
  getApiUrl(endpoint = '') {
    const baseUrl = this.config.api.baseUrl.replace(/\/$/, '');
    const version = this.config.api.version;
    const cleanEndpoint = endpoint.replace(/^\//, '');
    
    return `${baseUrl}/${version}/${cleanEndpoint}`;
  }
  
  /**
   * Export configuration for debugging
   */
  export() {
    if (!this.isDevelopment()) {
      throw new Error('Configuration export only available in development mode');
    }
    
    return {
      timestamp: new Date().toISOString(),
      environment: this.config.app.environment,
      config: this.getAll()
    };
  }
}

// Create singleton instance
const settingsManager = new SettingsManager();

// Export convenience functions
export const settings = {
  get: (path, defaultValue) => settingsManager.get(path, defaultValue),
  set: (path, value) => settingsManager.set(path, value),
  watch: (path, callback) => settingsManager.watch(path, callback),
  getAll: () => settingsManager.getAll(),
  isDevelopment: () => settingsManager.isDevelopment(),
  isProduction: () => settingsManager.isProduction(),
  isAuthEnabled: () => settingsManager.isAuthEnabled(),
  isDebugMode: () => settingsManager.isDebugMode(),
  getApiUrl: (endpoint) => settingsManager.getApiUrl(endpoint),
  export: () => settingsManager.export()
};

export default settingsManager;