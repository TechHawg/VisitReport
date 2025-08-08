#!/usr/bin/env node
/**
 * Simplified Demo Accounts Test
 * Focuses on core verification: login success and navigation tab count
 */

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';

const BASE_URL = 'http://172.29.218.93:5173/';

async function testAccount(browser, username, password, expectedDisplayName, shouldHaveAdminTab) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    try {
        console.log(`\n🧪 Testing ${username}/${password}`);
        
        // Navigate to application
        await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
        
        // Wait for login form and fill credentials
        await page.waitForSelector('input[type="text"], input[name="username"]', { timeout: 10000 });
        await page.type('input[type="text"], input[name="username"]', username);
        await page.type('input[type="password"], input[name="password"]', password);
        
        // Click login button
        await page.click('button[type="submit"]');
        
        // Wait for navigation after login
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
        
        // Wait for the application to load
        await page.waitForTimeout(3000);
        
        // Take screenshot
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `./screenshots/${username}-success-${timestamp}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        
        // Check if user is logged in by looking for user indicator
        const userElement = await page.$('.user-name, .username, [class*="user"]');
        const userText = userElement ? await userElement.evaluate(el => el.textContent) : 'Not found';
        
        // Count navigation tabs
        const navLinks = await page.$$('nav a, .nav-menu a, .navigation a, [role="navigation"] a');
        let visibleNavCount = 0;
        let navTexts = [];
        
        for (const link of navLinks) {
            const isVisible = await link.isIntersectingViewport();
            if (isVisible) {
                const text = await link.evaluate(el => el.textContent?.trim() || '');
                if (text && text.length > 1) {
                    navTexts.push(text);
                    visibleNavCount++;
                }
            }
        }
        
        // Check for Administration tab specifically
        const hasAdminTab = navTexts.some(text => 
            text.toLowerCase().includes('admin') || 
            text.toLowerCase().includes('administration')
        );
        
        console.log(`   ✅ Login successful`);
        console.log(`   👤 User info found: ${userText}`);
        console.log(`   📋 Navigation tabs (${visibleNavCount}):`, navTexts);
        console.log(`   🔐 Has Administration tab: ${hasAdminTab}`);
        console.log(`   📸 Screenshot: ${screenshotPath}`);
        
        const result = {
            username,
            success: true,
            userText,
            navCount: visibleNavCount,
            navTabs: navTexts,
            hasAdminTab,
            shouldHaveAdminTab,
            adminTabCorrect: hasAdminTab === shouldHaveAdminTab,
            screenshot: screenshotPath
        };
        
        console.log(`   🎯 Admin tab check: ${result.adminTabCorrect ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   🏆 Overall: ${result.adminTabCorrect ? '✅ PASSED' : '❌ FAILED'}`);
        
        return result;
        
    } catch (error) {
        console.log(`   ❌ Test failed: ${error.message}`);
        
        // Take error screenshot
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const errorScreenshot = `./screenshots/${username}-error-${timestamp}.png`;
        try {
            await page.screenshot({ path: errorScreenshot, fullPage: true });
            console.log(`   📸 Error screenshot: ${errorScreenshot}`);
        } catch (e) {
            console.log(`   ❌ Could not take error screenshot`);
        }
        
        return { username, success: false, error: error.message };
    } finally {
        await page.close();
    }
}

async function main() {
    console.log('🚀 SIMPLIFIED DEMO ACCOUNTS TEST');
    console.log('=================================');
    
    // Ensure screenshots directory exists
    try {
        await fs.access('./screenshots');
    } catch {
        await fs.mkdir('./screenshots', { recursive: true });
    }
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,720']
    });
    
    try {
        // Test regular demo user (should NOT have admin tab)
        const demoResult = await testAccount(browser, 'demo', 'demo123', 'Demo User', false);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test admin user (should HAVE admin tab)
        const adminResult = await testAccount(browser, 'admin', 'admin123', 'Admin Demo User', true);
        
        // Final summary
        console.log('\n' + '='.repeat(50));
        console.log('🎯 FINAL RESULTS');
        console.log('='.repeat(50));
        
        const results = [demoResult, adminResult];
        let allPassed = true;
        
        results.forEach(result => {
            if (result.success) {
                console.log(`\n${result.username.toUpperCase()}:`);
                console.log(`   Status: ✅ LOGGED IN`);
                console.log(`   Navigation tabs: ${result.navCount}`);
                console.log(`   Has Administration tab: ${result.hasAdminTab}`);
                console.log(`   Should have Administration tab: ${result.shouldHaveAdminTab}`);
                console.log(`   Admin tab check: ${result.adminTabCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
                console.log(`   Screenshot: ${result.screenshot}`);
                
                if (!result.adminTabCorrect) allPassed = false;
            } else {
                console.log(`\n${result.username.toUpperCase()}: ❌ FAILED - ${result.error}`);
                allPassed = false;
            }
        });
        
        console.log(`\n🏆 OVERALL RESULT: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME ISSUES FOUND'}`);
        
        if (allPassed) {
            console.log('\n🎉 Both demo accounts are working correctly with proper role-based access control!');
            console.log('👥 Regular demo user: Sees standard navigation (no Administration tab)');
            console.log('🔑 Admin demo user: Sees all navigation including Administration tab');
        }
        
    } finally {
        await browser.close();
    }
}

main().catch(console.error);