import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function debugNavigationIssue() {
    console.log('🚀 Starting navigation debug test...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        devtools: true
    });
    
    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => {
        console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
    });
    
    page.on('pageerror', error => {
        console.error('PAGE ERROR:', error.message);
    });
    
    try {
        console.log('📱 Navigating to app...');
        await page.goto('http://172.29.218.93:5173/', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Take screenshot of login page
        await page.screenshot({ path: 'debug-1-login-page.png' });
        console.log('📸 Screenshot saved: debug-1-login-page.png');
        
        // Wait for login form
        await page.waitForSelector('input[type="text"], input[name="username"]', { timeout: 10000 });
        
        console.log('🔐 Filling login form...');
        // Find and fill username field
        const usernameField = await page.$('input[type="text"], input[name="username"]');
        if (usernameField) {
            await usernameField.type('demo');
        }
        
        // Find and fill password field  
        const passwordField = await page.$('input[type="password"], input[name="password"]');
        if (passwordField) {
            await passwordField.type('demo123');
        }
        
        // Submit form
        await page.click('button[type="submit"], button:contains("Login"), input[type="submit"]');
        
        console.log('⏳ Waiting for login to complete...');
        // Wait for redirect or dashboard to load
        await page.waitForTimeout(3000);
        
        // Take screenshot after login
        await page.screenshot({ path: 'debug-2-after-login.png' });
        console.log('📸 Screenshot saved: debug-2-after-login.png');
        
        // Extract current URL
        const currentUrl = page.url();
        console.log('🌐 Current URL:', currentUrl);
        
        // Check for navigation elements
        console.log('🔍 Checking navigation elements...');
        
        // Look for various navigation selectors
        const navSelectors = [
            'nav',
            '.navigation',
            '.nav-tabs',
            '.tab',
            '[role="tablist"]',
            '.nav-item',
            'a[href*="dashboard"]',
            'a[href*="checklist"]',
            'button[role="tab"]'
        ];
        
        let navElements = {};
        for (const selector of navSelectors) {
            const elements = await page.$$(selector);
            navElements[selector] = elements.length;
        }
        
        console.log('📊 Navigation elements found:', navElements);
        
        // Get all visible text content
        const allText = await page.evaluate(() => {
            return document.body.innerText;
        });
        
        // Check for tab names in the text
        const expectedTabs = ['Dashboard', 'Checklists', 'Visit Summary', 'IT Infrastructure', 'Hardware Inventory', 'Data Closet', 'Issues & Actions', 'Import/Export'];
        const foundTabs = expectedTabs.filter(tab => allText.includes(tab));
        console.log('📋 Expected tabs found in page text:', foundTabs);
        
        // Get authentication state from localStorage/sessionStorage
        const authState = await page.evaluate(() => {
            return {
                localStorage: Object.fromEntries(Object.entries(localStorage)),
                sessionStorage: Object.fromEntries(Object.entries(sessionStorage)),
                cookies: document.cookie
            };
        });
        
        console.log('🔐 Authentication state:', JSON.stringify(authState, null, 2));
        
        // Check React DevTools or app state
        const appState = await page.evaluate(() => {
            // Try to access React state or context
            if (window.React) {
                console.log('React detected');
            }
            
            // Look for any global app state
            return {
                hasReact: !!window.React,
                globalVars: Object.keys(window).filter(key => 
                    key.includes('app') || 
                    key.includes('user') || 
                    key.includes('auth') ||
                    key.includes('state')
                )
            };
        });
        
        console.log('⚛️ App state info:', appState);
        
        // Get full DOM structure
        const htmlContent = await page.content();
        fs.writeFileSync('debug-dom-content.html', htmlContent);
        console.log('💾 Full DOM saved to: debug-dom-content.html');
        
        // Get console logs that might have been captured
        console.log('📝 Page console messages should appear above');
        
        // Wait a bit more to see if navigation loads delayed
        console.log('⏳ Waiting additional 5 seconds for delayed loading...');
        await page.waitForTimeout(5000);
        
        // Take final screenshot
        await page.screenshot({ path: 'debug-3-final-state.png' });
        console.log('📸 Final screenshot saved: debug-3-final-state.png');
        
        // Check navigation again
        const finalNavCheck = await page.evaluate(() => {
            const navElements = document.querySelectorAll('nav, .navigation, .nav-tabs, [role="tablist"]');
            return Array.from(navElements).map(el => ({
                tagName: el.tagName,
                className: el.className,
                innerHTML: el.innerHTML.substring(0, 200) + '...',
                textContent: el.textContent
            }));
        });
        
        console.log('🔍 Final navigation check:', JSON.stringify(finalNavCheck, null, 2));
        
    } catch (error) {
        console.error('❌ Error during test:', error.message);
        await page.screenshot({ path: 'debug-error.png' });
    }
    
    console.log('⏸️ Keeping browser open for manual inspection...');
    console.log('Press Ctrl+C to close when done investigating.');
    
    // Keep browser open for manual inspection
    await new Promise(resolve => {
        process.on('SIGINT', () => {
            console.log('🔚 Closing browser...');
            browser.close();
            resolve();
        });
    });
}

debugNavigationIssue().catch(console.error);