#!/usr/bin/env node

/**
 * RSS Visit Report - Existing Performance Analysis
 * 
 * Analyzes the current application for performance bottlenecks without running
 * live tests. Useful for initial assessment and quick analysis.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StaticPerformanceAnalyzer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.srcDir = path.join(this.projectRoot, 'src');
    this.analysis = {
      codeComplexity: {},
      potentialIssues: [],
      recommendations: [],
      componentAnalysis: {},
      contextAnalysis: {},
      bundleEstimation: {}
    };
  }

  // Analyze React Context for performance issues
  async analyzeReactContext() {
    console.log('⚛️  Analyzing React Context usage...');
    
    const contextFiles = [];
    await this.findFiles(this.srcDir, /context|provider/i, contextFiles);
    
    for (const file of contextFiles) {
      const content = await fs.readFile(file, 'utf8');
      const analysis = this.analyzeContextFile(content, file);
      
      this.analysis.contextAnalysis[path.relative(this.projectRoot, file)] = analysis;
      
      // Check for performance issues
      if (analysis.largeInitialState) {
        this.analysis.potentialIssues.push({
          type: 'Large Context State',
          file: path.relative(this.projectRoot, file),
          severity: 'medium',
          description: 'Large initial state in context may cause performance issues',
          recommendation: 'Consider splitting context or using lazy initialization'
        });
      }
      
      if (analysis.frequentUpdates) {
        this.analysis.potentialIssues.push({
          type: 'Frequent Context Updates',
          file: path.relative(this.projectRoot, file),
          severity: 'high',
          description: 'Context updates too frequently, causing unnecessary re-renders',
          recommendation: 'Implement context splitting or memoization'
        });
      }
    }
  }

  // Analyze individual context file
  analyzeContextFile(content, filePath) {
    const analysis = {
      hasLargeInitialState: false,
      stateComplexity: 0,
      hasDebouncing: false,
      hasMemorization: false,
      frequentUpdates: false,
      issues: []
    };
    
    // Check for large initial state (AppContext.jsx specifically)
    if (filePath.includes('AppContext') || filePath.includes('context')) {
      const initialStateMatch = content.match(/const initialState = \{([\s\S]*?)\};/);
      if (initialStateMatch) {
        const stateContent = initialStateMatch[1];
        const lineCount = stateContent.split('\n').length;
        
        analysis.stateComplexity = lineCount;
        analysis.hasLargeInitialState = lineCount > 50;
        
        if (lineCount > 100) {
          analysis.issues.push('Extremely large initial state (>100 lines)');
        }
      }
    }
    
    // Check for debouncing
    analysis.hasDebouncing = /debounce|setTimeout|throttle/i.test(content);
    
    // Check for memoization
    analysis.hasMemorization = /useMemo|useCallback|React\.memo/i.test(content);
    
    // Check for frequent localStorage operations
    if (/localStorage\.setItem/.test(content)) {
      const localStorageOps = (content.match(/localStorage\.setItem/g) || []).length;
      if (localStorageOps > 3) {
        analysis.frequentUpdates = true;
        analysis.issues.push('Multiple localStorage operations detected');
      }
    }
    
    return analysis;
  }

  // Analyze components for performance issues
  async analyzeComponents() {
    console.log('🔍 Analyzing React components...');
    
    const componentFiles = [];
    await this.findFiles(this.srcDir, /\.(jsx|js|tsx|ts)$/i, componentFiles);
    
    let totalComponents = 0;
    let largeComponents = 0;
    let componentsWithoutMemo = 0;
    
    for (const file of componentFiles) {
      const content = await fs.readFile(file, 'utf8');
      const relativePath = path.relative(this.projectRoot, file);
      
      // Skip non-component files
      if (!this.isComponentFile(content)) continue;
      
      totalComponents++;
      
      const componentAnalysis = this.analyzeComponentFile(content, file);
      this.analysis.componentAnalysis[relativePath] = componentAnalysis;
      
      // Track large components
      if (componentAnalysis.lineCount > 200) {
        largeComponents++;
        this.analysis.potentialIssues.push({
          type: 'Large Component',
          file: relativePath,
          severity: 'medium',
          description: `Component has ${componentAnalysis.lineCount} lines`,
          recommendation: 'Consider breaking into smaller components'
        });
      }
      
      // Track components without memoization
      if (!componentAnalysis.hasMemoization && componentAnalysis.hasComplexLogic) {
        componentsWithoutMemo++;
        this.analysis.potentialIssues.push({
          type: 'Missing Memoization',
          file: relativePath,
          severity: 'low',
          description: 'Component has complex logic but no memoization',
          recommendation: 'Consider adding React.memo, useMemo, or useCallback'
        });
      }

      // Check for performance anti-patterns
      if (componentAnalysis.hasInlineObjects) {
        this.analysis.potentialIssues.push({
          type: 'Inline Objects',
          file: relativePath,
          severity: 'medium',
          description: 'Component creates objects/functions inline in render',
          recommendation: 'Move objects outside component or use useMemo/useCallback'
        });
      }
    }
    
    this.analysis.componentAnalysis.summary = {
      totalComponents,
      largeComponents,
      componentsWithoutMemo,
      averageSize: totalComponents > 0 ? Math.round(
        Object.values(this.analysis.componentAnalysis)
          .filter(a => typeof a === 'object' && a.lineCount)
          .reduce((sum, a) => sum + a.lineCount, 0) / totalComponents
      ) : 0
    };
  }

  // Check if file is a React component
  isComponentFile(content) {
    return /import.*React|from ['"]react['"]|\.jsx?$|function.*Component|const.*=.*\(\)|export.*function/.test(content);
  }

  // Analyze individual component file
  analyzeComponentFile(content, filePath) {
    const lines = content.split('\n');
    
    return {
      lineCount: lines.length,
      hasUseEffect: /useEffect/.test(content),
      hasUseState: /useState/.test(content),
      hasUseContext: /useContext/.test(content),
      hasMemoization: /React\.memo|useMemo|useCallback/.test(content),
      hasComplexLogic: this.hasComplexLogic(content),
      hasInlineObjects: this.hasInlineObjects(content),
      hasEventHandlers: /onClick|onChange|onSubmit/.test(content),
      importsCount: (content.match(/^import/gm) || []).length
    };
  }

  // Check for complex logic that might benefit from memoization
  hasComplexLogic(content) {
    return /\.map\(|\.filter\(|\.reduce\(|\.sort\(|for\s*\(|while\s*\(/.test(content) ||
           (content.match(/\{|\}/g) || []).length > 20; // Many object/function definitions
  }

  // Check for inline objects that cause re-renders
  hasInlineObjects(content) {
    // Look for objects/arrays created inline in JSX
    return /\w+\s*=\s*\{[^}]*\}|\w+\s*=\s*\[[^\]]*\]/.test(content);
  }

  // Analyze SCCM processing function specifically
  async analyzeSCCMProcessing() {
    console.log('💾 Analyzing SCCM data processing...');
    
    const infrastructureFile = path.join(this.srcDir, 'pages/Infrastructure/Infrastructure.jsx');
    
    try {
      const content = await fs.readFile(infrastructureFile, 'utf8');
      
      // Find the processPasteData function
      const processPasteMatch = content.match(/processPasteData.*?=.*?useCallback\(\(\)\s*=>\s*\{([\s\S]*?)\}\s*,/);
      
      if (processPasteMatch) {
        const functionContent = processPasteMatch[1];
        
        const analysis = {
          functionLength: functionContent.split('\n').length,
          hasPerformanceOptimizations: false,
          hasErrorHandling: /try\s*\{|catch\s*\(/.test(functionContent),
          usesRegex: /\/.*\//.test(functionContent),
          hasComplexLogic: /forEach|map|filter|split|join/.test(functionContent),
          hasDebugging: /console\.log/.test(functionContent)
        };
        
        // Check for performance optimizations
        analysis.hasPerformanceOptimizations = /debounce|throttle|useMemo|useCallback/.test(functionContent);
        
        this.analysis.sccmProcessing = analysis;
        
        if (analysis.functionLength > 100) {
          this.analysis.potentialIssues.push({
            type: 'Complex SCCM Processing',
            file: 'src/pages/Infrastructure/Infrastructure.jsx',
            severity: 'high',
            description: `SCCM processing function is ${analysis.functionLength} lines`,
            recommendation: 'Consider moving to Web Worker or breaking into smaller functions'
          });
        }
        
        if (!analysis.hasPerformanceOptimizations && analysis.hasComplexLogic) {
          this.analysis.potentialIssues.push({
            type: 'SCCM Performance',
            file: 'src/pages/Infrastructure/Infrastructure.jsx',
            severity: 'medium',
            description: 'SCCM processing lacks performance optimizations',
            recommendation: 'Add debouncing, progress indicators, or Web Worker processing'
          });
        }
      }
    } catch (error) {
      console.log('   ⚠️  Could not analyze SCCM processing:', error.message);
    }
  }

  // Estimate bundle size and dependencies
  async estimateBundle() {
    console.log('📦 Analyzing bundle and dependencies...');
    
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const heavyDeps = [];
      const potentiallyUnused = [];
      
      // Check for heavy dependencies
      const knownHeavyDeps = {
        'moment': '~300KB',
        'lodash': '~70KB',
        'rxjs': '~200KB',
        'core-js': '~150KB',
        '@mui/material': '~500KB',
        'antd': '~2MB',
        'react-router-dom': '~50KB'
      };
      
      Object.keys(deps).forEach(dep => {
        if (knownHeavyDeps[dep]) {
          heavyDeps.push({ name: dep, estimatedSize: knownHeavyDeps[dep] });
        }
      });
      
      // Estimate total bundle size
      const estimatedSize = this.estimateBundleSize(deps);
      
      this.analysis.bundleEstimation = {
        totalDependencies: Object.keys(deps).length,
        productionDependencies: Object.keys(packageJson.dependencies || {}).length,
        heavyDependencies: heavyDeps,
        estimatedTotalSize: estimatedSize,
        potentiallyUnusedDeps: potentiallyUnused
      };
      
      if (heavyDeps.length > 0) {
        this.analysis.potentialIssues.push({
          type: 'Heavy Dependencies',
          severity: 'medium',
          description: `${heavyDeps.length} potentially heavy dependencies detected`,
          recommendation: 'Consider lighter alternatives or ensure they are actually needed'
        });
      }
      
    } catch (error) {
      console.log('   ⚠️  Could not analyze bundle:', error.message);
    }
  }

  // Estimate bundle size based on dependencies
  estimateBundleSize(deps) {
    // Very rough estimation based on common dependency sizes
    const sizeEstimates = {
      'react': 45,
      'react-dom': 130,
      'react-router-dom': 50,
      'lucide-react': 200,
      '@supabase/supabase-js': 100,
      'puppeteer': 0, // dev dependency
      'vite': 0, // dev dependency
    };
    
    let totalKB = 0;
    Object.keys(deps).forEach(dep => {
      if (sizeEstimates[dep]) {
        totalKB += sizeEstimates[dep];
      } else {
        // Default estimate for unknown packages
        totalKB += 20;
      }
    });
    
    return `~${Math.round(totalKB)}KB`;
  }

  // Find files matching pattern
  async findFiles(dir, pattern, results) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await this.findFiles(fullPath, pattern, results);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  // Generate recommendations
  generateRecommendations() {
    const recs = [];
    
    // High priority recommendations
    const criticalIssues = this.analysis.potentialIssues.filter(i => i.severity === 'high');
    if (criticalIssues.length > 0) {
      recs.push({
        priority: 'HIGH',
        category: 'Critical Performance Issues',
        issue: `${criticalIssues.length} critical performance issues identified`,
        recommendation: 'Address SCCM processing optimization and component splitting',
        files: criticalIssues.map(i => i.file)
      });
    }
    
    // Context optimization
    const contextIssues = this.analysis.potentialIssues.filter(i => i.type.includes('Context'));
    if (contextIssues.length > 0) {
      recs.push({
        priority: 'MEDIUM',
        category: 'React Context Optimization',
        issue: 'Context state and updates need optimization',
        recommendation: 'Implement context splitting and reduce initial state size',
        impact: 'Faster app initialization and reduced re-renders'
      });
    }
    
    // Component optimization
    const componentIssues = this.analysis.potentialIssues.filter(i => 
      i.type.includes('Component') || i.type.includes('Memo')
    );
    if (componentIssues.length > 3) {
      recs.push({
        priority: 'MEDIUM',
        category: 'Component Performance',
        issue: `${componentIssues.length} components need optimization`,
        recommendation: 'Add memoization and reduce component complexity',
        impact: 'Improved rendering performance'
      });
    }
    
    // Bundle recommendations
    if (this.analysis.bundleEstimation.heavyDependencies?.length > 0) {
      recs.push({
        priority: 'MEDIUM',
        category: 'Bundle Optimization',
        issue: 'Heavy dependencies detected',
        recommendation: 'Audit dependencies and consider lighter alternatives',
        impact: 'Smaller bundle size and faster loading'
      });
    }
    
    // Memory management
    recs.push({
      priority: 'LOW',
      category: 'Memory Management',
      issue: 'Memory manager exists but may need tuning',
      recommendation: 'Review memory manager settings for production environment',
      impact: 'Better memory usage and stability'
    });
    
    this.analysis.recommendations = recs;
  }

  // Display analysis results
  displayResults() {
    console.log('\n' + '=' * 60);
    console.log('📊 STATIC PERFORMANCE ANALYSIS RESULTS');
    console.log('=' * 60);
    
    // Component Analysis Summary
    if (this.analysis.componentAnalysis.summary) {
      const summary = this.analysis.componentAnalysis.summary;
      console.log('\n⚛️  COMPONENT ANALYSIS:');
      console.log(`   Total components: ${summary.totalComponents}`);
      console.log(`   Large components: ${summary.largeComponents}`);
      console.log(`   Missing memoization: ${summary.componentsWithoutMemo}`);
      console.log(`   Average size: ${summary.averageSize} lines`);
    }
    
    // Context Analysis
    if (Object.keys(this.analysis.contextAnalysis).length > 0) {
      console.log('\n🔄 CONTEXT ANALYSIS:');
      Object.entries(this.analysis.contextAnalysis).forEach(([file, analysis]) => {
        console.log(`   ${file}:`);
        console.log(`     State complexity: ${analysis.stateComplexity} lines`);
        console.log(`     Has debouncing: ${analysis.hasDebouncing ? '✅' : '❌'}`);
        console.log(`     Has memoization: ${analysis.hasMemorization ? '✅' : '❌'}`);
      });
    }
    
    // Bundle Analysis
    if (this.analysis.bundleEstimation.totalDependencies) {
      console.log('\n📦 BUNDLE ESTIMATION:');
      console.log(`   Total dependencies: ${this.analysis.bundleEstimation.totalDependencies}`);
      console.log(`   Production dependencies: ${this.analysis.bundleEstimation.productionDependencies}`);
      console.log(`   Estimated size: ${this.analysis.bundleEstimation.estimatedTotalSize}`);
      
      if (this.analysis.bundleEstimation.heavyDependencies.length > 0) {
        console.log('   Heavy dependencies:');
        this.analysis.bundleEstimation.heavyDependencies.forEach(dep => {
          console.log(`     • ${dep.name} (${dep.estimatedSize})`);
        });
      }
    }
    
    // Issues Summary
    console.log('\n🚨 POTENTIAL ISSUES:');
    const issuesBySeverity = {
      high: this.analysis.potentialIssues.filter(i => i.severity === 'high').length,
      medium: this.analysis.potentialIssues.filter(i => i.severity === 'medium').length,
      low: this.analysis.potentialIssues.filter(i => i.severity === 'low').length
    };
    
    console.log(`   🔴 High priority: ${issuesBySeverity.high}`);
    console.log(`   🟡 Medium priority: ${issuesBySeverity.medium}`);
    console.log(`   🟢 Low priority: ${issuesBySeverity.low}`);
    
    // Top Issues
    const topIssues = this.analysis.potentialIssues.slice(0, 5);
    if (topIssues.length > 0) {
      console.log('\n🎯 TOP ISSUES TO ADDRESS:');
      topIssues.forEach((issue, index) => {
        const priority = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
        console.log(`   ${index + 1}. ${priority} ${issue.type}`);
        console.log(`      ${issue.description}`);
        console.log(`      💡 ${issue.recommendation}`);
      });
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    this.analysis.recommendations.forEach((rec, index) => {
      const priority = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
      console.log(`   ${index + 1}. ${priority} ${rec.category}`);
      console.log(`      ${rec.recommendation}`);
    });
    
    console.log('\n' + '=' * 60);
  }

  // Save analysis results
  async saveResults() {
    const resultsDir = path.join(__dirname, 'results');
    await fs.mkdir(resultsDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `static-analysis-${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);
    
    const results = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      analysis: this.analysis,
      summary: {
        totalIssues: this.analysis.potentialIssues.length,
        highPriorityIssues: this.analysis.potentialIssues.filter(i => i.severity === 'high').length,
        recommendations: this.analysis.recommendations.length,
        componentsAnalyzed: Object.keys(this.analysis.componentAnalysis).length - 1 // exclude summary
      }
    };
    
    await fs.writeFile(filepath, JSON.stringify(results, null, 2));
    console.log(`💾 Static analysis saved to: ${filepath}`);
    
    return filepath;
  }

  // Run complete static analysis
  async runCompleteAnalysis() {
    console.log('🔍 Starting Static Performance Analysis');
    console.log(`📂 Project: ${this.projectRoot}`);
    
    try {
      await this.analyzeReactContext();
      await this.analyzeComponents();
      await this.analyzeSCCMProcessing();
      await this.estimateBundle();
      this.generateRecommendations();
      
      this.displayResults();
      const resultsFile = await this.saveResults();
      
      console.log('\n🎉 Static analysis completed!');
      console.log('💡 This analysis provides initial insights. Run live performance tests for comprehensive evaluation.');
      
      return {
        analysis: this.analysis,
        resultsFile
      };
      
    } catch (error) {
      console.error('❌ Static analysis failed:', error);
      throw error;
    }
  }
}

// CLI interface
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const analyzer = new StaticPerformanceAnalyzer();
  
  analyzer.runCompleteAnalysis()
    .then((results) => {
      const highPriorityIssues = results.analysis.potentialIssues.filter(i => i.severity === 'high').length;
      console.log(`\n✅ Static analysis complete - ${results.analysis.potentialIssues.length} issues found (${highPriorityIssues} high priority)`);
      process.exit(highPriorityIssues > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Static analysis failed:', error);
      process.exit(2);
    });
}

export default StaticPerformanceAnalyzer;