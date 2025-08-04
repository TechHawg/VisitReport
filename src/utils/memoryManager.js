/**
 * RSS Visit Report - Memory Management System
 * Handles caching, storage cleanup, and performance optimization
 */

import { settings } from './settings.js';

class MemoryManager {
  constructor() {
    this.cache = new Map();
    this.storageStats = {
      used: 0,
      quota: 0,
      available: 0
    };
    this.cleanupInterval = null;
    this.observers = new Set();
    
    this.init();
  }
  
  /**
   * Initialize memory manager
   */
  async init() {
    await this.updateStorageStats();
    this.setupAutoCleanup();
    this.setupStorageEventListener();
    
    if (settings.isDebugMode()) {
      console.log('MemoryManager initialized:', this.storageStats);
    }
  }
  
  /**
   * Update storage usage statistics
   */
  async updateStorageStats() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        this.storageStats = {
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
          available: (estimate.quota || 0) - (estimate.usage || 0)
        };
      } else {
        // Fallback for browsers without Storage API
        this.storageStats = {
          used: this.calculateLocalStorageSize(),
          quota: settings.get('memory.storageQuotaMB', 100) * 1024 * 1024,
          available: (settings.get('memory.storageQuotaMB', 100) * 1024 * 1024) - this.calculateLocalStorageSize()
        };
      }
    } catch (error) {
      console.warn('Failed to update storage stats:', error);
    }
  }
  
  /**
   * Calculate localStorage size (fallback method)
   */
  calculateLocalStorageSize() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }
  
  /**
   * Setup automatic cleanup based on configuration
   */
  setupAutoCleanup() {
    const autoCleanupEnabled = settings.get('memory.autoCleanupEnabled', true);
    const cleanupIntervalHours = settings.get('memory.cleanupIntervalHours', 24);
    
    if (autoCleanupEnabled) {
      // Clear existing interval if any
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      
      // Set new interval
      this.cleanupInterval = setInterval(() => {
        this.performCleanup();
      }, cleanupIntervalHours * 60 * 60 * 1000);
      
      // Perform initial cleanup
      setTimeout(() => this.performCleanup(), 5000);
    }
  }
  
  /**
   * Setup storage event listener for cross-tab synchronization
   */
  setupStorageEventListener() {
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith('rss_')) {
        this.updateStorageStats();
        this.notifyObservers('storage_changed', { key: event.key, newValue: event.newValue });
      }
    });
  }
  
  /**
   * Perform comprehensive cleanup
   */
  async performCleanup() {
    const startTime = performance.now();
    let cleaned = {
      cache: 0,
      localStorage: 0,
      sessionStorage: 0,
      indexedDB: 0
    };
    
    try {
      // Clean memory cache
      cleaned.cache = this.cleanMemoryCache();
      
      // Clean localStorage
      cleaned.localStorage = this.cleanLocalStorage();
      
      // Clean sessionStorage
      cleaned.sessionStorage = this.cleanSessionStorage();
      
      // Clean IndexedDB if needed
      cleaned.indexedDB = await this.cleanIndexedDB();
      
      // Update storage stats
      await this.updateStorageStats();
      
      const duration = performance.now() - startTime;
      
      if (settings.isDebugMode()) {
        console.log('Cleanup completed:', {
          duration: `${duration.toFixed(2)}ms`,
          cleaned,
          storageStats: this.storageStats
        });
      }
      
      this.notifyObservers('cleanup_completed', { cleaned, duration });
      
    } catch (error) {
      console.error('Cleanup failed:', error);
      this.notifyObservers('cleanup_failed', { error });
    }
  }
  
  /**
   * Clean memory cache based on LRU policy
   */
  cleanMemoryCache() {
    const maxCacheSize = settings.get('memory.cacheSize', 50);
    let cleaned = 0;
    
    if (this.cache.size > maxCacheSize) {
      const itemsToRemove = this.cache.size - maxCacheSize;
      const iterator = this.cache.keys();
      
      for (let i = 0; i < itemsToRemove; i++) {
        const key = iterator.next().value;
        if (key) {
          this.cache.delete(key);
          cleaned++;
        }
      }
    }
    
    return cleaned;
  }
  
  /**
   * Clean localStorage of expired or old items
   */
  cleanLocalStorage() {
    let cleaned = 0;
    const now = Date.now();
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      try {
        // Skip non-RSS items
        if (!key.startsWith('rss_')) continue;
        
        const item = JSON.parse(localStorage.getItem(key));
        
        // Check if item has expiry and is expired
        if (item.expiry && item.expiry < now) {
          localStorage.removeItem(key);
          cleaned++;
          continue;
        }
        
        // Check if item is old (older than 30 days)
        if (item.timestamp && (now - item.timestamp) > 30 * 24 * 60 * 60 * 1000) {
          localStorage.removeItem(key);
          cleaned++;
          continue;
        }
        
        // Clean up draft data older than 7 days
        if (key.includes('draft') && item.timestamp && (now - item.timestamp) > 7 * 24 * 60 * 60 * 1000) {
          localStorage.removeItem(key);
          cleaned++;
        }
        
      } catch (error) {
        // Remove corrupted items
        localStorage.removeItem(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
  
  /**
   * Clean sessionStorage
   */
  cleanSessionStorage() {
    let cleaned = 0;
    const keys = Object.keys(sessionStorage);
    
    for (const key of keys) {
      try {
        if (!key.startsWith('rss_')) continue;
        
        const item = JSON.parse(sessionStorage.getItem(key));
        const now = Date.now();
        
        // Remove expired session items
        if (item.expiry && item.expiry < now) {
          sessionStorage.removeItem(key);
          cleaned++;
        }
      } catch (error) {
        // Remove corrupted items
        sessionStorage.removeItem(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
  
  /**
   * Clean IndexedDB (future implementation)
   */
  async cleanIndexedDB() {
    // Placeholder for future IndexedDB cleanup
    return 0;
  }
  
  /**
   * Cache management
   */
  cacheSet(key, value, ttl = 3600000) { // 1 hour TTL by default
    const maxCacheSize = settings.get('memory.cacheSize', 50);
    
    // Remove oldest item if cache is full
    if (this.cache.size >= maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
  }
  
  cacheGet(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  cacheHas(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (item.expiry < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  cacheDelete(key) {
    return this.cache.delete(key);
  }
  
  cacheClear() {
    const size = this.cache.size;
    this.cache.clear();
    return size;
  }
  
  /**
   * Storage helpers with automatic cleanup
   */
  setItem(key, value, options = {}) {
    const {
      storage = 'localStorage',
      ttl = null,
      compress = false
    } = options;
    
    const item = {
      value: compress ? this.compress(value) : value,
      timestamp: Date.now(),
      expiry: ttl ? Date.now() + ttl : null,
      compressed: compress
    };
    
    const storageKey = key.startsWith('rss_') ? key : `rss_${key}`;
    
    try {
      if (storage === 'localStorage') {
        localStorage.setItem(storageKey, JSON.stringify(item));
      } else if (storage === 'sessionStorage') {
        sessionStorage.setItem(storageKey, JSON.stringify(item));
      }
    } catch (error) {
      console.warn('Storage setItem failed:', error);
      // Try cleanup and retry once
      this.performCleanup();
      try {
        if (storage === 'localStorage') {
          localStorage.setItem(storageKey, JSON.stringify(item));
        } else if (storage === 'sessionStorage') {
          sessionStorage.setItem(storageKey, JSON.stringify(item));
        }
      } catch (retryError) {
        console.error('Storage setItem failed after cleanup:', retryError);
        throw retryError;
      }
    }
  }
  
  getItem(key, options = {}) {
    const { storage = 'localStorage' } = options;
    const storageKey = key.startsWith('rss_') ? key : `rss_${key}`;
    
    try {
      let itemStr;
      if (storage === 'localStorage') {
        itemStr = localStorage.getItem(storageKey);
      } else if (storage === 'sessionStorage') {
        itemStr = sessionStorage.getItem(storageKey);
      }
      
      if (!itemStr) return null;
      
      const item = JSON.parse(itemStr);
      
      // Check expiry
      if (item.expiry && item.expiry < Date.now()) {
        this.removeItem(key, { storage });
        return null;
      }
      
      return item.compressed ? this.decompress(item.value) : item.value;
    } catch (error) {
      console.warn('Storage getItem failed:', error);
      // Remove corrupted item
      this.removeItem(key, { storage });
      return null;
    }
  }
  
  removeItem(key, options = {}) {
    const { storage = 'localStorage' } = options;
    const storageKey = key.startsWith('rss_') ? key : `rss_${key}`;
    
    if (storage === 'localStorage') {
      localStorage.removeItem(storageKey);
    } else if (storage === 'sessionStorage') {
      sessionStorage.removeItem(storageKey);
    }
  }
  
  /**
   * Simple compression/decompression (placeholder)
   */
  compress(data) {
    // Placeholder for future compression implementation
    return data;
  }
  
  decompress(data) {
    // Placeholder for future decompression implementation
    return data;
  }
  
  /**
   * Get memory usage statistics
   */
  getStats() {
    return {
      cache: {
        size: this.cache.size,
        maxSize: settings.get('memory.cacheSize', 50)
      },
      storage: this.storageStats,
      autoCleanup: {
        enabled: settings.get('memory.autoCleanupEnabled', true),
        intervalHours: settings.get('memory.cleanupIntervalHours', 24)
      }
    };
  }
  
  /**
   * Observer pattern for memory events
   */
  addObserver(callback) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }
  
  notifyObservers(event, data) {
    this.observers.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Memory observer error:', error);
      }
    });
  }
  
  /**
   * Force cleanup (manual trigger)
   */
  async forceCleanup() {
    return await this.performCleanup();
  }
  
  /**
   * Destroy memory manager
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    this.observers.clear();
  }
}

// Create singleton instance
const memoryManager = new MemoryManager();

// Export convenience functions
export const memory = {
  // Cache functions
  cacheSet: (key, value, ttl) => memoryManager.cacheSet(key, value, ttl),
  cacheGet: (key) => memoryManager.cacheGet(key),
  cacheHas: (key) => memoryManager.cacheHas(key),
  cacheDelete: (key) => memoryManager.cacheDelete(key),
  cacheClear: () => memoryManager.cacheClear(),
  
  // Storage functions
  setItem: (key, value, options) => memoryManager.setItem(key, value, options),
  getItem: (key, options) => memoryManager.getItem(key, options),
  removeItem: (key, options) => memoryManager.removeItem(key, options),
  
  // Management functions
  getStats: () => memoryManager.getStats(),
  forceCleanup: () => memoryManager.forceCleanup(),
  addObserver: (callback) => memoryManager.addObserver(callback),
  
  // Utility functions
  isStorageAvailable: (type = 'localStorage') => {
    try {
      const storage = window[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
};

export default memoryManager;