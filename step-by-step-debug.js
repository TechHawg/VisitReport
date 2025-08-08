import puppeteer from 'puppeteer';

async function stepByStepDebug() {
    console.log('🔍 Step-by-step authentication debug...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capture all console messages
    page.on('console', msg => {
        console.log(`BROWSER [${msg.type()}]:`, msg.text());
    });
    
    try {
        console.log('Step 1: Loading initial page...');
        await page.goto('http://172.29.218.93:5173/', { waitUntil: 'networkidle2' });
        
        // Check initial state
        let state = await page.evaluate(() => ({
            url: window.location.href,
            hasLoginForm: !!document.querySelector('input[type="password"]'),
            bodyText: document.body.textContent.includes('Login') ? 'Has Login' : 'No Login',
            storageCount: Object.keys(localStorage).length + Object.keys(sessionStorage).length
        }));
        console.log('Initial state:', state);
        
        console.log('Step 2: Filling login form...');
        await page.waitForSelector('input[type="text"]');
        await page.type('input[type="text"]', 'demo');
        await page.type('input[type="password"]', 'demo123');
        
        console.log('Step 3: Submitting login...');
        await page.click('button[type="submit"]');
        
        // Wait a bit and check intermediate state
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        state = await page.evaluate(() => ({
            url: window.location.href,
            hasLoginForm: !!document.querySelector('input[type="password"]'),
            hasNavigation: !!document.querySelector('nav'),
            navigationContent: document.querySelector('nav')?.innerHTML || 'No nav element',
            storageCount: Object.keys(localStorage).length + Object.keys(sessionStorage).length,
            userSession: localStorage.getItem('rss_user_session') || sessionStorage.getItem('rss_user_session')
        }));
        console.log('After login (2s):', state);
        
        console.log('Step 4: Waiting for full app load...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        state = await page.evaluate(() => ({
            url: window.location.href,
            hasLoginForm: !!document.querySelector('input[type="password"]'),
            hasNavigation: !!document.querySelector('nav'),
            navButtonCount: document.querySelectorAll('nav button').length,
            navButtonTexts: Array.from(document.querySelectorAll('nav button')).map(b => b.textContent.trim()),
            storageCount: Object.keys(localStorage).length + Object.keys(sessionStorage).length,
            userSession: localStorage.getItem('rss_user_session') || sessionStorage.getItem('rss_user_session'),
            mainContent: document.querySelector('main')?.textContent.substring(0, 200) || 'No main content'
        }));
        console.log('Final state (7s total):', state);
        
        // Check if we're actually on Dashboard
        const isDashboard = await page.evaluate(() => {
            return document.body.textContent.includes('Dashboard') && 
                   document.body.textContent.includes('Submit Report');
        });
        console.log('Is on Dashboard page:', isDashboard);
        
        await page.screenshot({ path: 'step-by-step-final.png' });
        console.log('Screenshot saved: step-by-step-final.png');
        
    } catch (error) {
        console.error('Debug error:', error);
        await page.screenshot({ path: 'step-by-step-error.png' });
    }
    
    await browser.close();
}

stepByStepDebug();