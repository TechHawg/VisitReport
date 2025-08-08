/**
 * RSS Visit Report - Comprehensive Audit Logging Service
 * Provides enterprise-grade audit logging with SQL Server backend
 */

import { settings } from '../utils/settings.js';
import authMiddleware from '../middleware/authMiddleware.js';

class AuditService {
  constructor() {
    this.apiUrl = settings.getApiUrl('audit');
    this.isEnabled = settings.get('security.auditLogging', true);
    this.batchSize = settings.get('audit.batchSize', 50);
    this.flushInterval = settings.get('audit.flushInterval', 30000); // 30 seconds
    this.logQueue = [];
    this.flushTimer = null;
    
    this.init();
  }

  /**
   * Initialize audit service
   */
  init() {
    if (this.isEnabled) {
      this.setupPeriodicFlush();
      this.setupEventListeners();
    }
  }

  /**
   * Log authentication events
   * @param {string} eventType - Event type (login, logout, session_expired, etc.)
   * @param {Object} details - Event details
   */
  async logAuthEvent(eventType, details = {}) {
    return await this.logEvent({
      eventType,
      eventCategory: 'authentication',
      severity: this.getAuthEventSeverity(eventType),
      details,
      resourceType: 'session'
    });
  }

  /**
   * Log data access events
   * @param {string} action - Action performed (view, create, edit, delete)
   * @param {string} resourceType - Type of resource (report, user, organization)
   * @param {string} resourceId - Resource identifier
   * @param {Object} details - Additional details
   */
  async logDataAccess(action, resourceType, resourceId, details = {}) {
    return await this.logEvent({
      eventType: `data_${action}`,
      eventCategory: 'data_access',
      resourceType,
      resourceId,
      severity: this.getDataAccessSeverity(action),
      details
    });
  }

  /**
   * Log security events
   * @param {string} eventType - Event type (unauthorized_access, permission_denied, etc.)
   * @param {Object} details - Event details
   */
  async logSecurityEvent(eventType, details = {}) {
    return await this.logEvent({
      eventType,
      eventCategory: 'security',
      severity: 'high',
      details,
      resourceType: 'security'
    });
  }

  /**
   * Log system events
   * @param {string} eventType - Event type (system_start, configuration_change, etc.)
   * @param {Object} details - Event details
   */
  async logSystemEvent(eventType, details = {}) {
    return await this.logEvent({
      eventType,
      eventCategory: 'system',
      severity: this.getSystemEventSeverity(eventType),
      details
    });
  }

  /**
   * Log user actions
   * @param {string} action - User action
   * @param {Object} details - Action details
   */
  async logUserAction(action, details = {}) {
    return await this.logEvent({
      eventType: `user_${action}`,
      eventCategory: 'user_activity',
      severity: 'info',
      details
    });
  }

  /**
   * Log report operations
   * @param {string} action - Report action (create, edit, submit, export, etc.)
   * @param {string} reportId - Report identifier
   * @param {Object} details - Action details
   */
  async logReportOperation(action, reportId, details = {}) {
    return await this.logEvent({
      eventType: `report_${action}`,
      eventCategory: 'data_access',
      resourceType: 'report',
      resourceId: reportId,
      severity: this.getReportEventSeverity(action),
      details
    });
  }

  /**
   * Log general event
   * @param {Object} eventData - Event data
   */
  async logEvent(eventData) {
    if (!this.isEnabled) {
      return;
    }

    try {
      const currentUser = authMiddleware.getCurrentUser();
      const timestamp = new Date().toISOString();

      const auditEntry = {
        timestamp,
        eventType: eventData.eventType,
        eventCategory: eventData.eventCategory,
        severity: eventData.severity || 'info',
        userId: currentUser?.id || null,
        username: currentUser?.username || 'anonymous',
        sessionId: authMiddleware.getSessionId?.() || null,
        resourceType: eventData.resourceType || null,
        resourceId: eventData.resourceId || null,
        oldValues: eventData.oldValues || null,
        newValues: eventData.newValues || null,
        ipAddress: this.getClientIP(),
        userAgent: navigator.userAgent,
        message: eventData.message || this.generateMessage(eventData),
        details: eventData.details || {},
        metadata: {
          ...eventData.metadata,
          url: window.location.href,
          referrer: document.referrer,
          timestamp: Date.now()
        }
      };

      // Add to queue for batch processing
      this.logQueue.push(auditEntry);

      // If queue is full, flush immediately
      if (this.logQueue.length >= this.batchSize) {
        await this.flushLogs();
      }

      // For high-severity events, flush immediately
      if (eventData.severity === 'critical' || eventData.severity === 'high') {
        await this.flushLogs();
      }

      return auditEntry;

    } catch (error) {
      console.warn('Audit logging failed:', error);
      // Don't throw error to avoid disrupting application flow
    }
  }

  /**
   * Flush queued logs to server
   */
  async flushLogs() {
    if (this.logQueue.length === 0) {
      return;
    }

    const logsToFlush = [...this.logQueue];
    this.logQueue = [];

    try {
      const token = authMiddleware.getToken();
      const response = await fetch(`${this.apiUrl}/batch-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          logs: logsToFlush,
          batchId: this.generateBatchId(),
          clientTimestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Audit log flush failed: ${response.status}`);
      }

    } catch (error) {
      console.warn('Failed to flush audit logs:', error);
      
      // Put logs back in queue to retry later
      this.logQueue.unshift(...logsToFlush);
      
      // Limit queue size to prevent memory issues
      if (this.logQueue.length > this.batchSize * 5) {
        this.logQueue = this.logQueue.slice(-this.batchSize * 3);
      }
    }
  }

  /**
   * Setup periodic log flushing
   */
  setupPeriodicFlush() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(async () => {
      await this.flushLogs();
    }, this.flushInterval);
  }

  /**
   * Setup event listeners for automatic logging
   */
  setupEventListeners() {
    // Log page navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      this.logUserAction('page_navigation', { 
        url: args[2], 
        method: 'pushState' 
      });
      return originalPushState.apply(history, args);
    }.bind(this);

    history.replaceState = function(...args) {
      this.logUserAction('page_navigation', { 
        url: args[2], 
        method: 'replaceState' 
      });
      return originalReplaceState.apply(history, args);
    }.bind(this);

    // Log window unload for session tracking
    window.addEventListener('beforeunload', () => {
      this.flushLogs(); // Synchronous flush on exit
    });

    // Log focus/blur for session activity
    document.addEventListener('visibilitychange', () => {
      this.logUserAction('visibility_change', {
        hidden: document.hidden,
        visibilityState: document.visibilityState
      });
    });

    // Log authentication events
    window.addEventListener('auth:login', (event) => {
      this.logAuthEvent('login_success', event.detail);
    });

    window.addEventListener('auth:logout', () => {
      this.logAuthEvent('logout');
    });

    window.addEventListener('auth:session-expired', () => {
      this.logAuthEvent('session_expired');
    });
  }

  /**
   * Generate message from event data
   * @param {Object} eventData - Event data
   */
  generateMessage(eventData) {
    const { eventType, resourceType, resourceId, eventCategory } = eventData;

    switch (eventCategory) {
      case 'authentication':
        return `Authentication event: ${eventType}`;
      
      case 'data_access':
        return `Data access: ${eventType} ${resourceType}${resourceId ? ` (${resourceId})` : ''}`;
      
      case 'security':
        return `Security event: ${eventType}`;
      
      case 'system':
        return `System event: ${eventType}`;
      
      case 'user_activity':
        return `User activity: ${eventType}`;
      
      default:
        return `Event: ${eventType}`;
    }
  }

  /**
   * Get severity for authentication events
   * @param {string} eventType - Event type
   */
  getAuthEventSeverity(eventType) {
    const severityMap = {
      'login_success': 'info',
      'login_failed': 'medium',
      'logout': 'info',
      'session_expired': 'low',
      'password_change': 'medium',
      'unauthorized_access': 'high',
      'account_locked': 'high'
    };
    
    return severityMap[eventType] || 'info';
  }

  /**
   * Get severity for data access events
   * @param {string} action - Action type
   */
  getDataAccessSeverity(action) {
    const severityMap = {
      'view': 'low',
      'create': 'info',
      'edit': 'info',
      'delete': 'medium',
      'export': 'medium',
      'import': 'medium'
    };
    
    return severityMap[action] || 'info';
  }

  /**
   * Get severity for system events
   * @param {string} eventType - Event type
   */
  getSystemEventSeverity(eventType) {
    const severityMap = {
      'system_start': 'info',
      'system_stop': 'info',
      'configuration_change': 'medium',
      'error': 'high',
      'database_error': 'critical'
    };
    
    return severityMap[eventType] || 'info';
  }

  /**
   * Get severity for report events
   * @param {string} action - Action type
   */
  getReportEventSeverity(action) {
    const severityMap = {
      'create': 'info',
      'edit': 'info',
      'submit': 'medium',
      'approve': 'medium',
      'reject': 'medium',
      'export': 'medium',
      'delete': 'high',
      'share': 'medium'
    };
    
    return severityMap[action] || 'info';
  }

  /**
   * Get client IP address (best effort)
   */
  getClientIP() {
    // This is limited in browsers, server-side detection is more reliable
    return 'client-side-unknown';
  }

  /**
   * Generate unique batch ID
   */
  generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current session ID
   */
  getSessionId() {
    return authMiddleware.getCurrentUser()?.sessionId || null;
  }

  /**
   * Create audit trail for data changes
   * @param {string} action - Action performed
   * @param {string} resourceType - Resource type
   * @param {string} resourceId - Resource ID
   * @param {Object} oldData - Previous data state
   * @param {Object} newData - New data state
   */
  async createAuditTrail(action, resourceType, resourceId, oldData = null, newData = null) {
    return await this.logEvent({
      eventType: `${resourceType}_${action}`,
      eventCategory: 'data_access',
      resourceType,
      resourceId,
      oldValues: oldData ? JSON.stringify(oldData) : null,
      newValues: newData ? JSON.stringify(newData) : null,
      severity: this.getDataAccessSeverity(action)
    });
  }

  /**
   * Search audit logs (requires server API)
   * @param {Object} criteria - Search criteria
   */
  async searchAuditLogs(criteria) {
    try {
      const token = authMiddleware.getToken();
      const response = await fetch(`${this.apiUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(criteria)
      });

      if (response.ok) {
        return await response.json();
      }

      throw new Error(`Audit search failed: ${response.status}`);

    } catch (error) {
      console.error('Audit log search failed:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(timeRange = '24h') {
    try {
      const token = authMiddleware.getToken();
      const response = await fetch(`${this.apiUrl}/stats?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        return await response.json();
      }

      throw new Error(`Audit stats failed: ${response.status}`);

    } catch (error) {
      console.error('Audit stats failed:', error);
      throw error;
    }
  }

  /**
   * Destroy audit service
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining logs
    this.flushLogs();
    
    this.logQueue = [];
  }
}

// Create singleton instance
const auditService = new AuditService();

// Export convenience methods
export const audit = {
  logAuthEvent: (eventType, details) => auditService.logAuthEvent(eventType, details),
  logDataAccess: (action, resourceType, resourceId, details) => 
    auditService.logDataAccess(action, resourceType, resourceId, details),
  logSecurityEvent: (eventType, details) => auditService.logSecurityEvent(eventType, details),
  logSystemEvent: (eventType, details) => auditService.logSystemEvent(eventType, details),
  logUserAction: (action, details) => auditService.logUserAction(action, details),
  logReportOperation: (action, reportId, details) => 
    auditService.logReportOperation(action, reportId, details),
  createAuditTrail: (action, resourceType, resourceId, oldData, newData) =>
    auditService.createAuditTrail(action, resourceType, resourceId, oldData, newData),
  searchLogs: (criteria) => auditService.searchAuditLogs(criteria),
  getStats: (timeRange) => auditService.getAuditStats(timeRange)
};

export default auditService;