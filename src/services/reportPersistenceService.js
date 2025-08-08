/**
 * RSS Visit Report - Report Persistence Service
 * Handles report saving, loading, and management with SQL Server backend
 */

import { settings } from '../utils/settings.js';
import authMiddleware from '../middleware/authMiddleware.js';
import auditService from './auditService.js';

class ReportPersistenceService {
  constructor() {
    this.apiUrl = settings.getApiUrl('reports');
    this.cacheTimeout = settings.get('reports.cacheTimeout', 300000); // 5 minutes
    this.autoSaveInterval = settings.get('reports.autoSaveInterval', 60000); // 1 minute
    this.reportCache = new Map();
    this.autoSaveTimer = null;
    this.pendingChanges = new Set();
    
    this.init();
  }

  /**
   * Initialize report persistence service
   */
  init() {
    this.setupAutoSave();
    this.setupEventListeners();
  }

  /**
   * Save report to server
   * @param {Object} reportData - Report data to save
   * @param {Object} options - Save options
   */
  async saveReport(reportData, options = {}) {
    try {
      const currentUser = authMiddleware.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const {
        title = this.generateReportTitle(reportData),
        description = '',
        status = 'draft',
        isTemplate = false,
        tags = [],
        reportId = null
      } = options;

      const payload = {
        title,
        description,
        reportType: 'visit',
        status,
        reportData: JSON.stringify(reportData),
        locationData: this.extractLocationData(reportData),
        isTemplate,
        tags,
        metadata: {
          lastModified: new Date().toISOString(),
          version: reportId ? await this.getNextVersion(reportId) : 1,
          autoSaved: options.autoSave || false
        }
      };

      let response;
      if (reportId) {
        // Update existing report
        response = await this.updateExistingReport(reportId, payload);
      } else {
        // Create new report
        response = await this.createNewReport(payload);
      }

      if (response.success) {
        // Update cache
        this.updateCache(response.reportId, {
          ...payload,
          id: response.reportId,
          userId: currentUser.id,
          createdAt: response.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // Remove from pending changes
        this.pendingChanges.delete(reportId || 'new');

        // Log the save operation
        await auditService.logReportOperation(
          reportId ? 'edit' : 'create',
          response.reportId,
          {
            title,
            status,
            autoSave: options.autoSave || false,
            size: JSON.stringify(reportData).length
          }
        );

        return {
          success: true,
          reportId: response.reportId,
          message: reportId ? 'Report updated successfully' : 'Report saved successfully'
        };
      }

      throw new Error(response.message || 'Save failed');

    } catch (error) {
      console.error('Report save failed:', error);
      
      // Log the failure
      await auditService.logReportOperation('save_failed', reportId || 'new', {
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Load report from server
   * @param {string} reportId - Report ID to load
   */
  async loadReport(reportId) {
    try {
      // Check cache first
      const cachedReport = this.reportCache.get(reportId);
      if (cachedReport && this.isCacheValid(cachedReport)) {
        await auditService.logReportOperation('view', reportId, { source: 'cache' });
        return {
          success: true,
          report: cachedReport.data
        };
      }

      // Fetch from server
      const token = authMiddleware.getToken();
      const response = await fetch(`${this.apiUrl}/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load report: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Parse JSON data
        const reportData = typeof result.report.reportData === 'string' 
          ? JSON.parse(result.report.reportData)
          : result.report.reportData;

        const fullReport = {
          ...result.report,
          reportData
        };

        // Update cache
        this.updateCache(reportId, fullReport);

        // Log access
        await auditService.logReportOperation('view', reportId, {
          source: 'server',
          title: result.report.title
        });

        return {
          success: true,
          report: fullReport
        };
      }

      throw new Error(result.message || 'Load failed');

    } catch (error) {
      console.error('Report load failed:', error);
      throw error;
    }
  }

  /**
   * List user's reports
   * @param {Object} filters - Filter options
   */
  async listReports(filters = {}) {
    try {
      const token = authMiddleware.getToken();
      const queryParams = new URLSearchParams({
        status: filters.status || 'all',
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        sortBy: filters.sortBy || 'updatedAt',
        sortOrder: filters.sortOrder || 'desc',
        ...(filters.search && { search: filters.search }),
        ...(filters.tags && { tags: filters.tags.join(',') }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
      });

      const response = await fetch(`${this.apiUrl}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list reports: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Log the list operation
        await auditService.logReportOperation('list', null, {
          count: result.reports?.length || 0,
          filters
        });

        return {
          success: true,
          reports: result.reports || [],
          total: result.total || 0,
          hasMore: result.hasMore || false
        };
      }

      throw new Error(result.message || 'List failed');

    } catch (error) {
      console.error('Report list failed:', error);
      throw error;
    }
  }

  /**
   * Delete report
   * @param {string} reportId - Report ID to delete
   */
  async deleteReport(reportId) {
    try {
      const token = authMiddleware.getToken();
      const response = await fetch(`${this.apiUrl}/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete report: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Remove from cache
        this.reportCache.delete(reportId);
        this.pendingChanges.delete(reportId);

        // Log deletion
        await auditService.logReportOperation('delete', reportId);

        return {
          success: true,
          message: 'Report deleted successfully'
        };
      }

      throw new Error(result.message || 'Delete failed');

    } catch (error) {
      console.error('Report delete failed:', error);
      throw error;
    }
  }

  /**
   * Share report with other users
   * @param {string} reportId - Report ID to share
   * @param {Object} shareOptions - Sharing options
   */
  async shareReport(reportId, shareOptions) {
    try {
      const token = authMiddleware.getToken();
      const response = await fetch(`${this.apiUrl}/${reportId}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shareOptions)
      });

      if (!response.ok) {
        throw new Error(`Failed to share report: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Log sharing
        await auditService.logReportOperation('share', reportId, shareOptions);

        return {
          success: true,
          message: 'Report shared successfully'
        };
      }

      throw new Error(result.message || 'Share failed');

    } catch (error) {
      console.error('Report share failed:', error);
      throw error;
    }
  }

  /**
   * Export report to PDF
   * @param {string} reportId - Report ID to export
   * @param {Object} exportOptions - Export options
   */
  async exportReport(reportId, exportOptions = {}) {
    try {
      const token = authMiddleware.getToken();
      const response = await fetch(`${this.apiUrl}/${reportId}/export`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: exportOptions.format || 'pdf',
          includePhotos: exportOptions.includePhotos !== false,
          includeChecklists: exportOptions.includeChecklists !== false,
          template: exportOptions.template || 'default'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to export report: ${response.status}`);
      }

      // Handle file download
      const blob = await response.blob();
      const filename = exportOptions.filename || `report-${reportId}-${Date.now()}.pdf`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);

      // Log export
      await auditService.logReportOperation('export', reportId, {
        format: exportOptions.format || 'pdf',
        filename
      });

      return {
        success: true,
        message: 'Report exported successfully'
      };

    } catch (error) {
      console.error('Report export failed:', error);
      throw error;
    }
  }

  /**
   * Create new report
   * @param {Object} payload - Report payload
   */
  async createNewReport(payload) {
    const token = authMiddleware.getToken();
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to create report: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Update existing report
   * @param {string} reportId - Report ID
   * @param {Object} payload - Report payload
   */
  async updateExistingReport(reportId, payload) {
    const token = authMiddleware.getToken();
    const response = await fetch(`${this.apiUrl}/${reportId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to update report: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get next version number for report
   * @param {string} reportId - Report ID
   */
  async getNextVersion(reportId) {
    try {
      const report = await this.loadReport(reportId);
      return (report.report?.metadata?.version || 1) + 1;
    } catch (error) {
      return 1;
    }
  }

  /**
   * Generate report title from data
   * @param {Object} reportData - Report data
   */
  generateReportTitle(reportData) {
    const office = reportData.office || 'Unknown Office';
    const date = reportData.date || new Date().toISOString().split('T')[0];
    return `${office} - Visit Report - ${date}`;
  }

  /**
   * Extract location data from report
   * @param {Object} reportData - Report data
   */
  extractLocationData(reportData) {
    return {
      office: reportData.office,
      dataCloset: reportData.dataCloset,
      rackLocations: reportData.dataCloset?.rackLocations || [],
      deviceLocations: reportData.dataCloset?.deviceLocations || []
    };
  }

  /**
   * Update cache with report data
   * @param {string} reportId - Report ID
   * @param {Object} data - Report data
   */
  updateCache(reportId, data) {
    this.reportCache.set(reportId, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Check if cached data is still valid
   * @param {Object} cachedItem - Cached item
   */
  isCacheValid(cachedItem) {
    return Date.now() - cachedItem.timestamp < this.cacheTimeout;
  }

  /**
   * Setup auto-save functionality
   */
  setupAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(async () => {
      await this.performAutoSave();
    }, this.autoSaveInterval);
  }

  /**
   * Perform auto-save for pending changes
   */
  async performAutoSave() {
    if (this.pendingChanges.size === 0) {
      return;
    }

    try {
      // Get current report data from context
      const reportData = this.getCurrentReportData();
      if (!reportData) {
        return;
      }

      // Check if there are actual changes worth saving
      if (this.shouldAutoSave(reportData)) {
        await this.saveReport(reportData, {
          autoSave: true,
          status: 'draft'
        });

        await auditService.logUserAction('auto_save', {
          pendingChanges: this.pendingChanges.size
        });
      }

    } catch (error) {
      console.warn('Auto-save failed:', error);
    }
  }

  /**
   * Check if report should be auto-saved
   * @param {Object} reportData - Report data
   */
  shouldAutoSave(reportData) {
    // Check if report has meaningful content
    const hasContent = reportData.office || 
                      reportData.summary?.summaryText ||
                      reportData.issues?.length > 0 ||
                      reportData.recommendations?.length > 0;

    return hasContent;
  }

  /**
   * Get current report data from application context
   * This would need to be connected to the actual app context
   */
  getCurrentReportData() {
    // This would typically come from the application context
    // For now, return null as this needs integration
    return null;
  }

  /**
   * Mark report as having pending changes
   * @param {string} reportId - Report ID
   */
  markPendingChanges(reportId = 'current') {
    this.pendingChanges.add(reportId);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for authentication changes
    window.addEventListener('auth:logout', () => {
      this.clearCache();
      this.clearPendingChanges();
    });

    // Listen for before unload to save pending changes
    window.addEventListener('beforeunload', (event) => {
      if (this.pendingChanges.size > 0) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    });
  }

  /**
   * Clear all cached reports
   */
  clearCache() {
    this.reportCache.clear();
  }

  /**
   * Clear pending changes
   */
  clearPendingChanges() {
    this.pendingChanges.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.reportCache.size,
      pendingChanges: this.pendingChanges.size,
      cacheTimeout: this.cacheTimeout,
      autoSaveInterval: this.autoSaveInterval
    };
  }

  /**
   * Destroy service
   */
  destroy() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    this.clearCache();
    this.clearPendingChanges();
  }
}

// Create singleton instance
const reportPersistenceService = new ReportPersistenceService();

export default reportPersistenceService;