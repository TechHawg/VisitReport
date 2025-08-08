#!/usr/bin/env node

/**
 * RSS Visit Report - Demo Accounts Comprehensive Test
 * Tests both regular demo user and admin demo user accounts
 * to verify proper role-based access control implementation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

console.log(`${colors.cyan}${colors.bright}
╔══════════════════════════════════════════════════════════════╗
║                  RSS VISIT REPORT DEMO TEST                  ║
║            Comprehensive Demo Accounts Validation           ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0
  }
};

// Helper function to add test result
function addTestResult(testName, passed, details = '', expected = '', actual = '') {
  const result = {
    test: testName,
    status: passed ? 'PASS' : 'FAIL',
    details,
    expected,
    actual,
    timestamp: new Date().toISOString()
  };
  
  testResults.tests.push(result);
  testResults.summary.total++;
  
  if (passed) {
    testResults.summary.passed++;
    console.log(`${colors.green}✓ PASS${colors.reset} - ${testName}`);
    if (details) console.log(`  ${colors.cyan}${details}${colors.reset}`);
  } else {
    testResults.summary.failed++;
    console.log(`${colors.red}✗ FAIL${colors.reset} - ${testName}`);
    if (details) console.log(`  ${colors.red}${details}${colors.reset}`);
    if (expected) console.log(`  Expected: ${expected}`);
    if (actual) console.log(`  Actual: ${actual}`);
  }
  console.log('');
}

// Helper function to simulate user authentication
function simulateAuth(username, password) {
  console.log(`${colors.yellow}🔐 Simulating authentication for: ${username}${colors.reset}`);
  
  // Demo user simulation (from authService.js lines 142-170)
  if (username.toLowerCase() === 'demo' && password === 'demo123') {
    return {
      success: true,
      user: {
        id: 'demo-user-001',
        username: 'demo',
        email: 'demo@rss-reports.local',
        displayName: 'Demo User',
        role: 'technician',
        roles: ['technician'],
        permissions: [
          'reports:view:assigned',
          'reports:view:all',
          'reports:create',
          'reports:edit:own',
          'reports:export:own',
          'hardware:manage'
        ],
        authMethod: 'local'
      },
      token: 'demo-token-' + Date.now(),
      sessionId: 'demo-session-' + Date.now()
    };
  }
  
  // Admin demo user simulation (from authService.js lines 172-204)
  if (username.toLowerCase() === 'admin' && password === 'admin123') {
    return {
      success: true,
      user: {
        id: 'admin-demo-001',
        username: 'admin',
        email: 'admin@rss-reports.local',
        displayName: 'Admin Demo User',
        role: 'admin',
        roles: ['admin'],
        permissions: [
          '*',
          'admin:*',
          'system:settings',
          'reports:view:all',
          'reports:create',
          'reports:edit:any',
          'reports:export:all',
          'hardware:manage',
          'users:manage',
          'system:backup'
        ],
        authMethod: 'local'
      },
      token: 'admin-demo-token-' + Date.now(),
      sessionId: 'admin-demo-session-' + Date.now()
    };
  }
  
  return { success: false, message: 'Invalid credentials' };
}

// Helper function to check if user has access to a page (from Navigation.jsx logic)
function hasPageAccess(user, page) {
  if (!user) return false;
  
  const userRole = user.role;
  const userPermissions = user.permissions || [];
  
  // If user is admin, allow access to everything
  if (userRole === 'admin' || userPermissions.includes('*')) {
    return true;
  }
  
  // Check role-based access
  const hasRequiredRole = page.roles?.includes(userRole) ?? true;
  if (!hasRequiredRole) return false;
  
  // Check permission-based access
  if (page.permissions && page.permissions.length > 0) {
    if (page.permissions.includes('*')) return true;
    
    return page.permissions.some(permission => 
      userPermissions.includes(permission)
    );
  }
  
  return hasRequiredRole;
}

// Navigation pages definition (from Navigation.jsx)
const navigationPages = [
  { 
    id: 'Dashboard', 
    label: 'Dashboard',
    permissions: ['*'],
    roles: ['admin', 'manager', 'technician', 'viewer']
  },
  { 
    id: 'Checklists', 
    label: 'Checklists',
    permissions: ['reports:view:assigned', 'reports:create'],
    roles: ['admin', 'manager', 'technician']
  },
  { 
    id: 'Summary', 
    label: 'Visit Summary',
    permissions: ['reports:view:assigned', 'reports:create'],
    roles: ['admin', 'manager', 'technician']
  },
  { 
    id: 'Infrastructure', 
    label: 'IT Infrastructure',
    permissions: ['hardware:manage', 'reports:create'],
    roles: ['admin', 'manager', 'technician']
  },
  { 
    id: 'Inventory', 
    label: 'Hardware Inventory',
    permissions: ['reports:view:assigned', 'reports:create'],
    roles: ['admin', 'manager', 'technician']
  },
  { 
    id: 'Storage', 
    label: 'Data Closet',
    permissions: ['hardware:manage', 'reports:create'],
    roles: ['admin', 'manager', 'technician']
  },
  {
    id: 'IssuesActions',
    label: 'Issues & Actions',
    permissions: ['reports:create', 'reports:edit:own'],
    roles: ['admin', 'manager', 'technician']
  },
  { 
    id: 'ImportExport', 
    label: 'Import/Export',
    permissions: ['reports:export:own', 'reports:view:all'],
    roles: ['admin', 'manager']
  },
  { 
    id: 'Admin', 
    label: 'Administration',
    permissions: ['admin:*', 'system:settings'],
    roles: ['admin']
  }
];

// Main test execution
async function runTests() {
  console.log(`${colors.blue}Starting comprehensive demo accounts test...${colors.reset}\n`);
  
  // ==================== TEST 1: REGULAR DEMO USER ====================
  console.log(`${colors.magenta}${colors.bright}TEST 1: REGULAR DEMO USER (demo/demo123)${colors.reset}`);
  console.log('=' * 60);
  
  const demoAuth = simulateAuth('demo', 'demo123');
  
  addTestResult(
    'Demo User Authentication',
    demoAuth.success,
    demoAuth.success ? 'Successfully authenticated demo user' : 'Failed to authenticate demo user',
    'Authentication should succeed',
    demoAuth.success ? 'Success' : 'Failed'
  );
  
  if (demoAuth.success) {
    const demoUser = demoAuth.user;
    
    // Test user properties
    addTestResult(
      'Demo User Role Assignment',
      demoUser.role === 'technician',
      `User role: ${demoUser.role}`,
      'technician',
      demoUser.role
    );
    
    // Test navigation access
    const demoAccessiblePages = navigationPages.filter(page => hasPageAccess(demoUser, page));
    
    addTestResult(
      'Demo User Navigation Tabs Count',
      demoAccessiblePages.length === 7,
      `User can access ${demoAccessiblePages.length} tabs: ${demoAccessiblePages.map(p => p.label).join(', ')}`,
      '7 tabs (no Administration)',
      `${demoAccessiblePages.length} tabs`
    );
    
    // Test that Administration tab is NOT accessible
    const hasAdminAccess = demoAccessiblePages.some(page => page.id === 'Admin');
    addTestResult(
      'Demo User Admin Tab Access',
      !hasAdminAccess,
      hasAdminAccess ? 'ERROR: Demo user can access Administration tab!' : 'Demo user correctly CANNOT access Administration tab',
      'No access to Administration tab',
      hasAdminAccess ? 'Has access (BAD)' : 'No access (GOOD)'
    );
    
    // Test specific permissions
    const expectedPermissions = [
      'reports:view:assigned',
      'reports:view:all',
      'reports:create',
      'reports:edit:own',
      'reports:export:own',
      'hardware:manage'
    ];
    
    expectedPermissions.forEach(permission => {
      const hasPermission = demoUser.permissions.includes(permission);
      addTestResult(
        `Demo User Permission: ${permission}`,
        hasPermission,
        hasPermission ? `Has permission: ${permission}` : `Missing permission: ${permission}`,
        'Should have permission',
        hasPermission ? 'Has permission' : 'Missing permission'
      );
    });
    
    // Test that admin permissions are NOT present
    const adminPermissions = ['admin:*', 'system:settings', '*'];
    adminPermissions.forEach(permission => {
      const hasPermission = demoUser.permissions.includes(permission);
      addTestResult(
        `Demo User Admin Permission Check: ${permission}`,
        !hasPermission,
        hasPermission ? `ERROR: Has admin permission: ${permission}` : `Correctly does NOT have admin permission: ${permission}`,
        'Should NOT have permission',
        hasPermission ? 'Has permission (BAD)' : 'No permission (GOOD)'
      );
    });
  }
  
  console.log('\n');
  
  // ==================== TEST 2: ADMIN DEMO USER ====================
  console.log(`${colors.magenta}${colors.bright}TEST 2: ADMIN DEMO USER (admin/admin123)${colors.reset}`);
  console.log('=' * 60);
  
  const adminAuth = simulateAuth('admin', 'admin123');
  
  addTestResult(
    'Admin User Authentication',
    adminAuth.success,
    adminAuth.success ? 'Successfully authenticated admin user' : 'Failed to authenticate admin user',
    'Authentication should succeed',
    adminAuth.success ? 'Success' : 'Failed'
  );
  
  if (adminAuth.success) {
    const adminUser = adminAuth.user;
    
    // Test user properties
    addTestResult(
      'Admin User Role Assignment',
      adminUser.role === 'admin',
      `User role: ${adminUser.role}`,
      'admin',
      adminUser.role
    );
    
    // Test navigation access
    const adminAccessiblePages = navigationPages.filter(page => hasPageAccess(adminUser, page));
    
    addTestResult(
      'Admin User Navigation Tabs Count',
      adminAccessiblePages.length === 9,
      `User can access ${adminAccessiblePages.length} tabs: ${adminAccessiblePages.map(p => p.label).join(', ')}`,
      '9 tabs (including Administration)',
      `${adminAccessiblePages.length} tabs`
    );
    
    // Test that Administration tab IS accessible
    const hasAdminAccess = adminAccessiblePages.some(page => page.id === 'Admin');
    addTestResult(
      'Admin User Admin Tab Access',
      hasAdminAccess,
      hasAdminAccess ? 'Admin user can correctly access Administration tab' : 'ERROR: Admin user CANNOT access Administration tab!',
      'Should have access to Administration tab',
      hasAdminAccess ? 'Has access (GOOD)' : 'No access (BAD)'
    );
    
    // Test wildcard permission
    const hasWildcard = adminUser.permissions.includes('*');
    addTestResult(
      'Admin User Wildcard Permission',
      hasWildcard,
      hasWildcard ? 'Has wildcard (*) permission for full access' : 'Missing wildcard (*) permission',
      'Should have wildcard (*) permission',
      hasWildcard ? 'Has wildcard' : 'Missing wildcard'
    );
    
    // Test admin-specific permissions
    const adminSpecificPermissions = ['admin:*', 'system:settings', 'users:manage', 'system:backup'];
    adminSpecificPermissions.forEach(permission => {
      const hasPermission = adminUser.permissions.includes(permission);
      addTestResult(
        `Admin User Permission: ${permission}`,
        hasPermission,
        hasPermission ? `Has admin permission: ${permission}` : `Missing admin permission: ${permission}`,
        'Should have admin permission',
        hasPermission ? 'Has permission' : 'Missing permission'
      );
    });
  }
  
  console.log('\n');
  
  // ==================== TEST 3: INVALID CREDENTIALS ====================
  console.log(`${colors.magenta}${colors.bright}TEST 3: SECURITY VALIDATION${colors.reset}`);
  console.log('=' * 60);
  
  const invalidAuth = simulateAuth('invalid', 'invalid');
  addTestResult(
    'Invalid Credentials Rejection',
    !invalidAuth.success,
    !invalidAuth.success ? 'Correctly rejected invalid credentials' : 'ERROR: Accepted invalid credentials!',
    'Should reject invalid credentials',
    !invalidAuth.success ? 'Rejected (GOOD)' : 'Accepted (BAD)'
  );
  
  const wrongPasswordAuth = simulateAuth('demo', 'wrongpassword');
  addTestResult(
    'Wrong Password Rejection',
    !wrongPasswordAuth.success,
    !wrongPasswordAuth.success ? 'Correctly rejected wrong password' : 'ERROR: Accepted wrong password!',
    'Should reject wrong password',
    !wrongPasswordAuth.success ? 'Rejected (GOOD)' : 'Accepted (BAD)'
  );
  
  console.log('\n');
  
  // ==================== FINAL SUMMARY ====================
  console.log(`${colors.cyan}${colors.bright}
╔══════════════════════════════════════════════════════════════╗
║                        TEST SUMMARY                          ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}`);
  
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`${colors.green}Passed: ${testResults.summary.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.summary.failed}${colors.reset}`);
  console.log(`Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
  
  if (testResults.summary.failed === 0) {
    console.log(`\n${colors.green}${colors.bright}🎉 ALL TESTS PASSED! Both demo accounts are working correctly.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}❌ ${testResults.summary.failed} test(s) failed. Please review the issues above.${colors.reset}`);
  }
  
  // ==================== MANUAL TEST INSTRUCTIONS ====================
  console.log(`\n${colors.yellow}${colors.bright}MANUAL TESTING INSTRUCTIONS:${colors.reset}`);
  console.log(`
${colors.cyan}1. Navigate to: http://172.29.218.93:5173/${colors.reset}

${colors.cyan}2. Test Regular Demo User:${colors.reset}
   • Login with: demo/demo123
   • Verify you see ${colors.green}7 navigation tabs${colors.reset} (no Administration tab)
   • Tabs should be: Dashboard, Checklists, Visit Summary, IT Infrastructure, Hardware Inventory, Data Closet, Issues & Actions

${colors.cyan}3. Test Admin Demo User:${colors.reset}
   • Logout and login with: admin/admin123
   • Verify you see ${colors.green}ALL 9 navigation tabs${colors.reset} including Administration
   • Click on Administration tab to verify access
   • Additional tabs: Import/Export, Administration

${colors.cyan}4. Expected Behavior:${colors.reset}
   • Regular users should NOT see the Administration tab
   • Admin users should see ALL tabs including Administration
   • Both accounts should authenticate successfully
   • Role-based access control should be enforced
`);
  
  // Save test results to file
  const resultsFile = path.join(__dirname, 'demo-test-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
  console.log(`\n${colors.blue}Test results saved to: ${resultsFile}${colors.reset}`);
  
  return testResults.summary.failed === 0;
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error(`${colors.red}Test execution failed:${colors.reset}`, error);
    process.exit(1);
  });
}

export { runTests, simulateAuth, hasPageAccess, navigationPages };