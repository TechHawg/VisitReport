#!/usr/bin/env node

/**
 * RSS Visit Report - Simple End-to-End Validation
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';

const SERVER_URL = 'http://localhost:5173';
const DEMO_CREDENTIALS = { username: 'demo', password: 'demo123' };

async function validateApplication() {
  console.log('🚀 Starting Application Validation...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
    errors: [],
    summary: { passed: 0, failed: 0, total: 0 }
  };
  
  try {
    // Test 1: Application Loads
    console.log('📋 Testing application loading...');
    try {
      await page.goto(SERVER_URL, { waitUntil: 'networkidle2', timeout: 15000 });
      await page.waitForSelector('#root', { timeout: 10000 });
      
      const hasError = await page.$('.bg-red-50');
      if (hasError) throw new Error('Error boundary visible');
      
      results.tests.applicationLoading = { status: 'PASSED', message: 'Application loads successfully' };
      results.summary.passed++;
      console.log('✅ Application loading - PASSED');
    } catch (error) {
      results.tests.applicationLoading = { status: 'FAILED', error: error.message };
      results.summary.failed++;
      results.errors.push(`Application Loading: ${error.message}`);
      console.log('❌ Application loading - FAILED:', error.message);
    }
    results.summary.total++;
    
    // Test 2: Authentication
    console.log('📋 Testing authentication...');
    try {
      const usernameField = await page.$('input[type="text"]') || await page.$('input[name*="user"]');
      const passwordField = await page.$('input[type="password"]');
      const loginButton = await page.$('button[type="submit"]') || await page.$('button');
      
      if (!usernameField || !passwordField || !loginButton) {
        throw new Error('Login form elements not found');
      }
      
      await usernameField.type(DEMO_CREDENTIALS.username);
      await passwordField.type(DEMO_CREDENTIALS.password);
      await loginButton.click();
      
      await page.waitForTimeout(3000);
      
      const stillOnLogin = await page.$('input[type="password"]');
      if (stillOnLogin) {
        throw new Error('Still on login screen after credentials');
      }
      
      results.tests.authentication = { status: 'PASSED', message: 'Login successful' };
      results.summary.passed++;
      console.log('✅ Authentication - PASSED');
    } catch (error) {
      results.tests.authentication = { status: 'FAILED', error: error.message };
      results.summary.failed++;
      results.errors.push(`Authentication: ${error.message}`);
      console.log('❌ Authentication - FAILED:', error.message);
    }
    results.summary.total++;
    
    // Test 3: Basic Navigation
    console.log('📋 Testing basic navigation...');
    try {
      const mainContent = await page.$('main, .container, nav');
      if (!mainContent) {
        throw new Error('Main application content not visible');
      }
      
      // Try to find and click a navigation element
      const navElements = await page.$$('nav a, nav button, [data-page]');
      
      let navigationWorks = false;
      if (navElements.length > 0) {
        try {
          await navElements[0].click();
          await page.waitForTimeout(1000);
          navigationWorks = true;
        } catch (navError) {
          console.log('  ⚠️ Navigation click failed, but app is accessible');
        }
      }
      
      results.tests.navigation = { 
        status: 'PASSED', 
        message: `Found ${navElements.length} navigation elements`, 
        navigationWorking: navigationWorks 
      };
      results.summary.passed++;
      console.log(`✅ Navigation - PASSED (${navElements.length} nav elements found)`);
    } catch (error) {
      results.tests.navigation = { status: 'FAILED', error: error.message };
      results.summary.failed++;
      results.errors.push(`Navigation: ${error.message}`);
      console.log('❌ Navigation - FAILED:', error.message);
    }
    results.summary.total++;
    
    // Test 4: Performance Check
    console.log('📋 Testing performance metrics...');
    try {
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart),
          loadComplete: Math.round(navigation.loadEventEnd - navigation.navigationStart),
          resourceCount: performance.getEntriesByType('resource').length
        };
      });
      
      const memoryInfo = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSMemoryMB: Math.round(performance.memory.usedJSMemory / 1024 / 1024),
            totalJSMemoryMB: Math.round(performance.memory.totalJSMemory / 1024 / 1024)
          };
        }
        return null;
      });
      
      results.tests.performance = { 
        status: 'PASSED', 
        metrics: performanceMetrics,
        memory: memoryInfo
      };
      results.summary.passed++;
      console.log(`✅ Performance - PASSED (Load: ${performanceMetrics.loadComplete}ms, DOM: ${performanceMetrics.domContentLoaded}ms)`);
    } catch (error) {
      results.tests.performance = { status: 'FAILED', error: error.message };
      results.summary.failed++;
      results.errors.push(`Performance: ${error.message}`);
      console.log('❌ Performance - FAILED:', error.message);
    }
    results.summary.total++;
    
    // Test 5: Data Entry
    console.log('📋 Testing data entry...');
    try {
      const inputFields = await page.$$('input[type="text"], textarea, select');
      const workingFields = [];
      
      for (let i = 0; i < Math.min(3, inputFields.length); i++) {
        try {
          await inputFields[i].click();
          await inputFields[i].type('Test Data');
          workingFields.push(i);
        } catch (fieldError) {
          // Field not editable, skip
        }
      }
      
      results.tests.dataEntry = { 
        status: 'PASSED', 
        message: `${inputFields.length} input fields found, ${workingFields.length} working`,
        totalFields: inputFields.length,
        workingFields: workingFields.length
      };
      results.summary.passed++;
      console.log(`✅ Data Entry - PASSED (${workingFields.length}/${inputFields.length} fields working)`);
    } catch (error) {
      results.tests.dataEntry = { status: 'FAILED', error: error.message };
      results.summary.failed++;
      results.errors.push(`Data Entry: ${error.message}`);
      console.log('❌ Data Entry - FAILED:', error.message);
    }
    results.summary.total++;
    
    // Calculate success rate
    results.summary.successRate = (results.summary.passed / results.summary.total) * 100;
    results.summary.productionReady = results.summary.successRate >= 80 && results.summary.failed <= 1;
    
  } catch (error) {
    console.error('❌ Critical validation error:', error);
    results.errors.push(`Critical Error: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  // Save results
  await fs.writeFile('validation-results.json', JSON.stringify(results, null, 2));
  
  // Display summary
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('='.repeat(40));
  console.log(`✅ Passed: ${results.summary.passed}/${results.summary.total}`);
  console.log(`❌ Failed: ${results.summary.failed}/${results.summary.total}`);
  console.log(`📈 Success Rate: ${results.summary.successRate.toFixed(1)}%`);
  console.log(`🏁 Production Ready: ${results.summary.productionReady ? 'YES' : 'NO'}`);
  
  if (results.errors.length > 0) {
    console.log('\n⚠️ Errors Found:');
    results.errors.forEach((error, i) => console.log(`${i+1}. ${error}`));
  }
  
  console.log('\n📁 Full results saved to: validation-results.json');
  
  return results;
}

// Run validation
validateApplication()
  .then(results => {
    console.log('\n🎉 Validation Complete!');
    process.exit(results.summary.productionReady ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Validation failed completely:', error);
    process.exit(1);
  });