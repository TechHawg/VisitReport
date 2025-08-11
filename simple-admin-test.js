/**
 * Simple Admin Test - Quick verification of admin functionality
 */

import puppeteer from 'puppeteer';

async function quickAdminTest() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false,
    defaultViewport: { width: 1200, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    console.log('🚀 Quick Admin Test Starting...');
    console.log('📱 Going to: http://172.29.218.93:5173/');
    
    await page.goto('http://172.29.218.93:5173/', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Take screenshot of initial page
    await page.screenshot({ path: 'admin-test-1-initial.png', fullPage: true });
    console.log('📸 Screenshot 1: Initial page saved');
    
    // Wait for login form and fill it
    await page.waitForSelector('input', { timeout: 10000 });
    console.log('✅ Found input fields');
    
    // Look for login fields
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].type('admin');
      await inputs[1].type('admin123');
      console.log('✅ Filled admin credentials');
      
      // Find and click login button
      const buttons = await page.$$('button');
      for (let button of buttons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && (text.toLowerCase().includes('login') || text.toLowerCase().includes('sign'))) {
          await button.click();
          console.log('✅ Clicked login button');
          break;
        }
      }
      
      // Wait for navigation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Take screenshot after login
      await page.screenshot({ path: 'admin-test-2-loggedin.png', fullPage: true });
      console.log('📸 Screenshot 2: After login saved');
      
      // Check for navigation tabs
      const allButtons = await page.$$('button');
      console.log(`📊 Found ${allButtons.length} buttons after login`);
      
      let foundAdmin = false;
      for (let button of allButtons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text) {
          console.log(`  - Button: "${text.trim()}"`);
          if (text.toLowerCase().includes('administration') || text.toLowerCase().includes('admin')) {
            foundAdmin = true;
            console.log('🎯 FOUND ADMINISTRATION BUTTON!');
          }
        }
      }
      
      if (!foundAdmin) {
        console.log('❌ Administration button not found in main navigation');
        
        // Check user menu
        const avatars = await page.$$('[class*="rounded-full"], [class*="avatar"]');
        if (avatars.length > 0) {
          console.log('👤 Trying user menu...');
          await avatars[0].click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Screenshot with menu open
          await page.screenshot({ path: 'admin-test-3-usermenu.png', fullPage: true });
          console.log('📸 Screenshot 3: User menu opened');
          
          const menuButtons = await page.$$('button');
          for (let button of menuButtons) {
            const text = await page.evaluate(el => el.textContent, button);
            if (text && text.toLowerCase().includes('administration')) {
              console.log('🎯 FOUND ADMINISTRATION IN USER MENU!');
              await button.click();
              console.log('✅ Clicked administration in user menu');
              break;
            }
          }
        }
      }
      
      // Final screenshot
      await new Promise(resolve => setTimeout(resolve, 3000));
      await page.screenshot({ path: 'admin-test-4-final.png', fullPage: true });
      console.log('📸 Screenshot 4: Final state saved');
      
      console.log(`\n🎯 RESULT: Admin functionality ${foundAdmin ? 'WORKING' : 'NEEDS FIXING'}`);
      
    } else {
      console.log('❌ Could not find login form');
    }
    
    // Keep browser open for manual inspection
    console.log('\n⏸️  Browser kept open for manual inspection. Close it when done.');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

quickAdminTest().catch(console.error);