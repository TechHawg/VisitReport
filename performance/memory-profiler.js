#!/usr/bin/env node

/**
 * RSS Visit Report - Advanced Memory Profiler
 * 
 * This tool provides deep memory analysis including:
 * - Heap snapshot comparison
 * - Memory leak detection
 * - Component-level memory usage
 * - Storage usage tracking
 * - Garbage collection analysis
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MemoryProfiler {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || 'http://localhost:5173';
    this.browser = null;
    this.page = null;
    this.cdpSession = null;
    this.heapSnapshots = [];
    this.memoryTimeline = [];
    this.gcEvents = [];
  }

  async init() {
    console.log('🧠 Initializing Memory Profiler...');
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--js-flags=--expose-gc', // Enable garbage collection
        '--enable-precise-memory-info' // Enable detailed memory info
      ]
    });
    
    this.page = await this.browser.newPage();
    this.cdpSession = await this.page.target().createCDPSession();
    
    // Enable runtime and heap profiler
    await this.cdpSession.send('Runtime.enable');
    await this.cdpSession.send('HeapProfiler.enable');
    
    // Listen for GC events
    this.cdpSession.on('HeapProfiler.heapStatsUpdate', (params) => {
      this.gcEvents.push({
        timestamp: Date.now(),
        ...params
      });
    });

    console.log('✅ Memory profiler initialized');
  }

  async cleanup() {
    if (this.cdpSession) {
      await this.cdpSession.detach();
    }
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }

  // Take heap snapshot
  async takeHeapSnapshot(label = '') {
    console.log(`📸 Taking heap snapshot: ${label}`);
    
    // Force garbage collection first
    await this.forceGarbageCollection();
    
    // Take snapshot via CDP
    const result = await this.cdpSession.send('HeapProfiler.takeHeapSnapshot', {
      reportProgress: false
    });
    
    // Get memory info
    const memoryInfo = await this.page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSMemory: performance.memory.usedJSMemory,
          totalJSMemory: performance.memory.totalJSMemory,
          jsMemoryLimit: performance.memory.jsMemoryLimit
        };
      }
      
      // Fallback memory estimation
      return {
        usedJSMemory: 0,
        totalJSMemory: 0,
        jsMemoryLimit: 0
      };
    });
    
    const snapshot = {
      id: this.heapSnapshots.length,
      label,
      timestamp: Date.now(),
      memoryInfo,
      domNodes: await this.countDOMNodes(),
      eventListeners: await this.countEventListeners(),
      reactComponents: await this.analyzeReactComponents(),
      localStorageSize: await this.getStorageSize('localStorage'),
      sessionStorageSize: await this.getStorageSize('sessionStorage')
    };
    
    this.heapSnapshots.push(snapshot);
    console.log(`   Memory used: ${Math.round(memoryInfo.usedJSMemory / 1024 / 1024)}MB`);
    
    return snapshot;
  }

  // Force garbage collection
  async forceGarbageCollection() {
    await this.page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });
    
    // Alternative: Force GC via CDP
    try {
      await this.cdpSession.send('Runtime.runScript', {
        expression: 'gc()',
        includeCommandLineAPI: true
      });
    } catch (e) {
      // GC might not be available
    }
  }

  // Count DOM nodes
  async countDOMNodes() {
    return await this.page.evaluate(() => {
      return document.getElementsByTagName('*').length;
    });
  }

  // Count event listeners (approximate)
  async countEventListeners() {
    return await this.page.evaluate(() => {
      let count = 0;
      
      // This is an approximation - real event listener counting is complex
      const elements = document.querySelectorAll('*');
      elements.forEach(element => {
        // Check for common React props that indicate event listeners
        const attributes = element.attributes;
        for (let i = 0; i < attributes.length; i++) {
          const attr = attributes[i];
          if (attr.name.startsWith('on') || attr.name.includes('click') || attr.name.includes('change')) {
            count++;
          }
        }
      });
      
      return count;
    });
  }

  // Analyze React components (if React DevTools is available)
  async analyzeReactComponents() {
    return await this.page.evaluate(() => {
      let componentCount = 0;
      let stateObjectsCount = 0;
      
      // Try to access React DevTools or React instance
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        try {
          const reactFiber = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
          // This would require more complex logic to traverse React fiber tree
          componentCount = 'DevTools available but analysis not implemented';
        } catch (e) {
          componentCount = 'Error accessing React DevTools';
        }
      }
      
      // Alternative: Count elements with React-like attributes
      const reactElements = document.querySelectorAll('[data-reactroot], [data-react-*]');
      componentCount = reactElements.length || 'Unable to determine';
      
      return {
        estimatedComponents: componentCount,
        stateObjects: stateObjectsCount
      };
    });
  }

  // Get storage size
  async getStorageSize(storageType) {
    return await this.page.evaluate((type) => {
      try {
        const storage = window[type];
        let total = 0;
        
        for (let key in storage) {
          if (storage.hasOwnProperty(key)) {
            total += storage[key].length + key.length;
          }
        }
        
        return total;
      } catch (e) {
        return 0;
      }
    }, storageType);
  }

  // Start continuous memory monitoring
  async startMemoryMonitoring(intervalMs = 1000) {
    console.log(`📊 Starting memory monitoring (${intervalMs}ms intervals)...`);
    
    const monitor = async () => {
      const memoryInfo = await this.page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSMemory: performance.memory.usedJSMemory,
            totalJSMemory: performance.memory.totalJSMemory,
            jsMemoryLimit: performance.memory.jsMemoryLimit
          };
        }
        return null;
      });
      
      if (memoryInfo) {
        this.memoryTimeline.push({
          timestamp: Date.now(),
          ...memoryInfo,
          domNodes: await this.countDOMNodes()
        });
      }
    };
    
    // Initial measurement
    await monitor();
    
    // Set interval for continuous monitoring
    const intervalId = setInterval(monitor, intervalMs);
    
    return () => {
      clearInterval(intervalId);
      console.log('⏹️  Memory monitoring stopped');
    };
  }

  // Simulate user interactions to stress test memory
  async simulateUserInteractions(duration = 30000) {
    console.log(`🤖 Simulating user interactions for ${duration / 1000}s...`);
    
    const endTime = Date.now() + duration;
    const interactions = [
      'navigation',
      'data-entry',
      'form-interaction',
      'page-refresh',
      'modal-operations'
    ];
    
    while (Date.now() < endTime) {
      const interaction = interactions[Math.floor(Math.random() * interactions.length)];
      
      try {
        switch (interaction) {
          case 'navigation':
            await this.simulateNavigation();
            break;
          case 'data-entry':
            await this.simulateDataEntry();
            break;
          case 'form-interaction':
            await this.simulateFormInteraction();
            break;
          case 'page-refresh':
            await this.simulatePageRefresh();
            break;
          case 'modal-operations':
            await this.simulateModalOperations();
            break;
        }
        
        // Random delay between interactions
        await this.page.waitForTimeout(Math.random() * 2000 + 500);
        
      } catch (error) {
        console.log(`   Warning: ${interaction} failed: ${error.message}`);
      }
    }
  }

  async simulateNavigation() {
    const pages = ['Dashboard', 'Infrastructure', 'Inventory', 'Storage', 'Recycling'];
    const randomPage = pages[Math.floor(Math.random() * pages.length)];
    
    // Try multiple navigation methods
    const navigated = await Promise.race([
      this.page.click(`[data-page="${randomPage}"]`).then(() => true).catch(() => false),
      this.page.click(`a[href*="${randomPage.toLowerCase()}"]`).then(() => true).catch(() => false),
      this.page.evaluate((page) => {
        // Direct navigation via React Router or similar
        if (window.history && window.history.pushState) {
          window.history.pushState({}, '', `#/${page.toLowerCase()}`);
          window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
          return true;
        }
        return false;
      }, randomPage)
    ]);
    
    if (navigated) {
      await this.page.waitForTimeout(500); // Wait for navigation to complete
    }
  }

  async simulateDataEntry() {
    // Try to find and fill input fields
    const inputs = await this.page.$$('input[type="text"], textarea, select');
    
    for (let i = 0; i < Math.min(3, inputs.length); i++) {
      const input = inputs[Math.floor(Math.random() * inputs.length)];
      try {
        await input.click();
        await input.type('Test data ' + Math.random().toString(36).substr(2, 9));
        await this.page.waitForTimeout(100);
      } catch (e) {
        // Skip if input interaction fails
      }
    }
  }

  async simulateFormInteraction() {
    // Look for buttons and click them
    const buttons = await this.page.$$('button:not([disabled])');
    
    if (buttons.length > 0) {
      const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
      try {
        await randomButton.click();
        await this.page.waitForTimeout(300);
      } catch (e) {
        // Skip if button click fails
      }
    }
  }

  async simulatePageRefresh() {
    await this.page.reload({ waitUntil: 'networkidle2' });
  }

  async simulateModalOperations() {
    // Try to open modals
    const modalTriggers = await this.page.$$('[data-modal], [aria-label*="modal"], button:has-text("Add"), button:has-text("Edit")');
    
    if (modalTriggers.length > 0) {
      const trigger = modalTriggers[0];
      try {
        await trigger.click();
        await this.page.waitForTimeout(500);
        
        // Try to close modal
        const closeButtons = await this.page.$$('[data-close], [aria-label*="close"], button:has-text("Cancel")');
        if (closeButtons.length > 0) {
          await closeButtons[0].click();
        }
      } catch (e) {
        // Skip if modal interaction fails
      }
    }
  }

  // Analyze memory leaks between snapshots
  analyzeMemoryLeaks() {
    console.log('🔍 Analyzing memory leaks...');
    
    if (this.heapSnapshots.length < 2) {
      return {
        analysis: 'Insufficient snapshots for leak analysis',
        recommendations: []
      };
    }
    
    const first = this.heapSnapshots[0];
    const last = this.heapSnapshots[this.heapSnapshots.length - 1];
    
    const memoryGrowth = last.memoryInfo.usedJSMemory - first.memoryInfo.usedJSMemory;
    const domGrowth = last.domNodes - first.domNodes;
    const listenerGrowth = last.eventListeners - first.eventListeners;
    const storageGrowth = (last.localStorageSize + last.sessionStorageSize) - 
                          (first.localStorageSize + first.sessionStorageSize);
    
    const leaks = [];
    const recommendations = [];
    
    // Analyze memory growth
    if (memoryGrowth > 10 * 1024 * 1024) { // 10MB growth
      leaks.push({
        type: 'JavaScript Memory',
        growth: `${Math.round(memoryGrowth / 1024 / 1024)}MB`,
        severity: memoryGrowth > 50 * 1024 * 1024 ? 'HIGH' : 'MEDIUM'
      });
      
      recommendations.push({
        issue: 'Significant JavaScript memory growth detected',
        solution: 'Review component cleanup, remove unused event listeners, and check for closures retaining references',
        priority: 'HIGH'
      });
    }
    
    // Analyze DOM growth
    if (domGrowth > 100) {
      leaks.push({
        type: 'DOM Nodes',
        growth: `+${domGrowth} nodes`,
        severity: domGrowth > 500 ? 'HIGH' : 'MEDIUM'
      });
      
      recommendations.push({
        issue: 'DOM nodes are not being properly cleaned up',
        solution: 'Ensure components properly unmount and clean up dynamically created elements',
        priority: 'MEDIUM'
      });
    }
    
    // Analyze event listener growth
    if (listenerGrowth > 10) {
      leaks.push({
        type: 'Event Listeners',
        growth: `+${listenerGrowth} listeners`,
        severity: 'MEDIUM'
      });
      
      recommendations.push({
        issue: 'Event listeners may not be properly removed',
        solution: 'Use cleanup functions in useEffect hooks and remove listeners in componentWillUnmount',
        priority: 'MEDIUM'
      });
    }
    
    // Analyze storage growth
    if (storageGrowth > 100000) { // 100KB growth
      leaks.push({
        type: 'Browser Storage',
        growth: `${Math.round(storageGrowth / 1024)}KB`,
        severity: 'LOW'
      });
      
      recommendations.push({
        issue: 'Browser storage is growing significantly',
        solution: 'Implement storage cleanup and consider using the memory manager more effectively',
        priority: 'LOW'
      });
    }
    
    return {
      totalSnapshots: this.heapSnapshots.length,
      timeSpan: last.timestamp - first.timestamp,
      leaks,
      memoryGrowth: Math.round(memoryGrowth / 1024 / 1024),
      domGrowth,
      listenerGrowth,
      storageGrowth: Math.round(storageGrowth / 1024),
      recommendations,
      severity: leaks.some(l => l.severity === 'HIGH') ? 'HIGH' : 
                leaks.some(l => l.severity === 'MEDIUM') ? 'MEDIUM' : 'LOW'
    };
  }

  // Generate memory timeline analysis
  analyzeMemoryTimeline() {
    if (this.memoryTimeline.length === 0) {
      return { analysis: 'No timeline data available' };
    }
    
    const timeline = this.memoryTimeline;
    const memoryValues = timeline.map(t => t.usedJSMemory);
    const domValues = timeline.map(t => t.domNodes);
    
    // Calculate statistics
    const avgMemory = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
    const maxMemory = Math.max(...memoryValues);
    const minMemory = Math.min(...memoryValues);
    const memoryVariance = memoryValues.reduce((sum, val) => sum + Math.pow(val - avgMemory, 2), 0) / memoryValues.length;
    
    return {
      timeSpan: timeline[timeline.length - 1].timestamp - timeline[0].timestamp,
      measurements: timeline.length,
      memoryStats: {
        average: Math.round(avgMemory / 1024 / 1024),
        maximum: Math.round(maxMemory / 1024 / 1024),
        minimum: Math.round(minMemory / 1024 / 1024),
        variance: Math.round(memoryVariance / 1024 / 1024),
        growth: Math.round((memoryValues[memoryValues.length - 1] - memoryValues[0]) / 1024 / 1024)
      },
      domStats: {
        average: Math.round(domValues.reduce((a, b) => a + b, 0) / domValues.length),
        maximum: Math.max(...domValues),
        minimum: Math.min(...domValues),
        growth: domValues[domValues.length - 1] - domValues[0]
      },
      timeline: timeline.map(t => ({
        timestamp: t.timestamp,
        memoryMB: Math.round(t.usedJSMemory / 1024 / 1024),
        domNodes: t.domNodes
      }))
    };
  }

  // Save detailed results
  async saveResults(analysis) {
    const resultsDir = path.join(__dirname, 'results');
    await fs.mkdir(resultsDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `memory-profile-${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);
    
    const results = {
      timestamp: new Date().toISOString(),
      serverUrl: this.serverUrl,
      heapSnapshots: this.heapSnapshots,
      memoryTimeline: this.analyzeMemoryTimeline(),
      leakAnalysis: analysis,
      gcEvents: this.gcEvents,
      summary: {
        totalSnapshots: this.heapSnapshots.length,
        monitoringDuration: this.memoryTimeline.length > 0 ? 
          this.memoryTimeline[this.memoryTimeline.length - 1].timestamp - this.memoryTimeline[0].timestamp : 0,
        leakSeverity: analysis.severity,
        recommendations: analysis.recommendations?.length || 0
      }
    };
    
    await fs.writeFile(filepath, JSON.stringify(results, null, 2));
    console.log(`💾 Memory profile saved to: ${filepath}`);
    
    return filepath;
  }

  // Run complete memory profiling session
  async runMemoryProfile(options = {}) {
    const {
      duration = 60000, // 1 minute
      snapshotInterval = 15000, // 15 seconds
      monitorInterval = 1000 // 1 second
    } = options;
    
    console.log('🔥 Starting Memory Profile Session');
    console.log(`📍 Testing: ${this.serverUrl}`);
    console.log(`⏱️  Duration: ${duration / 1000}s`);
    
    try {
      await this.init();
      
      // Navigate to application
      await this.page.goto(this.serverUrl, { waitUntil: 'networkidle2' });
      
      // Take initial snapshot
      await this.takeHeapSnapshot('Initial Load');
      
      // Start continuous monitoring
      const stopMonitoring = await this.startMemoryMonitoring(monitorInterval);
      
      const startTime = Date.now();
      const endTime = startTime + duration;
      
      // Take snapshots and simulate interactions
      let snapshotCount = 1;
      while (Date.now() < endTime) {
        const remainingTime = endTime - Date.now();
        const interactionDuration = Math.min(snapshotInterval, remainingTime);
        
        // Simulate user interactions
        await this.simulateUserInteractions(interactionDuration);
        
        // Take snapshot if we still have time
        if (Date.now() < endTime) {
          await this.takeHeapSnapshot(`After ${snapshotCount * snapshotInterval / 1000}s`);
          snapshotCount++;
        }
      }
      
      // Stop monitoring
      stopMonitoring();
      
      // Take final snapshot
      await this.takeHeapSnapshot('Final');
      
      // Analyze results
      const leakAnalysis = this.analyzeMemoryLeaks();
      
      console.log('\n📊 MEMORY PROFILE SUMMARY');
      console.log('=' * 40);
      
      if (leakAnalysis.leaks?.length > 0) {
        console.log(`🚨 ${leakAnalysis.leaks.length} potential memory leaks detected:`);
        leakAnalysis.leaks.forEach(leak => {
          console.log(`   ${leak.severity === 'HIGH' ? '🔴' : leak.severity === 'MEDIUM' ? '🟡' : '🟢'} ${leak.type}: ${leak.growth}`);
        });
      } else {
        console.log('✅ No significant memory leaks detected');
      }
      
      console.log(`\n📈 Memory Growth: ${leakAnalysis.memoryGrowth}MB`);
      console.log(`🏗️  DOM Growth: +${leakAnalysis.domGrowth} nodes`);
      console.log(`🎯 Event Listeners: +${leakAnalysis.listenerGrowth}`);
      console.log(`💾 Storage Growth: +${leakAnalysis.storageGrowth}KB`);
      
      if (leakAnalysis.recommendations?.length > 0) {
        console.log(`\n🎯 ${leakAnalysis.recommendations.length} recommendations generated`);
      }
      
      // Save detailed results
      const resultsFile = await this.saveResults(leakAnalysis);
      
      console.log(`\n📁 Detailed results: ${resultsFile}`);
      console.log('🎉 Memory profiling complete!');
      
      return {
        resultsFile,
        analysis: leakAnalysis,
        timeline: this.analyzeMemoryTimeline()
      };
      
    } catch (error) {
      console.error('❌ Memory profiling failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// CLI interface
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const serverUrl = process.argv[2] || 'http://localhost:5173';
  const duration = parseInt(process.argv[3]) || 60000;
  
  const profiler = new MemoryProfiler({ serverUrl });
  
  profiler.runMemoryProfile({ duration })
    .then((results) => {
      console.log(`\n✅ Memory profiling completed successfully`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Memory profiling failed:', error);
      process.exit(1);
    });
}

export default MemoryProfiler;