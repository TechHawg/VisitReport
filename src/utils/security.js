/**
 * RSS Visit Report - Security Utilities
 * Enhanced security utilities for authentication, authorization, and data protection
 */

import { settings } from './settings.js';

// Email Recipients Configuration - MOVED TO BACKEND
// This configuration should be retrieved from the backend API
// to prevent exposure of internal email addresses in client code
export const getEmailRecipients = async () => {
  try {
    const response = await fetch(settings.getApiUrl('config/email-recipients'), {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('Failed to fetch email recipients from backend:', error);
  }
  
  // Fallback for development/emergency use only
  return {
    inventory: ['inventory@your-domain.local'],
    fullReport: ['management@your-domain.local']
  };
};

// Input validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  office: /^[A-Za-z0-9\s\-_]{1,50}$/,
  serialNumber: /^[A-Za-z0-9\-]{1,30}$/,
  ipAddress: /^(\d{1,3}\.){3}\d{1,3}$/,
  macAddress: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
};

// File upload security
export const FILE_UPLOAD_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
};

// Content Security Policy
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"], // TODO: Remove unsafe-inline and use nonces
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", "data:", "blob:"],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"]
};

// Security headers configuration
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'camera=self',
    'microphone=none',
    'geolocation=none',
    'payment=none'
  ].join(', ')
};

// Input sanitization
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// Validate file uploads
export const validateFile = (file) => {
  const errors = [];
  
  if (!file) {
    errors.push('No file selected');
    return { isValid: false, errors };
  }
  
  if (file.size > FILE_UPLOAD_CONFIG.maxSize) {
    errors.push(`File size must be less than ${FILE_UPLOAD_CONFIG.maxSize / 1024 / 1024}MB`);
  }
  
  if (!FILE_UPLOAD_CONFIG.allowedTypes.includes(file.type)) {
    errors.push('File type not allowed');
  }
  
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  if (!FILE_UPLOAD_CONFIG.allowedExtensions.includes(extension)) {
    errors.push('File extension not allowed');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate secure random string
export const generateSecureToken = (length = 32) => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Validate email addresses
export const validateEmail = (email) => {
  return VALIDATION_PATTERNS.email.test(email);
};

// Session security
export const SESSION_CONFIG = {
  timeout: 30 * 60 * 1000, // 30 minutes
  warningTime: 5 * 60 * 1000, // 5 minutes warning
  maxInactivity: 15 * 60 * 1000 // 15 minutes max inactivity
};

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many requests, please try again later'
};

// Audit logging levels
export const AUDIT_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Security events that should be logged
export const SECURITY_EVENTS = {
  LOGIN_ATTEMPT: 'login_attempt',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  SESSION_EXPIRED: 'session_expired',
  PASSWORD_CHANGE: 'password_change',
  DATA_EXPORT: 'data_export',
  DATA_IMPORT: 'data_import',
  EMAIL_SENT: 'email_sent',
  FILE_UPLOAD: 'file_upload',
  FILE_DOWNLOAD: 'file_download',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  DATA_MODIFICATION: 'data_modification',
  PERMISSION_DENIED: 'permission_denied',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  SECURITY_VIOLATION: 'security_violation'
};

// XSS Protection utilities
export const xssProtection = {
  /**
   * Encode HTML entities to prevent XSS
   * @param {string} str - String to encode
   */
  encodeHtml: (str) => {
    if (typeof str !== 'string') return str;
    
    const entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };
    
    return str.replace(/[&<>"'`=\/]/g, (s) => entityMap[s]);
  },
  
  /**
   * Sanitize user input more thoroughly
   * @param {string} input - Input to sanitize
   */
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframe tags
      .replace(/<object[^>]*>.*?<\/object>/gi, '') // Remove object tags
      .replace(/<embed[^>]*>/gi, '') // Remove embed tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/expression\s*\(/gi, '') // Remove CSS expressions
      .trim();
  },
  
  /**
   * Validate that content doesn't contain potential XSS
   * @param {string} content - Content to validate
   */
  isContentSafe: (content) => {
    if (typeof content !== 'string') return true;
    
    const dangerousPatterns = [
      /<script/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /expression\s*\(/i,
      /<\s*img[^>]+src\s*=\s*["']?javascript:/i
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(content));
  }
};

// CSRF Protection
export const csrfProtection = {
  /**
   * Generate CSRF token
   */
  generateToken: () => {
    return generateSecureToken(32);
  },
  
  /**
   * Get CSRF token from meta tag or generate new one
   */
  getToken: () => {
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (metaToken) return metaToken;
    
    // Generate and store new token
    const newToken = csrfProtection.generateToken();
    localStorage.setItem('csrf_token', newToken);
    return newToken;
  },
  
  /**
   * Add CSRF token to request headers
   * @param {Object} headers - Existing headers
   */
  addTokenToHeaders: (headers = {}) => {
    return {
      ...headers,
      'X-CSRF-Token': csrfProtection.getToken()
    };
  }
};

// SQL Injection Protection (for any dynamic queries)
export const sqlProtection = {
  /**
   * Escape SQL special characters
   * @param {string} input - Input to escape
   */
  escapeInput: (input) => {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/'/g, "''")
      .replace(/\\/g, '\\\\')
      .replace(/\x00/g, '\\0')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\x1a/g, '\\Z');
  },
  
  /**
   * Validate input doesn't contain SQL injection patterns
   * @param {string} input - Input to validate
   */
  isSqlSafe: (input) => {
    if (typeof input !== 'string') return true;
    
    const sqlPatterns = [
      /('|(\-\-)|(\;)|(\||\|)|(\*|\*))/i,
      /(union|select|insert|delete|update|create|drop|exec|execute)/i,
      /(script|javascript|vbscript|onload|onerror|onclick)/i
    ];
    
    return !sqlPatterns.some(pattern => pattern.test(input));
  }
};

// Network Security
export const networkSecurity = {
  /**
   * Validate that request is from allowed origin
   * @param {string} origin - Origin to validate
   */
  isOriginAllowed: (origin) => {
    const allowedOrigins = settings.get('network.corsOrigins', []);
    return allowedOrigins.includes(origin) || origin === window.location.origin;
  },
  
  /**
   * Check if IP is in internal network range
   * @param {string} ip - IP address to check
   */
  isInternalIP: (ip) => {
    const internalRanges = [
      /^127\./,  // Loopback
      /^10\./,   // Private Class A
      /^172\.(1[6-9]|2[0-9]|3[0-1])/, // Private Class B
      /^192\.168\./  // Private Class C
    ];
    
    return internalRanges.some(range => range.test(ip));
  },
  
  /**
   * Add security headers to fetch requests
   * @param {Object} options - Fetch options
   */
  secureHeaders: (options = {}) => {
    const secureHeaders = {
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
      ...csrfProtection.addTokenToHeaders()
    };
    
    return {
      ...options,
      headers: {
        ...secureHeaders,
        ...options.headers
      }
    };
  }
};

// Data Classification and Protection
export const dataProtection = {
  /**
   * Data classification levels
   */
  CLASSIFICATION: {
    PUBLIC: 'public',
    INTERNAL: 'internal',
    CONFIDENTIAL: 'confidential',
    RESTRICTED: 'restricted'
  },
  
  /**
   * Classify data based on content
   * @param {Object} data - Data to classify
   */
  classifyData: (data) => {
    if (!data) return dataProtection.CLASSIFICATION.PUBLIC;
    
    const sensitiveFields = ['serial_number', 'ip_address', 'mac_address', 'password', 'ssn', 'email'];
    const dataStr = JSON.stringify(data).toLowerCase();
    
    const hasSensitiveData = sensitiveFields.some(field => dataStr.includes(field));
    
    if (hasSensitiveData) {
      return dataProtection.CLASSIFICATION.CONFIDENTIAL;
    }
    
    return dataProtection.CLASSIFICATION.INTERNAL;
  },
  
  /**
   * Mask sensitive data for logging
   * @param {Object} data - Data to mask
   */
  maskSensitiveData: (data) => {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = ['password', 'token', 'ssn', 'credit_card', 'serial_number'];
    const masked = { ...data };
    
    Object.keys(masked).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        const value = masked[key];
        if (typeof value === 'string' && value.length > 4) {
          masked[key] = value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
        } else {
          masked[key] = '***';
        }
      }
    });
    
    return masked;
  }
};

// Security Monitoring
export const securityMonitoring = {
  /**
   * Log security event
   * @param {string} event - Event type
   * @param {Object} details - Event details
   */
  logSecurityEvent: async (event, details = {}) => {
    if (!settings.get('security.auditLogging', true)) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      user: getCurrentUser()?.username || 'anonymous',
      ip: await getClientIP(),
      userAgent: navigator.userAgent,
      details: dataProtection.maskSensitiveData(details),
      classification: dataProtection.classifyData(details)
    };
    
    // Store locally for immediate access
    const securityLogs = JSON.parse(localStorage.getItem('security_logs') || '[]');
    securityLogs.push(logEntry);
    
    // Keep only last 50 entries
    if (securityLogs.length > 50) {
      securityLogs.splice(0, securityLogs.length - 50);
    }
    
    localStorage.setItem('security_logs', JSON.stringify(securityLogs));
    
    // Send to backend
    try {
      await fetch(settings.getApiUrl('security/log'), {
        method: 'POST',
        ...networkSecurity.secureHeaders(),
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      console.warn('Failed to send security log to backend:', error);
    }
  },
  
  /**
   * Check for suspicious activity patterns
   * @param {string} userId - User ID
   * @param {string} activity - Activity type
   */
  checkSuspiciousActivity: (userId, activity) => {
    const recentLogs = JSON.parse(localStorage.getItem('security_logs') || '[]')
      .filter(log => log.user === userId && Date.now() - new Date(log.timestamp).getTime() < 300000); // Last 5 minutes
    
    // Check for rapid repeated actions
    const sameActivityLogs = recentLogs.filter(log => log.event === activity);
    if (sameActivityLogs.length > 10) {
      securityMonitoring.logSecurityEvent(SECURITY_EVENTS.SUSPICIOUS_ACTIVITY, {
        suspiciousActivity: activity,
        count: sameActivityLogs.length,
        timeWindow: '5 minutes'
      });
      return true;
    }
    
    return false;
  }
};

// Helper function to get current user (would be imported from auth service)
const getCurrentUser = () => {
  try {
    const sessionData = JSON.parse(sessionStorage.getItem('rss_user_session') || '{}');
    return sessionData.user || null;
  } catch {
    return null;
  }
};

// Helper function to get client IP (limited in browser)
const getClientIP = async () => {
  try {
    // This would require a backend service to determine real IP
    const response = await fetch(settings.getApiUrl('utils/client-ip'));
    const data = await response.json();
    return data.ip || 'unknown';
  } catch {
    return 'client-unknown';
  }
};