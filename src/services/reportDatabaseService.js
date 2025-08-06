/**
 * Database Service for Report Persistence
 * Handles saving, loading, and syncing reports across browsers/devices
 */

import enhancedAuthService from './enhancedAuthService.v2.js';

class ReportDatabaseService {
  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    this.syncInterval = null;
    this.pendingChanges = new Map();
    
    this.init();
  }

  async init() {
    // Setup auto-sync every 30 seconds
    this.setupAutoSync();
    
    // Sync pending changes when coming online
    window.addEventListener('online', () => {
      this.syncPendingChanges();
    });
  }

  /**
   * Save report to database
   */
  async saveReport(reportData, options = {}) {
    try {
      const {
        title = 'Untitled Report',
        description = '',
        reportType = 'visit',
        status = 'draft',
        isTemplate = false,
        tags = []
      } = options;

      const payload = {
        title,
        description,
        report_type: reportType,
        status,
        report_data: reportData,
        is_template: isTemplate,
        tags,
        metadata: {
          browser: navigator.userAgent,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      const response = await enhancedAuthService.apiRequest(
        `${this.apiUrl}/reports`,
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save report');
      }

      const savedReport = await response.json();
      
      // Update local cache
      this.updateLocalCache(savedReport);
      
      return savedReport;

    } catch (error) {
      console.error('Save report error:', error);
      
      // If offline, queue for later sync
      if (!navigator.onLine) {
        return this.saveToLocalQueue(reportData, options);
      }
      
      throw error;
    }
  }

  /**
   * Update existing report
   */
  async updateReport(reportId, reportData, options = {}) {
    try {
      const payload = {
        report_data: reportData,
        metadata: {
          ...options.metadata,
          updated_at: new Date().toISOString(),
          browser: navigator.userAgent
        }
      };

      // Include optional fields if provided
      if (options.title) payload.title = options.title;
      if (options.description) payload.description = options.description;
      if (options.status) payload.status = options.status;
      if (options.tags) payload.tags = options.tags;

      const response = await enhancedAuthService.apiRequest(
        `${this.apiUrl}/reports/${reportId}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update report');
      }

      const updatedReport = await response.json();
      
      // Update local cache
      this.updateLocalCache(updatedReport);
      
      return updatedReport;

    } catch (error) {
      console.error('Update report error:', error);
      
      // If offline, queue for later sync
      if (!navigator.onLine) {
        return this.queueUpdateForSync(reportId, reportData, options);
      }
      
      throw error;
    }
  }

  /**
   * Load report from database
   */
  async loadReport(reportId) {
    try {
      // Try local cache first
      const cachedReport = this.getFromLocalCache(reportId);
      if (cachedReport && navigator.onLine) {
        // Return cached version immediately, sync in background
        this.syncReport(reportId);
        return cachedReport;
      }

      const response = await enhancedAuthService.apiRequest(
        `${this.apiUrl}/reports/${reportId}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Report not found');
        }
        throw new Error('Failed to load report');
      }

      const report = await response.json();
      
      // Update local cache
      this.updateLocalCache(report);
      
      return report;

    } catch (error) {
      console.error('Load report error:', error);
      
      // If offline, try to return cached version
      if (!navigator.onLine) {
        const cachedReport = this.getFromLocalCache(reportId);
        if (cachedReport) {
          return cachedReport;
        }
      }
      
      throw error;
    }
  }

  /**
   * Get list of user's reports
   */
  async getReports(options = {}) {
    try {
      const {
        status = null,
        reportType = null,
        limit = 50,
        offset = 0,
        search = null
      } = options;

      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (reportType) params.append('report_type', reportType);
      if (search) params.append('search', search);
      params.append('limit', limit);
      params.append('offset', offset);

      const response = await enhancedAuthService.apiRequest(
        `${this.apiUrl}/reports?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const reportsData = await response.json();
      
      // Update local cache for each report
      reportsData.reports.forEach(report => {
        this.updateLocalCache(report);
      });
      
      return reportsData;

    } catch (error) {
      console.error('Get reports error:', error);
      
      // If offline, return cached reports
      if (!navigator.onLine) {
        return this.getCachedReports(options);
      }
      
      throw error;
    }
  }

  /**
   * Delete report
   */
  async deleteReport(reportId) {
    try {
      const response = await enhancedAuthService.apiRequest(
        `${this.apiUrl}/reports/${reportId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete report');
      }

      // Remove from local cache
      this.removeFromLocalCache(reportId);
      
      return true;

    } catch (error) {
      console.error('Delete report error:', error);
      
      // If offline, mark for deletion when online
      if (!navigator.onLine) {
        this.queueDeletionForSync(reportId);
        this.removeFromLocalCache(reportId);
        return true;
      }
      
      throw error;
    }
  }

  /**
   * Submit report (change status to submitted)
   */
  async submitReport(reportId, submissionOptions = {}) {
    try {
      const payload = {
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        submission_metadata: {
          ...submissionOptions,
          submitted_from: 'web_app',
          user_agent: navigator.userAgent
        }
      };

      const response = await enhancedAuthService.apiRequest(
        `${this.apiUrl}/reports/${reportId}/submit`,
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      const submittedReport = await response.json();
      
      // Update local cache
      this.updateLocalCache(submittedReport);
      
      return submittedReport;

    } catch (error) {
      console.error('Submit report error:', error);
      throw error;
    }
  }

  /**
   * Auto-save functionality for drafts
   */
  async autoSave(reportData, reportId = null) {
    try {
      const autoSaveKey = `autosave_${reportId || 'new'}`;
      
      // Save to localStorage immediately
      localStorage.setItem(autoSaveKey, JSON.stringify({
        data: reportData,
        timestamp: Date.now(),
        reportId
      }));

      // Debounced save to server
      if (!this.autoSaveTimeout) {
        this.autoSaveTimeout = setTimeout(async () => {
          try {
            if (reportId) {
              await this.updateReport(reportId, reportData, { status: 'draft' });
            } else {
              const saved = await this.saveReport(reportData, { 
                title: 'Auto-saved Report',
                status: 'draft'
              });
              // Update the auto-save with the new report ID
              localStorage.setItem(`autosave_${saved.id}`, JSON.stringify({
                data: reportData,
                timestamp: Date.now(),
                reportId: saved.id
              }));
              localStorage.removeItem('autosave_new');
            }
          } catch (error) {
            console.warn('Auto-save failed:', error);
          }
          this.autoSaveTimeout = null;
        }, 2000); // 2 second delay
      }

    } catch (error) {
      console.warn('Auto-save error:', error);
    }
  }

  /**
   * Restore auto-saved data
   */
  getAutoSavedData(reportId = null) {
    try {
      const autoSaveKey = `autosave_${reportId || 'new'}`;
      const autoSaved = localStorage.getItem(autoSaveKey);
      
      if (autoSaved) {
        const parsed = JSON.parse(autoSaved);
        // Only return if less than 1 hour old
        if (Date.now() - parsed.timestamp < 60 * 60 * 1000) {
          return parsed;
        } else {
          // Clean up old auto-save data
          localStorage.removeItem(autoSaveKey);
        }
      }
    } catch (error) {
      console.warn('Failed to restore auto-saved data:', error);
    }
    return null;
  }

  /**
   * Local cache management
   */
  updateLocalCache(report) {
    try {
      const cacheKey = `report_${report.id}`;
      const cacheData = {
        ...report,
        cached_at: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to update local cache:', error);
    }
  }

  getFromLocalCache(reportId) {
    try {
      const cacheKey = `report_${reportId}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const parsed = JSON.parse(cached);
        // Return cached data if less than 5 minutes old
        if (Date.now() - parsed.cached_at < 5 * 60 * 1000) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to get from local cache:', error);
    }
    return null;
  }

  removeFromLocalCache(reportId) {
    try {
      const cacheKey = `report_${reportId}`;
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('Failed to remove from local cache:', error);
    }
  }

  /**
   * Setup automatic sync
   */
  setupAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && enhancedAuthService.isAuthenticated()) {
        this.syncPendingChanges();
      }
    }, 30 * 1000);
  }

  /**
   * Sync pending changes when coming back online
   */
  async syncPendingChanges() {
    try {
      const pendingSync = JSON.parse(localStorage.getItem('pending_sync') || '[]');
      
      for (const change of pendingSync) {
        try {
          switch (change.action) {
            case 'create':
              await this.saveReport(change.data, change.options);
              break;
            case 'update':
              await this.updateReport(change.reportId, change.data, change.options);
              break;
            case 'delete':
              await this.deleteReport(change.reportId);
              break;
          }
        } catch (error) {
          console.warn('Failed to sync change:', change, error);
          continue; // Continue with other changes
        }
      }

      // Clear synced changes
      localStorage.removeItem('pending_sync');

    } catch (error) {
      console.error('Sync pending changes error:', error);
    }
  }

  /**
   * Queue operations for offline sync
   */
  saveToLocalQueue(reportData, options) {
    const queueItem = {
      action: 'create',
      data: reportData,
      options,
      timestamp: Date.now()
    };
    
    this.addToPendingSync(queueItem);
    
    // Return a mock report for immediate use
    return {
      id: `temp_${Date.now()}`,
      ...options,
      report_data: reportData,
      status: 'pending_sync',
      created_at: new Date().toISOString()
    };
  }

  queueUpdateForSync(reportId, reportData, options) {
    const queueItem = {
      action: 'update',
      reportId,
      data: reportData,
      options,
      timestamp: Date.now()
    };
    
    this.addToPendingSync(queueItem);
  }

  queueDeletionForSync(reportId) {
    const queueItem = {
      action: 'delete',
      reportId,
      timestamp: Date.now()
    };
    
    this.addToPendingSync(queueItem);
  }

  addToPendingSync(item) {
    try {
      const pending = JSON.parse(localStorage.getItem('pending_sync') || '[]');
      pending.push(item);
      localStorage.setItem('pending_sync', JSON.stringify(pending));
    } catch (error) {
      console.warn('Failed to add to pending sync:', error);
    }
  }
}

// Create singleton instance
const reportDatabaseService = new ReportDatabaseService();

export default reportDatabaseService;
