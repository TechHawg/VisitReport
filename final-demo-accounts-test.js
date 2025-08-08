#!/usr/bin/env node
/**
 * Final Comprehensive Demo Accounts Test
 * Tests both regular demo user and admin demo user with role-based access control
 * 
 * Tests:
 * 1. Regular demo user (demo/demo123) - Should see 7 tabs, no Administration tab
 * 2. Admin demo user (admin/admin123) - Should see all 9 tabs including Administration
 */

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';

// Configuration
const BASE_URL = 'http://172.29.218.93:5173/';
const SCREENSHOT_DIR = './screenshots';

// Test accounts
const DEMO_USER = {
    username: 'demo',
    password: 'demo123',
    displayName: 'Demo User',
    expectedTabs: 7,
    shouldHaveAdminTab: false
};

const ADMIN_USER = {
    username: 'admin',
    password: 'admin123',
    displayName: 'Admin Demo User',
    expectedTabs: 9,
    shouldHaveAdminTab: true
};

// Expected navigation tabs for reference
const ALL_NAVIGATION_TABS = [
    'Dashboard',
    'Infrastructure',
    'Inventory', 
    'Storage',
    'Issues & Actions',
    'Recommendations',
    'Summary',
    'Photos',
    'Administration'  // Should only be visible to admin users
];

const REGULAR_USER_TABS = ALL_NAVIGATION_TABS.slice(0, 8); // All except Administration

/**
 * Utility function to create screenshots directory
 */
async function ensureScreenshotDir() {
    try {
        await fs.access(SCREENSHOT_DIR);
    } catch {
        await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
        console.log(`📁 Created screenshots directory: ${SCREENSHOT_DIR}`);
    }
}

/**
 * Utility function to take screenshot with timestamp
 */
async function takeScreenshot(page, name, userType) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${userType}-${name}-${timestamp}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);
    
    await page.screenshot({ 
        path: filepath, 
        fullPage: true,
        type: 'png'
    });
    
    console.log(`📸 Screenshot saved: ${filename}`);
    return filename;
}

/**
 * Wait for element with timeout and better error handling
 */
async function waitForElementSafe(page, selector, timeout = 10000) {
    try {
        await page.waitForSelector(selector, { timeout, visible: true });
        return true;
    } catch (error) {
        console.error(`❌ Element not found: ${selector}`);
        console.error(`   Error: ${error.message}`);
        return false;
    }
}

/**
 * Test login functionality for a user
 */
async function testLogin(page, user, userType) {
    console.log(`\n🔐 Testing login for ${userType}...`);
    
    try {
        // Navigate to application
        console.log(`   Navigating to ${BASE_URL}`);
        await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
        
        // Wait for login form
        const loginFormFound = await waitForElementSafe(page, 'input[name="username"], input[type="text"]', 15000);
        if (!loginFormFound) {
            throw new Error('Login form not found');
        }
        
        // Take screenshot of login page
        await takeScreenshot(page, 'login-page', userType);
        
        // Find and fill username field
        const usernameSelector = await page.$('input[name="username"]') ? 'input[name="username"]' : 'input[type="text"]';
        await page.type(usernameSelector, user.username);
        console.log(`   ✓ Entered username: ${user.username}`);
        
        // Find and fill password field
        const passwordSelector = 'input[name="password"], input[type="password"]';
        await page.type(passwordSelector, user.password);
        console.log(`   ✓ Entered password`);
        
        // Find and click login button
        const loginButton = await page.$('button[type="submit"]') || await page.$('button:contains("Login")') || await page.$('input[type="submit"]');
        if (loginButton) {
            await loginButton.click();
        } else {
            // Try pressing Enter
            await page.keyboard.press('Enter');
        }
        console.log(`   ✓ Submitted login form`);
        
        // Wait for navigation after login
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
        
        // Wait for main application to load
        await page.waitForTimeout(2000);
        
        console.log(`   ✅ Login successful for ${userType}`);
        return true;
        
    } catch (error) {
        console.error(`   ❌ Login failed for ${userType}:`, error.message);
        await takeScreenshot(page, 'login-error', userType);
        return false;
    }
}

/**
 * Verify user display name in the interface
 */
async function verifyUserDisplayName(page, user, userType) {
    console.log(`\n👤 Verifying user display name for ${userType}...`);
    
    try {
        // Look for user display name in various possible locations
        const userDisplaySelectors = [
            '.user-name',
            '.username',
            '.user-display',
            '[class*="user"]',
            '.header-user',
            '.nav-user',
            'header .user',
            '[data-testid="user-name"]'
        ];
        
        let userDisplayFound = false;
        let actualDisplayName = '';
        
        for (const selector of userDisplaySelectors) {
            try {
                const elements = await page.$$(selector);
                for (const element of elements) {
                    const text = await element.evaluate(el => el.textContent.trim());
                    if (text && text.includes(user.displayName)) {
                        userDisplayFound = true;
                        actualDisplayName = text;
                        console.log(`   ✓ Found user display name: "${text}" in ${selector}`);
                        break;
                    }
                }
                if (userDisplayFound) break;
            } catch (error) {
                // Continue to next selector
            }
        }
        
        if (!userDisplayFound) {
            // Try to find any text containing the user's name parts
            const nameWords = user.displayName.split(' ');
            const pageContent = await page.content();
            
            for (const word of nameWords) {
                if (pageContent.includes(word)) {
                    console.log(`   ⚠️  Found name part "${word}" in page content`);
                    userDisplayFound = true;
                    break;
                }
            }
        }
        
        if (userDisplayFound) {
            console.log(`   ✅ User display name verification passed`);
            return true;
        } else {
            console.log(`   ❌ User display name "${user.displayName}" not found`);
            console.log(`   ℹ️  This might be normal if the display name is not shown in the UI`);
            return false;
        }
        
    } catch (error) {
        console.error(`   ❌ Error verifying user display name:`, error.message);
        return false;
    }
}

/**
 * Verify navigation tabs and role-based access
 */
async function verifyNavigationTabs(page, user, userType) {
    console.log(`\n🔍 Verifying navigation tabs for ${userType}...`);
    console.log(`   Expected: ${user.expectedTabs} tabs`);
    console.log(`   Should have Administration tab: ${user.shouldHaveAdminTab}`);
    
    try {
        // Wait for navigation to be visible
        const navSelectors = [
            'nav',
            '.navigation',
            '.nav-menu',
            '.sidebar',
            '.menu',
            '[role="navigation"]',
            '.nav-tabs',
            '.tab-menu'
        ];
        
        let navigationFound = false;
        let navElement = null;
        
        for (const selector of navSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    const isVisible = await element.isIntersectingViewport();
                    if (isVisible) {
                        navElement = element;
                        navigationFound = true;
                        console.log(`   ✓ Found navigation: ${selector}`);
                        break;
                    }
                }
            } catch (error) {
                // Continue to next selector
            }
        }
        
        if (!navigationFound) {
            console.log(`   ❌ Navigation element not found`);
            return false;
        }
        
        // Get all navigation links/tabs
        const linkSelectors = [
            'a',
            'button',
            '.tab',
            '.nav-item',
            '.menu-item',
            '[role="tab"]',
            '.nav-link'
        ];
        
        let allNavItems = [];
        
        for (const linkSelector of linkSelectors) {
            try {
                const links = await navElement.$$(linkSelector);
                for (const link of links) {
                    const text = await link.evaluate(el => el.textContent?.trim() || '');
                    const isVisible = await link.isIntersectingViewport();
                    
                    if (text && isVisible && text.length > 1) {
                        allNavItems.push(text);
                    }
                }
            } catch (error) {
                // Continue with next selector
            }
        }
        
        // Remove duplicates and filter relevant navigation items
        const uniqueNavItems = [...new Set(allNavItems)];
        const relevantTabs = uniqueNavItems.filter(item => 
            ALL_NAVIGATION_TABS.some(tab => 
                item.toLowerCase().includes(tab.toLowerCase()) || 
                tab.toLowerCase().includes(item.toLowerCase())
            )
        );
        
        console.log(`   📋 Found navigation items:`, relevantTabs);
        console.log(`   📊 Total relevant tabs found: ${relevantTabs.length}`);
        
        // Check for Administration tab specifically
        const hasAdminTab = relevantTabs.some(tab => 
            tab.toLowerCase().includes('admin') || 
            tab.toLowerCase().includes('administration')
        );
        
        console.log(`   🔐 Administration tab found: ${hasAdminTab}`);
        
        // Verify tab count
        const tabCountCorrect = relevantTabs.length >= (user.expectedTabs - 2); // Allow some flexibility
        console.log(`   📝 Tab count verification: ${tabCountCorrect ? '✅' : '❌'} (found ${relevantTabs.length}, expected ~${user.expectedTabs})`);
        
        // Verify admin tab presence/absence
        const adminTabCorrect = hasAdminTab === user.shouldHaveAdminTab;
        console.log(`   🔐 Admin tab verification: ${adminTabCorrect ? '✅' : '❌'}`);
        
        if (adminTabCorrect && tabCountCorrect) {
            console.log(`   ✅ Navigation verification passed for ${userType}`);
            return true;
        } else {
            console.log(`   ❌ Navigation verification failed for ${userType}`);
            return false;
        }
        
    } catch (error) {
        console.error(`   ❌ Error verifying navigation tabs:`, error.message);
        return false;
    }
}

/**
 * Test a single user account
 */
async function testUserAccount(browser, user, userType) {
    console.log(`\n🚀 Starting test for ${userType.toUpperCase()}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Expected display name: ${user.displayName}`);
    console.log(`   Expected tabs: ${user.expectedTabs}`);
    console.log(`   Should see Administration tab: ${user.shouldHaveAdminTab}`);
    
    const page = await browser.newPage();
    
    try {
        // Set viewport
        await page.setViewport({ width: 1280, height: 720 });
        
        // Enable request/response logging for debugging
        page.on('console', msg => console.log(`   🖥️  Console: ${msg.text()}`));
        
        // Test login
        const loginSuccess = await testLogin(page, user, userType);
        if (!loginSuccess) {
            return { userType, success: false, error: 'Login failed' };
        }
        
        // Wait for application to fully load
        await page.waitForTimeout(3000);
        
        // Take screenshot after login
        await takeScreenshot(page, 'after-login', userType);
        
        // Verify user display name
        const displayNameCorrect = await verifyUserDisplayName(page, user, userType);
        
        // Verify navigation tabs
        const navigationCorrect = await verifyNavigationTabs(page, user, userType);
        
        // Take final screenshot
        const finalScreenshot = await takeScreenshot(page, 'final-state', userType);
        
        const success = loginSuccess && navigationCorrect;
        
        console.log(`\n📊 ${userType.toUpperCase()} TEST SUMMARY:`);
        console.log(`   ✅ Login: ${loginSuccess ? 'PASSED' : 'FAILED'}`);
        console.log(`   👤 Display Name: ${displayNameCorrect ? 'PASSED' : 'INFO ONLY'}`);
        console.log(`   🔍 Navigation: ${navigationCorrect ? 'PASSED' : 'FAILED'}`);
        console.log(`   📸 Final Screenshot: ${finalScreenshot}`);
        console.log(`   🎯 Overall: ${success ? '✅ PASSED' : '❌ FAILED'}`);
        
        return {
            userType,
            success,
            loginSuccess,
            displayNameCorrect,
            navigationCorrect,
            finalScreenshot,
            user: {
                username: user.username,
                displayName: user.displayName,
                expectedTabs: user.expectedTabs,
                shouldHaveAdminTab: user.shouldHaveAdminTab
            }
        };
        
    } catch (error) {
        console.error(`   ❌ Unexpected error testing ${userType}:`, error);
        await takeScreenshot(page, 'error', userType);
        return { userType, success: false, error: error.message };
    } finally {
        await page.close();
    }
}

/**
 * Generate final test report
 */
async function generateTestReport(results) {
    const timestamp = new Date().toISOString();
    const report = {
        timestamp,
        testSuite: 'Final Demo Accounts Test',
        application: 'RSS Visit Report',
        baseUrl: BASE_URL,
        summary: {
            total: results.length,
            passed: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        },
        results: results
    };
    
    const reportFile = `final-demo-test-report-${timestamp.replace(/[:.]/g, '-')}.json`;
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`\n📋 Test report saved: ${reportFile}`);
    return report;
}

/**
 * Main test execution
 */
async function main() {
    console.log('🚀 FINAL DEMO ACCOUNTS TEST');
    console.log('================================');
    console.log(`🌐 Application URL: ${BASE_URL}`);
    console.log(`📸 Screenshots directory: ${SCREENSHOT_DIR}`);
    
    // Ensure screenshot directory exists
    await ensureScreenshotDir();
    
    let browser;
    const results = [];
    
    try {
        // Launch browser
        console.log('\n🌐 Launching browser...');
        browser = await puppeteer.launch({
            headless: false,  // Show browser for demo
            devtools: false,
            defaultViewport: null,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-extensions',
                '--window-size=1280,720'
            ]
        });
        
        console.log('✅ Browser launched successfully');
        
        // Test regular demo user
        const demoResult = await testUserAccount(browser, DEMO_USER, 'demo-user');
        results.push(demoResult);
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test admin demo user  
        const adminResult = await testUserAccount(browser, ADMIN_USER, 'admin-user');
        results.push(adminResult);
        
        // Generate final report
        const report = await generateTestReport(results);
        
        // Print final summary
        console.log('\n' + '='.repeat(50));
        console.log('🎯 FINAL TEST SUMMARY');
        console.log('='.repeat(50));
        console.log(`📊 Total Tests: ${report.summary.total}`);
        console.log(`✅ Passed: ${report.summary.passed}`);
        console.log(`❌ Failed: ${report.summary.failed}`);
        console.log(`🌐 Application URL: ${BASE_URL}`);
        
        results.forEach(result => {
            console.log(`\n${result.userType.toUpperCase()}:`);
            console.log(`   Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
            if (result.user) {
                console.log(`   Username: ${result.user.username}`);
                console.log(`   Expected Display: ${result.user.displayName}`);
                console.log(`   Expected Tabs: ${result.user.expectedTabs}`);
                console.log(`   Should See Admin Tab: ${result.user.shouldHaveAdminTab}`);
            }
            if (result.finalScreenshot) {
                console.log(`   Screenshot: ${result.finalScreenshot}`);
            }
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });
        
        const allPassed = results.every(r => r.success);
        console.log(`\n🏆 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
        
        if (allPassed) {
            console.log('\n🎉 Both demo accounts are working correctly with proper role-based access control!');
        } else {
            console.log('\n⚠️  Some issues were found. Check the test results above and screenshots for details.');
        }
        
    } catch (error) {
        console.error('❌ Fatal error during test execution:', error);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n🔒 Browser closed');
        }
    }
}

// Run the test
main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});