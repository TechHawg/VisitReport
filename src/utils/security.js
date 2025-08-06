/**
 * Security utilities for RSS Visit Report
 * Provides input sanitization, CSRF protection, and other security features
 */

// XSS Prevention
export class InputSanitizer {
  /**
   * Sanitize string input to prevent XSS attacks
   */
  static sanitizeString(input) {
    if (typeof input !== 'string') return input;
    
    // HTML encode dangerous characters
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate and sanitize username
   */
  static sanitizeUsername(username) {
    if (!username || typeof username !== 'string') return '';
    
    // Remove whitespace and limit length
    const cleaned = username.trim().substring(0, 100);
    
    // Only allow alphanumeric, @, ., _, -
    const sanitized = cleaned.replace(/[^a-zA-Z0-9@._-]/g, '');
    
    return sanitized;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Check for potential SQL injection patterns
   */
  static containsSQLInjection(input) {
    if (typeof input !== 'string') return false;
    
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(--|\#|\/\*|\*\/)/,
      /(\bOR\b.*=.*\bOR\b)/i,
      /('.*OR.*'.*=.*')/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Check for XSS patterns
   */
  static containsXSS(input) {
    if (typeof input !== 'string') return false;
    
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]*src\s*=\s*['"]\s*javascript:/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Comprehensive input validation
   */
  static validateInput(input, type = 'string') {
    const errors = [];
    
    if (input === null || input === undefined) {
      errors.push('Input is required');
      return { isValid: false, errors, sanitized: '' };
    }
    
    if (typeof input !== 'string') {
      input = String(input);
    }
    
    // Check for malicious patterns
    if (this.containsXSS(input)) {
      errors.push('Input contains potentially dangerous content');
    }
    
    if (this.containsSQLInjection(input)) {
      errors.push('Input contains invalid characters');
    }
    
    // Type-specific validation
    switch (type) {
      case 'username':
        if (input.length > 100) {
          errors.push('Username is too long');
        }
        if (!/^[a-zA-Z0-9@._-]+$/.test(input)) {
          errors.push('Username contains invalid characters');
        }
        break;
        
      case 'email':
        if (!this.isValidEmail(input)) {
          errors.push('Invalid email format');
        }
        break;
        
      case 'password':
        if (input.length > 200) {
          errors.push('Password is too long');
        }
        break;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitized: this.sanitizeString(input)
    };
  }
}

// CSRF Protection
export class CSRFProtection {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
    this.tokenLifetime = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Generate a CSRF token
   */
  generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    
    this.token = token;
    this.tokenExpiry = Date.now() + this.tokenLifetime;
    
    // Store in sessionStorage for this tab only
    try {
      sessionStorage.setItem('csrf_token', token);
      sessionStorage.setItem('csrf_expiry', this.tokenExpiry.toString());
    } catch (error) {
      console.warn('Failed to store CSRF token:', error);
    }
    
    return token;
  }

  /**
   * Get current CSRF token
   */
  getToken() {
    // Check if current token is still valid
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }
    
    // Try to load from storage
    try {
      const storedToken = sessionStorage.getItem('csrf_token');
      const storedExpiry = sessionStorage.getItem('csrf_expiry');
      
      if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry)) {
        this.token = storedToken;
        this.tokenExpiry = parseInt(storedExpiry);
        return this.token;
      }
    } catch (error) {
      console.warn('Failed to load CSRF token:', error);
    }
    
    // Generate new token
    return this.generateToken();
  }

  /**
   * Validate CSRF token
   */
  validateToken(token) {
    if (!token || !this.token) return false;
    
    // Check expiry
    if (!this.tokenExpiry || Date.now() >= this.tokenExpiry) {
      return false;
    }
    
    // Constant time comparison to prevent timing attacks
    return this.constantTimeEquals(token, this.token);
  }

  /**
   * Constant time string comparison
   */
  constantTimeEquals(a, b) {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  /**
   * Clear CSRF token
   */
  clearToken() {
    this.token = null;
    this.tokenExpiry = null;
    
    try {
      sessionStorage.removeItem('csrf_token');
      sessionStorage.removeItem('csrf_expiry');
    } catch (error) {
      console.warn('Failed to clear CSRF token:', error);
    }
  }
}

// Rate Limiting
export class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  /**
   * Record an attempt
   */
  recordAttempt(identifier) {
    const now = Date.now();
    const key = this.getKey(identifier);
    
    if (!this.attempts.has(key)) {
      this.attempts.set(key, []);
    }
    
    const attempts = this.attempts.get(key);
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(timestamp => now - timestamp < this.windowMs);
    
    // Add current attempt
    validAttempts.push(now);
    
    this.attempts.set(key, validAttempts);
    
    return validAttempts.length;
  }

  /**
   * Check if rate limit is exceeded
   */
  isRateLimited(identifier) {
    const attempts = this.getAttempts(identifier);
    return attempts >= this.maxAttempts;
  }

  /**
   * Get current attempt count
   */
  getAttempts(identifier) {
    const now = Date.now();
    const key = this.getKey(identifier);
    
    if (!this.attempts.has(key)) {
      return 0;
    }
    
    const attempts = this.attempts.get(key);
    const validAttempts = attempts.filter(timestamp => now - timestamp < this.windowMs);
    
    // Update the stored attempts
    this.attempts.set(key, validAttempts);
    
    return validAttempts.length;
  }

  /**
   * Reset attempts for identifier
   */
  reset(identifier) {
    const key = this.getKey(identifier);
    this.attempts.delete(key);
  }

  /**
   * Get time until rate limit resets
   */
  getResetTime(identifier) {
    const now = Date.now();
    const key = this.getKey(identifier);
    
    if (!this.attempts.has(key)) {
      return 0;
    }
    
    const attempts = this.attempts.get(key);
    if (attempts.length === 0) {
      return 0;
    }
    
    const oldestAttempt = Math.min(...attempts);
    const resetTime = oldestAttempt + this.windowMs;
    
    return Math.max(0, resetTime - now);
  }

  /**
   * Generate storage key
   */
  getKey(identifier) {
    return `rate_limit_${identifier}`;
  }

  /**
   * Clean up old entries
   */
  cleanup() {
    const now = Date.now();
    
    for (const [key, attempts] of this.attempts.entries()) {
      const validAttempts = attempts.filter(timestamp => now - timestamp < this.windowMs);
      
      if (validAttempts.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, validAttempts);
      }
    }
  }
}

// Security event types
export const SECURITY_EVENTS = {
  DATA_IMPORT: 'data_import',
  DATA_EXPORT: 'data_export',
  LOGIN_ATTEMPT: 'login_attempt',
  LOGOUT: 'logout',
  SESSION_EXPIRED: 'session_expired',
  VALIDATION_ERROR: 'validation_error',
  RATE_LIMIT_HIT: 'rate_limit_hit'
};

// Audit levels
export const AUDIT_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Create singleton instances
export const inputSanitizer = new InputSanitizer();
export const csrfProtection = new CSRFProtection();
export const rateLimiter = new RateLimiter();

// Utility functions
export const securityUtils = {
  /**
   * Generate secure random string
   */
  generateSecureId(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Generate session fingerprint
   */
  generateFingerprint() {
    const components = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown'
    ];
    
    return btoa(components.join('|'));
  },

  /**
   * Check if running in secure context
   */
  isSecureContext() {
    return window.isSecureContext && window.location.protocol === 'https:';
  }
};

/**
 * Get email recipients for report submission
 * This function would typically fetch from a secure configuration
 */
export const getEmailRecipients = () => {
  // In a real application, this would be fetched from a secure backend
  // For now, return empty array as placeholder
  return [];
};

export default {
  InputSanitizer,
  CSRFProtection,
  RateLimiter,
  inputSanitizer,
  csrfProtection,
  rateLimiter,
  securityUtils
};