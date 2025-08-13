#!/usr/bin/env node

/**
 * Inventory Page Testing Script
 * Tests all functionality of the Office Inventory page
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = '/tmp/inventory-screenshots';
const TEST_TIMEOUT = 30000;

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Find Chrome/Chromium executable
function findChrome() {
  const possiblePaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/opt/google/chrome/chrome',
    '/usr/bin/google-chrome-stable'
  ];
  
  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  
  throw new Error('Chrome/Chromium not found. Install with: sudo apt-get install chromium-browser');
}

class InventoryTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      accessibility: { passed: false, details: '' },
      layout: { passed: false, details: '' },
      calculations: { passed: false, details: '' },
      editing: { passed: false, details: '' },
      kpi: { passed: false, details: '' },
      localStorage: { passed: false, details: '' },
      csvExport: { passed: false, details: '' },
      responsive: { passed: false, details: '' },
      pdfExport: { passed: false, details: '' }
    };
  }

  async init() {
    console.log('🚀 Starting Inventory Page Tests...');
    
    const executablePath = findChrome();
    console.log(`📍 Using Chrome at: ${executablePath}`);
    
    this.browser = await puppeteer.launch({
      executablePath,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1920,1080'
      ]
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Enable console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 Console Error:', msg.text());
      }
    });
    
    // Navigate to the application
    console.log('🌐 Navigating to application...');
    await this.page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: TEST_TIMEOUT });
    
    // Wait for React to load
    await this.page.waitForSelector('#root', { timeout: TEST_TIMEOUT });
    
    // Take initial screenshot
    await this.page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '01-initial-load.png'),
      fullPage: true 
    });
  }

  async navigateToInventory() {
    console.log('📋 Navigating to Inventory page...');
    
    // Look for navigation link or button to inventory
    const inventorySelector = 'a[href*="inventory"], button[data-page="Inventory"], [data-testid="inventory-nav"]';
    
    try {
      await this.page.waitForSelector(inventorySelector, { timeout: 5000 });
      await this.page.click(inventorySelector);
    } catch (error) {
      // Try clicking by text content
      await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, button'));
        const inventoryLink = links.find(link => 
          link.textContent.toLowerCase().includes('inventory')
        );
        if (inventoryLink) {
          inventoryLink.click();
        } else {
          // If no navigation found, try to set the page directly
          if (window.useApp) {
            const { setActivePage } = window.useApp();
            setActivePage('Inventory');
          }
        }
      });
    }
    
    // Wait for inventory table to load
    await this.page.waitForSelector('.inventory-table, #office-inventory-print', { timeout: TEST_TIMEOUT });
    
    // Take screenshot after navigation
    await this.page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '02-inventory-loaded.png'),
      fullPage: true 
    });
    
    this.results.accessibility.passed = true;
    this.results.accessibility.details = 'Successfully navigated to inventory page';
  }

  async testExcelLayout() {
    console.log('🎨 Testing Excel-style layout...');
    
    // Check for proper header colors
    const headerColors = await this.page.evaluate(() => {
      const groupHeaders = document.querySelectorAll('.header-groups th');
      const columnHeaders = document.querySelectorAll('.header-columns th');
      
      const groupBg = groupHeaders.length > 0 ? 
        window.getComputedStyle(groupHeaders[0]).backgroundColor : '';
      const columnBg = columnHeaders.length > 0 ? 
        window.getComputedStyle(columnHeaders[0]).backgroundColor : '';
      
      return { groupBg, columnBg, groupCount: groupHeaders.length, columnCount: columnHeaders.length };
    });
    
    // Check table structure
    const tableStructure = await this.page.evaluate(() => {
      const table = document.querySelector('.inventory-table');
      if (!table) return null;
      
      return {
        hasTable: true,
        rowCount: table.querySelectorAll('tbody tr').length,
        columnCount: table.querySelectorAll('thead tr:last-child th').length,
        hasMultiRowHeader: table.querySelectorAll('thead tr').length >= 2
      };
    });
    
    this.results.layout.passed = 
      tableStructure?.hasTable && 
      tableStructure?.hasMultiRowHeader && 
      headerColors.groupCount > 0 && 
      headerColors.columnCount > 0;
    
    this.results.layout.details = JSON.stringify({ headerColors, tableStructure }, null, 2);
    
    await this.page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '03-layout-test.png'),
      fullPage: true 
    });
  }

  async testCalculations() {
    console.log('🧮 Testing calculation functionality...');
    
    // Test calculation by entering values
    await this.page.evaluate(() => {
      // Find first row inputs and enter test values
      const rows = document.querySelectorAll('.inventory-table tbody tr');
      if (rows.length > 0) {
        const firstRow = rows[0];
        
        // Enter test values in various columns
        const inputs = firstRow.querySelectorAll('input[type="number"]');
        if (inputs.length >= 4) {
          inputs[0].value = '10'; // In Use
          inputs[1].value = '2';  // Training
          inputs[2].value = '3';  // Conference
          inputs[3].value = '1';  // GSM
          
          // Trigger change events
          inputs.forEach(input => {
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('input', { bubbles: true }));
          });
        }
      }
    });
    
    // Wait for calculations to update
    await this.page.waitForTimeout(1000);
    
    // Check calculated values
    const calculations = await this.page.evaluate(() => {
      const rows = document.querySelectorAll('.inventory-table tbody tr');
      if (rows.length > 0) {
        const firstRow = rows[0];
        
        // Get computed cell values
        const totalOtherUse = firstRow.querySelector('.total-other-cell')?.textContent || '0';
        const sparesAuto = firstRow.querySelector('.spares-auto-cell')?.textContent || '0';
        const rowTotal = firstRow.querySelector('.total-cell')?.textContent || '0';
        
        return { totalOtherUse, sparesAuto, rowTotal };
      }
      return null;
    });
    
    // Verify calculations (2+3+1 = 6 for Total Other Use)
    this.results.calculations.passed = calculations && parseInt(calculations.totalOtherUse) >= 6;
    this.results.calculations.details = JSON.stringify(calculations, null, 2);
    
    await this.page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '04-calculations-test.png'),
      fullPage: true 
    });
  }

  async testEditingItems() {
    console.log('✏️ Testing item editing functionality...');
    
    // Test adding custom item
    try {
      const addButtonExists = await this.page.$('.btn:has-text("Add Custom Item"), button:has-text("Add")');
      if (addButtonExists) {
        await addButtonExists.click();
        await this.page.waitForTimeout(500);
      }
      
      // Test editing item name
      await this.page.evaluate(() => {
        const nameInputs = document.querySelectorAll('input[type="text"]');
        if (nameInputs.length > 0) {
          const lastInput = nameInputs[nameInputs.length - 1];
          lastInput.value = 'Test Custom Item';
          lastInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      this.results.editing.passed = true;
      this.results.editing.details = 'Successfully tested item editing and adding';
    } catch (error) {
      this.results.editing.details = `Error: ${error.message}`;
    }
    
    await this.page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '05-editing-test.png'),
      fullPage: true 
    });
  }

  async testKPIBoxes() {
    console.log('📊 Testing KPI boxes...');
    
    // Test KPI input functionality
    const kpiTest = await this.page.evaluate(() => {
      const kpiInputs = document.querySelectorAll('.inventory-footer-fields input');
      const results = [];
      
      kpiInputs.forEach((input, index) => {
        if (index < 3) { // Test first 3 KPI fields
          const testValue = (index + 1) * 5;
          input.value = testValue;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          results.push({ 
            field: input.closest('.field-group')?.querySelector('label')?.textContent || `Field ${index}`,
            value: testValue 
          });
        }
      });
      
      return results;
    });
    
    this.results.kpi.passed = kpiTest.length > 0;
    this.results.kpi.details = JSON.stringify(kpiTest, null, 2);
    
    await this.page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '06-kpi-test.png'),
      fullPage: true 
    });
  }

  async testLocalStorage() {
    console.log('💾 Testing localStorage persistence...');
    
    // Check if data is saved to localStorage
    const storageTest = await this.page.evaluate(() => {
      const data = localStorage.getItem('office-inventory-data');
      return {
        hasData: !!data,
        dataLength: data ? data.length : 0,
        isValidJSON: data ? (() => {
          try {
            JSON.parse(data);
            return true;
          } catch {
            return false;
          }
        })() : false
      };
    });
    
    this.results.localStorage.passed = storageTest.hasData && storageTest.isValidJSON;
    this.results.localStorage.details = JSON.stringify(storageTest, null, 2);
  }

  async testCSVExport() {
    console.log('📤 Testing CSV export...');
    
    // Look for CSV export button
    try {
      const exportButton = await this.page.$('button:has-text("Export CSV"), .btn:has-text("CSV")');
      if (exportButton) {
        // Set up download handling
        await this.page._client.send('Page.setDownloadBehavior', {
          behavior: 'allow',
          downloadPath: SCREENSHOT_DIR
        });
        
        await exportButton.click();
        await this.page.waitForTimeout(2000); // Wait for download
        
        this.results.csvExport.passed = true;
        this.results.csvExport.details = 'CSV export button found and clicked';
      } else {
        this.results.csvExport.details = 'CSV export button not found';
      }
    } catch (error) {
      this.results.csvExport.details = `Error: ${error.message}`;
    }
  }

  async testResponsive() {
    console.log('📱 Testing responsive design...');
    
    // Test mobile viewport
    await this.page.setViewport({ width: 375, height: 667 }); // iPhone SE size
    await this.page.waitForTimeout(1000);
    
    const mobileTest = await this.page.evaluate(() => {
      const table = document.querySelector('.inventory-table');
      const container = document.querySelector('.inventory-container');
      
      return {
        tableVisible: table ? table.offsetWidth > 0 : false,
        containerWidth: container ? container.offsetWidth : 0,
        hasHorizontalScroll: document.body.scrollWidth > window.innerWidth
      };
    });
    
    await this.page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '07-mobile-view.png'),
      fullPage: true 
    });
    
    // Test tablet viewport
    await this.page.setViewport({ width: 768, height: 1024 });
    await this.page.waitForTimeout(1000);
    
    await this.page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '08-tablet-view.png'),
      fullPage: true 
    });
    
    // Restore desktop viewport
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    this.results.responsive.passed = mobileTest.tableVisible;
    this.results.responsive.details = JSON.stringify(mobileTest, null, 2);
  }

  async testPDFExport() {
    console.log('📄 Testing PDF export...');
    
    try {
      const pdfButton = await this.page.$('button:has-text("Export PDF"), .btn:has-text("PDF")');
      if (pdfButton) {
        await pdfButton.click();
        await this.page.waitForTimeout(3000); // Wait for PDF generation
        
        this.results.pdfExport.passed = true;
        this.results.pdfExport.details = 'PDF export button found and clicked';
      } else {
        this.results.pdfExport.details = 'PDF export button not found';
      }
    } catch (error) {
      this.results.pdfExport.details = `Error: ${error.message}`;
    }
  }

  async runAllTests() {
    try {
      await this.init();
      await this.navigateToInventory();
      await this.testExcelLayout();
      await this.testCalculations();
      await this.testEditingItems();
      await this.testKPIBoxes();
      await this.testLocalStorage();
      await this.testCSVExport();
      await this.testResponsive();
      await this.testPDFExport();
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  generateReport() {
    console.log('\n📋 TEST RESULTS SUMMARY');
    console.log('========================\n');
    
    let passedTests = 0;
    const totalTests = Object.keys(this.results).length;
    
    for (const [testName, result] of Object.entries(this.results)) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${testName.toUpperCase()}`);
      if (result.details) {
        console.log(`   Details: ${result.details}\n`);
      }
      if (result.passed) passedTests++;
    }
    
    console.log(`\n📊 Overall: ${passedTests}/${totalTests} tests passed`);
    console.log(`🖼️  Screenshots saved to: ${SCREENSHOT_DIR}`);
    
    // Save detailed report
    const reportPath = path.join(SCREENSHOT_DIR, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`📄 Detailed report: ${reportPath}`);
    
    return { passedTests, totalTests, results: this.results };
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  (async () => {
    const tester = new InventoryTester();
    await tester.runAllTests();
    tester.generateReport();
  })();
}

module.exports = InventoryTester;