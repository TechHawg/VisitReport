#!/usr/bin/env node

/**
 * RSS Visit Report - Lighthouse Performance Audit
 * 
 * Comprehensive audit using Lighthouse for:
 * - Performance metrics (Core Web Vitals)
 * - Accessibility compliance
 * - Best practices validation
 * - SEO optimization
 * - Progressive Web App features
 */

import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LighthouseAuditor {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || 'http://localhost:5173';
    this.chrome = null;
    this.results = [];
  }

  async init() {
    console.log('🏠 Initializing Lighthouse Auditor...');
    
    // Launch Chrome
    this.chrome = await launch({
      chromeFlags: [
        '--headless',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ]
    });
    
    console.log(`✅ Chrome launched on port ${this.chrome.port}`);
  }

  async cleanup() {
    if (this.chrome) {
      await this.chrome.kill();
      console.log('🔄 Chrome instance closed');
    }
  }

  // Run single lighthouse audit
  async runAudit(url, options = {}) {
    const auditOptions = {
      logLevel: 'info',
      output: 'json',
      onlyCategories: options.categories || ['performance', 'accessibility', 'best-practices', 'seo'],
      port: this.chrome.port,
      ...options.lighthouseOptions
    };

    const flags = {
      // Performance settings
      throttlingMethod: 'devtools',
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0
      },
      // Device emulation
      emulatedFormFactor: 'desktop',
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false
      },
      ...options.flags
    };

    console.log(`🔍 Running Lighthouse audit for: ${url}`);
    
    const runnerResult = await lighthouse(url, auditOptions, null, flags);
    
    if (!runnerResult) {
      throw new Error('Lighthouse audit failed to complete');
    }

    return runnerResult.lhr; // Return Lighthouse report
  }

  // Run comprehensive audit suite
  async runComprehensiveAudit() {
    console.log('🔥 Starting Comprehensive Lighthouse Audit');
    console.log(`📍 Testing: ${this.serverUrl}`);

    const auditConfigs = [
      {
        name: 'Desktop Performance',
        url: this.serverUrl,
        flags: {
          emulatedFormFactor: 'desktop',
          screenEmulation: {
            mobile: false,
            width: 1350,
            height: 940,
            deviceScaleFactor: 1,
            disabled: false
          }
        },
        categories: ['performance']
      },
      {
        name: 'Mobile Performance',
        url: this.serverUrl,
        flags: {
          emulatedFormFactor: 'mobile',
          screenEmulation: {
            mobile: true,
            width: 360,
            height: 640,
            deviceScaleFactor: 2,
            disabled: false
          }
        },
        categories: ['performance']
      },
      {
        name: 'Accessibility Audit',
        url: this.serverUrl,
        categories: ['accessibility'],
        flags: {
          emulatedFormFactor: 'desktop'
        }
      },
      {
        name: 'Best Practices',
        url: this.serverUrl,
        categories: ['best-practices'],
        flags: {
          emulatedFormFactor: 'desktop'
        }
      },
      {
        name: 'SEO Audit',
        url: this.serverUrl,
        categories: ['seo'],
        flags: {
          emulatedFormFactor: 'desktop'
        }
      }
    ];

    for (const config of auditConfigs) {
      try {
        console.log(`\n🚀 Running ${config.name}...`);
        
        const result = await this.runAudit(config.url, config);
        
        this.results.push({
          name: config.name,
          timestamp: new Date().toISOString(),
          url: config.url,
          ...this.processAuditResult(result, config.categories)
        });

        console.log(`✅ ${config.name} completed`);
        
      } catch (error) {
        console.error(`❌ ${config.name} failed:`, error.message);
        
        this.results.push({
          name: config.name,
          timestamp: new Date().toISOString(),
          url: config.url,
          error: error.message,
          score: 0
        });
      }
    }

    return this.results;
  }

  // Process and extract key metrics from Lighthouse result
  processAuditResult(lhr, categories) {
    const processed = {
      score: 0,
      metrics: {},
      audits: {},
      opportunities: [],
      diagnostics: []
    };

    // Extract overall scores
    if (categories.includes('performance') && lhr.categories.performance) {
      processed.score = Math.round(lhr.categories.performance.score * 100);
      processed.performanceScore = processed.score;

      // Extract Core Web Vitals
      processed.coreWebVitals = this.extractCoreWebVitals(lhr);
      
      // Extract performance metrics
      processed.metrics = this.extractPerformanceMetrics(lhr);
      
      // Extract opportunities
      processed.opportunities = this.extractOpportunities(lhr);
    }

    if (categories.includes('accessibility') && lhr.categories.accessibility) {
      processed.accessibilityScore = Math.round(lhr.categories.accessibility.score * 100);
      if (!processed.score) processed.score = processed.accessibilityScore;
      
      processed.accessibilityAudits = this.extractAccessibilityAudits(lhr);
    }

    if (categories.includes('best-practices') && lhr.categories['best-practices']) {
      processed.bestPracticesScore = Math.round(lhr.categories['best-practices'].score * 100);
      if (!processed.score) processed.score = processed.bestPracticesScore;
      
      processed.bestPracticesAudits = this.extractBestPracticesAudits(lhr);
    }

    if (categories.includes('seo') && lhr.categories.seo) {
      processed.seoScore = Math.round(lhr.categories.seo.score * 100);
      if (!processed.score) processed.score = processed.seoScore;
      
      processed.seoAudits = this.extractSEOAudits(lhr);
    }

    // Extract diagnostics
    processed.diagnostics = this.extractDiagnostics(lhr);

    return processed;
  }

  // Extract Core Web Vitals
  extractCoreWebVitals(lhr) {
    const vitals = {};
    
    // First Contentful Paint
    if (lhr.audits['first-contentful-paint']) {
      vitals.firstContentfulPaint = {
        value: lhr.audits['first-contentful-paint'].numericValue,
        score: lhr.audits['first-contentful-paint'].score,
        displayValue: lhr.audits['first-contentful-paint'].displayValue
      };
    }

    // Largest Contentful Paint
    if (lhr.audits['largest-contentful-paint']) {
      vitals.largestContentfulPaint = {
        value: lhr.audits['largest-contentful-paint'].numericValue,
        score: lhr.audits['largest-contentful-paint'].score,
        displayValue: lhr.audits['largest-contentful-paint'].displayValue
      };
    }

    // First Input Delay (from Total Blocking Time as proxy)
    if (lhr.audits['total-blocking-time']) {
      vitals.totalBlockingTime = {
        value: lhr.audits['total-blocking-time'].numericValue,
        score: lhr.audits['total-blocking-time'].score,
        displayValue: lhr.audits['total-blocking-time'].displayValue
      };
    }

    // Cumulative Layout Shift
    if (lhr.audits['cumulative-layout-shift']) {
      vitals.cumulativeLayoutShift = {
        value: lhr.audits['cumulative-layout-shift'].numericValue,
        score: lhr.audits['cumulative-layout-shift'].score,
        displayValue: lhr.audits['cumulative-layout-shift'].displayValue
      };
    }

    // Speed Index
    if (lhr.audits['speed-index']) {
      vitals.speedIndex = {
        value: lhr.audits['speed-index'].numericValue,
        score: lhr.audits['speed-index'].score,
        displayValue: lhr.audits['speed-index'].displayValue
      };
    }

    return vitals;
  }

  // Extract performance metrics
  extractPerformanceMetrics(lhr) {
    const metrics = {};

    const metricAudits = [
      'time-to-first-byte',
      'first-meaningful-paint',
      'interactive',
      'max-potential-fid',
      'server-response-time'
    ];

    metricAudits.forEach(metricKey => {
      if (lhr.audits[metricKey]) {
        metrics[metricKey] = {
          value: lhr.audits[metricKey].numericValue,
          score: lhr.audits[metricKey].score,
          displayValue: lhr.audits[metricKey].displayValue
        };
      }
    });

    return metrics;
  }

  // Extract performance opportunities
  extractOpportunities(lhr) {
    const opportunities = [];

    const opportunityAudits = [
      'unused-javascript',
      'unused-css-rules',
      'render-blocking-resources',
      'unminified-css',
      'unminified-javascript',
      'efficient-animated-content',
      'uses-optimized-images',
      'modern-image-formats',
      'uses-text-compression',
      'uses-responsive-images'
    ];

    opportunityAudits.forEach(auditKey => {
      const audit = lhr.audits[auditKey];
      if (audit && audit.score !== null && audit.score < 1) {
        opportunities.push({
          audit: auditKey,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          numericValue: audit.numericValue,
          displayValue: audit.displayValue,
          details: audit.details
        });
      }
    });

    return opportunities.sort((a, b) => (b.numericValue || 0) - (a.numericValue || 0));
  }

  // Extract accessibility audits
  extractAccessibilityAudits(lhr) {
    const audits = [];

    const accessibilityAudits = [
      'color-contrast',
      'image-alt',
      'label',
      'aria-allowed-attr',
      'aria-hidden-body',
      'aria-roles',
      'button-name',
      'link-name',
      'heading-order',
      'landmark-one-main',
      'meta-viewport'
    ];

    accessibilityAudits.forEach(auditKey => {
      const audit = lhr.audits[auditKey];
      if (audit) {
        audits.push({
          audit: auditKey,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          passed: audit.score === 1,
          details: audit.details
        });
      }
    });

    return audits;
  }

  // Extract best practices audits
  extractBestPracticesAudits(lhr) {
    const audits = [];

    const bestPracticeAudits = [
      'uses-https',
      'is-on-https',
      'no-vulnerable-libraries',
      'csp-xss',
      'errors-in-console',
      'image-aspect-ratio',
      'image-size-responsive'
    ];

    bestPracticeAudits.forEach(auditKey => {
      const audit = lhr.audits[auditKey];
      if (audit) {
        audits.push({
          audit: auditKey,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          passed: audit.score === 1,
          details: audit.details
        });
      }
    });

    return audits;
  }

  // Extract SEO audits
  extractSEOAudits(lhr) {
    const audits = [];

    const seoAudits = [
      'meta-description',
      'document-title',
      'html-has-lang',
      'html-lang-valid',
      'viewport',
      'font-size',
      'crawlable-anchors'
    ];

    seoAudits.forEach(auditKey => {
      const audit = lhr.audits[auditKey];
      if (audit) {
        audits.push({
          audit: auditKey,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          passed: audit.score === 1,
          details: audit.details
        });
      }
    });

    return audits;
  }

  // Extract diagnostics
  extractDiagnostics(lhr) {
    const diagnostics = [];

    const diagnosticAudits = [
      'dom-size',
      'uses-passive-event-listeners',
      'no-document-write',
      'uses-http2',
      'uses-long-cache-ttl',
      'total-byte-weight'
    ];

    diagnosticAudits.forEach(auditKey => {
      const audit = lhr.audits[auditKey];
      if (audit) {
        diagnostics.push({
          audit: auditKey,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          numericValue: audit.numericValue,
          displayValue: audit.displayValue,
          details: audit.details
        });
      }
    });

    return diagnostics;
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n📊 LIGHTHOUSE AUDIT REPORT');
    console.log('=' * 50);

    // Performance Summary
    const performanceResults = this.results.filter(r => r.name.includes('Performance'));
    if (performanceResults.length > 0) {
      console.log('\n🚀 PERFORMANCE SCORES:');
      performanceResults.forEach(result => {
        console.log(`   ${result.name}: ${result.score}/100`);
      });

      // Core Web Vitals
      const desktopPerf = performanceResults.find(r => r.name === 'Desktop Performance');
      if (desktopPerf && desktopPerf.coreWebVitals) {
        console.log('\n⚡ CORE WEB VITALS (Desktop):');
        const vitals = desktopPerf.coreWebVitals;
        
        if (vitals.firstContentfulPaint) {
          console.log(`   FCP: ${vitals.firstContentfulPaint.displayValue} (${this.getScoreEmoji(vitals.firstContentfulPaint.score)})`);
        }
        if (vitals.largestContentfulPaint) {
          console.log(`   LCP: ${vitals.largestContentfulPaint.displayValue} (${this.getScoreEmoji(vitals.largestContentfulPaint.score)})`);
        }
        if (vitals.totalBlockingTime) {
          console.log(`   TBT: ${vitals.totalBlockingTime.displayValue} (${this.getScoreEmoji(vitals.totalBlockingTime.score)})`);
        }
        if (vitals.cumulativeLayoutShift) {
          console.log(`   CLS: ${vitals.cumulativeLayoutShift.displayValue} (${this.getScoreEmoji(vitals.cumulativeLayoutShift.score)})`);
        }
      }
    }

    // Other Categories
    const accessibilityResult = this.results.find(r => r.name === 'Accessibility Audit');
    if (accessibilityResult) {
      console.log(`\n♿ ACCESSIBILITY: ${accessibilityResult.score}/100 ${this.getScoreEmoji(accessibilityResult.score / 100)}`);
    }

    const bestPracticesResult = this.results.find(r => r.name === 'Best Practices');
    if (bestPracticesResult) {
      console.log(`\n✨ BEST PRACTICES: ${bestPracticesResult.score}/100 ${this.getScoreEmoji(bestPracticesResult.score / 100)}`);
    }

    const seoResult = this.results.find(r => r.name === 'SEO Audit');
    if (seoResult) {
      console.log(`\n🔍 SEO: ${seoResult.score}/100 ${this.getScoreEmoji(seoResult.score / 100)}`);
    }

    // Top Opportunities
    const opportunities = [];
    this.results.forEach(result => {
      if (result.opportunities) {
        opportunities.push(...result.opportunities);
      }
    });

    if (opportunities.length > 0) {
      console.log('\n🎯 TOP PERFORMANCE OPPORTUNITIES:');
      opportunities.slice(0, 5).forEach(opp => {
        console.log(`   • ${opp.title} (${opp.displayValue || 'Potential savings'})`);
      });
    }

    console.log('\n' + '=' * 50);
  }

  // Get emoji for score
  getScoreEmoji(score) {
    if (score >= 0.9) return '🟢';
    if (score >= 0.5) return '🟡';
    return '🔴';
  }

  // Generate recommendations
  generateRecommendations() {
    const recommendations = [];

    this.results.forEach(result => {
      // Performance recommendations
      if (result.performanceScore && result.performanceScore < 90) {
        recommendations.push({
          category: 'Performance',
          priority: result.performanceScore < 50 ? 'HIGH' : 'MEDIUM',
          issue: `${result.name} score is ${result.performanceScore}/100`,
          recommendation: 'Focus on optimizing Core Web Vitals metrics',
          impact: 'Improved user experience and search rankings'
        });
      }

      // Accessibility recommendations
      if (result.accessibilityScore && result.accessibilityScore < 95) {
        recommendations.push({
          category: 'Accessibility',
          priority: result.accessibilityScore < 80 ? 'HIGH' : 'MEDIUM',
          issue: `Accessibility score is ${result.accessibilityScore}/100`,
          recommendation: 'Address color contrast, alt text, and ARIA labels',
          impact: 'Better user experience for users with disabilities'
        });
      }

      // Specific opportunities
      if (result.opportunities) {
        result.opportunities.slice(0, 3).forEach(opp => {
          recommendations.push({
            category: 'Performance Optimization',
            priority: opp.numericValue > 1000 ? 'HIGH' : 'MEDIUM',
            issue: opp.title,
            recommendation: opp.description,
            impact: `Potential savings: ${opp.displayValue || 'Unknown'}`
          });
        });
      }
    });

    return recommendations;
  }

  // Save results
  async saveResults() {
    const resultsDir = path.join(__dirname, 'results');
    await fs.mkdir(resultsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `lighthouse-audit-${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    const fullResults = {
      timestamp: new Date().toISOString(),
      serverUrl: this.serverUrl,
      audits: this.results,
      recommendations: this.generateRecommendations(),
      summary: {
        totalAudits: this.results.length,
        avgPerformanceScore: this.calculateAvgScore('performanceScore'),
        accessibilityScore: this.results.find(r => r.accessibilityScore)?.accessibilityScore || null,
        bestPracticesScore: this.results.find(r => r.bestPracticesScore)?.bestPracticesScore || null,
        seoScore: this.results.find(r => r.seoScore)?.seoScore || null
      }
    };

    await fs.writeFile(filepath, JSON.stringify(fullResults, null, 2));
    console.log(`💾 Lighthouse results saved to: ${filepath}`);

    return filepath;
  }

  // Calculate average score for a metric
  calculateAvgScore(metric) {
    const scores = this.results.filter(r => r[metric]).map(r => r[metric]);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  }

  // Run complete audit
  async runCompleteAudit() {
    try {
      await this.init();
      await this.runComprehensiveAudit();
      this.generateReport();
      const resultsFile = await this.saveResults();
      
      console.log('\n🎉 Lighthouse audit completed successfully!');
      return {
        results: this.results,
        recommendations: this.generateRecommendations(),
        resultsFile
      };
      
    } catch (error) {
      console.error('❌ Lighthouse audit failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// CLI interface
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const serverUrl = process.argv[2] || 'http://localhost:5173';
  
  const auditor = new LighthouseAuditor({ serverUrl });
  
  auditor.runCompleteAudit()
    .then((results) => {
      console.log(`\n✅ Lighthouse audit completed - ${results.recommendations.length} recommendations generated`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Lighthouse audit failed:', error);
      process.exit(1);
    });
}

export default LighthouseAuditor;