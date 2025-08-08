#!/usr/bin/env node

/**
 * RSS Visit Report - Master Performance Test Runner
 * 
 * Orchestrates all performance testing tools:
 * - Comprehensive performance testing
 * - Memory profiling
 * - Lighthouse audits
 * - Bundle analysis
 * - Consolidated reporting
 */

import PerformanceTestSuite from './test-suite.js';
import MemoryProfiler from './memory-profiler.js';
import LighthouseAuditor from './lighthouse-audit.js';
import BundleAnalyzer from './bundle-analyzer.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MasterPerformanceRunner {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || 'http://localhost:5173';
    this.projectRoot = options.projectRoot || path.resolve(__dirname, '..');
    this.skipTests = options.skipTests || [];
    this.results = {
      timestamp: new Date().toISOString(),
      serverUrl: this.serverUrl,
      testResults: {},
      consolidatedReport: {},
      recommendations: [],
      summary: {}
    };
  }

  // Run all performance tests
  async runAllTests() {
    console.log('🚀 MASTER PERFORMANCE TESTING SUITE');
    console.log('=' * 60);
    console.log(`📍 Server URL: ${this.serverUrl}`);
    console.log(`📂 Project Root: ${this.projectRoot}`);
    console.log(`⏰ Started: ${new Date().toLocaleString()}`);
    console.log('=' * 60);

    const overallStartTime = performance.now();
    const testResults = {};

    // Test 1: Comprehensive Performance Testing
    if (!this.skipTests.includes('performance')) {
      console.log('\n🔥 1/4 - Running Comprehensive Performance Tests...');
      try {
        const perfSuite = new PerformanceTestSuite();
        const perfResults = await perfSuite.runAllTests();
        testResults.performance = {
          status: 'completed',
          resultsFile: perfResults,
          timestamp: new Date().toISOString()
        };
        console.log('✅ Performance tests completed successfully');
      } catch (error) {
        console.error('❌ Performance tests failed:', error.message);
        testResults.performance = {
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Test 2: Memory Profiling
    if (!this.skipTests.includes('memory')) {
      console.log('\n🧠 2/4 - Running Memory Profile...');
      try {
        const memoryProfiler = new MemoryProfiler({ serverUrl: this.serverUrl });
        const memoryResults = await memoryProfiler.runMemoryProfile({
          duration: 45000, // 45 seconds for comprehensive testing
          snapshotInterval: 10000,
          monitorInterval: 1000
        });
        testResults.memory = {
          status: 'completed',
          resultsFile: memoryResults.resultsFile,
          leakDetected: memoryResults.analysis.severity === 'HIGH',
          memoryGrowth: memoryResults.analysis.memoryGrowth,
          timestamp: new Date().toISOString()
        };
        console.log('✅ Memory profiling completed successfully');
      } catch (error) {
        console.error('❌ Memory profiling failed:', error.message);
        testResults.memory = {
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Test 3: Lighthouse Audit
    if (!this.skipTests.includes('lighthouse')) {
      console.log('\n🏠 3/4 - Running Lighthouse Audit...');
      try {
        const lighthouseAuditor = new LighthouseAuditor({ serverUrl: this.serverUrl });
        const lighthouseResults = await lighthouseAuditor.runCompleteAudit();
        testResults.lighthouse = {
          status: 'completed',
          resultsFile: lighthouseResults.resultsFile,
          performanceScore: this.extractPerformanceScore(lighthouseResults.results),
          accessibilityScore: this.extractAccessibilityScore(lighthouseResults.results),
          timestamp: new Date().toISOString()
        };
        console.log('✅ Lighthouse audit completed successfully');
      } catch (error) {
        console.error('❌ Lighthouse audit failed:', error.message);
        testResults.lighthouse = {
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Test 4: Bundle Analysis
    if (!this.skipTests.includes('bundle')) {
      console.log('\n📦 4/4 - Running Bundle Analysis...');
      try {
        const bundleAnalyzer = new BundleAnalyzer({ projectRoot: this.projectRoot });
        const bundleResults = await bundleAnalyzer.runCompleteAnalysis();
        testResults.bundle = {
          status: 'completed',
          resultsFile: bundleResults.resultsFile,
          totalSize: bundleResults.results.bundleInfo.totalSize,
          gzippedSize: bundleResults.results.bundleInfo.gzippedSize,
          recommendations: bundleResults.results.recommendations.length,
          timestamp: new Date().toISOString()
        };
        console.log('✅ Bundle analysis completed successfully');
      } catch (error) {
        console.error('❌ Bundle analysis failed:', error.message);
        testResults.bundle = {
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    const overallEndTime = performance.now();
    const totalDuration = Math.round((overallEndTime - overallStartTime) / 1000);

    this.results.testResults = testResults;
    this.results.summary.totalDuration = totalDuration;
    this.results.summary.testsRun = Object.keys(testResults).length;
    this.results.summary.testsSuccessful = Object.values(testResults).filter(t => t.status === 'completed').length;
    this.results.summary.testsFailed = Object.values(testResults).filter(t => t.status === 'failed').length;

    console.log(`\n⏱️  Total test duration: ${totalDuration} seconds`);
    console.log(`✅ Tests completed: ${this.results.summary.testsSuccessful}/${this.results.summary.testsRun}`);
    
    return testResults;
  }

  // Extract performance score from Lighthouse results
  extractPerformanceScore(lighthouseResults) {
    const perfResult = lighthouseResults.find(r => r.performanceScore);
    return perfResult ? perfResult.performanceScore : null;
  }

  // Extract accessibility score from Lighthouse results
  extractAccessibilityScore(lighthouseResults) {
    const accessResult = lighthouseResults.find(r => r.accessibilityScore);
    return accessResult ? accessResult.accessibilityScore : null;
  }

  // Load and consolidate results from individual test files
  async loadTestResults() {
    console.log('\n📊 Consolidating results from individual tests...');
    
    const resultsDir = path.join(__dirname, 'results');
    
    try {
      const files = await fs.readdir(resultsDir);
      const consolidatedData = {
        performanceTest: null,
        memoryProfile: null,
        lighthouseAudit: null,
        bundleAnalysis: null
      };

      // Load most recent results from each test type
      const sortedFiles = files.sort().reverse(); // Most recent first

      for (const file of sortedFiles) {
        if (file.startsWith('performance-results-') && file.endsWith('.json') && !consolidatedData.performanceTest) {
          const filePath = path.join(resultsDir, file);
          consolidatedData.performanceTest = JSON.parse(await fs.readFile(filePath, 'utf8'));
        }
        
        if (file.startsWith('memory-profile-') && file.endsWith('.json') && !consolidatedData.memoryProfile) {
          const filePath = path.join(resultsDir, file);
          consolidatedData.memoryProfile = JSON.parse(await fs.readFile(filePath, 'utf8'));
        }
        
        if (file.startsWith('lighthouse-audit-') && file.endsWith('.json') && !consolidatedData.lighthouseAudit) {
          const filePath = path.join(resultsDir, file);
          consolidatedData.lighthouseAudit = JSON.parse(await fs.readFile(filePath, 'utf8'));
        }
        
        if (file.startsWith('bundle-analysis-') && file.endsWith('.json') && !consolidatedData.bundleAnalysis) {
          const filePath = path.join(resultsDir, file);
          consolidatedData.bundleAnalysis = JSON.parse(await fs.readFile(filePath, 'utf8'));
        }
      }

      this.results.consolidatedReport = consolidatedData;
      return consolidatedData;
      
    } catch (error) {
      console.log('   ⚠️  Could not load all test results:', error.message);
      return null;
    }
  }

  // Generate consolidated recommendations
  generateConsolidatedRecommendations() {
    console.log('🎯 Generating consolidated recommendations...');
    
    const allRecommendations = [];
    const consolidated = this.results.consolidatedReport;

    // Collect recommendations from all tests
    if (consolidated.performanceTest?.recommendations) {
      consolidated.performanceTest.recommendations.forEach(rec => {
        allRecommendations.push({
          source: 'Performance Test',
          ...rec
        });
      });
    }

    if (consolidated.memoryProfile?.leakAnalysis?.recommendations) {
      consolidated.memoryProfile.leakAnalysis.recommendations.forEach(rec => {
        allRecommendations.push({
          source: 'Memory Profile',
          category: 'Memory Management',
          priority: rec.priority?.toUpperCase() || 'MEDIUM',
          issue: rec.issue,
          recommendation: rec.solution,
          impact: 'Memory optimization'
        });
      });
    }

    if (consolidated.lighthouseAudit?.recommendations) {
      consolidated.lighthouseAudit.recommendations.forEach(rec => {
        allRecommendations.push({
          source: 'Lighthouse Audit',
          ...rec
        });
      });
    }

    if (consolidated.bundleAnalysis?.recommendations) {
      consolidated.bundleAnalysis.recommendations.forEach(rec => {
        allRecommendations.push({
          source: 'Bundle Analysis',
          ...rec
        });
      });
    }

    // Deduplicate and prioritize recommendations
    const uniqueRecommendations = this.deduplicateRecommendations(allRecommendations);
    const prioritizedRecommendations = this.prioritizeRecommendations(uniqueRecommendations);

    this.results.recommendations = prioritizedRecommendations;
    
    console.log(`   ✅ Consolidated ${prioritizedRecommendations.length} unique recommendations`);
    return prioritizedRecommendations;
  }

  // Deduplicate similar recommendations
  deduplicateRecommendations(recommendations) {
    const unique = [];
    const seen = new Set();

    recommendations.forEach(rec => {
      // Create a simplified key for deduplication
      const key = `${rec.category?.toLowerCase()}-${rec.issue?.toLowerCase().substring(0, 50)}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(rec);
      } else {
        // If we've seen this before, combine sources
        const existing = unique.find(u => 
          u.category?.toLowerCase() === rec.category?.toLowerCase() && 
          u.issue?.toLowerCase().substring(0, 50) === rec.issue?.toLowerCase().substring(0, 50)
        );
        if (existing && existing.source !== rec.source) {
          existing.source = `${existing.source}, ${rec.source}`;
        }
      }
    });

    return unique;
  }

  // Prioritize recommendations by impact and urgency
  prioritizeRecommendations(recommendations) {
    const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    
    return recommendations.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      return bPriority - aPriority;
    });
  }

  // Generate comprehensive report
  async generateComprehensiveReport() {
    console.log('\n📋 Generating comprehensive performance report...');
    
    const consolidated = this.results.consolidatedReport;
    const report = {
      executiveSummary: this.generateExecutiveSummary(consolidated),
      detailedFindings: this.generateDetailedFindings(consolidated),
      recommendations: this.results.recommendations,
      productionReadiness: this.assessProductionReadiness(consolidated),
      nextSteps: this.generateNextSteps()
    };

    // Display summary
    this.displayComprehensiveReport(report);

    return report;
  }

  // Generate executive summary
  generateExecutiveSummary(consolidated) {
    const summary = {
      overallHealthScore: 0,
      criticalIssues: 0,
      majorFindings: [],
      keyMetrics: {}
    };

    let scoreComponents = 0;
    let totalScore = 0;

    // Performance metrics
    if (consolidated.performanceTest) {
      const perfData = consolidated.performanceTest;
      if (perfData.loadPerformance?.startup) {
        const startupScore = perfData.loadPerformance.startup.p95 < 3000 ? 85 : 
                            perfData.loadPerformance.startup.p95 < 5000 ? 65 : 35;
        summary.keyMetrics.startupTime = `${perfData.loadPerformance.startup.p95}ms (P95)`;
        totalScore += startupScore;
        scoreComponents++;
      }
    }

    // Memory health
    if (consolidated.memoryProfile) {
      const memData = consolidated.memoryProfile;
      if (memData.leakAnalysis) {
        const memoryScore = memData.leakAnalysis.severity === 'LOW' ? 90 :
                           memData.leakAnalysis.severity === 'MEDIUM' ? 60 : 30;
        summary.keyMetrics.memoryHealth = memData.leakAnalysis.severity;
        totalScore += memoryScore;
        scoreComponents++;
        
        if (memData.leakAnalysis.severity === 'HIGH') {
          summary.criticalIssues++;
          summary.majorFindings.push('Critical memory leaks detected');
        }
      }
    }

    // Lighthouse scores
    if (consolidated.lighthouseAudit) {
      const lighthouse = consolidated.lighthouseAudit;
      if (lighthouse.summary) {
        if (lighthouse.summary.avgPerformanceScore) {
          summary.keyMetrics.lighthousePerformance = `${lighthouse.summary.avgPerformanceScore}/100`;
          totalScore += lighthouse.summary.avgPerformanceScore;
          scoreComponents++;
        }
        if (lighthouse.summary.accessibilityScore) {
          summary.keyMetrics.accessibility = `${lighthouse.summary.accessibilityScore}/100`;
          totalScore += lighthouse.summary.accessibilityScore;
          scoreComponents++;
        }
      }
    }

    // Bundle size
    if (consolidated.bundleAnalysis) {
      const bundle = consolidated.bundleAnalysis;
      if (bundle.bundleInfo) {
        const bundleSizeMB = bundle.bundleInfo.totalSize / 1024 / 1024;
        const bundleScore = bundleSizeMB < 1 ? 90 : bundleSizeMB < 2 ? 70 : bundleSizeMB < 5 ? 50 : 20;
        summary.keyMetrics.bundleSize = `${bundleSizeMB.toFixed(1)}MB`;
        totalScore += bundleScore;
        scoreComponents++;
        
        if (bundleSizeMB > 5) {
          summary.criticalIssues++;
          summary.majorFindings.push('Extremely large bundle size');
        }
      }
    }

    // Calculate overall health score
    summary.overallHealthScore = scoreComponents > 0 ? Math.round(totalScore / scoreComponents) : 0;

    return summary;
  }

  // Generate detailed findings
  generateDetailedFindings(consolidated) {
    const findings = {
      performance: {},
      memory: {},
      accessibility: {},
      bundleOptimization: {},
      security: {}
    };

    // Performance findings
    if (consolidated.performanceTest) {
      const perf = consolidated.performanceTest;
      findings.performance = {
        loadTimes: perf.loadPerformance,
        componentPerformance: perf.componentPerformance,
        dataProcessing: perf.dataProcessing,
        browserCompatibility: perf.browserCompatibility
      };
    }

    // Memory findings
    if (consolidated.memoryProfile) {
      const memory = consolidated.memoryProfile;
      findings.memory = {
        leakAnalysis: memory.leakAnalysis,
        memoryTimeline: memory.memoryTimeline,
        heapSnapshots: memory.heapSnapshots?.length || 0,
        recommendations: memory.leakAnalysis?.recommendations || []
      };
    }

    // Accessibility findings
    if (consolidated.lighthouseAudit) {
      const lighthouse = consolidated.lighthouseAudit;
      findings.accessibility = {
        score: lighthouse.summary?.accessibilityScore,
        issues: this.extractAccessibilityIssues(lighthouse.audits)
      };
    }

    // Bundle findings
    if (consolidated.bundleAnalysis) {
      const bundle = consolidated.bundleAnalysis;
      findings.bundleOptimization = {
        size: bundle.bundleInfo,
        dependencies: bundle.analysis?.dependencies,
        treeShaking: bundle.analysis?.treeShaking,
        opportunities: bundle.recommendations
      };
    }

    return findings;
  }

  // Extract accessibility issues
  extractAccessibilityIssues(audits) {
    const issues = [];
    
    if (audits) {
      audits.forEach(audit => {
        if (audit.accessibilityAudits) {
          const failedAudits = audit.accessibilityAudits.filter(a => !a.passed);
          issues.push(...failedAudits.map(a => ({
            audit: a.audit,
            title: a.title,
            description: a.description
          })));
        }
      });
    }
    
    return issues;
  }

  // Assess production readiness
  assessProductionReadiness(consolidated) {
    const assessment = {
      readinessScore: 0,
      status: 'NOT_READY',
      blockingIssues: [],
      warnings: [],
      recommendations: []
    };

    let readinessPoints = 0;
    let maxPoints = 0;

    // Performance readiness (25 points)
    maxPoints += 25;
    if (consolidated.performanceTest?.loadPerformance?.startup) {
      const p95 = consolidated.performanceTest.loadPerformance.startup.p95;
      if (p95 < 3000) readinessPoints += 25;
      else if (p95 < 5000) readinessPoints += 15;
      else {
        assessment.blockingIssues.push(`Slow startup time: ${p95}ms P95 latency`);
        readinessPoints += 5;
      }
    }

    // Memory readiness (25 points)
    maxPoints += 25;
    if (consolidated.memoryProfile?.leakAnalysis) {
      const severity = consolidated.memoryProfile.leakAnalysis.severity;
      if (severity === 'LOW') readinessPoints += 25;
      else if (severity === 'MEDIUM') {
        readinessPoints += 15;
        assessment.warnings.push('Minor memory leaks detected');
      } else {
        assessment.blockingIssues.push('Critical memory leaks detected');
        readinessPoints += 0;
      }
    }

    // Lighthouse readiness (25 points)
    maxPoints += 25;
    if (consolidated.lighthouseAudit?.summary) {
      const perfScore = consolidated.lighthouseAudit.summary.avgPerformanceScore || 0;
      const accessScore = consolidated.lighthouseAudit.summary.accessibilityScore || 0;
      
      const avgScore = (perfScore + accessScore) / 2;
      if (avgScore >= 90) readinessPoints += 25;
      else if (avgScore >= 75) readinessPoints += 20;
      else if (avgScore >= 50) readinessPoints += 10;
      else readinessPoints += 0;
      
      if (perfScore < 75) {
        assessment.warnings.push(`Low Lighthouse performance score: ${perfScore}`);
      }
      if (accessScore < 85) {
        assessment.warnings.push(`Accessibility improvements needed: ${accessScore}`);
      }
    }

    // Bundle readiness (25 points)
    maxPoints += 25;
    if (consolidated.bundleAnalysis?.bundleInfo) {
      const sizeMB = consolidated.bundleAnalysis.bundleInfo.totalSize / 1024 / 1024;
      if (sizeMB < 2) readinessPoints += 25;
      else if (sizeMB < 5) readinessPoints += 15;
      else if (sizeMB < 10) {
        readinessPoints += 5;
        assessment.warnings.push(`Large bundle size: ${sizeMB.toFixed(1)}MB`);
      } else {
        assessment.blockingIssues.push(`Extremely large bundle: ${sizeMB.toFixed(1)}MB`);
        readinessPoints += 0;
      }
    }

    // Calculate final readiness score
    assessment.readinessScore = maxPoints > 0 ? Math.round((readinessPoints / maxPoints) * 100) : 0;

    // Determine status
    if (assessment.blockingIssues.length > 0) {
      assessment.status = 'NOT_READY';
    } else if (assessment.warnings.length > 2 || assessment.readinessScore < 75) {
      assessment.status = 'CAUTION';
    } else {
      assessment.status = 'READY';
    }

    return assessment;
  }

  // Generate next steps
  generateNextSteps() {
    const steps = [];
    
    // High priority recommendations as next steps
    const highPriorityRecs = this.results.recommendations?.filter(r => r.priority === 'HIGH') || [];
    
    if (highPriorityRecs.length > 0) {
      steps.push({
        phase: 'Immediate (1-2 weeks)',
        actions: highPriorityRecs.slice(0, 3).map(rec => rec.issue)
      });
    }

    steps.push({
      phase: 'Short-term (2-4 weeks)',
      actions: [
        'Implement automated performance monitoring',
        'Set up performance budgets in CI/CD',
        'Optimize largest bundle components',
        'Address accessibility issues'
      ]
    });

    steps.push({
      phase: 'Long-term (1-3 months)',
      actions: [
        'Implement comprehensive performance testing in CI',
        'Set up real user monitoring (RUM)',
        'Establish performance SLAs',
        'Consider architectural improvements for scalability'
      ]
    });

    return steps;
  }

  // Display comprehensive report
  displayComprehensiveReport(report) {
    console.log('\n' + '=' * 60);
    console.log('📊 COMPREHENSIVE PERFORMANCE REPORT');
    console.log('=' * 60);

    // Executive Summary
    console.log('\n📈 EXECUTIVE SUMMARY:');
    console.log(`   Overall Health Score: ${report.executiveSummary.overallHealthScore}/100`);
    console.log(`   Critical Issues: ${report.executiveSummary.criticalIssues}`);
    
    if (report.executiveSummary.majorFindings.length > 0) {
      console.log('   Major Findings:');
      report.executiveSummary.majorFindings.forEach(finding => {
        console.log(`     • ${finding}`);
      });
    }

    // Key Metrics
    console.log('\n📊 KEY METRICS:');
    Object.entries(report.executiveSummary.keyMetrics).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^\w/, c => c.toUpperCase());
      console.log(`   ${label}: ${value}`);
    });

    // Production Readiness
    console.log('\n🏁 PRODUCTION READINESS:');
    const readiness = report.productionReadiness;
    const statusEmoji = readiness.status === 'READY' ? '✅' : readiness.status === 'CAUTION' ? '⚠️' : '❌';
    console.log(`   Status: ${statusEmoji} ${readiness.status} (${readiness.readinessScore}/100)`);
    
    if (readiness.blockingIssues.length > 0) {
      console.log('   🚫 Blocking Issues:');
      readiness.blockingIssues.forEach(issue => {
        console.log(`     • ${issue}`);
      });
    }

    if (readiness.warnings.length > 0) {
      console.log('   ⚠️  Warnings:');
      readiness.warnings.forEach(warning => {
        console.log(`     • ${warning}`);
      });
    }

    // Top Recommendations
    const topRecs = report.recommendations.slice(0, 5);
    if (topRecs.length > 0) {
      console.log('\n🎯 TOP RECOMMENDATIONS:');
      topRecs.forEach((rec, index) => {
        const priority = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
        console.log(`   ${index + 1}. ${priority} ${rec.issue}`);
        console.log(`      ${rec.recommendation}`);
      });
    }

    // Next Steps
    console.log('\n🚀 NEXT STEPS:');
    report.nextSteps.forEach(step => {
      console.log(`   ${step.phase}:`);
      step.actions.forEach(action => {
        console.log(`     • ${action}`);
      });
    });

    console.log('\n' + '=' * 60);
  }

  // Save consolidated results
  async saveConsolidatedResults() {
    const resultsDir = path.join(__dirname, 'results');
    await fs.mkdir(resultsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `consolidated-performance-report-${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
    console.log(`💾 Consolidated report saved to: ${filepath}`);

    return filepath;
  }

  // Run complete test suite
  async runCompleteTestSuite() {
    const startTime = performance.now();
    
    try {
      // Run all individual tests
      await this.runAllTests();
      
      // Load and consolidate results
      await this.loadTestResults();
      
      // Generate recommendations
      this.generateConsolidatedRecommendations();
      
      // Generate comprehensive report
      const report = await this.generateComprehensiveReport();
      
      // Save consolidated results
      const resultsFile = await this.saveConsolidatedResults();
      
      const endTime = performance.now();
      const totalDuration = Math.round((endTime - startTime) / 1000);
      
      console.log(`\n🎉 Complete performance analysis finished in ${totalDuration} seconds!`);
      console.log(`📁 Consolidated report: ${resultsFile}`);
      
      return {
        results: this.results,
        report,
        resultsFile,
        duration: totalDuration
      };
      
    } catch (error) {
      console.error('❌ Performance test suite failed:', error);
      throw error;
    }
  }
}

// CLI interface
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const serverUrl = process.argv[2] || 'http://localhost:5173';
  const skipTests = process.argv.slice(3); // Any additional args are tests to skip
  
  console.log(`Starting master performance test suite...`);
  if (skipTests.length > 0) {
    console.log(`Skipping tests: ${skipTests.join(', ')}`);
  }
  
  const runner = new MasterPerformanceRunner({ 
    serverUrl,
    skipTests 
  });
  
  runner.runCompleteTestSuite()
    .then((results) => {
      const readinessStatus = results.report.productionReadiness.status;
      console.log(`\n✅ Master performance test suite completed`);
      console.log(`📊 Overall health score: ${results.report.executiveSummary.overallHealthScore}/100`);
      console.log(`🏁 Production readiness: ${readinessStatus}`);
      
      // Exit with appropriate code
      process.exit(readinessStatus === 'READY' ? 0 : readinessStatus === 'CAUTION' ? 1 : 2);
    })
    .catch((error) => {
      console.error('Master performance test suite failed:', error);
      process.exit(3);
    });
}

export default MasterPerformanceRunner;