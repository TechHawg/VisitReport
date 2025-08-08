import puppeteer from 'puppeteer';

async function testNavigation() {
    console.log('🚀 Testing navigation issue...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.text().includes('Navigation Debug')) {
            console.log(`NAV DEBUG:`, msg.text());
        }
    });
    
    try {
        await page.goto('http://172.29.218.93:5173/', { waitUntil: 'networkidle2' });
        
        // Wait for login form and fill it
        await page.waitForSelector('input[type="text"]', { timeout: 10000 });
        await page.type('input[type="text"]', 'demo');
        await page.type('input[type="password"]', 'demo123');
        
        // Click login button
        await page.click('button[type="submit"]');
        
        // Wait for login to complete
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check the current state
        const navigationInfo = await page.evaluate(() => {
            // Look for navigation elements
            const navElements = document.querySelectorAll('nav, [role="tablist"], .nav-tabs');
            const buttons = document.querySelectorAll('button');
            const links = document.querySelectorAll('a');
            
            return {
                hasNavElements: navElements.length,
                totalButtons: buttons.length,
                totalLinks: links.length,
                buttonTexts: Array.from(buttons).map(b => b.textContent.trim()).filter(t => t),
                linkTexts: Array.from(links).map(l => l.textContent.trim()).filter(t => t),
                bodyText: document.body.textContent.includes('Dashboard') ? 'Has Dashboard' : 'No Dashboard',
                htmlSnippet: document.querySelector('main')?.innerHTML?.substring(0, 500) || 'No main element'
            };
        });
        
        console.log('Navigation Info:', JSON.stringify(navigationInfo, null, 2));
        
        // Screenshot the current state
        await page.screenshot({ path: 'nav-test-result.png' });
        console.log('Screenshot saved: nav-test-result.png');
        
    } catch (error) {
        console.error('Test error:', error);
    }
    
    await browser.close();
}

testNavigation();