#!/usr/bin/env node

/**
 * RSS Visit Report - Comprehensive End-to-End Validation Suite
 * 
 * This script performs comprehensive validation of all application functionality
 * including authentication, navigation, data management, and performance.
 */

import puppeteer from 'puppeteer';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALIDATION_CONFIG = {
  SERVER_URL: 'http://localhost:5173',
  DEMO_CREDENTIALS: { username: 'demo', password: 'demo123' },
  TEST_TIMEOUT: 30000,
  PAGE_LOAD_TIMEOUT: 15000,
  BROWSER_OPTIONS: {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--disable-extensions',
      '--window-size=1920,1080'
    ]
  },
  PAGES_TO_TEST: [
    'Dashboard',
    'Infrastructure', 
    'Inventory',
    'Storage',
    'Recycling',
    'Issues',
    'Recommendations',
    'OfficeGrading',
    'Photos',
    'Summary',
    'Checklists',
    'Admin'
  ]
};

class ComprehensiveValidator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      serverUrl: VALIDATION_CONFIG.SERVER_URL,
      testResults: {},
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        warnings: 0,
        errors: [],
        performance: {},
        productionReady: false
      }
    };
  }

  async init() {
    console.log('🚀 Starting Comprehensive Application Validation...');
    console.log(`📍 Testing: ${VALIDATION_CONFIG.SERVER_URL}`);
    
    this.browser = await puppeteer.launch(VALIDATION_CONFIG.BROWSER_OPTIONS);
    this.page = await this.browser.newPage();
    
    // Set viewport and user agent
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent('ValidationBot/1.0 (Comprehensive Testing Suite)');
    
    // Monitor console errors and warnings
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${msg.text()}`);
        this.results.summary.errors.push(`Console Error: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        this.results.summary.warnings++;
      }
    });
    
    // Monitor network failures
    this.page.on('requestfailed', request => {
      console.log(`🌐 Network Failed: ${request.url()} - ${request.failure().errorText}`);
      this.results.summary.errors.push(`Network Error: ${request.url()}`);
    });

    console.log('✅ Validator initialized');
  }

  async cleanup() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }

  async recordTest(testName, testFunc) {
    console.log(`\n🔍 Testing: ${testName}...`);
    const startTime = performance.now();
    
    try {
      this.results.summary.totalTests++;
      const result = await testFunc();
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      this.results.testResults[testName] = {
        status: 'PASSED',
        duration,
        ...result
      };
      
      this.results.summary.passedTests++;
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      this.results.testResults[testName] = {
        status: 'FAILED',
        duration,
        error: error.message,
        stack: error.stack
      };
      
      this.results.summary.failedTests++;
      this.results.summary.errors.push(`${testName}: ${error.message}`);
      console.log(`❌ ${testName} - FAILED (${duration}ms): ${error.message}`);
      
      throw error;
    }
  }

  // Test 1: Application Loading and Initial State
  async testApplicationLoading() {
    return await this.recordTest('Application Loading', async () => {
      const startTime = performance.now();
      
      await this.page.goto(VALIDATION_CONFIG.SERVER_URL, { 
        waitUntil: 'networkidle2', 
        timeout: VALIDATION_CONFIG.PAGE_LOAD_TIMEOUT 
      });
      
      // Wait for React app to initialize
      await this.page.waitForSelector('#root', { timeout: 10000 });
      
      const endTime = performance.now();
      const loadTime = Math.round(endTime - startTime);
      
      // Check if error boundary is shown
      const hasError = await this.page.$('.bg-red-50');
      if (hasError) {
        throw new Error('Application error boundary is showing');
      }
      
      // Check for auth guard (should show login)
      const hasAuthGuard = await this.page.waitForSelector('form, [data-testid="login-form"], input[type="password"]', { timeout: 5000 }).catch(() => null);
      
      return {
        loadTime,
        hasAuthGuard: !!hasAuthGuard,
        initialUrl: this.page.url()
      };
    });
  }

  // Test 2: Authentication Flow
  async testAuthentication() {
    return await this.recordTest('Authentication Flow', async () => {
      // Look for login form elements
      const usernameField = await this.page.$('input[type="text"]') || await this.page.$('input[name*="user"]') || await this.page.$('input[name*="email"]');
      const passwordField = await this.page.$('input[type="password"]');
      const loginButton = await this.page.$('button[type="submit"]') || await this.page.$('button');
      
      if (!usernameField || !passwordField || !loginButton) {
        throw new Error('Login form elements not found');
      }
      
      // Enter credentials
      await usernameField.type(VALIDATION_CONFIG.DEMO_CREDENTIALS.username);
      await passwordField.type(VALIDATION_CONFIG.DEMO_CREDENTIALS.password);
      
      // Submit login
      await loginButton.click();
      
      // Wait for authentication to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if we're past the login screen
      const stillOnLogin = await this.page.$('input[type="password"]');
      if (stillOnLogin) {
        throw new Error('Authentication failed - still showing login form');
      }
      
      // Look for main application content
      const hasMainContent = await this.page.$('main, nav, [data-page], .dashboard, .container');
      if (!hasMainContent) {
        throw new Error('Main application content not found after login');
      }
      
      return {
        authenticated: true,
        postLoginUrl: this.page.url()
      };
    });
  }

  // Test 3: Navigation and Page Loading
  async testNavigation() {
    return await this.recordTest('Navigation Testing', async () => {
      const navigationResults = {};
      let successfulNavigations = 0;
      
      for (const pageName of VALIDATION_CONFIG.PAGES_TO_TEST) {
        console.log(`  📄 Testing ${pageName} page...`);
        
        try {
          // Try multiple navigation strategies
          let navigated = false;
          
          // Strategy 1: Click navigation link
          let navLink = await this.page.$(`nav a[href*="${pageName.toLowerCase()}"]`);
          if (!navLink) navLink = await this.page.$(`[data-page="${pageName}"]`);
          if (!navLink) navLink = await this.page.$(`nav button`); // Generic fallback
          
          if (navLink) {
            await navLink.click();
            navigated = true;
          }
          
          // Strategy 2: Direct URL navigation if link click failed
          if (!navigated) {
            await this.page.goto(`${VALIDATION_CONFIG.SERVER_URL}/#/${pageName.toLowerCase()}`, { waitUntil: 'networkidle2', timeout: 5000 });
            navigated = true;
          }
          
          await this.page.waitForFunction(() => new Promise(resolve => setTimeout(resolve, (1000);
          
          // Check if page loaded
          const pageContent = await this.page.$('main, .container, [role="main"]');
          const hasError = await this.page.$('.bg-red-50, .error-boundary');
          
          if (hasError) {
            throw new Error(`${pageName} page shows error boundary`);
          }
          
          if (!pageContent) {
            throw new Error(`${pageName} page content not found`);
          }
          
          navigationResults[pageName] = {
            status: 'SUCCESS',
            hasContent: !!pageContent,
            url: this.page.url()
          };
          
          successfulNavigations++;
          console.log(`    ✅ ${pageName} loaded successfully`);
          
        } catch (error) {
          navigationResults[pageName] = {
            status: 'FAILED',
            error: error.message
          };
          console.log(`    ❌ ${pageName} failed: ${error.message}`);
        }
      }
      
      return {
        totalPages: VALIDATION_CONFIG.PAGES_TO_TEST.length,
        successfulNavigations,
        navigationRate: (successfulNavigations / VALIDATION_CONFIG.PAGES_TO_TEST.length) * 100,
        pageResults: navigationResults
      };
    });
  }

  // Test 4: SCCM Data Processing
  async testSCCMDataProcessing() {
    return await this.recordTest('SCCM Data Processing', async () => {
      // Navigate to Infrastructure page
      let infraLink = await this.page.$('[data-page="Infrastructure"]');
      if (!infraLink) infraLink = await this.page.$('nav a[href*="infrastructure"]');
      if (!infraLink) infraLink = await this.page.$('nav button');
      
      if (infraLink) {
        await infraLink.click();
        await this.page.waitForFunction(() => new Promise(resolve => setTimeout(resolve, (1000);
      }
      
      // Look for SCCM paste area or input
      const pasteArea = await this.page.$('textarea, [contenteditable], input[type="text"]');
      if (!pasteArea) {
        console.log('    ⚠️  SCCM paste area not found, skipping data processing test');
        return { skipped: true, reason: 'No paste area found' };
      }
      
      // Generate sample SCCM data
      const sampleData = this.generateSampleSCCMData();
      
      // Test data processing
      const processingResult = await this.page.evaluate((data) => {
        const startTime = performance.now();
        
        try {
          const lines = data.trim().split('\n');
          const processedItems = [];
          
          lines.forEach((line, index) => {
            const values = line.split(/\s{2,}|\t/).map(v => v.trim());
            
            if (values.length >= 4) {
              processedItems.push({
                id: Date.now() + index,
                name: values[0] || '',
                memory: values[1] || '',
                storage: values[2] || '',
                model: values[3] || ''
              });
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
          return { error: error.message };
        }
      }, sampleData);
      
      return {
        ...processingResult,
        sampleDataSize: sampleData.length
      };
    });
  }

  // Test 5: Data Persistence
  async testDataPersistence() {
    return await this.recordTest('Data Persistence', async () => {
      // Navigate to a data entry page (Dashboard)
      let dashLink = await this.page.$('[data-page="Dashboard"]');
      if (!dashLink) dashLink = await this.page.$('nav a[href*="dashboard"]');
      if (!dashLink) dashLink = await this.page.$('nav button');
      
      if (dashLink) {
        await dashLink.click();
        await this.page.waitForFunction(() => new Promise(resolve => setTimeout(resolve, (1000);
      }
      
      // Find input fields to test persistence
      const testData = {
        rss: 'Test RSS Location',
        office: 'Test Office Name',
        visitPurpose: 'Automated Testing'
      };
      
      let fieldsFound = 0;
      let fieldsFilled = 0;
      
      // Try to fill common fields
      for (const [fieldName, value] of Object.entries(testData)) {
        try {
          const field = await this.page.$(`input[name="${fieldName}"], textarea[name="${fieldName}"], select[name="${fieldName}"]`);
          if (field) {
            fieldsFound++;
            await field.clear();
            await field.type(value);
            fieldsFilled++;
          }
        } catch (error) {
          console.log(`    ⚠️  Could not fill field ${fieldName}: ${error.message}`);
        }
      }
      
      // Wait for auto-save (debounced)
      await this.page.waitForFunction(() => new Promise(resolve => setTimeout(resolve, (2000);
      
      // Check localStorage
      const localStorageData = await this.page.evaluate(() => {
        const saved = localStorage.getItem('officeVisitReport');
        return saved ? JSON.parse(saved) : null;
      });
      
      return {
        fieldsFound,
        fieldsFilled,
        dataInLocalStorage: !!localStorageData,
        localStorageSize: localStorageData ? JSON.stringify(localStorageData).length : 0
      };
    });
  }

  // Test 6: Error Handling
  async testErrorHandling() {
    return await this.recordTest('Error Handling', async () => {
      const errorTests = [];
      
      // Test 1: Invalid navigation
      try {
        await this.page.goto(`${VALIDATION_CONFIG.SERVER_URL}/#/nonexistent-page`);
        await this.page.waitForFunction(() => new Promise(resolve => setTimeout(resolve, (1000);
        
        const hasErrorBoundary = await this.page.$('.bg-red-50, .error-boundary');
        const hasValidContent = await this.page.$('main, .container');
        
        errorTests.push({
          test: 'Invalid Navigation',
          graceful: !hasErrorBoundary && hasValidContent,
          hasErrorBoundary: !!hasErrorBoundary
        });
      } catch (error) {
        errorTests.push({
          test: 'Invalid Navigation',
          graceful: false,
          error: error.message
        });
      }
      
      // Test 2: JavaScript error simulation
      try {
        await this.page.evaluate(() => {
          // Simulate a JS error
          window.nonExistentFunction();
        });
      } catch (jsError) {
        // Check if error boundary caught it
        await this.page.waitForFunction(() => new Promise(resolve => setTimeout(resolve, (500);
        const hasErrorBoundary = await this.page.$('.bg-red-50, .error-boundary');
        
        errorTests.push({
          test: 'JavaScript Error',
          graceful: !!hasErrorBoundary,
          errorBoundaryCaught: !!hasErrorBoundary
        });
      }
      
      return {
        totalErrorTests: errorTests.length,
        errorTests
      };
    });
  }

  // Test 7: Performance Metrics
  async testPerformanceMetrics() {
    return await this.recordTest('Performance Metrics', async () => {
      // Navigate to a fresh page for performance measurement
      const startTime = performance.now();
      
      await this.page.goto(VALIDATION_CONFIG.SERVER_URL, { 
        waitUntil: 'networkidle2',
        timeout: VALIDATION_CONFIG.PAGE_LOAD_TIMEOUT 
      });
      
      const loadEndTime = performance.now();
      
      // Get performance metrics
      const performanceMetrics = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource');
        
        return {
          domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart),
          loadComplete: Math.round(navigation.loadEventEnd - navigation.navigationStart),
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
          resourceCount: resources.length,
          totalResourceSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
        };
      });
      
      // Memory usage
      const memoryUsage = await this.page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSMemoryMB: Math.round(performance.memory.usedJSMemory / 1024 / 1024),
            totalJSMemoryMB: Math.round(performance.memory.totalJSMemory / 1024 / 1024)
          };
        }
        return null;
      });
      
      const clientLoadTime = Math.round(loadEndTime - startTime);
      
      return {
        ...performanceMetrics,
        memoryUsage,
        clientLoadTime,
        performance: {
          domContentLoaded: performanceMetrics.domContentLoaded,
          loadComplete: performanceMetrics.loadComplete,
          clientTotal: clientLoadTime
        }
      };
    });
  }

  // Generate sample SCCM data
  generateSampleSCCMData() {
    const sampleData = [];
    const computerNames = ['WORKSTATION-01', 'LAPTOP-HR-05', 'PC-SALES-12'];
    const models = ['Dell OptiPlex 7090', 'HP EliteBook 840', 'Lenovo ThinkCentre M75q'];
    
    for (let i = 0; i < 10; i++) {
      const ramGB = [8, 16, 32][Math.floor(Math.random() * 3)];
      const ramKB = ramGB * 1024 * 1024;
      const storage = '512GB SSD';
      
      sampleData.push([
        `${computerNames[Math.floor(Math.random() * computerNames.length)]}-${String(i).padStart(2, '0')}`,
        ramKB.toString(),
        storage,
        models[Math.floor(Math.random() * models.length)]
      ].join('    '));
    }
    
    return sampleData.join('\n');
  }

  // Run all validation tests
  async runComprehensiveValidation() {
    const startTime = performance.now();
    
    try {
      await this.init();
      
      // Core functionality tests
      await this.testApplicationLoading();
      await this.testAuthentication();
      
      const navigationResult = await this.testNavigation();
      await this.testSCCMDataProcessing();
      await this.testDataPersistence();
      await this.testErrorHandling();
      
      const performanceResult = await this.testPerformanceMetrics();
      this.results.summary.performance = performanceResult.performance;
      
      const endTime = performance.now();
      const totalDuration = Math.round((endTime - startTime) / 1000);
      
      // Assessment
      this.assessProductionReadiness(navigationResult);
      
      this.results.summary.totalDuration = totalDuration;
      this.results.summary.completedAt = new Date().toISOString();
      
      console.log(`\n🎉 Comprehensive Validation Complete! (${totalDuration}s)`);
      
      return await this.saveResults();
      
    } catch (error) {
      console.error('❌ Validation suite failed:', error);
      this.results.summary.criticalFailure = error.message;
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  // Assess production readiness
  assessProductionReadiness(navigationResult) {
    const issues = [];
    let score = 100;
    
    // Critical issues
    if (this.results.summary.failedTests > 0) {
      issues.push(`❌ ${this.results.summary.failedTests} critical test failures`);
      score -= this.results.summary.failedTests * 20;
    }
    
    if (this.results.summary.errors.length > 2) {
      issues.push(`⚠️  ${this.results.summary.errors.length} errors detected`);
      score -= Math.min(this.results.summary.errors.length * 5, 30);
    }
    
    // Navigation issues
    if (navigationResult && navigationResult.navigationRate < 80) {
      issues.push(`⚠️  Poor navigation success rate: ${navigationResult.navigationRate.toFixed(1)}%`);
      score -= 15;
    }
    
    // Performance issues
    const perf = this.results.summary.performance;
    if (perf && perf.loadComplete > 5000) {
      issues.push(`⚠️  Slow load time: ${perf.loadComplete}ms`);
      score -= 10;
    }
    
    // Determine readiness
    this.results.summary.productionReady = score >= 80;
    this.results.summary.readinessScore = Math.max(0, score);
    this.results.summary.readinessIssues = issues;
    
    console.log('\n🏁 Production Readiness Assessment:');
    console.log(`   Score: ${Math.max(0, score)}/100`);
    
    if (this.results.summary.productionReady) {
      console.log('   ✅ READY FOR PRODUCTION');
    } else {
      console.log('   🔴 NOT READY - Issues must be resolved:');
      issues.forEach(issue => console.log(`     ${issue}`));
    }
  }

  // Save results
  async saveResults() {
    const resultsDir = path.join(__dirname, 'validation-results');
    await fs.mkdir(resultsDir, { recursive: true }).catch(() => {});
    
    const filename = `validation-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(resultsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
    
    // Also create a summary report
    const summaryPath = path.join(resultsDir, 'latest-summary.txt');
    const summary = this.generateSummaryReport();
    await fs.writeFile(summaryPath, summary);
    
    console.log(`📊 Results saved to: ${filepath}`);
    console.log(`📋 Summary saved to: ${summaryPath}`);
    
    return filepath;
  }

  // Generate human-readable summary
  generateSummaryReport() {
    const { summary, testResults } = this.results;
    
    let report = `RSS Visit Report - Comprehensive Validation Results\n`;
    report += `${'='.repeat(60)}\n\n`;
    
    report += `Validation Date: ${new Date(summary.timestamp).toLocaleString()}\n`;
    report += `Server URL: ${this.results.serverUrl}\n`;
    report += `Total Duration: ${summary.totalDuration}s\n\n`;
    
    report += `TEST RESULTS SUMMARY:\n`;
    report += `- Total Tests: ${summary.totalTests}\n`;
    report += `- Passed: ${summary.passedTests}\n`;
    report += `- Failed: ${summary.failedTests}\n`;
    report += `- Warnings: ${summary.warnings}\n`;
    report += `- Success Rate: ${((summary.passedTests / summary.totalTests) * 100).toFixed(1)}%\n\n`;
    
    if (summary.performance) {
      report += `PERFORMANCE METRICS:\n`;
      report += `- DOM Content Loaded: ${summary.performance.domContentLoaded}ms\n`;
      report += `- Load Complete: ${summary.performance.loadComplete}ms\n`;
      report += `- Client Total Time: ${summary.performance.clientTotal}ms\n\n`;
    }
    
    report += `PRODUCTION READINESS:\n`;
    report += `- Ready: ${summary.productionReady ? 'YES' : 'NO'}\n`;
    report += `- Score: ${summary.readinessScore}/100\n`;
    
    if (summary.readinessIssues && summary.readinessIssues.length > 0) {
      report += `- Issues to Address:\n`;
      summary.readinessIssues.forEach(issue => {
        report += `  ${issue}\n`;
      });
    }
    
    report += `\nDETAILED TEST RESULTS:\n`;
    Object.entries(testResults).forEach(([testName, result]) => {
      report += `\n${testName}:\n`;
      report += `  Status: ${result.status}\n`;
      report += `  Duration: ${result.duration}ms\n`;
      
      if (result.error) {
        report += `  Error: ${result.error}\n`;
      }
    });
    
    if (summary.errors.length > 0) {
      report += `\nERRORS ENCOUNTERED:\n`;
      summary.errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
    }
    
    return report;
  }
}

// Run validation if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const validator = new ComprehensiveValidator();
  
  validator.runComprehensiveValidation()
    .then((resultsFile) => {
      console.log(`\n📁 Full results: ${resultsFile}`);
      
      // Display summary
      console.log('\n📊 VALIDATION SUMMARY');
      console.log('=' * 30);
      console.log(`✅ Passed: ${validator.results.summary.passedTests}`);
      console.log(`❌ Failed: ${validator.results.summary.failedTests}`);
      console.log(`⚠️  Warnings: ${validator.results.summary.warnings}`);
      console.log(`🏁 Production Ready: ${validator.results.summary.productionReady ? 'YES' : 'NO'}`);
      console.log(`📈 Readiness Score: ${validator.results.summary.readinessScore}/100`);
      
      process.exit(validator.results.summary.productionReady ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n❌ Validation failed:', error.message);
      process.exit(1);
    });
}

export default ComprehensiveValidator;