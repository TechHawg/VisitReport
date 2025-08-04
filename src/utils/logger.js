/**
 * RSS Visit Report - Advanced Logging System
 * Centralized logging with multiple outputs and filtering
 */

import { settings } from './settings.js';
import { memory } from './memoryManager.js';

class Logger {
  constructor() {
    this.logLevel = this.getLogLevel();
    this.outputs = [];
    this.filters = [];
    this.logQueue = [];
    this.isProcessing = false;
    
    this.setupOutputs();
    this.setupFilters();
  }
  
  /**
   * Log levels in priority order
   */
  static LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
  };
  
  /**
   * Get current log level from settings
   */
  getLogLevel() {
    const level = settings.get('app.logLevel', 'info').toUpperCase();
    return Logger.LEVELS[level] !== undefined ? Logger.LEVELS[level] : Logger.LEVELS.INFO;
  }
  
  /**
   * Setup log outputs
   */
  setupOutputs() {
    // Console output (always enabled in development)
    if (settings.isDevelopment()) {
      this.addOutput(new ConsoleOutput());
    }
    
    // Memory output (for recent logs)
    this.addOutput(new MemoryOutput());
    
    // Server output (for production logging)
    if (settings.isProduction()) {
      this.addOutput(new ServerOutput());
    }
    
    // Local storage output (for debugging)
    if (settings.get('app.debugMode', false)) {
      this.addOutput(new LocalStorageOutput());
    }
  }
  
  /**
   * Setup log filters
   */
  setupFilters() {
    // Security filter (mask sensitive data)
    this.addFilter(new SecurityFilter());
    
    // Performance filter (track slow operations)
    this.addFilter(new PerformanceFilter());
    
    // Rate limiting filter
    this.addFilter(new RateLimitFilter());
  }
  
  /**
   * Add log output
   */
  addOutput(output) {
    this.outputs.push(output);
  }
  
  /**
   * Add log filter
   */
  addFilter(filter) {
    this.filters.push(filter);
  }
  
  /**
   * Create log entry
   */
  createLogEntry(level, message, meta = {}) {
    return {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level: Object.keys(Logger.LEVELS)[level],
      message,
      meta: { ...meta },
      sessionId: this.getSessionId(),
      userId: this.getCurrentUserId(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
    };
  }
  
  /**
   * Log message
   */
  log(level, message, meta = {}) {
    // Check if level should be logged
    if (level > this.logLevel) return;
    
    // Create log entry
    let logEntry = this.createLogEntry(level, message, meta);
    
    // Apply filters
    for (const filter of this.filters) {
      logEntry = filter.process(logEntry);
      if (!logEntry) return; // Filter blocked the log
    }
    
    // Add to queue for processing
    this.logQueue.push(logEntry);
    
    // Process queue
    this.processQueue();
  }
  
  /**
   * Process log queue
   */
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    while (this.logQueue.length > 0) {
      const logEntry = this.logQueue.shift();
      
      // Send to all outputs
      const outputPromises = this.outputs.map(output => 
        output.write(logEntry).catch(error => 
          console.warn(`Log output failed for ${output.constructor.name}:`, error)
        )
      );
      
      await Promise.allSettled(outputPromises);
    }
    
    this.isProcessing = false;
  }
  
  /**
   * Convenience methods for different log levels
   */
  error(message, meta = {}) {
    this.log(Logger.LEVELS.ERROR, message, meta);
  }
  
  warn(message, meta = {}) {
    this.log(Logger.LEVELS.WARN, message, meta);
  }
  
  info(message, meta = {}) {
    this.log(Logger.LEVELS.INFO, message, meta);
  }
  
  debug(message, meta = {}) {
    this.log(Logger.LEVELS.DEBUG, message, meta);
  }
  
  trace(message, meta = {}) {
    this.log(Logger.LEVELS.TRACE, message, meta);
  }
  
  /**
   * Log with performance timing
   */
  time(label) {
    const startTime = performance.now();
    
    return {
      end: (message, meta = {}) => {
        const duration = performance.now() - startTime;
        this.info(message || `Timer '${label}' completed`, {
          ...meta,
          duration: `${duration.toFixed(2)}ms`,
          label
        });
        return duration;
      }
    };
  }
  
  /**
   * Log error with stack trace
   */
  exception(error, message = '', meta = {}) {
    this.error(message || error.message, {
      ...meta,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      }
    });
  }
  
  /**
   * Get session ID
   */
  getSessionId() {
    return sessionStorage.getItem('monitoring_session_id') || 'unknown';
  }
  
  /**
   * Get current user ID
   */
  getCurrentUserId() {
    try {
      const session = JSON.parse(sessionStorage.getItem('rss_user_session') || '{}');
      return session.user?.id || session.user?.username || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }
  
  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * Get recent logs for debugging
   */
  getRecentLogs(count = 50) {
    return memory.cacheGet('recent_logs')?.slice(-count) || [];
  }
  
  /**
   * Clear all logs
   */
  clearLogs() {
    memory.cacheDelete('recent_logs');
    localStorage.removeItem('rss_debug_logs');
  }
}

/**
 * Console Output - writes to browser console
 */
class ConsoleOutput {
  async write(logEntry) {
    const { level, message, meta } = logEntry;
    const consoleMethod = level.toLowerCase();
    
    if (console[consoleMethod]) {
      if (Object.keys(meta).length > 0) {
        console[consoleMethod](`[${logEntry.timestamp}] ${message}`, meta);
      } else {
        console[consoleMethod](`[${logEntry.timestamp}] ${message}`);
      }
    } else {
      console.log(`[${level}] [${logEntry.timestamp}] ${message}`, meta);
    }
  }
}

/**
 * Memory Output - stores logs in memory cache
 */
class MemoryOutput {
  async write(logEntry) {
    const logs = memory.cacheGet('recent_logs') || [];
    logs.push(logEntry);
    
    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    
    memory.cacheSet('recent_logs', logs, 60 * 60 * 1000); // 1 hour
  }
}

/**
 * Server Output - sends logs to backend server
 */
class ServerOutput {
  constructor() {
    this.buffer = [];
    this.flushInterval = 30000; // 30 seconds
    this.maxBufferSize = 50;
    
    // Set up periodic flush
    setInterval(() => this.flush(), this.flushInterval);
  }
  
  async write(logEntry) {
    this.buffer.push(logEntry);
    
    // Flush immediately for errors
    if (logEntry.level === 'ERROR') {
      await this.flush();
    } else if (this.buffer.length >= this.maxBufferSize) {
      await this.flush();
    }
  }
  
  async flush() {
    if (this.buffer.length === 0) return;
    
    const logsToSend = [...this.buffer];
    this.buffer = [];
    
    try {
      const response = await fetch(settings.getApiUrl('logs'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ logs: logsToSend })
      });
      
      if (!response.ok) {
        // Put logs back if failed
        this.buffer.unshift(...logsToSend);
      }
    } catch (error) {
      // Put logs back if failed
      this.buffer.unshift(...logsToSend);
      console.warn('Failed to send logs to server:', error);
    }
  }
  
  getAuthToken() {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
  }
}

/**
 * Local Storage Output - stores logs in localStorage for debugging
 */
class LocalStorageOutput {
  async write(logEntry) {
    try {
      const logs = JSON.parse(localStorage.getItem('rss_debug_logs') || '[]');
      logs.push(logEntry);
      
      // Keep only last 200 logs
      if (logs.length > 200) {
        logs.splice(0, logs.length - 200);
      }
      
      localStorage.setItem('rss_debug_logs', JSON.stringify(logs));
    } catch (error) {
      // Handle storage quota exceeded
      console.warn('Failed to write to localStorage:', error);
    }
  }
}

/**
 * Security Filter - masks sensitive data
 */
class SecurityFilter {
  process(logEntry) {
    // Mask sensitive fields in meta data
    if (logEntry.meta) {
      logEntry.meta = this.maskSensitiveData(logEntry.meta);
    }
    
    // Check for sensitive data in message
    logEntry.message = this.maskSensitiveMessage(logEntry.message);
    
    return logEntry;
  }
  
  maskSensitiveData(data) {
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'ssn', 'credit_card'];
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
  
  maskSensitiveMessage(message) {
    // Basic patterns to mask in log messages
    const patterns = [
      { regex: /password[=:]\s*['"]?([^'"\s]+)['"]?/gi, replacement: 'password=***' },
      { regex: /token[=:]\s*['"]?([^'"\s]+)['"]?/gi, replacement: 'token=***' },
      { regex: /key[=:]\s*['"]?([^'"\s]+)['"]?/gi, replacement: 'key=***' }
    ];
    
    let maskedMessage = message;
    patterns.forEach(pattern => {
      maskedMessage = maskedMessage.replace(pattern.regex, pattern.replacement);
    });
    
    return maskedMessage;
  }
}

/**
 * Performance Filter - tracks slow operations
 */
class PerformanceFilter {
  process(logEntry) {
    // Check for performance issues
    if (logEntry.meta.duration) {
      const duration = parseFloat(logEntry.meta.duration);
      
      if (duration > 1000) { // > 1 second
        logEntry.meta.performanceFlag = 'slow';
        logEntry.meta.severity = 'warning';
      } else if (duration > 5000) { // > 5 seconds
        logEntry.meta.performanceFlag = 'very_slow';
        logEntry.meta.severity = 'error';
      }
    }
    
    return logEntry;
  }
}

/**
 * Rate Limit Filter - prevents log spam
 */
class RateLimitFilter {
  constructor() {
    this.messageCount = new Map();
    this.timeWindow = 60000; // 1 minute
    this.maxMessages = 10;
  }
  
  process(logEntry) {
    const key = `${logEntry.level}:${logEntry.message.substring(0, 100)}`;
    const now = Date.now();
    
    // Clean old entries
    for (const [msgKey, data] of this.messageCount.entries()) {
      if (now - data.firstSeen > this.timeWindow) {
        this.messageCount.delete(msgKey);
      }
    }
    
    // Check rate limit
    const messageData = this.messageCount.get(key);
    if (messageData) {
      messageData.count++;
      
      if (messageData.count > this.maxMessages) {
        // Rate limited - modify message
        if (messageData.count === this.maxMessages + 1) {
          logEntry.message = `[RATE LIMITED] ${logEntry.message} (further occurrences suppressed)`;
          logEntry.meta.rateLimited = true;
          return logEntry;
        } else {
          // Suppress this log
          return null;
        }
      }
    } else {
      this.messageCount.set(key, {
        count: 1,
        firstSeen: now
      });
    }
    
    return logEntry;
  }
}

// Create singleton instance
const logger = new Logger();

// Export convenience functions and logger instance
export const log = {
  error: (message, meta) => logger.error(message, meta),
  warn: (message, meta) => logger.warn(message, meta),
  info: (message, meta) => logger.info(message, meta),
  debug: (message, meta) => logger.debug(message, meta),
  trace: (message, meta) => logger.trace(message, meta),
  time: (label) => logger.time(label),
  exception: (error, message, meta) => logger.exception(error, message, meta),
  getRecentLogs: (count) => logger.getRecentLogs(count),
  clearLogs: () => logger.clearLogs()
};

export default logger;