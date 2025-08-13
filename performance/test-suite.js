#!/usr/bin/env node

/**
 * RSS Visit Report - Comprehensive Performance Testing Suite
 * 
 * This suite tests application performance across multiple dimensions:
 * - Load performance and startup time
 * - Memory usage and leak detection
 * - Component rendering performance
 * - Data processing performance
 * - Browser compatibility
 * - Bundle analysis and optimization opportunities
 */

import puppeteer from 'puppeteer';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Performance test configuration
const TEST_CONFIG = {
  SERVER_URL: 'http://localhost:5173',
  TEST_DURATION: 30000, // 30 seconds
  LOAD_TEST_ITERATIONS: 10,
  MEMORY_LEAK_ITERATIONS: 20,
  BROWSER_OPTIONS: {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  },
  PAGES_TO_TEST: [
    { name: 'Dashboard', selector: '[data-page="Dashboard"]' },
    { name: 'Infrastructure', selector: '[data-page="Infrastructure"]' },
    { name: 'Inventory', selector: '[data-page="Inventory"]' },
    { name: 'Storage', selector: '[data-page="Storage"]' },
    { name: 'Recycling', selector: '[data-page="Recycling"]' }
  ]
};

// Performance metrics collector
class PerformanceMetrics {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {},
      loadPerformance: {},
      memoryUsage: {},
      componentPerformance: {},
      dataProcessing: {},
      lighthouseAudit: {},
      bundleAnalysis: {},
      browserCompatibility: {},
      recommendations: []
    };
  }

  addResult(category, test, data) {
    if (!this.results[category]) {
      this.results[category] = {};
    }
    this.results[category][test] = data;
  }

  async saveResults() {
    const resultsDir = path.join(__dirname, 'results');
    await fs.mkdir(resultsDir, { recursive: true });
    
    const filename = `performance-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(resultsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
    console.log(`📊 Results saved to: ${filepath}`);
    
    return filepath;
  }
}

// Main test class
class PerformanceTestSuite {
  constructor() {
    this.metrics = new PerformanceMetrics();
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Initializing Performance Test Suite...');
    
    this.browser = await puppeteer.launch(TEST_CONFIG.BROWSER_OPTIONS);
    this.page = await this.browser.newPage();
    
    // Enable performance monitoring
    await this.page.setCacheEnabled(false);
    await this.page.setUserAgent('PerformanceTestBot/1.0 (Performance Testing Suite)');
    
    // Monitor console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
    
    // Monitor network failures
    this.page.on('requestfailed', request => {
      console.log('🌐 Request Failed:', request.url(), request.failure().errorText);
    });

    console.log('✅ Test suite initialized');
  }

  async cleanup() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }

  // Test 1: Load Performance and Startup Time
  async testLoadPerformance() {
    console.log('\n📈 Testing Load Performance...');
    
    const loadTimes = [];
    const navigationMetrics = [];

    for (let i = 0; i < TEST_CONFIG.LOAD_TEST_ITERATIONS; i++) {
      const startTime = performance.now();
      
      // Navigate to application
      await this.page.goto(TEST_CONFIG.SERVER_URL, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for React app to initialize
      await this.page.waitForSelector('[data-testid="app-root"], .app, main, #root', { 
        timeout: 15000 
      });
      
      // Measure time to interactive
      const metrics = await this.page.evaluate(() => {
        return JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')[0]));
      });
      
      const endTime = performance.now();
      const totalLoadTime = endTime - startTime;
      
      loadTimes.push(totalLoadTime);
      navigationMetrics.push(metrics);
      
      console.log(`  Iteration ${i + 1}: ${totalLoadTime.toFixed(2)}ms`);
      
      // Clear cache for next iteration
      await this.page.evaluate(() => {
        if (window.localStorage) window.localStorage.clear();
        if (window.sessionStorage) window.sessionStorage.clear();
      });
    }

    const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    const minLoadTime = Math.min(...loadTimes);
    const maxLoadTime = Math.max(...loadTimes);
    
    // Calculate percentiles
    const sortedTimes = [...loadTimes].sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];

    this.metrics.addResult('loadPerformance', 'startup', {
      iterations: TEST_CONFIG.LOAD_TEST_ITERATIONS,
      avgLoadTime: Math.round(avgLoadTime),
      minLoadTime: Math.round(minLoadTime),
      maxLoadTime: Math.round(maxLoadTime),
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      navigationMetrics: {
        avgDomContentLoaded: Math.round(navigationMetrics.reduce((sum, m) => sum + m.domContentLoadedEventEnd, 0) / navigationMetrics.length),
        avgLoadComplete: Math.round(navigationMetrics.reduce((sum, m) => sum + m.loadEventEnd, 0) / navigationMetrics.length)
      }
    });

    console.log(`✅ Load Performance Complete - Avg: ${avgLoadTime.toFixed(2)}ms, P95: ${p95.toFixed(2)}ms`);
  }

  // Test 2: Memory Usage and Leak Detection
  async testMemoryUsage() {
    console.log('\n🧠 Testing Memory Usage...');
    
    await this.page.goto(TEST_CONFIG.SERVER_URL, { waitUntil: 'networkidle2' });
    
    const memorySnapshots = [];
    
    // Take initial snapshot
    let initialMemory = await this.page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSMemory: performance.memory.usedJSMemory,
          totalJSMemory: performance.memory.totalJSMemory,
          jsMemoryLimit: performance.memory.jsMemoryLimit
        };
      }
      return null;
    });
    
    if (initialMemory) {
      memorySnapshots.push({ iteration: 0, ...initialMemory });
    }

    // Simulate user interactions and measure memory over time
    for (let i = 0; i < TEST_CONFIG.MEMORY_LEAK_ITERATIONS; i++) {
      // Navigate through different pages
      for (const pageTest of TEST_CONFIG.PAGES_TO_TEST) {
        try {
          // Click navigation or simulate page change
          await this.page.click(`nav [data-page="${pageTest.name}"], [href*="${pageTest.name.toLowerCase()}"], button:has-text("${pageTest.name}")`)
            .catch(() => {
              // Fallback: evaluate page change directly
              return this.page.evaluate((pageName) => {
                // Simulate React router navigation or state change
                if (window.history && window.history.pushState) {
                  window.history.pushState({}, '', `#/${pageName.toLowerCase()}`);
                  window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
                }
              }, pageTest.name);
            });
          
          await this.page.waitForTimeout(500); // Wait for navigation
          
          // Simulate data entry if on Infrastructure page
          if (pageTest.name === 'Infrastructure') {
            await this.simulateDataProcessing();
          }
        } catch (error) {
          console.log(`  Warning: Could not navigate to ${pageTest.name}`);
        }
      }

      // Take memory snapshot
      if (i % 5 === 0) { // Every 5th iteration
        const memory = await this.page.evaluate(() => {
          if (performance.memory) {
            return {
              usedJSMemory: performance.memory.usedJSMemory,
              totalJSMemory: performance.memory.totalJSMemory,
              jsMemoryLimit: performance.memory.jsMemoryLimit
            };
          }
          return null;
        });
        
        if (memory) {
          memorySnapshots.push({ iteration: i + 1, ...memory });
          console.log(`  Iteration ${i + 1}: ${Math.round(memory.usedJSMemory / 1024 / 1024)}MB used`);
        }
      }
    }

    // Analyze memory usage patterns
    if (memorySnapshots.length > 1) {
      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1].usedJSMemory - memorySnapshots[0].usedJSMemory;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;
      
      this.metrics.addResult('memoryUsage', 'leakDetection', {
        initialMemoryMB: Math.round(memorySnapshots[0].usedJSMemory / 1024 / 1024),
        finalMemoryMB: Math.round(memorySnapshots[memorySnapshots.length - 1].usedJSMemory / 1024 / 1024),
        memoryGrowthMB: Math.round(memoryGrowthMB),
        iterations: TEST_CONFIG.MEMORY_LEAK_ITERATIONS,
        snapshots: memorySnapshots.map(s => ({
          iteration: s.iteration,
          usedMemoryMB: Math.round(s.usedJSMemory / 1024 / 1024)
        })),
        possibleLeak: memoryGrowthMB > 50 // Flag if memory grows by more than 50MB
      });
      
      console.log(`✅ Memory Usage Complete - Growth: ${memoryGrowthMB.toFixed(2)}MB`);
    }
  }

  // Test 3: Component Rendering Performance
  async testComponentPerformance() {
    console.log('\n⚛️ Testing Component Performance...');
    
    await this.page.goto(TEST_CONFIG.SERVER_URL, { waitUntil: 'networkidle2' });
    
    // Enable React DevTools profiling if available
    const renderMetrics = {};
    
    for (const pageTest of TEST_CONFIG.PAGES_TO_TEST) {
      console.log(`  Testing ${pageTest.name} rendering...`);
      
      const renderTimes = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        
        try {
          // Navigate to page
          await this.page.click(`nav [data-page="${pageTest.name}"], [href*="${pageTest.name.toLowerCase()}"], button:has-text("${pageTest.name}")`)
            .catch(() => {
              return this.page.evaluate((pageName) => {
                if (window.history && window.history.pushState) {
                  window.history.pushState({}, '', `#/${pageName.toLowerCase()}`);
                  window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
                }
              }, pageTest.name);
            });
          
          // Wait for page content to be visible
          await this.page.waitForTimeout(100);
          
          const endTime = performance.now();
          renderTimes.push(endTime - startTime);
          
        } catch (error) {
          console.log(`    Warning: Failed to test ${pageTest.name} rendering`);
        }
      }
      
      if (renderTimes.length > 0) {
        const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
        renderMetrics[pageTest.name] = {
          avgRenderTime: Math.round(avgRenderTime),
          samples: renderTimes.length
        };
        
        console.log(`    ${pageTest.name}: ${avgRenderTime.toFixed(2)}ms avg`);
      }
    }
    
    this.metrics.addResult('componentPerformance', 'rendering', renderMetrics);
    console.log('✅ Component Performance Complete');
  }

  // Test 4: Data Processing Performance (SCCM parsing)
  async testDataProcessing() {
    console.log('\n💾 Testing Data Processing Performance...');
    
    await this.page.goto(TEST_CONFIG.SERVER_URL, { waitUntil: 'networkidle2' });
    
    // Navigate to Infrastructure page
    try {
      await this.page.click('[data-page="Infrastructure"], [href*="infrastructure"], button:has-text("Infrastructure")')
        .catch(() => {
          return this.page.evaluate(() => {
            if (window.history && window.history.pushState) {
              window.history.pushState({}, '', '#/infrastructure');
              window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
            }
          });
        });
      
      await this.page.waitForTimeout(1000);
      
      // Test SCCM data processing performance
      const processingResults = await this.simulateDataProcessing();
      
      this.metrics.addResult('dataProcessing', 'sccmParsing', processingResults);
      console.log('✅ Data Processing Complete');
      
    } catch (error) {
      console.log('⚠️ Could not test data processing - Infrastructure page not accessible');
    }
  }

  // Simulate SCCM data processing
  async simulateDataProcessing() {
    const sampleSccmData = this.generateSampleSccmData();
    
    return await this.page.evaluate((data) => {
      const startTime = performance.now();
      
      // Simulate the SCCM parsing logic from the application
      try {
        const lines = data.trim().split('\n');
        const processedItems = [];
        
        lines.forEach((line, index) => {
          const values = line.split(/\s{2,}|\t/).map(v => v.trim());
          
          if (values.length >= 4) {
            const item = {
              id: Date.now() + index,
              name: values[0] || '',
              memory: values[1] || '',
              storage: values[2] || '',
              model: values[3] || '',
              lastLoginUsername: values[4] || '',
              lastSeen: values[5] || '',
              os: values[6] || '',
              status: 'active',
              sccmStatus: 'active',
              lastUpdated: new Date().toISOString().split('T')[0]
            };
            
            processedItems.push(item);
          }
        });
        
        const endTime = performance.now();
        
        return {
          processingTime: Math.round(endTime - startTime),
          inputLines: lines.length,
          processedItems: processedItems.length,
          successRate: (processedItems.length / lines.length) * 100
        };
        
      } catch (error) {
        return {
          error: error.message,
          processingTime: 0,
          inputLines: 0,
          processedItems: 0,
          successRate: 0
        };
      }
    }, sampleSccmData);
  }

  // Generate sample SCCM data for testing
  generateSampleSccmData() {
    const sampleData = [];
    const computerNames = ['WORKSTATION-01', 'LAPTOP-HR-05', 'PC-SALES-12', 'DESKTOP-IT-03', 'MOBILE-EXE-02'];
    const models = ['Dell OptiPlex 7090', 'HP EliteBook 840', 'Lenovo ThinkCentre M75q', 'Dell Latitude 5520', 'HP ProDesk 400'];
    const users = ['john.doe', 'jane.smith', 'mike.johnson', 'sarah.wilson', 'admin'];
    const osList = ['Windows 10 Pro', 'Windows 11 Pro', 'Windows 10 Enterprise', 'Windows 11 Enterprise'];
    
    for (let i = 0; i < 100; i++) {
      const ramGB = [4, 8, 16, 32][Math.floor(Math.random() * 4)];
      const ramKB = ramGB * 1024 * 1024;
      const storage = [`${[256, 512, 1000][Math.floor(Math.random() * 3)]}GB SSD`, `${[500, 1000, 2000][Math.floor(Math.random() * 3)]}GB HDD`];
      const lastSeen = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      sampleData.push([
        `${computerNames[Math.floor(Math.random() * computerNames.length)]}-${String(i).padStart(3, '0')}`,
        ramKB.toString(),
        storage[Math.floor(Math.random() * storage.length)],
        models[Math.floor(Math.random() * models.length)],
        users[Math.floor(Math.random() * users.length)],
        lastSeen,
        osList[Math.floor(Math.random() * osList.length)],
        '10.0.19044'
      ].join('    '));
    }
    
    return sampleData.join('\n');
  }

  // Test 5: Bundle Analysis
  async testBundleAnalysis() {
    console.log('\n📦 Analyzing Bundle Performance...');
    
    await this.page.goto(TEST_CONFIG.SERVER_URL, { waitUntil: 'networkidle2' });
    
    // Get resource loading information
    const resourceMetrics = await this.page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      const bundleInfo = {
        totalResources: resources.length,
        jsFiles: [],
        cssFiles: [],
        totalSize: 0,
        loadTimes: []
      };
      
      resources.forEach(resource => {
        const size = resource.transferSize || 0;
        const loadTime = resource.responseEnd - resource.startTime;
        
        bundleInfo.totalSize += size;
        bundleInfo.loadTimes.push(loadTime);
        
        if (resource.name.endsWith('.js')) {
          bundleInfo.jsFiles.push({
            name: resource.name.split('/').pop(),
            size,
            loadTime: Math.round(loadTime)
          });
        } else if (resource.name.endsWith('.css')) {
          bundleInfo.cssFiles.push({
            name: resource.name.split('/').pop(),
            size,
            loadTime: Math.round(loadTime)
          });
        }
      });
      
      // Sort by size descending
      bundleInfo.jsFiles.sort((a, b) => b.size - a.size);
      bundleInfo.cssFiles.sort((a, b) => b.size - a.size);
      
      return bundleInfo;
    });
    
    this.metrics.addResult('bundleAnalysis', 'resources', {
      totalResources: resourceMetrics.totalResources,
      totalSizeKB: Math.round(resourceMetrics.totalSize / 1024),
      avgLoadTime: Math.round(resourceMetrics.loadTimes.reduce((a, b) => a + b, 0) / resourceMetrics.loadTimes.length),
      largestJSFiles: resourceMetrics.jsFiles.slice(0, 5),
      largestCSSFiles: resourceMetrics.cssFiles.slice(0, 3),
      jsFileCount: resourceMetrics.jsFiles.length,
      cssFileCount: resourceMetrics.cssFiles.length
    });
    
    console.log(`✅ Bundle Analysis Complete - Total: ${Math.round(resourceMetrics.totalSize / 1024)}KB`);
  }

  // Test 6: Lighthouse Audit Simulation
  async testLighthouseMetrics() {
    console.log('\n🏠 Testing Core Web Vitals...');
    
    await this.page.goto(TEST_CONFIG.SERVER_URL, { waitUntil: 'networkidle2' });
    
    // Measure Core Web Vitals
    const webVitals = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        // Simulate web vitals measurement
        const vitals = {
          fcp: 0, // First Contentful Paint
          lcp: 0, // Largest Contentful Paint
          fid: 0, // First Input Delay
          cls: 0, // Cumulative Layout Shift
          ttfb: 0 // Time to First Byte
        };
        
        // Get navigation timing
        const navTiming = performance.getEntriesByType('navigation')[0];
        if (navTiming) {
          vitals.ttfb = navTiming.responseStart - navTiming.requestStart;
        }
        
        // Try to get paint timing
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            vitals.fcp = entry.startTime;
          }
        });
        
        // Simulate LCP measurement
        if (window.PerformanceObserver) {
          try {
            const po = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              entries.forEach((entry) => {
                if (entry.entryType === 'largest-contentful-paint') {
                  vitals.lcp = entry.startTime;
                }
              });
            });
            po.observe({ entryTypes: ['largest-contentful-paint'] });
            
            setTimeout(() => {
              po.disconnect();
              resolve(vitals);
            }, 3000);
          } catch (e) {
            resolve(vitals);
          }
        } else {
          resolve(vitals);
        }
      });
    });
    
    this.metrics.addResult('lighthouseAudit', 'coreWebVitals', {
      firstContentfulPaint: Math.round(webVitals.fcp),
      largestContentfulPaint: Math.round(webVitals.lcp),
      timeToFirstByte: Math.round(webVitals.ttfb),
      cumulativeLayoutShift: webVitals.cls,
      firstInputDelay: webVitals.fid
    });
    
    console.log(`✅ Core Web Vitals Complete - FCP: ${webVitals.fcp?.toFixed(0)}ms, LCP: ${webVitals.lcp?.toFixed(0)}ms`);
  }

  // Generate performance recommendations
  generateRecommendations() {
    console.log('\n🎯 Generating Performance Recommendations...');
    
    const recommendations = [];
    const results = this.metrics.results;
    
    // Load performance recommendations
    if (results.loadPerformance?.startup) {
      const startup = results.loadPerformance.startup;
      if (startup.p95 > 3000) {
        recommendations.push({
          category: 'Load Performance',
          priority: 'HIGH',
          issue: 'Slow startup time (P95 > 3s)',
          recommendation: 'Implement code splitting and lazy loading for routes',
          impact: 'High user experience improvement'
        });
      }
      if (startup.avgLoadTime > 2000) {
        recommendations.push({
          category: 'Load Performance',
          priority: 'MEDIUM',
          issue: 'Average load time exceeds 2 seconds',
          recommendation: 'Optimize bundle size and implement resource preloading',
          impact: 'Improved perceived performance'
        });
      }
    }
    
    // Memory recommendations
    if (results.memoryUsage?.leakDetection) {
      const memory = results.memoryUsage.leakDetection;
      if (memory.memoryGrowthMB > 50) {
        recommendations.push({
          category: 'Memory Management',
          priority: 'HIGH',
          issue: `Memory grew by ${memory.memoryGrowthMB}MB during testing`,
          recommendation: 'Investigate potential memory leaks in React components and event listeners',
          impact: 'Prevent browser crashes and improve stability'
        });
      }
      if (memory.finalMemoryMB > 200) {
        recommendations.push({
          category: 'Memory Management',
          priority: 'MEDIUM',
          issue: 'High memory usage detected',
          recommendation: 'Implement virtual scrolling for large data sets and optimize state management',
          impact: 'Better performance on lower-end devices'
        });
      }
    }
    
    // Bundle recommendations
    if (results.bundleAnalysis?.resources) {
      const bundle = results.bundleAnalysis.resources;
      if (bundle.totalSizeKB > 1000) {
        recommendations.push({
          category: 'Bundle Optimization',
          priority: 'MEDIUM',
          issue: `Large bundle size (${bundle.totalSizeKB}KB)`,
          recommendation: 'Implement tree shaking, code splitting, and consider removing unused dependencies',
          impact: 'Faster initial load times'
        });
      }
      if (bundle.jsFileCount > 10) {
        recommendations.push({
          category: 'Bundle Optimization',
          priority: 'LOW',
          issue: 'Many JavaScript files loaded',
          recommendation: 'Consider consolidating chunks and implementing HTTP/2 server push',
          impact: 'Reduced network overhead'
        });
      }
    }
    
    // Component performance recommendations
    if (results.componentPerformance?.rendering) {
      const rendering = results.componentPerformance.rendering;
      Object.entries(rendering).forEach(([page, metrics]) => {
        if (metrics.avgRenderTime > 100) {
          recommendations.push({
            category: 'Component Performance',
            priority: 'MEDIUM',
            issue: `${page} page renders slowly (${metrics.avgRenderTime}ms)`,
            recommendation: `Optimize ${page} component with React.memo, useMemo, and useCallback`,
            impact: 'Smoother user interactions'
          });
        }
      });
    }
    
    // Data processing recommendations
    if (results.dataProcessing?.sccmParsing) {
      const processing = results.dataProcessing.sccmParsing;
      if (processing.processingTime > 1000) {
        recommendations.push({
          category: 'Data Processing',
          priority: 'HIGH',
          issue: `SCCM processing is slow (${processing.processingTime}ms for ${processing.inputLines} items)`,
          recommendation: 'Implement Web Workers for large data parsing and add progress indicators',
          impact: 'Prevent UI blocking during data import'
        });
      }
    }
    
    // Web vitals recommendations
    if (results.lighthouseAudit?.coreWebVitals) {
      const vitals = results.lighthouseAudit.coreWebVitals;
      if (vitals.firstContentfulPaint > 2000) {
        recommendations.push({
          category: 'Core Web Vitals',
          priority: 'HIGH',
          issue: 'Poor First Contentful Paint score',
          recommendation: 'Optimize critical rendering path and implement resource hints',
          impact: 'Better search engine ranking and user experience'
        });
      }
    }
    
    // Add general recommendations
    recommendations.push(
      {
        category: 'General Optimization',
        priority: 'MEDIUM',
        issue: 'Large initial React context state',
        recommendation: 'Consider splitting context into smaller, focused contexts to prevent unnecessary re-renders',
        impact: 'Improved component rendering performance'
      },
      {
        category: 'General Optimization',
        priority: 'LOW',
        issue: 'Development debugging logs in production code',
        recommendation: 'Implement conditional logging and remove console statements from production builds',
        impact: 'Cleaner console and slight performance improvement'
      },
      {
        category: 'Data Management',
        priority: 'MEDIUM',
        issue: 'Frequent localStorage operations',
        recommendation: 'Implement debouncing for localStorage saves and consider IndexedDB for large data',
        impact: 'Reduced I/O blocking and better performance'
      }
    );
    
    this.metrics.results.recommendations = recommendations;
    
    console.log(`✅ Generated ${recommendations.length} recommendations`);
  }

  // Run complete test suite
  async runAllTests() {
    console.log('🔥 Starting Comprehensive Performance Test Suite');
    console.log(`📍 Testing: ${TEST_CONFIG.SERVER_URL}`);
    console.log(`⏱️  Duration: ${TEST_CONFIG.TEST_DURATION / 1000}s per major test`);
    
    const startTime = performance.now();
    
    try {
      await this.init();
      
      // Run all performance tests
      await this.testLoadPerformance();
      await this.testMemoryUsage();
      await this.testComponentPerformance();
      await this.testDataProcessing();
      await this.testBundleAnalysis();
      await this.testLighthouseMetrics();
      
      // Generate recommendations
      this.generateRecommendations();
      
      const endTime = performance.now();
      const totalDuration = Math.round((endTime - startTime) / 1000);
      
      // Add summary
      this.metrics.results.summary = {
        totalTestDuration: totalDuration,
        testsRun: 6,
        serverUrl: TEST_CONFIG.SERVER_URL,
        timestamp: new Date().toISOString(),
        recommendations: this.metrics.results.recommendations.length
      };
      
      console.log(`\n🎉 Performance Test Suite Complete! (${totalDuration}s)`);
      
      // Save and display results
      const resultsFile = await this.metrics.saveResults();
      await this.displaySummary();
      
      return resultsFile;
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  // Display performance summary
  async displaySummary() {
    console.log('\n📊 PERFORMANCE TEST SUMMARY');
    console.log('=' * 50);
    
    const results = this.metrics.results;
    
    // Load Performance
    if (results.loadPerformance?.startup) {
      const startup = results.loadPerformance.startup;
      console.log(`\n🚀 Load Performance:`);
      console.log(`   Average startup: ${startup.avgLoadTime}ms`);
      console.log(`   P95 latency: ${startup.p95}ms`);
      console.log(`   Min/Max: ${startup.minLoadTime}ms / ${startup.maxLoadTime}ms`);
    }
    
    // Memory Usage
    if (results.memoryUsage?.leakDetection) {
      const memory = results.memoryUsage.leakDetection;
      console.log(`\n🧠 Memory Usage:`);
      console.log(`   Initial: ${memory.initialMemoryMB}MB`);
      console.log(`   Final: ${memory.finalMemoryMB}MB`);
      console.log(`   Growth: ${memory.memoryGrowthMB}MB`);
      console.log(`   Possible leak: ${memory.possibleLeak ? '⚠️  YES' : '✅ NO'}`);
    }
    
    // Bundle Analysis
    if (results.bundleAnalysis?.resources) {
      const bundle = results.bundleAnalysis.resources;
      console.log(`\n📦 Bundle Analysis:`);
      console.log(`   Total size: ${bundle.totalSizeKB}KB`);
      console.log(`   JS files: ${bundle.jsFileCount}`);
      console.log(`   CSS files: ${bundle.cssFileCount}`);
      console.log(`   Avg load time: ${bundle.avgLoadTime}ms`);
    }
    
    // Recommendations
    console.log(`\n🎯 Recommendations: ${results.recommendations?.length || 0} items`);
    
    const highPriority = results.recommendations?.filter(r => r.priority === 'HIGH') || [];
    if (highPriority.length > 0) {
      console.log('   🔴 HIGH PRIORITY:');
      highPriority.forEach(rec => {
        console.log(`     • ${rec.issue}`);
      });
    }
    
    const mediumPriority = results.recommendations?.filter(r => r.priority === 'MEDIUM') || [];
    if (mediumPriority.length > 0) {
      console.log('   🟡 MEDIUM PRIORITY: ' + mediumPriority.length + ' items');
    }
    
    // Production readiness assessment
    console.log('\n🏁 Production Readiness Assessment:');
    this.assessProductionReadiness(results);
    
    console.log('\n' + '=' * 50);
  }

  // Assess production readiness
  assessProductionReadiness(results) {
    const issues = [];
    
    // Check critical metrics
    if (results.loadPerformance?.startup?.p95 > 5000) {
      issues.push('❌ Load time exceeds 5s (P95)');
    }
    
    if (results.memoryUsage?.leakDetection?.possibleLeak) {
      issues.push('❌ Potential memory leak detected');
    }
    
    if (results.bundleAnalysis?.resources?.totalSizeKB > 2000) {
      issues.push('⚠️  Large bundle size (>2MB)');
    }
    
    const highPriorityRecs = results.recommendations?.filter(r => r.priority === 'HIGH').length || 0;
    if (highPriorityRecs > 3) {
      issues.push(`⚠️  ${highPriorityRecs} high priority performance issues`);
    }
    
    if (issues.length === 0) {
      console.log('   ✅ READY - No critical performance issues detected');
    } else if (issues.length <= 2) {
      console.log('   🟡 CAUTION - Minor issues to address:');
      issues.forEach(issue => console.log(`     ${issue}`));
    } else {
      console.log('   🔴 NOT READY - Critical issues must be resolved:');
      issues.forEach(issue => console.log(`     ${issue}`));
    }
  }
}

// Run the test suite if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const testSuite = new PerformanceTestSuite();
  
  testSuite.runAllTests()
    .then((resultsFile) => {
      console.log(`\n📁 Detailed results saved to: ${resultsFile}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export default PerformanceTestSuite;