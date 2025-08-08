#!/usr/bin/env node

/**
 * Quick Demo Check - Verify the RSS Visit Report application is ready for demo
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`${colors.cyan}${colors.bright}
╔═════════════════════════════════════════════════════════╗
║                 RSS VISIT REPORT                        ║
║                 DEMO READINESS CHECK                    ║
╚═════════════════════════════════════════════════════════╝${colors.reset}`);

async function checkDemoReadiness() {
  let allChecksPass = true;
  
  console.log(`${colors.blue}Checking demo readiness...${colors.reset}\n`);
  
  // Check 1: Verify package.json exists
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log(`${colors.green}✓${colors.reset} Package.json exists - Project: ${packageData.name}`);
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Package.json not found or invalid`);
    allChecksPass = false;
  }
  
  // Check 2: Verify node_modules exists
  if (fs.existsSync('node_modules')) {
    console.log(`${colors.green}✓${colors.reset} Dependencies installed (node_modules exists)`);
  } else {
    console.log(`${colors.red}✗${colors.reset} Dependencies not installed - run 'npm install'`);
    allChecksPass = false;
  }
  
  // Check 3: Verify key source files exist
  const keyFiles = [
    'src/services/authService.js',
    'src/components/layout/Navigation.jsx',
    'src/context/AppContext.jsx',
    'dist/index.html'
  ];
  
  for (const file of keyFiles) {
    if (fs.existsSync(file)) {
      console.log(`${colors.green}✓${colors.reset} ${file} exists`);
    } else {
      console.log(`${colors.red}✗${colors.reset} Missing: ${file}`);
      allChecksPass = false;
    }
  }
  
  // Check 4: Port availability (basic check)
  console.log(`${colors.yellow}⚠${colors.reset}  Manual check required: Verify port 5173 is available`);
  
  console.log(`\n${colors.cyan}Demo Account Summary:${colors.reset}`);
  console.log(`${colors.yellow}Regular User:${colors.reset} demo/demo123 (7 tabs, no Administration)`);
  console.log(`${colors.yellow}Admin User:${colors.reset} admin/admin123 (9 tabs, includes Administration)`);
  
  console.log(`\n${colors.cyan}To start the application:${colors.reset}`);
  console.log(`  npm run dev`);
  console.log(`  Then navigate to: http://172.29.218.93:5173/`);
  
  console.log(`\n${colors.cyan}Demo Testing Steps:${colors.reset}`);
  console.log(`1. Login as demo/demo123 - should see 7 tabs`);
  console.log(`2. Logout and login as admin/admin123 - should see 9 tabs`);
  console.log(`3. Verify admin can access Administration tab`);
  
  if (allChecksPass) {
    console.log(`\n${colors.green}${colors.bright}🎉 Demo is ready! All checks passed.${colors.reset}`);
    return true;
  } else {
    console.log(`\n${colors.red}${colors.bright}❌ Demo setup issues detected. Please resolve the above errors.${colors.reset}`);
    return false;
  }
}

// Run the check
checkDemoReadiness().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error(`${colors.red}Check failed:${colors.reset}`, error);
  process.exit(1);
});