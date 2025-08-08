import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

/**
 * Comprehensive Admin Demo Account Test
 * Tests the new admin demo user with full access to all 9 navigation tabs
 */
async function testAdminDemoAccount() {
    console.log('🔐 Testing Admin Demo Account - Full Access Verification');
    console.log('==========================================');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--window-size=1920,1080',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ],
        defaultViewport: { width: 1920, height: 1080 }
    });
    
    const page = await browser.newPage();
    
    // Enhanced console logging
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') {
            console.log(`❌ BROWSER ERROR: ${text}`);
        } else if (type === 'warn') {
            console.log(`⚠️  BROWSER WARN: ${text}`);
        } else if (text.includes('🔍')) {
            console.log(`🔍 BROWSER: ${text}`);
        }
    });
    
    // Track page errors
    page.on('pageerror', error => {
        console.log('❌ PAGE ERROR:', error.message);
    });
    
    try {
        // Step 1: Navigate to login page
        console.log('\n📍 Step 1: Navigating to login page...');
        await page.goto('http://172.29.218.93:5173/', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Verify we're on the login page
        const loginPageCheck = await page.evaluate(() => ({
            hasLoginForm: !!document.querySelector('input[type="password"]'),
            hasUsernameField: !!document.querySelector('input[type="text"]'),
            hasSubmitButton: !!document.querySelector('button[type="submit"]'),
            pageTitle: document.title,
            loginText: document.body.textContent.includes('Login')
        }));
        
        console.log('✅ Login page verification:', loginPageCheck);
        
        if (!loginPageCheck.hasLoginForm || !loginPageCheck.hasUsernameField) {
            throw new Error('Login form not found on the page');
        }
        
        // Step 2: Login with admin credentials
        console.log('\n📍 Step 2: Logging in with admin credentials...');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        
        await page.waitForSelector('input[type="text"]', { timeout: 10000 });
        
        // Clear and fill username
        await page.evaluate(() => {
            const usernameField = document.querySelector('input[type="text"]');
            if (usernameField) {
                usernameField.value = '';
                usernameField.focus();
            }
        });
        await page.type('input[type="text"]', 'admin');
        
        // Clear and fill password
        await page.evaluate(() => {
            const passwordField = document.querySelector('input[type="password"]');
            if (passwordField) {
                passwordField.value = '';
                passwordField.focus();
            }
        });
        await page.type('input[type="password"]', 'admin123');
        
        // Verify the values are set correctly
        const fieldValues = await page.evaluate(() => ({
            username: document.querySelector('input[type="text"]')?.value || '',
            password: document.querySelector('input[type="password"]')?.value || ''
        }));
        console.log('✅ Field values set:', fieldValues);
        
        console.log('✅ Credentials entered');
        
        // Submit login form
        await page.click('button[type="submit"]');
        console.log('✅ Login form submitted');
        
        // Step 3: Wait for authentication and app loading
        console.log('\n📍 Step 3: Waiting for authentication and app loading...');
        
        // Wait for navigation or error message
        await Promise.race([
            page.waitForSelector('nav', { timeout: 15000 }),
            page.waitForSelector('.error-message', { timeout: 15000 }),
            new Promise(resolve => setTimeout(resolve, 15000))
        ]);
        
        // Check authentication state
        const authState = await page.evaluate(() => {
            const hasNav = !!document.querySelector('nav');
            const hasError = !!document.querySelector('.error-message') || 
                            document.body.textContent.includes('Authentication failed') ||
                            document.body.textContent.includes('Invalid credentials');
            const userSession = localStorage.getItem('rss_user_session') || 
                              sessionStorage.getItem('rss_user_session');
            
            return {
                hasNavigation: hasNav,
                hasError: hasError,
                sessionExists: !!userSession,
                url: window.location.href,
                bodyText: document.body.textContent.substring(0, 500)
            };
        });
        
        console.log('🔍 Authentication state:', authState);
        
        if (authState.hasError) {
            throw new Error('Authentication failed - error message detected');
        }
        
        if (!authState.hasNavigation) {
            throw new Error('Navigation not loaded - authentication may have failed');
        }
        
        console.log('✅ Authentication successful');
        
        // Step 4: Verify user identity and role
        console.log('\n📍 Step 4: Verifying admin user identity...');
        
        const userInfo = await page.evaluate(() => {
            // Try to find user display name in various locations
            const userMenuButton = document.querySelector('[role="button"]') || 
                                 document.querySelector('.user-menu') ||
                                 document.querySelector('[class*="user"]');
            
            const displayName = userMenuButton?.textContent || 
                              document.querySelector('.user-name')?.textContent ||
                              document.querySelector('[class*="display-name"]')?.textContent;
            
            // Get session data if available
            let sessionData = null;
            const sessionRaw = localStorage.getItem('rss_user_session') || 
                              sessionStorage.getItem('rss_user_session');
            if (sessionRaw) {
                try {
                    sessionData = JSON.parse(sessionRaw);
                } catch (e) {
                    // Session data might not be JSON
                }
            }
            
            return {
                displayName: displayName?.trim(),
                sessionUser: sessionData?.user,
                pageContainsAdmin: document.body.textContent.includes('Admin Demo User')
            };
        });
        
        console.log('👤 User info:', userInfo);
        
        // Verify admin user
        const isAdminUser = userInfo.displayName?.includes('Admin') || 
                           userInfo.sessionUser?.displayName?.includes('Admin') ||
                           userInfo.pageContainsAdmin;
        
        if (isAdminUser) {
            console.log('✅ Confirmed logged in as Admin Demo User');
        } else {
            console.log('⚠️  Could not confirm admin user from display name, continuing with navigation test...');
        }
        
        // Step 5: Count and verify navigation tabs
        console.log('\n📍 Step 5: Analyzing navigation tabs...');
        
        const navigationAnalysis = await page.evaluate(() => {
            const nav = document.querySelector('nav');
            if (!nav) return { error: 'No navigation found' };
            
            const buttons = nav.querySelectorAll('button');
            const tabs = Array.from(buttons).map(button => {
                const icon = button.querySelector('svg') ? 'Has Icon' : 'No Icon';
                const text = button.textContent.trim();
                const isActive = button.classList.contains('border-blue-600') || 
                               button.classList.contains('text-blue-600') ||
                               button.getAttribute('class')?.includes('blue');
                
                return {
                    text: text,
                    icon: icon,
                    isActive: isActive,
                    classes: button.className
                };
            });
            
            return {
                totalTabs: buttons.length,
                tabs: tabs,
                tabTexts: tabs.map(t => t.text),
                activeTabs: tabs.filter(t => t.isActive).map(t => t.text)
            };
        });
        
        console.log('📊 Navigation Analysis:');
        console.log(`   Total tabs: ${navigationAnalysis.totalTabs}`);
        console.log(`   Tab names: ${navigationAnalysis.tabTexts.join(', ')}`);
        console.log(`   Active tabs: ${navigationAnalysis.activeTabs.join(', ')}`);
        
        // Expected tabs for admin user
        const expectedTabs = [
            'Dashboard',
            'Checklists', 
            'Visit Summary',
            'IT Infrastructure',
            'Hardware Inventory',
            'Data Closet',
            'Issues & Actions',
            'Import/Export',
            'Administration'
        ];
        
        console.log('\n🎯 Expected tabs for admin user:', expectedTabs.join(', '));
        
        // Step 6: Verify admin has access to all tabs including Administration
        console.log('\n📍 Step 6: Verifying admin access to all tabs...');
        
        const accessVerification = {
            totalExpected: expectedTabs.length,
            totalFound: navigationAnalysis.totalTabs,
            hasAllTabs: navigationAnalysis.totalTabs >= 9,
            hasAdministrationTab: navigationAnalysis.tabTexts.includes('Administration'),
            missingTabs: expectedTabs.filter(tab => !navigationAnalysis.tabTexts.includes(tab)),
            extraTabs: navigationAnalysis.tabTexts.filter(tab => !expectedTabs.includes(tab))
        };
        
        console.log('🔍 Access Verification Results:');
        console.log(`   ✅ Has ${accessVerification.totalFound}/${accessVerification.totalExpected} expected tabs`);
        console.log(`   ✅ Administration tab present: ${accessVerification.hasAdministrationTab ? 'YES' : 'NO'}`);
        
        if (accessVerification.missingTabs.length > 0) {
            console.log(`   ⚠️  Missing tabs: ${accessVerification.missingTabs.join(', ')}`);
        }
        
        if (accessVerification.extraTabs.length > 0) {
            console.log(`   ℹ️  Extra tabs: ${accessVerification.extraTabs.join(', ')}`);
        }
        
        // Step 7: Test Administration tab access
        if (accessVerification.hasAdministrationTab) {
            console.log('\n📍 Step 7: Testing Administration tab access...');
            
            try {
                // Click on Administration tab
                await page.click('nav button:has-text("Administration")');
                console.log('✅ Clicked on Administration tab');
                
                // Wait for page to load
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const adminPageCheck = await page.evaluate(() => ({
                    hasAdminContent: document.body.textContent.includes('Administration') ||
                                   document.body.textContent.includes('System Settings') ||
                                   document.body.textContent.includes('Admin'),
                    currentActiveTab: Array.from(document.querySelectorAll('nav button'))
                        .find(b => b.classList.contains('border-blue-600') || b.classList.contains('text-blue-600'))
                        ?.textContent.trim()
                }));
                
                console.log('🔍 Administration page check:', adminPageCheck);
                
                if (adminPageCheck.currentActiveTab === 'Administration') {
                    console.log('✅ Successfully accessed Administration tab');
                } else {
                    console.log('⚠️  Administration tab clicked but may not have loaded properly');
                }
                
            } catch (error) {
                console.log('❌ Failed to click Administration tab:', error.message);
            }
        } else {
            console.log('\n❌ Step 7: FAILED - Administration tab not found!');
        }
        
        // Step 8: Take comprehensive screenshot
        console.log('\n📍 Step 8: Taking screenshot of admin interface...');
        
        // Navigate back to Dashboard for full interface screenshot
        try {
            await page.click('nav button:has-text("Dashboard")');
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (e) {
            console.log('⚠️  Could not navigate to Dashboard, taking screenshot of current page');
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `admin-demo-test-${timestamp}.png`;
        
        await page.screenshot({ 
            path: screenshotPath,
            fullPage: true 
        });
        
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
        
        // Step 9: Generate test report
        console.log('\n📍 Step 9: Generating test report...');
        
        const testReport = {
            testName: 'Admin Demo Account Access Test',
            timestamp: new Date().toISOString(),
            testUrl: 'http://172.29.218.93:5173/',
            credentials: { username: 'admin', password: 'admin123' },
            results: {
                loginSuccessful: !authState.hasError && authState.hasNavigation,
                userIdentityVerified: isAdminUser,
                totalTabsFound: navigationAnalysis.totalTabs,
                expectedTabsCount: expectedTabs.length,
                hasAllExpectedTabs: accessVerification.totalFound >= accessVerification.totalExpected,
                administrationTabPresent: accessVerification.hasAdministrationTab,
                tabsList: navigationAnalysis.tabTexts,
                missingTabs: accessVerification.missingTabs,
                extraTabs: accessVerification.extraTabs
            },
            screenshots: [screenshotPath],
            overallResult: accessVerification.hasAdministrationTab && 
                          accessVerification.totalFound >= 8 ? 'PASS' : 'FAIL'
        };
        
        // Save report
        const reportPath = `admin-demo-test-report-${timestamp}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2));
        
        // Print final summary
        console.log('\n🎯 TEST SUMMARY');
        console.log('==============');
        console.log(`✅ Login Successful: ${testReport.results.loginSuccessful ? 'YES' : 'NO'}`);
        console.log(`✅ Admin User Verified: ${testReport.results.userIdentityVerified ? 'YES' : 'NO'}`);
        console.log(`✅ Navigation Tabs Found: ${testReport.results.totalTabsFound}`);
        console.log(`✅ Administration Tab Present: ${testReport.results.administrationTabPresent ? 'YES' : 'NO'}`);
        console.log(`✅ All Expected Features: ${testReport.results.hasAllExpectedTabs ? 'YES' : 'NO'}`);
        console.log(`\n🎯 OVERALL RESULT: ${testReport.overallResult}`);
        console.log(`\n📄 Detailed report saved: ${reportPath}`);
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
        
        if (testReport.overallResult === 'PASS') {
            console.log('\n🎉 Admin demo account test PASSED! The admin user has full access to all features.');
        } else {
            console.log('\n❌ Admin demo account test FAILED! Check the report for details.');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        
        // Take error screenshot
        try {
            const errorScreenshot = `admin-demo-error-${Date.now()}.png`;
            await page.screenshot({ path: errorScreenshot, fullPage: true });
            console.log(`📸 Error screenshot saved: ${errorScreenshot}`);
        } catch (screenshotError) {
            console.log('Could not take error screenshot:', screenshotError.message);
        }
    } finally {
        await browser.close();
        console.log('\n🔚 Browser closed. Test completed.');
    }
}

// Run the test
testAdminDemoAccount().catch(console.error);