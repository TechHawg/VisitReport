#!/usr/bin/env node

/**
 * RSS Visit Report - Bundle Analyzer
 * 
 * Analyzes the built application bundle for:
 * - Bundle size optimization opportunities
 * - Code splitting effectiveness
 * - Dependency analysis
 * - Tree shaking opportunities
 * - Duplicate code detection
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BundleAnalyzer {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || path.resolve(__dirname, '..');
    this.distDir = path.join(this.projectRoot, 'dist');
    this.results = {
      timestamp: new Date().toISOString(),
      bundleInfo: {},
      analysis: {},
      recommendations: []
    };
  }

  // Ensure build exists
  async ensureBuild() {
    try {
      await fs.access(this.distDir);
      console.log('✅ Build directory found');
    } catch (error) {
      console.log('🏗️  No build found, creating production build...');
      
      try {
        // Change to project directory and run build
        process.chdir(this.projectRoot);
        execSync('npm run build', { stdio: 'inherit' });
        console.log('✅ Build completed');
      } catch (buildError) {
        throw new Error(`Build failed: ${buildError.message}`);
      }
    }
  }

  // Analyze bundle files
  async analyzeBundleFiles() {
    console.log('📦 Analyzing bundle files...');
    
    const bundleFiles = await this.getBundleFiles();
    const analysis = {
      totalFiles: bundleFiles.length,
      totalSize: 0,
      gzippedSize: 0,
      filesByType: {},
      largestFiles: [],
      chunkAnalysis: {}
    };

    // Analyze each file
    for (const file of bundleFiles) {
      const filePath = path.join(this.distDir, file.relativePath);
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath);
      
      file.size = stats.size;
      file.gzippedSize = await this.estimateGzipSize(content);
      
      analysis.totalSize += file.size;
      analysis.gzippedSize += file.gzippedSize;
      
      // Categorize by type
      const extension = path.extname(file.name).toLowerCase();
      if (!analysis.filesByType[extension]) {
        analysis.filesByType[extension] = {
          count: 0,
          totalSize: 0,
          files: []
        };
      }
      
      analysis.filesByType[extension].count++;
      analysis.filesByType[extension].totalSize += file.size;
      analysis.filesByType[extension].files.push(file);
    }

    // Sort files by size
    analysis.largestFiles = bundleFiles
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map(file => ({
        name: file.name,
        path: file.relativePath,
        size: file.size,
        sizeFormatted: this.formatBytes(file.size),
        gzippedSize: file.gzippedSize,
        gzippedSizeFormatted: this.formatBytes(file.gzippedSize),
        type: path.extname(file.name)
      }));

    // Analyze code splitting
    analysis.chunkAnalysis = await this.analyzeChunks(bundleFiles);

    this.results.bundleInfo = analysis;
    
    console.log(`   📊 Total size: ${this.formatBytes(analysis.totalSize)}`);
    console.log(`   🗜️  Gzipped size: ${this.formatBytes(analysis.gzippedSize)}`);
    console.log(`   📁 Files: ${analysis.totalFiles}`);
  }

  // Get all bundle files
  async getBundleFiles() {
    const files = [];
    
    const scanDirectory = async (dir, relativePath = '') => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const currentRelativePath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath, currentRelativePath);
        } else if (entry.isFile()) {
          files.push({
            name: entry.name,
            path: fullPath,
            relativePath: currentRelativePath,
            directory: relativePath
          });
        }
      }
    };
    
    await scanDirectory(this.distDir);
    return files;
  }

  // Estimate gzip size
  async estimateGzipSize(content) {
    // Simple estimation: gzipped size is typically 20-30% of original for text files
    const textEstimateRatio = 0.25;
    return Math.round(content.length * textEstimateRatio);
  }

  // Analyze code splitting effectiveness
  async analyzeChunks(files) {
    const jsFiles = files.filter(f => f.name.endsWith('.js'));
    const cssFiles = files.filter(f => f.name.endsWith('.css'));
    
    const analysis = {
      jsChunks: jsFiles.length,
      cssChunks: cssFiles.length,
      vendorChunks: jsFiles.filter(f => f.name.includes('vendor')).length,
      pageChunks: jsFiles.filter(f => f.name.includes('pages')).length,
      mainBundle: jsFiles.find(f => f.name.includes('main') || f.name.includes('index')),
      chunkSizeDistribution: this.analyzeChunkSizes(jsFiles)
    };

    // Identify potential issues
    analysis.issues = [];
    
    if (jsFiles.length < 3) {
      analysis.issues.push({
        type: 'insufficient-splitting',
        message: 'Very few JavaScript chunks detected - consider more aggressive code splitting',
        severity: 'medium'
      });
    }
    
    if (analysis.mainBundle && analysis.mainBundle.size > 500000) { // 500KB
      analysis.issues.push({
        type: 'large-main-bundle',
        message: `Main bundle is large (${this.formatBytes(analysis.mainBundle.size)}) - consider splitting further`,
        severity: 'high'
      });
    }
    
    const largeChunks = jsFiles.filter(f => f.size > 1000000); // 1MB
    if (largeChunks.length > 0) {
      analysis.issues.push({
        type: 'large-chunks',
        message: `${largeChunks.length} chunks are over 1MB - consider further splitting`,
        severity: 'high',
        files: largeChunks.map(f => f.name)
      });
    }

    return analysis;
  }

  // Analyze chunk size distribution
  analyzeChunkSizes(jsFiles) {
    const sizes = jsFiles.map(f => f.size).sort((a, b) => a - b);
    
    return {
      smallest: sizes[0],
      largest: sizes[sizes.length - 1],
      median: sizes[Math.floor(sizes.length / 2)],
      average: Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length),
      distribution: {
        under100kb: sizes.filter(s => s < 100000).length,
        '100kb-500kb': sizes.filter(s => s >= 100000 && s < 500000).length,
        '500kb-1mb': sizes.filter(s => s >= 500000 && s < 1000000).length,
        over1mb: sizes.filter(s => s >= 1000000).length
      }
    };
  }

  // Analyze dependencies
  async analyzeDependencies() {
    console.log('📚 Analyzing dependencies...');
    
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      const analysis = {
        totalDependencies: Object.keys(dependencies).length,
        productionDependencies: Object.keys(packageJson.dependencies || {}).length,
        devDependencies: Object.keys(packageJson.devDependencies || {}).length,
        heavyDependencies: [],
        unusedDependencies: [], // Would require more complex analysis
        duplicateDependencies: [], // Would require bundle content analysis
        securityIssues: []
      };

      // Identify potentially heavy dependencies
      const heavyPackages = [
        'moment', 'lodash', 'rxjs', 'core-js', 'babel-polyfill',
        'material-ui', 'antd', 'bootstrap', 'jquery'
      ];
      
      analysis.heavyDependencies = heavyPackages.filter(pkg => dependencies[pkg]);

      // Check for security vulnerabilities
      try {
        const auditOutput = execSync('npm audit --json', { 
          cwd: this.projectRoot,
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        const auditData = JSON.parse(auditOutput);
        analysis.securityIssues = Object.values(auditData.vulnerabilities || {})
          .filter(vuln => vuln.severity === 'high' || vuln.severity === 'critical')
          .map(vuln => ({
            module: vuln.module_name,
            severity: vuln.severity,
            title: vuln.title
          }));
      } catch (auditError) {
        console.log('   ⚠️  Could not run security audit');
      }

      this.results.analysis.dependencies = analysis;
      
      console.log(`   📦 Total dependencies: ${analysis.totalDependencies}`);
      console.log(`   🔒 Production dependencies: ${analysis.productionDependencies}`);
      
      if (analysis.heavyDependencies.length > 0) {
        console.log(`   ⚠️  Heavy dependencies detected: ${analysis.heavyDependencies.join(', ')}`);
      }
      
    } catch (error) {
      console.log('   ❌ Dependency analysis failed:', error.message);
    }
  }

  // Analyze tree shaking opportunities
  async analyzeTreeShaking() {
    console.log('🌳 Analyzing tree shaking opportunities...');
    
    const jsFiles = (await this.getBundleFiles()).filter(f => f.name.endsWith('.js'));
    const treeShakingAnalysis = {
      totalJSFiles: jsFiles.length,
      potentialSavings: 0,
      issues: [],
      recommendations: []
    };

    // Look for common tree shaking issues in file names and sizes
    for (const file of jsFiles) {
      try {
        const content = await fs.readFile(file.path, 'utf8');
        
        // Check for common indicators of poor tree shaking
        if (content.includes('lodash') && file.size > 100000) {
          treeShakingAnalysis.issues.push({
            file: file.name,
            issue: 'Large lodash bundle detected',
            recommendation: 'Use lodash-es or individual lodash functions',
            estimatedSavings: Math.round(file.size * 0.7) // Estimate 70% savings
          });
        }

        if (content.includes('moment') && file.size > 50000) {
          treeShakingAnalysis.issues.push({
            file: file.name,
            issue: 'Moment.js detected with locales',
            recommendation: 'Switch to date-fns or exclude unused locales',
            estimatedSavings: Math.round(file.size * 0.6)
          });
        }

        // Check for large React bundles
        if (content.includes('react-dom') && file.size > 200000) {
          treeShakingAnalysis.issues.push({
            file: file.name,
            issue: 'Large React bundle',
            recommendation: 'Ensure production build and check for development code',
            estimatedSavings: Math.round(file.size * 0.3)
          });
        }

      } catch (error) {
        // Skip files that can't be read
      }
    }

    treeShakingAnalysis.potentialSavings = treeShakingAnalysis.issues
      .reduce((total, issue) => total + issue.estimatedSavings, 0);

    this.results.analysis.treeShaking = treeShakingAnalysis;
    
    if (treeShakingAnalysis.potentialSavings > 0) {
      console.log(`   💾 Potential savings: ${this.formatBytes(treeShakingAnalysis.potentialSavings)}`);
    }
  }

  // Generate comprehensive recommendations
  generateRecommendations() {
    console.log('🎯 Generating optimization recommendations...');
    
    const recommendations = [];
    const bundle = this.results.bundleInfo;
    const analysis = this.results.analysis;

    // Bundle size recommendations
    if (bundle.totalSize > 2000000) { // 2MB
      recommendations.push({
        category: 'Bundle Size',
        priority: 'HIGH',
        issue: `Total bundle size is large (${this.formatBytes(bundle.totalSize)})`,
        recommendation: 'Implement aggressive code splitting and lazy loading',
        impact: 'Faster initial page load',
        estimatedSavings: '30-50% reduction in initial bundle size'
      });
    }

    // JavaScript file recommendations
    if (bundle.filesByType['.js']) {
      const jsInfo = bundle.filesByType['.js'];
      if (jsInfo.totalSize > 1000000) { // 1MB JS
        recommendations.push({
          category: 'JavaScript Optimization',
          priority: 'MEDIUM',
          issue: `JavaScript bundle is ${this.formatBytes(jsInfo.totalSize)}`,
          recommendation: 'Audit and remove unused JavaScript code, implement tree shaking',
          impact: 'Reduced parsing and execution time'
        });
      }
    }

    // CSS recommendations
    if (bundle.filesByType['.css']) {
      const cssInfo = bundle.filesByType['.css'];
      if (cssInfo.count > 5) {
        recommendations.push({
          category: 'CSS Optimization',
          priority: 'LOW',
          issue: `${cssInfo.count} CSS files detected`,
          recommendation: 'Consider combining CSS files to reduce HTTP requests',
          impact: 'Fewer network requests'
        });
      }
    }

    // Chunk analysis recommendations
    if (analysis.dependencies?.heavyDependencies?.length > 0) {
      recommendations.push({
        category: 'Dependencies',
        priority: 'MEDIUM',
        issue: `Heavy dependencies detected: ${analysis.dependencies.heavyDependencies.join(', ')}`,
        recommendation: 'Consider lighter alternatives or optimize imports',
        impact: 'Significant bundle size reduction'
      });
    }

    // Tree shaking recommendations
    if (analysis.treeShaking?.potentialSavings > 100000) { // 100KB potential savings
      recommendations.push({
        category: 'Tree Shaking',
        priority: 'HIGH',
        issue: `${this.formatBytes(analysis.treeShaking.potentialSavings)} potential savings identified`,
        recommendation: 'Fix tree shaking issues and optimize imports',
        impact: `Reduce bundle size by ~${this.formatBytes(analysis.treeShaking.potentialSavings)}`
      });
    }

    // Gzip recommendations
    const compressionRatio = bundle.gzippedSize / bundle.totalSize;
    if (compressionRatio > 0.4) { // Poor compression
      recommendations.push({
        category: 'Compression',
        priority: 'LOW',
        issue: 'Poor gzip compression ratio detected',
        recommendation: 'Enable server-side compression and optimize file formats',
        impact: 'Better compression ratios'
      });
    }

    // Add specific file recommendations
    bundle.largestFiles.slice(0, 3).forEach(file => {
      if (file.size > 500000) { // 500KB
        recommendations.push({
          category: 'Large Files',
          priority: 'MEDIUM',
          issue: `${file.name} is ${file.sizeFormatted}`,
          recommendation: `Analyze and optimize ${file.name} - consider code splitting or removing unused code`,
          impact: 'Reduced initial bundle size'
        });
      }
    });

    // Security recommendations
    if (analysis.dependencies?.securityIssues?.length > 0) {
      recommendations.push({
        category: 'Security',
        priority: 'HIGH',
        issue: `${analysis.dependencies.securityIssues.length} security vulnerabilities detected`,
        recommendation: 'Update vulnerable dependencies immediately',
        impact: 'Improved application security'
      });
    }

    this.results.recommendations = recommendations;
    console.log(`   ✅ Generated ${recommendations.length} recommendations`);
  }

  // Generate detailed report
  generateReport() {
    console.log('\n📊 BUNDLE ANALYSIS REPORT');
    console.log('=' * 50);

    const bundle = this.results.bundleInfo;
    const analysis = this.results.analysis;

    // Bundle Overview
    console.log('\n📦 BUNDLE OVERVIEW:');
    console.log(`   Total size: ${this.formatBytes(bundle.totalSize)}`);
    console.log(`   Gzipped size: ${this.formatBytes(bundle.gzippedSize)}`);
    console.log(`   Compression ratio: ${((bundle.gzippedSize / bundle.totalSize) * 100).toFixed(1)}%`);
    console.log(`   Total files: ${bundle.totalFiles}`);

    // File types breakdown
    console.log('\n📋 FILE BREAKDOWN:');
    Object.entries(bundle.filesByType).forEach(([ext, info]) => {
      console.log(`   ${ext}: ${info.count} files, ${this.formatBytes(info.totalSize)}`);
    });

    // Largest files
    console.log('\n📈 LARGEST FILES:');
    bundle.largestFiles.slice(0, 5).forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name} - ${file.sizeFormatted} (${file.gzippedSizeFormatted} gzipped)`);
    });

    // Chunks analysis
    if (analysis.chunkAnalysis) {
      console.log('\n🧩 CODE SPLITTING:');
      console.log(`   JavaScript chunks: ${analysis.chunkAnalysis.jsChunks}`);
      console.log(`   CSS chunks: ${analysis.chunkAnalysis.cssChunks}`);
      
      if (analysis.chunkAnalysis.issues.length > 0) {
        console.log('   ⚠️  Issues detected:');
        analysis.chunkAnalysis.issues.forEach(issue => {
          console.log(`     • ${issue.message}`);
        });
      }
    }

    // Dependencies
    if (analysis.dependencies) {
      console.log('\n📚 DEPENDENCIES:');
      console.log(`   Total: ${analysis.dependencies.totalDependencies}`);
      console.log(`   Production: ${analysis.dependencies.productionDependencies}`);
      
      if (analysis.dependencies.heavyDependencies.length > 0) {
        console.log(`   ⚠️  Heavy dependencies: ${analysis.dependencies.heavyDependencies.join(', ')}`);
      }
      
      if (analysis.dependencies.securityIssues.length > 0) {
        console.log(`   🚨 Security issues: ${analysis.dependencies.securityIssues.length}`);
      }
    }

    // Recommendations summary
    console.log('\n🎯 RECOMMENDATIONS SUMMARY:');
    const highPriority = this.results.recommendations.filter(r => r.priority === 'HIGH');
    const mediumPriority = this.results.recommendations.filter(r => r.priority === 'MEDIUM');
    const lowPriority = this.results.recommendations.filter(r => r.priority === 'LOW');

    if (highPriority.length > 0) {
      console.log(`   🔴 HIGH PRIORITY: ${highPriority.length} items`);
      highPriority.forEach(rec => {
        console.log(`     • ${rec.issue}`);
      });
    }

    if (mediumPriority.length > 0) {
      console.log(`   🟡 MEDIUM PRIORITY: ${mediumPriority.length} items`);
    }

    if (lowPriority.length > 0) {
      console.log(`   🟢 LOW PRIORITY: ${lowPriority.length} items`);
    }

    console.log('\n' + '=' * 50);
  }

  // Save detailed results
  async saveResults() {
    const resultsDir = path.join(__dirname, 'results');
    await fs.mkdir(resultsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `bundle-analysis-${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
    console.log(`💾 Bundle analysis saved to: ${filepath}`);

    return filepath;
  }

  // Format bytes to human readable
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Run complete analysis
  async runCompleteAnalysis() {
    console.log('🔥 Starting Bundle Analysis');
    
    try {
      await this.ensureBuild();
      await this.analyzeBundleFiles();
      await this.analyzeDependencies();
      await this.analyzeTreeShaking();
      this.generateRecommendations();
      this.generateReport();
      
      const resultsFile = await this.saveResults();
      
      console.log('\n🎉 Bundle analysis completed successfully!');
      
      return {
        results: this.results,
        resultsFile
      };
      
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error);
      throw error;
    }
  }
}

// CLI interface
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const projectRoot = process.argv[2] || process.cwd();
  
  const analyzer = new BundleAnalyzer({ projectRoot });
  
  analyzer.runCompleteAnalysis()
    .then((results) => {
      console.log(`\n✅ Analysis complete - ${results.results.recommendations.length} recommendations generated`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Bundle analysis failed:', error);
      process.exit(1);
    });
}

export default BundleAnalyzer;