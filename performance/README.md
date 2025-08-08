# RSS Visit Report - Performance Testing Suite

Comprehensive performance testing and optimization toolkit for the RSS Visit Report application.

## 🚀 Quick Start

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Run complete performance test suite**:
   ```bash
   npm run test:performance
   ```

## 📊 Test Suite Overview

This performance testing suite includes four comprehensive testing tools:

### 1. 🔥 Performance Test Suite (`test-suite.js`)
- **Load Performance**: Startup time, page navigation, P95/P99 latency metrics
- **Memory Usage**: Memory leak detection, heap analysis over extended usage
- **Component Performance**: React component render performance analysis
- **Data Processing**: SCCM parsing performance with realistic datasets
- **Bundle Analysis**: Resource loading, chunk analysis, optimization opportunities

### 2. 🧠 Memory Profiler (`memory-profiler.js`)
- **Heap Snapshots**: Before/after memory comparison
- **Memory Timeline**: Continuous memory monitoring during user interactions
- **Leak Detection**: Identifies memory leaks in JavaScript, DOM nodes, event listeners
- **Storage Analysis**: LocalStorage and SessionStorage usage tracking
- **Garbage Collection**: GC event monitoring and analysis

### 3. 🏠 Lighthouse Audit (`lighthouse-audit.js`)
- **Core Web Vitals**: FCP, LCP, TBT, CLS measurements
- **Performance Scores**: Desktop and mobile performance analysis
- **Accessibility**: WCAG compliance and accessibility best practices
- **Best Practices**: Security, modern web standards, optimization
- **SEO**: Search engine optimization analysis

### 4. 📦 Bundle Analyzer (`bundle-analyzer.js`)
- **Bundle Size Analysis**: Total size, gzipped size, file breakdown
- **Code Splitting**: Chunk effectiveness analysis
- **Dependency Audit**: Heavy dependency identification
- **Tree Shaking**: Unused code detection and optimization opportunities
- **Security**: Vulnerability scanning in dependencies

## 🛠️ Individual Test Commands

Run specific tests independently:

```bash
# Complete performance test suite
npm run test:performance:suite

# Memory profiling only
npm run test:performance:memory

# Lighthouse audit only
npm run test:performance:lighthouse

# Bundle analysis only
npm run test:performance:bundle

# Run complete test suite (all tests + consolidated report)
npm run test:performance
```

## 📋 Test Configuration

### Server URL Configuration
By default, tests run against `http://localhost:5173`. To test against a different URL:

```bash
# Test against production
node performance/run-all-tests.js https://your-production-url.com

# Test specific tool against custom URL
node performance/lighthouse-audit.js https://staging.example.com
```

### Skip Specific Tests
Skip tests that you don't need:

```bash
# Skip memory profiling and bundle analysis
node performance/run-all-tests.js http://localhost:5173 memory bundle
```

Available test names to skip: `performance`, `memory`, `lighthouse`, `bundle`

## 📊 Understanding Results

### Performance Metrics
- **P95 Latency**: 95% of requests complete within this time
- **P99 Latency**: 99% of requests complete within this time
- **Memory Growth**: Total memory increase during testing session
- **DOM Nodes**: Number of DOM elements (indicates memory leaks if growing)

### Score Interpretations
- **90-100**: Excellent performance
- **75-89**: Good performance
- **50-74**: Needs improvement
- **0-49**: Poor performance, critical issues

### Production Readiness Status
- **✅ READY**: No critical issues, safe for production
- **⚠️ CAUTION**: Minor issues, monitor closely in production
- **❌ NOT READY**: Critical issues must be resolved before production

## 🎯 Common Performance Issues & Solutions

### 1. Slow Startup Time (P95 > 3000ms)
**Solutions:**
- Implement code splitting for routes
- Add lazy loading for heavy components
- Optimize bundle size (see bundle analysis)
- Use resource preloading for critical assets

### 2. Memory Leaks Detected
**Solutions:**
- Add cleanup functions to useEffect hooks
- Remove event listeners in component unmount
- Clear intervals and timeouts properly
- Review closures that might retain references

### 3. Large Bundle Size (> 2MB)
**Solutions:**
- Implement tree shaking for unused code
- Split large dependencies into separate chunks  
- Use dynamic imports for route-based splitting
- Replace heavy libraries with lighter alternatives

### 4. Poor Lighthouse Scores
**Performance Issues:**
- Optimize images (WebP format, proper sizing)
- Minimize render-blocking resources
- Implement proper caching strategies

**Accessibility Issues:**
- Add alt text to images
- Improve color contrast ratios
- Add proper ARIA labels
- Ensure keyboard navigation works

## 🔧 Advanced Configuration

### Memory Profiler Options
```javascript
const memoryProfiler = new MemoryProfiler({
  serverUrl: 'http://localhost:5173'
});

await memoryProfiler.runMemoryProfile({
  duration: 60000,        // Test duration in ms
  snapshotInterval: 15000, // Heap snapshot interval
  monitorInterval: 1000    // Memory monitoring frequency
});
```

### Performance Test Suite Options
```javascript
const testSuite = new PerformanceTestSuite();

// Customize test configuration
TEST_CONFIG.LOAD_TEST_ITERATIONS = 5;  // Reduce for faster testing
TEST_CONFIG.MEMORY_LEAK_ITERATIONS = 10; // Reduce for faster testing
```

### Lighthouse Audit Options
```javascript
const auditor = new LighthouseAuditor({
  serverUrl: 'http://localhost:5173'
});

// Custom audit configuration
const customFlags = {
  emulatedFormFactor: 'mobile',  // 'desktop' or 'mobile'
  throttling: {
    rttMs: 40,
    throughputKbps: 10240
  }
};
```

## 📁 Results & Reports

All test results are saved in the `performance/results/` directory:

- `performance-results-*.json`: Complete performance test results
- `memory-profile-*.json`: Memory profiling detailed analysis
- `lighthouse-audit-*.json`: Lighthouse audit comprehensive report
- `bundle-analysis-*.json`: Bundle analysis with recommendations
- `consolidated-performance-report-*.json`: Master report combining all tests

### Result File Structure
```json
{
  "timestamp": "2024-01-01T10:00:00.000Z",
  "serverUrl": "http://localhost:5173",
  "loadPerformance": { /* Load test results */ },
  "memoryUsage": { /* Memory analysis */ },
  "lighthouseAudit": { /* Core web vitals */ },
  "bundleAnalysis": { /* Bundle optimization */ },
  "recommendations": [ /* Prioritized action items */ ],
  "summary": { /* Executive summary */ }
}
```

## 🚨 Critical Performance Thresholds

The test suite flags these critical issues:

### Load Performance
- **Critical**: P95 latency > 5000ms
- **Warning**: P95 latency > 3000ms

### Memory Usage
- **Critical**: Memory growth > 50MB during session
- **Warning**: Memory growth > 20MB during session

### Bundle Size
- **Critical**: Total bundle > 5MB
- **Warning**: Total bundle > 2MB

### Lighthouse Scores
- **Critical**: Performance score < 50
- **Warning**: Performance score < 75

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Performance Tests
on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm run dev &
      - run: sleep 30  # Wait for server to start
      - run: npm run test:performance
      - uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: performance/results/
```

### Performance Budgets
Set up performance budgets in your CI/CD:

```javascript
// performance-budgets.json
{
  "maxBundleSize": "2MB",
  "maxP95Latency": 3000,
  "minLighthouseScore": 75,
  "maxMemoryGrowth": "20MB"
}
```

## 🛡️ Security Considerations

The performance tests include security analysis:

- **Dependency Vulnerabilities**: Scans for known security issues
- **Content Security Policy**: Validates CSP implementation
- **HTTPS Usage**: Ensures secure connections
- **XSS Protection**: Checks for XSS prevention measures

## 🐛 Troubleshooting

### Common Issues

1. **Tests failing to start server**
   ```bash
   # Ensure server is running
   npm run dev
   # In another terminal, run tests
   npm run test:performance
   ```

2. **Chrome/Puppeteer issues**
   ```bash
   # Install Chrome dependencies (Linux)
   sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2
   ```

3. **Memory profiler permissions**
   ```bash
   # Add chrome flags for memory access
   --enable-precise-memory-info --js-flags=--expose-gc
   ```

4. **Lighthouse audit failures**
   - Ensure server is accessible
   - Check for CORS issues
   - Verify no authentication required for test pages

### Debug Mode
Enable debug logging:
```bash
DEBUG=true npm run test:performance
```

## 📚 Further Reading

- [Core Web Vitals](https://web.dev/vitals/)
- [React Performance](https://reactjs.org/docs/optimizing-performance.html)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Bundle Analysis Best Practices](https://webpack.js.org/guides/code-splitting/)

## 🤝 Contributing

To add new performance tests:

1. Create test file in `performance/` directory
2. Follow existing patterns for result structure
3. Add npm script in `package.json`
4. Update this README with new test description
5. Add integration to `run-all-tests.js` if needed

## 📝 License

This performance testing suite is part of the RSS Visit Report application and follows the same license terms.