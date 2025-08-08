#!/usr/bin/env node

/**
 * Quick Navigation Validation
 */

import puppeteer from 'puppeteer';

async function quickCheck() {
  console.log('🚀 Quick navigation check...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to app
    await page.goto('http://172.29.218.93:5173/', { waitUntil: 'networkidle0', timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'current-state.png', fullPage: true });
    console.log('📸 Screenshot saved as current-state.png');
    
    // Get page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Check if we can find login elements
    const hasUsernameField = await page.$('input[type="text"]') !== null;
    const hasPasswordField = await page.$('input[type="password"]') !== null;
    
    console.log(`🔐 Login form detected: ${hasUsernameField && hasPasswordField ? 'YES' : 'NO'}`);
    
    if (hasUsernameField && hasPasswordField) {
      // Try login
      await page.type('input[type="text"]', 'demo');
      await page.type('input[type="password"]', 'demo123');
      
      // Look for submit button (more generic)
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        console.log('🔐 Login button clicked');
      } else {
        // Try pressing Enter
        await page.keyboard.press('Enter');
        console.log('🔐 Enter key pressed');
      }
      
      // Wait for potential redirect
      await page.waitForTimeout(3000);
      
      // Take after-login screenshot
      await page.screenshot({ path: 'after-login-state.png', fullPage: true });
      console.log('📸 After-login screenshot saved');
      
      // Count all buttons (navigation tabs would be buttons)
      const buttonCount = await page.$$eval('button', buttons => buttons.length);
      console.log(`🔘 Total buttons found: ${buttonCount}`);
      
      // Get button texts
      const buttonTexts = await page.$$eval('button', buttons => 
        buttons.map(btn => btn.textContent?.trim()).filter(text => text && text.length > 0)
      );
      
      console.log('📋 Button texts found:');
      buttonTexts.forEach((text, i) => console.log(`  ${i+1}. "${text}"`));
      
      // Check for specific navigation indicators
      const navElements = await page.$$eval('*', elements => 
        Array.from(elements)
          .filter(el => el.textContent && (
            el.textContent.includes('Dashboard') ||
            el.textContent.includes('Checklists') ||
            el.textContent.includes('Summary') ||
            el.textContent.includes('Infrastructure')
          ))
          .map(el => el.textContent.trim())
          .slice(0, 10) // Limit results
      );
      
      console.log('🎯 Navigation-related text found:');
      navElements.forEach((text, i) => console.log(`  ${i+1}. "${text}"`));
      
      return navElements.length > 1;
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'error-state.png' });
    return false;
  } finally {
    await browser.close();
  }
}

quickCheck().then(success => {
  console.log(`\n🎯 Result: ${success ? 'NAVIGATION WORKING' : 'ISSUE DETECTED'}`);
}).catch(console.error);