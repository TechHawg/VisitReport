#!/usr/bin/env node
/**
 * Final Manual Verification Test
 * Handles AJAX login properly and verifies role-based access control
 */

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';

const BASE_URL = 'http://172.29.218.93:5173/';

async function waitForLogin(page, username) {
    // Wait for login to complete by checking for user indicator or dashboard
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    while (attempts < maxAttempts) {
        try {
            // Check if we're on the dashboard or logged in
            const isDashboard = await page.$('.dashboard, [class*="dashboard"], h1:contains("Dashboard"), h2:contains("Dashboard")');
            const userElement = await page.$('[class*="user"], .username, .user-name');
            const navElement = await page.$('nav, .navigation, .nav-menu');
            
            if (isDashboard || userElement || navElement) {
                console.log(`   ✅ Login detected after ${attempts} seconds`);
                return true;
            }
            
            // Also check if we can see navigation tabs
            const navLinks = await page.$$('nav a, .nav-menu a, .navigation a');
            if (navLinks.length > 3) {
                console.log(`   ✅ Navigation detected (${navLinks.length} links)`);
                return true;
            }
            
        } catch (error) {
            // Continue waiting
        }
        
        await page.waitForTimeout(1000);
        attempts++;
    }
    
    console.log(`   ⚠️  Login verification timeout after ${maxAttempts} seconds`);
    return false;
}

async function testLoginAndTabs(browser, username, password, expectedRole) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log(`\n🔐 Testing ${username} (expected role: ${expectedRole})`);
    
    try {
        // Navigate to app
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        
        // Wait for login form
        await page.waitForSelector('input[type="text"], input[name="username"]', { timeout: 10000 });
        console.log(`   📝 Login form found`);
        
        // Fill credentials
        await page.type('input[type="text"], input[name="username"]', username);
        await page.type('input[type="password"], input[name="password"]', password);
        console.log(`   ✏️  Entered credentials: ${username}/***`);
        
        // Submit login
        await page.click('button[type="submit"]');
        console.log(`   🚀 Login submitted`);
        
        // Wait for login to complete
        const loginSuccessful = await waitForLogin(page, username);
        
        if (!loginSuccessful) {
            throw new Error('Login verification failed');
        }
        
        // Wait a bit more for everything to load
        await page.waitForTimeout(2000);
        
        // Take screenshot
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `./screenshots/${username}-final-verification-${timestamp}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        
        // Analyze the logged-in state
        console.log(`   📸 Screenshot saved: ${screenshotPath}`);
        
        // Count navigation items
        const allNavElements = await page.$$('nav a, .nav-menu a, .navigation a, [role="navigation"] a, nav button, .nav-menu button');
        let visibleTabs = [];
        
        for (const element of allNavElements) {
            try {
                const isVisible = await element.isIntersectingViewport();
                if (isVisible) {
                    const text = await element.evaluate(el => el.textContent?.trim() || '');
                    if (text && text.length > 1 && !text.includes('Submit') && !text.includes('Continue')) {
                        visibleTabs.push(text);
                    }
                }
            } catch (e) {
                // Skip elements that are no longer attached
            }
        }
        
        // Remove duplicates
        visibleTabs = [...new Set(visibleTabs)];
        
        // Check specifically for Administration tab
        const hasAdministrationTab = visibleTabs.some(tab => 
            tab.toLowerCase().includes('admin') || 
            tab.toLowerCase().includes('administration')
        );
        
        // Get user indicator
        let userIndicator = 'Not found';
        try {
            const userElements = await page.$$('[class*="user"], .username, .user-name');
            for (const el of userElements) {
                const text = await el.evaluate(e => e.textContent?.trim() || '');
                if (text && text.length > 0) {
                    userIndicator = text;
                    break;
                }
            }
        } catch (e) {
            // User indicator not found
        }
        
        console.log(`   👤 User indicator: "${userIndicator}"`);
        console.log(`   📋 Navigation tabs found (${visibleTabs.length}):`, visibleTabs);
        console.log(`   🔐 Has Administration tab: ${hasAdministrationTab}`);
        
        // Determine success based on role expectations
        let success = false;
        let message = '';
        
        if (expectedRole === 'admin') {
            success = hasAdministrationTab;
            message = hasAdministrationTab 
                ? '✅ ADMIN USER: Correctly has Administration tab'
                : '❌ ADMIN USER: Missing Administration tab';
        } else {
            success = !hasAdministrationTab;
            message = !hasAdministrationTab 
                ? '✅ REGULAR USER: Correctly does NOT have Administration tab'
                : '❌ REGULAR USER: Incorrectly has Administration tab';
        }
        
        console.log(`   🎯 ${message}`);
        
        return {
            username,
            success,
            userIndicator,
            tabCount: visibleTabs.length,
            tabs: visibleTabs,
            hasAdministrationTab,
            expectedRole,
            message,
            screenshotPath
        };
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        
        // Try to take error screenshot
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const errorPath = `./screenshots/${username}-error-${timestamp}.png`;
            await page.screenshot({ path: errorPath, fullPage: true });
            console.log(`   📸 Error screenshot: ${errorPath}`);
        } catch (e) {
            // Can't take screenshot
        }
        
        return {
            username,
            success: false,
            error: error.message,
            expectedRole
        };
    } finally {
        await page.close();
    }
}

async function main() {
    console.log('🎯 FINAL VERIFICATION TEST - DEMO ACCOUNTS');
    console.log('==========================================');
    console.log(`🌐 Testing application at: ${BASE_URL}`);
    
    // Ensure screenshots directory
    try {
        await fs.mkdir('./screenshots', { recursive: true });
    } catch (e) {
        // Directory exists
    }
    
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1280,720',
            '--disable-dev-shm-usage'
        ]
    });
    
    try {
        // Test regular demo user
        const demoResult = await testLoginAndTabs(browser, 'demo', 'demo123', 'user');
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test admin user
        const adminResult = await testLoginAndTabs(browser, 'admin', 'admin123', 'admin');
        
        // Final summary
        console.log('\n' + '='.repeat(60));
        console.log('🏆 FINAL VERIFICATION RESULTS');
        console.log('='.repeat(60));
        
        const results = [demoResult, adminResult];
        let overallSuccess = true;
        
        results.forEach((result, index) => {
            const userType = index === 0 ? 'REGULAR DEMO USER' : 'ADMIN DEMO USER';
            console.log(`\n${userType} (${result.username}):`);
            
            if (result.success) {
                console.log(`   Status: ✅ PASSED`);
                console.log(`   User indicator: ${result.userIndicator}`);
                console.log(`   Navigation tabs: ${result.tabCount}`);
                console.log(`   Tabs: ${result.tabs?.join(', ') || 'N/A'}`);
                console.log(`   Administration tab: ${result.hasAdministrationTab ? 'Yes' : 'No'}`);
                console.log(`   Result: ${result.message}`);
                console.log(`   Screenshot: ${result.screenshotPath}`);
            } else {
                console.log(`   Status: ❌ FAILED`);
                console.log(`   Error: ${result.error}`);
                overallSuccess = false;
            }
        });
        
        console.log('\n' + '='.repeat(60));
        console.log(`🎯 OVERALL TEST RESULT: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        if (overallSuccess) {
            console.log('\n🎉 DEMO ACCOUNTS VERIFICATION COMPLETE!');
            console.log('✅ Both demo accounts are working correctly');
            console.log('✅ Role-based access control is functioning properly');
            console.log('✅ Regular user sees standard navigation (no Administration)');
            console.log('✅ Admin user sees full navigation (including Administration)');
            console.log('\n🚀 Ready for boss demonstration!');
        } else {
            console.log('\n⚠️  Some issues found - check results above');
        }
        
    } finally {
        await browser.close();
    }
}

main().catch(console.error);