import puppeteer from 'puppeteer';

async function debugDirectly() {
    console.log('🔍 Direct navigation debug...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto('http://172.29.218.93:5173/', { waitUntil: 'networkidle2' });
        
        // Login
        await page.waitForSelector('input[type="text"]');
        await page.type('input[type="text"]', 'demo');
        await page.type('input[type="password"]', 'demo123');
        await page.click('button[type="submit"]');
        
        // Wait for app to load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Directly evaluate the navigation state in the browser
        const navState = await page.evaluate(() => {
            // Get app context data
            const appElement = document.querySelector('#root');
            if (!appElement) return { error: 'No root element' };
            
            // Try to access React Fiber to get component state
            const fiber = appElement._reactInternalInstance || appElement._reactInternalFiber;
            
            // Look for user data in window or global scope
            const userData = window.localStorage.getItem('rss_user_session') || 
                            window.sessionStorage.getItem('rss_user_session');
            
            // Check visible navigation elements
            const navButtons = Array.from(document.querySelectorAll('nav button'));
            const navLinks = Array.from(document.querySelectorAll('nav a'));
            
            return {
                userDataExists: !!userData,
                userData: userData ? JSON.parse(userData) : null,
                navButtonCount: navButtons.length,
                navButtonTexts: navButtons.map(b => b.textContent.trim()),
                navLinkCount: navLinks.length,
                navLinkTexts: navLinks.map(l => l.textContent.trim()),
                currentUrl: window.location.href,
                pageTitle: document.title,
                authState: {
                    hasLocalStorage: !!window.localStorage.getItem('rss_user_session'),
                    hasSessionStorage: !!window.sessionStorage.getItem('rss_user_session')
                }
            };
        });
        
        console.log('Navigation State:', JSON.stringify(navState, null, 2));
        
        // Check if we can manually call the navigation functions
        const rolePermissionTest = await page.evaluate(() => {
            // Try to access the app context functions directly
            try {
                // Look for React DevTools
                if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                    console.log('React DevTools available');
                }
                
                // Check if any global functions are available
                const globals = Object.keys(window).filter(key => 
                    key.includes('hasRole') || 
                    key.includes('hasPermission') || 
                    key.includes('user') ||
                    key.includes('auth')
                );
                
                return {
                    reactDevTools: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
                    globalKeys: globals,
                    error: null
                };
            } catch (error) {
                return {
                    error: error.message,
                    reactDevTools: false,
                    globalKeys: []
                };
            }
        });
        
        console.log('Role/Permission Test:', JSON.stringify(rolePermissionTest, null, 2));
        
        // Take a screenshot for manual inspection
        await page.screenshot({ path: 'direct-debug-result.png' });
        console.log('Screenshot saved: direct-debug-result.png');
        
    } catch (error) {
        console.error('Debug error:', error);
    }
    
    await browser.close();
}

debugDirectly();