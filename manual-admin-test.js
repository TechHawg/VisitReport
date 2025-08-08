#!/usr/bin/env node
/**
 * Simple Manual Admin Test
 * Just login and take screenshot
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://172.29.218.93:5173/';

async function quickAdminTest() {
    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    try {
        console.log('🔐 Testing admin login...');
        
        // Go to app
        await page.goto(BASE_URL);
        
        // Wait for login form
        await page.waitForSelector('input[type="text"]', { timeout: 10000 });
        
        // Clear and type admin credentials
        await page.click('input[type="text"]');
        await page.keyboard.selectAll();
        await page.type('input[type="text"]', 'admin');
        
        await page.click('input[type="password"]');
        await page.keyboard.selectAll();
        await page.type('input[type="password"]', 'admin123');
        
        console.log('✅ Entered admin credentials');
        
        // Submit
        await page.click('button[type="submit"]');
        
        // Wait for some content to load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Take screenshot
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `./screenshots/admin-manual-test-${timestamp}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        
        console.log(`📸 Admin test screenshot: ${screenshotPath}`);
        
        // Count nav items
        const navElements = await page.$$('nav a, .nav-menu a');
        console.log(`📋 Found ${navElements.length} navigation elements`);
        
        // Check for admin tab
        let hasAdminTab = false;
        for (const el of navElements) {
            const text = await el.evaluate(e => e.textContent || '');
            console.log(`   - ${text}`);
            if (text.toLowerCase().includes('admin')) {
                hasAdminTab = true;
            }
        }
        
        console.log(`🔐 Has Administration tab: ${hasAdminTab}`);
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
    
    // Keep browser open for manual inspection
    console.log('🔍 Browser kept open for manual inspection...');
    console.log('Press Ctrl+C to close when done');
    
    // Don't close browser automatically
    await new Promise(() => {}); // Wait indefinitely
}

quickAdminTest().catch(console.error);