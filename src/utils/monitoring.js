/**
 * RSS Visit Report - Monitoring and Logging System
 * Comprehensive monitoring for performance, errors, and user activity
 */

import { settings } from './settings.js';
import { memory } from './memoryManager.js';

class MonitoringService {
  constructor() {
    this.metrics = new Map();
    this.logBuffer = [];
    this.performanceEntries = [];
    this.errorCount = 0;
    this.sessionStartTime = Date.now();
    // Disable monitoring in development to prevent server crashes
    this.isEnabled = settings.get('security.performanceMonitoring', !import.meta.env.DEV);
    
    if (this.isEnabled) {
      this.init();
    }
  }
  
  /**
   * Initialize monitoring service
   */
  init() {
    // Set up performance monitoring
    this.setupPerformanceMonitoring();
    
    // Set up error monitoring
    this.setupErrorMonitoring();
    
    // Set up user activity monitoring
    this.setupActivityMonitoring();
    
    // Set up network monitoring
    this.setupNetworkMonitoring();
    
    // Set up periodic reporting
    this.setupPeriodicReporting();
    
    // Log initialization
    this.logEvent('monitoring_initialized', {
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId()
    });
  }
  
  /**
   * Set up performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor page load performance
    if (typeof window !== 'undefined' && window.performance) {
      // Wait for page load to complete
      window.addEventListener('load', () => {
        setTimeout(() => {
          this.collectPageLoadMetrics();
        }, 100);
      });
      
      // Monitor navigation timing
      if (window.performance.getEntriesByType) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.collectPerformanceEntry(entry);
          }
        });
        
        // Observe different types of performance entries
        try {
          observer.observe({ entryTypes: ['navigation', 'resource', 'measure', 'mark'] });
        } catch (error) {
          console.warn('PerformanceObserver not fully supported:', error);
        }
      }
    }
    
    // Monitor React render performance
    this.setupReactPerformanceMonitoring();
  }
  
  /**
   * Set up React performance monitoring
   */
  setupReactPerformanceMonitoring() {
    // Monitor React component renders (if React DevTools is available)
    if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      // This is a simplified version - in production, you'd use React Profiler
      const originalRender = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot;
      if (originalRender) {
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = (id, root, ...args) => {
          const startTime = performance.now();
          const result = originalRender.call(this, id, root, ...args);
          const duration = performance.now() - startTime;
          
          if (duration > 16) { // Flag slow renders (> 16ms)
            this.logPerformanceIssue('slow_react_render', {
              componentId: id,
              duration: duration.toFixed(2),
              threshold: 16
            });
          }
          
          return result;
        };
      }
    }
  }
  
  /**
   * Set up error monitoring
   */
  setupErrorMonitoring() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      });
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'unhandled_promise_rejection',
        reason: event.reason,
        timestamp: new Date().toISOString()
      });
    });
    
    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.logError({
          type: 'resource_error',
          element: event.target.tagName,
          source: event.target.src || event.target.href,
          timestamp: new Date().toISOString()
        });
      }
    }, true);
  }
  
  /**
   * Set up user activity monitoring
   */
  setupActivityMonitoring() {
    const activityEvents = ['click', 'keydown', 'scroll', 'mousemove'];
    const throttledActivityLog = this.throttle(() => {
      this.updateMetric('user_activity', {
        lastActivity: Date.now(),
        sessionDuration: Date.now() - this.sessionStartTime
      });
    }, 30000); // Throttle to once per 30 seconds
    
    activityEvents.forEach(eventType => {
      document.addEventListener(eventType, throttledActivityLog, { passive: true });
    });
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.logEvent('page_visibility_change', {
        hidden: document.hidden,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  /**
   * Set up network monitoring
   */
  setupNetworkMonitoring() {
    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];
      
      try {
        const response = await originalFetch.apply(this, args);
        const duration = performance.now() - startTime;
        
        this.logNetworkRequest({
          url: typeof url === 'string' ? url : url.url,
          method: args[1]?.method || 'GET',
          status: response.status,
          duration: duration.toFixed(2),
          success: response.ok,
          timestamp: new Date().toISOString()
        });
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        this.logNetworkRequest({
          url: typeof url === 'string' ? url : url.url,
          method: args[1]?.method || 'GET',
          error: error.message,
          duration: duration.toFixed(2),
          success: false,
          timestamp: new Date().toISOString()
        });
        
        throw error;
      }
    };
  }
  
  /**
   * Set up periodic reporting
   */
  setupPeriodicReporting() {
    // Send metrics every 5 minutes
    setInterval(() => {
      this.sendMetricsToServer();
    }, 5 * 60 * 1000);
    
    // Send logs every 2 minutes
    setInterval(() => {
      this.flushLogs();
    }, 2 * 60 * 1000);
    
    // Clean up old data every 10 minutes
    setInterval(() => {
      this.cleanupOldData();
    }, 10 * 60 * 1000);
  }
  
  /**
   * Collect page load metrics
   */
  collectPageLoadMetrics() {
    if (!window.performance || !window.performance.timing) return;
    
    const timing = window.performance.timing;
    const navigation = window.performance.navigation;
    
    const metrics = {
      pageLoadTime: timing.loadEventEnd - timing.navigationStart,
      domContentLoadedTime: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstPaintTime: this.getFirstPaintTime(),
      navigationType: navigation.type,
      redirectCount: navigation.redirectCount,
      timestamp: new Date().toISOString()
    };
    
    this.updateMetric('page_load', metrics);
    
    // Flag slow page loads
    if (metrics.pageLoadTime > 3000) {
      this.logPerformanceIssue('slow_page_load', metrics);
    }
  }
  
  /**
   * Get first paint time
   */
  getFirstPaintTime() {
    if (!window.performance || !window.performance.getEntriesByType) return null;
    
    const paintEntries = window.performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : null;
  }
  
  /**
   * Collect performance entry
   */
  collectPerformanceEntry(entry) {
    this.performanceEntries.push({
      name: entry.name,
      entryType: entry.entryType,
      startTime: entry.startTime,
      duration: entry.duration,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 entries
    if (this.performanceEntries.length > 100) {
      this.performanceEntries.splice(0, this.performanceEntries.length - 100);
    }
    
    // Flag slow resources
    if (entry.entryType === 'resource' && entry.duration > 1000) {
      this.logPerformanceIssue('slow_resource', {
        name: entry.name,
        duration: entry.duration,
        entryType: entry.entryType
      });
    }
  }
  
  /**
   * Log error
   */
  logError(error) {
    this.errorCount++;
    
    const errorEntry = {
      ...error,
      errorId: this.generateId(),
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.logEvent('error', errorEntry);
    
    // Store in memory for immediate access
    const errors = memory.cacheGet('recent_errors') || [];
    errors.push(errorEntry);
    
    // Keep only last 20 errors
    if (errors.length > 20) {
      errors.splice(0, errors.length - 20);
    }
    
    memory.cacheSet('recent_errors', errors, 30 * 60 * 1000); // 30 minutes
  }
  
  /**
   * Log performance issue
   */
  logPerformanceIssue(type, details) {
    this.logEvent('performance_issue', {
      type,
      details,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId()
    });
  }
  
  /**
   * Log network request
   */
  logNetworkRequest(request) {
    this.logEvent('network_request', request);
    
    // Update network metrics
    const networkMetrics = this.getMetric('network_metrics') || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    };
    
    networkMetrics.totalRequests++;
    networkMetrics.totalResponseTime += parseFloat(request.duration);
    networkMetrics.averageResponseTime = networkMetrics.totalResponseTime / networkMetrics.totalRequests;
    
    if (request.success) {
      networkMetrics.successfulRequests++;
    } else {
      networkMetrics.failedRequests++;
    }
    
    this.updateMetric('network_metrics', networkMetrics);
  }
  
  /**
   * Log event
   */
  logEvent(eventType, data) {
    if (!this.isEnabled) return;
    
    const logEntry = {
      id: this.generateId(),
      eventType,
      data,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId()
    };
    
    this.logBuffer.push(logEntry);
    
    // Flush immediately for critical events
    const criticalEvents = ['error', 'security_violation', 'performance_issue'];
    if (criticalEvents.includes(eventType)) {
      this.flushLogs();
    }
    
    // Limit buffer size
    if (this.logBuffer.length > 200) {
      this.logBuffer.splice(0, this.logBuffer.length - 200);
    }
  }
  
  /**
   * Update metric
   */
  updateMetric(key, value) {
    this.metrics.set(key, {
      value,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Get metric
   */
  getMetric(key) {
    const metric = this.metrics.get(key);
    return metric ? metric.value : null;
  }
  
  /**
   * Get all metrics
   */
  getAllMetrics() {
    const allMetrics = {};
    for (const [key, metric] of this.metrics.entries()) {
      allMetrics[key] = metric;
    }
    return allMetrics;
  }
  
  /**
   * Get session summary
   */
  getSessionSummary() {
    const now = Date.now();
    return {
      sessionId: this.getSessionId(),
      sessionDuration: now - this.sessionStartTime,
      errorCount: this.errorCount,
      logEntries: this.logBuffer.length,
      performanceEntries: this.performanceEntries.length,
      metrics: this.getAllMetrics(),
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Send metrics to server
   */
  async sendMetricsToServer() {
    if (!this.isEnabled || this.logBuffer.length === 0) return;
    
    try {
      const sessionSummary = this.getSessionSummary();
      
      const response = await fetch(settings.getApiUrl('monitoring/metrics'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(sessionSummary)
      });
      
      if (response.ok) {
        // Clear sent metrics
        this.metrics.clear();
        if (settings.isDebugMode()) {
          console.log('Metrics sent successfully');
        }
      }
    } catch (error) {
      console.warn('Failed to send metrics:', error);
    }
  }
  
  /**
   * Flush logs to server
   */
  async flushLogs() {
    if (!this.isEnabled || this.logBuffer.length === 0) return;
    
    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];
    
    try {
      const response = await fetch(settings.getApiUrl('monitoring/logs'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ logs: logsToSend })
      });
      
      if (!response.ok) {
        // If failed, put logs back
        this.logBuffer.unshift(...logsToSend);
      }
    } catch (error) {
      // If failed, put logs back
      this.logBuffer.unshift(...logsToSend);
      console.warn('Failed to send logs:', error);
    }
  }
  
  /**
   * Clean up old data
   */
  cleanupOldData() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    // Clean performance entries
    this.performanceEntries = this.performanceEntries.filter(
      entry => new Date(entry.timestamp).getTime() > cutoffTime
    );
    
    // Clean old cached data
    memory.forceCleanup();
  }
  
  /**
   * Get session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('monitoring_session_id');
    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem('monitoring_session_id', sessionId);
    }
    return sessionId;
  }
  
  /**
   * Get auth token
   */
  getAuthToken() {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
  }
  
  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * Throttle function calls
   */
  throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function() {
      const context = this;
      const args = arguments;
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(function() {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }
  
  /**
   * Start custom performance measurement
   */
  startMeasurement(name) {
    if (window.performance && window.performance.mark) {
      window.performance.mark(name + '_start');
    }
    return Date.now();
  }
  
  /**
   * End custom performance measurement
   */
  endMeasurement(name, startTime) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (window.performance && window.performance.measure) {
      try {
        window.performance.measure(name, name + '_start');
      } catch (error) {
        // Mark might not exist, ignore
      }
    }
    
    this.logEvent('custom_measurement', {
      name,
      duration,
      timestamp: new Date().toISOString()
    });
    
    return duration;
  }
  
  /**
   * Export monitoring data for debugging
   */
  exportData() {
    if (!settings.isDevelopment()) {
      console.warn('Data export only available in development mode');
      return null;
    }
    
    return {
      sessionSummary: this.getSessionSummary(),
      logBuffer: this.logBuffer,
      performanceEntries: this.performanceEntries,
      recentErrors: memory.cacheGet('recent_errors') || []
    };
  }
  
  /**
   * Destroy monitoring service
   */
  destroy() {
    // Send any remaining data
    this.flushLogs();
    this.sendMetricsToServer();
    
    // Clear data
    this.metrics.clear();
    this.logBuffer = [];
    this.performanceEntries = [];
  }
}

// Create singleton instance
const monitoring = new MonitoringService();

// Export convenience functions
export const monitor = {
  logEvent: (eventType, data) => monitoring.logEvent(eventType, data),
  logError: (error) => monitoring.logError(error),
  updateMetric: (key, value) => monitoring.updateMetric(key, value),
  getMetric: (key) => monitoring.getMetric(key),
  startMeasurement: (name) => monitoring.startMeasurement(name),
  endMeasurement: (name, startTime) => monitoring.endMeasurement(name, startTime),
  getSessionSummary: () => monitoring.getSessionSummary(),
  exportData: () => monitoring.exportData()
};

export default monitoring;