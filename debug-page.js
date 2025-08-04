const puppeteer = require('puppeteer');

async function debugPage() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', (msg) => {
    console.log(`[BROWSER ${msg.type()}]:`, msg.text());
  });
  
  // Listen for errors
  page.on('error', (error) => {
    console.error('[BROWSER ERROR]:', error.message);
  });
  
  page.on('pageerror', (error) => {
    console.error('[PAGE ERROR]:', error.message);
    console.error('[ERROR STACK]:', error.stack);
  });
  
  try {
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    // Wait a bit for React to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for error messages
    const errorText = await page.evaluate(() => {
      const errorElements = document.querySelectorAll('[class*="error"], [class*="red-"]');
      return Array.from(errorElements).map(el => el.textContent.trim()).filter(text => text);
    });
    
    if (errorText.length > 0) {
      console.log('Error messages found:', errorText);
    } else {
      console.log('No error messages found on page');
    }
    
    // Get page content
    const bodyText = await page.evaluate(() => {
      return document.body.textContent.substring(0, 500);
    });
    console.log('Page content (first 500 chars):', bodyText);
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
    console.log('Screenshot saved as debug-screenshot.png');
    
  } catch (error) {
    console.error('Navigation error:', error.message);
  }
  
  await browser.close();
}

debugPage().catch(console.error);