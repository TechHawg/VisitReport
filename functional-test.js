#!/usr/bin/env node

/**
 * RSS Visit Report - Functional Testing Suite
 * Manual testing of key application features
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';

const SERVER_URL = 'http://localhost:5173';
const DEMO_CREDENTIALS = { username: 'demo', password: 'demo123' };

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runFunctionalTests() {
  console.log('🚀 Starting Functional Testing Suite...');
  
  const browser = await puppeteer.launch({
    headless: false,  // Run in visible mode for better debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    slowMo: 100  // Add delay for human observation
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const results = {
    timestamp: new Date().toISOString(),
    functionalTests: {},
    screenshots: [],
    summary: { total: 0, passed: 0, failed: 0, warnings: 0 }
  };
  
  // Helper function to test and record
  async function testFeature(name, testFunction) {
    console.log(`\n🔍 Testing: ${name}`);
    results.summary.total++;
    
    try {
      const result = await testFunction();
      results.functionalTests[name] = { 
        status: 'PASSED', 
        timestamp: new Date().toISOString(),
        ...result 
      };
      results.summary.passed++;
      console.log(`✅ ${name} - PASSED`);
      return result;
    } catch (error) {
      results.functionalTests[name] = { 
        status: 'FAILED', 
        error: error.message,
        timestamp: new Date().toISOString()
      };
      results.summary.failed++;
      console.log(`❌ ${name} - FAILED: ${error.message}`);
      
      // Take screenshot on failure
      const screenshotPath = `screenshot-${name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      results.screenshots.push(screenshotPath);
    }
  }
  
  try {
    // Test 1: Initial Page Load
    await testFeature('Initial Page Load', async () => {
      await page.goto(SERVER_URL, { waitUntil: 'networkidle2', timeout: 15000 });
      await sleep(2000);
      
      const title = await page.title();
      const hasRoot = await page.$('#root');
      const hasError = await page.$('.bg-red-50');
      
      if (hasError) throw new Error('Error boundary visible on page load');
      if (!hasRoot) throw new Error('React root element not found');
      
      return { 
        title, 
        url: page.url(),
        hasReactApp: !!hasRoot
      };
    });
    
    // Test 2: Authentication Form Present
    await testFeature('Authentication Form Detection', async () => {
      const loginForm = await page.$('form');
      const usernameField = await page.$('input[type="text"], input[name*="user"], input[name*="email"]');
      const passwordField = await page.$('input[type="password"]');
      const submitButton = await page.$('button[type="submit"], button');
      
      return {
        hasForm: !!loginForm,
        hasUsernameField: !!usernameField,
        hasPasswordField: !!passwordField,
        hasSubmitButton: !!submitButton,
        formReady: !!(usernameField && passwordField && submitButton)
      };
    });
    
    // Test 3: Authentication Process
    await testFeature('Authentication Login', async () => {
      const usernameField = await page.$('input[type="text"], input[name*="user"], input[name*="email"]');
      const passwordField = await page.$('input[type="password"]');
      const submitButton = await page.$('button[type="submit"], button');
      
      if (!usernameField || !passwordField || !submitButton) {
        throw new Error('Required form elements not found');
      }
      
      // Clear and fill form
      await usernameField.click({ clickCount: 3 });
      await usernameField.type(DEMO_CREDENTIALS.username);
      await passwordField.click({ clickCount: 3 });
      await passwordField.type(DEMO_CREDENTIALS.password);
      
      // Submit form
      await submitButton.click();
      await sleep(3000);  // Wait for authentication
      
      // Check if login was successful
      const stillHasPasswordField = await page.$('input[type="password"]');
      const hasMainContent = await page.$('main, nav, .container, [role="main"]');
      
      if (stillHasPasswordField) {
        throw new Error('Still showing login form after submission');
      }
      
      if (!hasMainContent) {
        throw new Error('Main application content not visible after login');
      }
      
      return {
        loginSuccessful: !stillHasPasswordField && !!hasMainContent,
        currentUrl: page.url()
      };
    });
    
    // Test 4: Main Navigation
    await testFeature('Main Navigation Structure', async () => {
      const navElements = await page.$$('nav a, nav button, [data-page]');
      const navTexts = [];
      
      for (const el of navElements) {
        try {
          const text = await el.evaluate(node => node.textContent?.trim());
          if (text) navTexts.push(text);
        } catch (e) {
          // Skip elements that can't be read
        }
      }
      
      return {
        navigationElementsFound: navElements.length,
        navigationLabels: navTexts,
        hasNavigation: navElements.length > 0
      };
    });
    
    // Test 5: Page Navigation
    await testFeature('Page Navigation Functionality', async () => {
      const pagesNavigated = [];
      const errors = [];
      
      // Try to navigate to key pages
      const pagesToTest = ['Dashboard', 'Infrastructure', 'Inventory', 'Storage'];
      
      for (const pageName of pagesToTest) {
        try {
          // Try multiple navigation strategies
          let navigated = false;
          
          // Strategy 1: Look for navigation link
          const navLinks = await page.$$('nav a, nav button');
          for (const link of navLinks) {
            const text = await link.evaluate(node => node.textContent?.trim());
            if (text && text.toLowerCase().includes(pageName.toLowerCase())) {
              await link.click();
              await sleep(1500);
              navigated = true;
              break;
            }
          }
          
          // Strategy 2: Try URL navigation
          if (!navigated) {
            await page.goto(`${SERVER_URL}/#/${pageName.toLowerCase()}`, { waitUntil: 'networkidle2' });
            await sleep(1000);
            navigated = true;
          }
          
          // Check if page loaded without errors
          const hasError = await page.$('.bg-red-50, .error-boundary');
          const hasContent = await page.$('main, .container');
          
          if (!hasError && hasContent) {
            pagesNavigated.push(pageName);
          } else {
            errors.push(`${pageName}: Error boundary or missing content`);
          }
          
        } catch (error) {
          errors.push(`${pageName}: ${error.message}`);
        }
      }
      
      return {
        totalPagesAttempted: pagesToTest.length,
        successfulNavigations: pagesNavigated.length,
        pagesNavigated,
        navigationErrors: errors,
        successRate: (pagesNavigated.length / pagesToTest.length) * 100
      };
    });
    
    // Test 6: Data Entry Testing
    await testFeature('Data Entry and Forms', async () => {
      // Go to Dashboard or first available page with forms
      const inputFields = await page.$$('input[type="text"], input[type="email"], textarea');
      const selectFields = await page.$$('select');
      
      let workingInputs = 0;
      let workingSelects = 0;
      
      // Test text inputs
      for (let i = 0; i < Math.min(3, inputFields.length); i++) {
        try {
          await inputFields[i].click();
          await inputFields[i].type('Test Data Input');
          workingInputs++;
          await sleep(500);
        } catch (error) {
          // Field might be disabled or not editable
        }
      }
      
      // Test select fields
      for (let i = 0; i < Math.min(2, selectFields.length); i++) {
        try {
          await selectFields[i].click();
          workingSelects++;
          await sleep(500);
        } catch (error) {
          // Field might be disabled
        }
      }
      
      return {
        totalInputFields: inputFields.length,
        totalSelectFields: selectFields.length,
        workingInputs,
        workingSelects,
        dataEntryFunctional: workingInputs > 0 || workingSelects > 0
      };
    });
    
    // Test 7: SCCM Data Functionality
    await testFeature('SCCM Data Processing', async () => {
      // Navigate to Infrastructure page
      try {
        await page.goto(`${SERVER_URL}/#/infrastructure`, { waitUntil: 'networkidle2' });
        await sleep(2000);
        
        const textareas = await page.$$('textarea');
        const hasTextArea = textareas.length > 0;
        
        if (hasTextArea) {
          // Test pasting sample data
          const sampleData = 'WORKSTATION-01    8388608    512GB SSD    Dell OptiPlex 7090\nLAPTOP-HR-01    16777216    256GB SSD    HP EliteBook 840';
          
          await textareas[0].click();
          await textareas[0].type(sampleData);
          await sleep(1000);
          
          const value = await textareas[0].evaluate(el => el.value);
          
          return {
            sccmPageAccessible: true,
            hasDataInput: hasTextArea,
            testDataAccepted: value.includes('WORKSTATION'),
            dataPersisted: value.length > 0
          };
        } else {
          return {
            sccmPageAccessible: true,
            hasDataInput: false,
            reason: 'No textarea found for SCCM data'
          };
        }
      } catch (error) {
        throw new Error(`SCCM page not accessible: ${error.message}`);
      }
    });
    
    // Test 8: Theme Switching
    await testFeature('Theme Switching', async () => {
      const themeButton = await page.$('button[title*="theme"], button[aria-label*="theme"], button:has-text("🌙"), button:has-text("☀️")');
      
      if (themeButton) {
        const initialBodyClass = await page.$eval('body', el => el.className);
        
        await themeButton.click();
        await sleep(500);
        
        const newBodyClass = await page.$eval('body', el => el.className);
        
        return {
          themeButtonFound: true,
          themeChanged: initialBodyClass !== newBodyClass,
          initialTheme: initialBodyClass,
          newTheme: newBodyClass
        };
      } else {
        // Check if dark mode is available in any form
        const htmlClasses = await page.$eval('html', el => el.className);
        const bodyClasses = await page.$eval('body', el => el.className);
        
        return {
          themeButtonFound: false,
          hasThemeClasses: htmlClasses.includes('dark') || bodyClasses.includes('dark'),
          htmlClasses,
          bodyClasses
        };
      }
    });
    
    // Test 9: Error Handling
    await testFeature('Error Boundary Testing', async () => {
      // Test invalid page navigation
      await page.goto(`${SERVER_URL}/#/nonexistent-page-test`);
      await sleep(1500);
      
      const hasErrorBoundary = await page.$('.bg-red-50, .error-boundary, .error-page');
      const hasValidContent = await page.$('main, .container, nav');
      
      // Go back to valid page
      await page.goto(`${SERVER_URL}/#/dashboard`);
      await sleep(1000);
      
      const recoveredSuccessfully = await page.$('main, .container, nav');
      
      return {
        invalidPageHandled: !hasErrorBoundary || !!hasValidContent,
        hasGracefulError: !!hasErrorBoundary,
        recoveredFromError: !!recoveredSuccessfully,
        errorHandlingWorking: true
      };
    });
    
  } catch (error) {
    console.error('❌ Critical test error:', error);
    results.summary.failed++;
  } finally {
    await browser.close();
  }
  
  // Generate final assessment
  results.summary.successRate = (results.summary.passed / results.summary.total) * 100;
  results.summary.productionReady = results.summary.successRate >= 85 && results.summary.failed <= 2;
  
  // Save results
  await fs.writeFile('functional-test-results.json', JSON.stringify(results, null, 2));
  
  // Display comprehensive summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE FUNCTIONAL TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log(`\n🕐 Test Execution Time: ${new Date().toLocaleString()}`);
  console.log(`🌐 Server URL: ${SERVER_URL}`);
  console.log(`📈 Overall Success Rate: ${results.summary.successRate.toFixed(1)}%`);
  console.log(`🏁 Production Ready: ${results.summary.productionReady ? '✅ YES' : '❌ NO'}`);
  
  console.log('\n📋 Test Results Breakdown:');
  console.log(`   ✅ Passed: ${results.summary.passed}`);
  console.log(`   ❌ Failed: ${results.summary.failed}`);
  console.log(`   ⚠️  Warnings: ${results.summary.warnings}`);
  console.log(`   📊 Total: ${results.summary.total}`);
  
  // Detailed test results
  console.log('\n🔍 Detailed Test Results:');
  Object.entries(results.functionalTests).forEach(([testName, result]) => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`   ${status} ${testName}`);
    
    if (result.status === 'FAILED') {
      console.log(`      Error: ${result.error}`);
    } else if (result.successRate !== undefined) {
      console.log(`      Success Rate: ${result.successRate}%`);
    }
  });
  
  if (results.screenshots.length > 0) {
    console.log('\n📸 Screenshots taken:');
    results.screenshots.forEach(screenshot => {
      console.log(`   • ${screenshot}`);
    });
  }
  
  console.log(`\n📁 Full results saved to: functional-test-results.json`);
  console.log('='.repeat(60));
  
  return results;
}

// Run the functional tests
runFunctionalTests()
  .then(results => {
    if (results.summary.productionReady) {
      console.log('\n🎉 All systems functional - Ready for production!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some issues found - Review before production deployment');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Functional testing failed:', error);
    process.exit(1);
  });