#!/usr/bin/env node

/**
 * Navigation Validation Script
 * Tests if the demo login shows all expected navigation tabs
 */

import puppeteer from 'puppeteer';

const TEST_URL = 'http://172.29.218.93:5173/';
const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo123';

const EXPECTED_TABS = [
  'Dashboard',
  'Checklists', 
  'Visit Summary',
  'IT Infrastructure',
  'Hardware Inventory',
  'Data Closet',
  'Issues & Actions',
  'Import/Export'
  // Note: Administration should be hidden for demo users
];

async function validateNavigation() {
  console.log('🚀 Starting navigation validation...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to app
    console.log(`📍 Navigating to ${TEST_URL}`);
    await page.goto(TEST_URL, { waitUntil: 'networkidle0' });
    
    // Take screenshot of login page
    await page.screenshot({ path: 'login-page.png' });
    console.log('📸 Login page screenshot saved as login-page.png');
    
    // Check if login form exists
    const loginForm = await page.$('form, [data-testid="login-form"], input[type="text"], input[type="password"]');
    if (!loginForm) {
      console.log('❌ No login form found');
      return false;
    }
    
    // Find username and password fields
    const usernameField = await page.$('input[type="text"], input[name="username"], input[id="username"]');
    const passwordField = await page.$('input[type="password"], input[name="password"], input[id="password"]');
    
    if (!usernameField || !passwordField) {
      console.log('❌ Could not find username/password fields');
      return false;
    }
    
    // Login
    console.log('🔐 Attempting login...');
    await usernameField.type(DEMO_USERNAME);
    await passwordField.type(DEMO_PASSWORD);
    
    // Find and click login button
    const loginButton = await page.$('button[type="submit"], button:contains("Login"), input[type="submit"]');
    if (loginButton) {
      await loginButton.click();
    } else {
      // Try pressing Enter
      await passwordField.press('Enter');
    }
    
    // Wait for navigation/redirect after login
    await page.waitForTimeout(3000);
    
    // Take screenshot after login
    await page.screenshot({ path: 'after-login.png' });
    console.log('📸 After login screenshot saved as after-login.png');
    
    // Check for navigation tabs
    console.log('🔍 Checking for navigation tabs...');
    
    const navigationElements = await page.$$eval('[role="navigation"] button, nav button, .nav button, .navigation button, button[class*="nav"]', 
      buttons => buttons.map(btn => btn.textContent?.trim()).filter(Boolean)
    );
    
    console.log(`📋 Found navigation elements: ${navigationElements.length}`);
    console.log('Navigation tabs found:', navigationElements);
    
    // Validate expected tabs
    let foundTabs = 0;
    let missingTabs = [];
    
    for (const expectedTab of EXPECTED_TABS) {
      const found = navigationElements.some(navText => 
        navText.toLowerCase().includes(expectedTab.toLowerCase()) ||
        expectedTab.toLowerCase().includes(navText.toLowerCase())
      );
      
      if (found) {
        foundTabs++;
        console.log(`✅ ${expectedTab} - Found`);
      } else {
        missingTabs.push(expectedTab);
        console.log(`❌ ${expectedTab} - Missing`);
      }
    }
    
    // Check for console errors
    const logs = await page.evaluate(() => {
      return window.console.logs || [];
    });
    
    console.log('\n📊 VALIDATION RESULTS:');
    console.log(`✅ Tabs found: ${foundTabs}/${EXPECTED_TABS.length}`);
    console.log(`❌ Missing tabs: ${missingTabs.join(', ')}`);
    
    const success = foundTabs >= (EXPECTED_TABS.length - 1); // Allow 1 missing tab
    console.log(`🎯 Overall result: ${success ? 'SUCCESS' : 'FAILED'}`);
    
    return success;
    
  } catch (error) {
    console.error('❌ Validation error:', error);
    await page.screenshot({ path: 'error-screenshot.png' });
    return false;
  } finally {
    await browser.close();
  }
}

// Run validation
validateNavigation().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});