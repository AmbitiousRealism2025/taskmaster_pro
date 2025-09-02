/**
 * Bundle Analysis and Optimization Tools
 * 
 * Provides utilities for analyzing bundle size and performance optimization
 */

export interface BundleAnalysisReport {
  totalSize: number
  chunks: ChunkAnalysis[]
  recommendations: OptimizationRecommendation[]
  score: 'excellent' | 'good' | 'needs-improvement' | 'poor'
  timestamp: string
}

export interface ChunkAnalysis {
  name: string
  size: number
  gzippedSize?: number
  modules: ModuleInfo[]
  isInitial: boolean
  isAsync: boolean
}

export interface ModuleInfo {
  name: string
  size: number
  chunks: string[]
}

export interface OptimizationRecommendation {
  type: 'code-splitting' | 'tree-shaking' | 'compression' | 'lazy-loading'
  priority: 'high' | 'medium' | 'low'
  description: string
  potentialSavings: number
  implementation: string
}

/**
 * Bundle Size Thresholds (in KB)
 */
const BUNDLE_THRESHOLDS = {
  excellent: 100,
  good: 200,
  needsImprovement: 400,
  poor: 600
}

/**
 * Analyze bundle size and provide optimization recommendations
 */
export function analyzeBundleSize(totalSize: number, chunks: ChunkAnalysis[]): BundleAnalysisReport {
  const recommendations: OptimizationRecommendation[] = []
  
  // Analyze overall bundle size
  if (totalSize > BUNDLE_THRESHOLDS.poor) {
    recommendations.push({
      type: 'code-splitting',
      priority: 'high',
      description: 'Bundle size is too large, implement aggressive code splitting',
      potentialSavings: Math.round(totalSize * 0.3),
      implementation: 'Use dynamic imports and React.lazy() for route-based splitting'
    })
  }
  
  // Analyze individual chunks
  for (const chunk of chunks) {
    if (chunk.size > 300 && chunk.isInitial) {
      recommendations.push({
        type: 'lazy-loading',
        priority: 'medium',
        description: `Initial chunk "${chunk.name}" is too large`,
        potentialSavings: Math.round(chunk.size * 0.5),
        implementation: 'Convert to lazy-loaded chunk or split into smaller pieces'
      })
    }
    
    if (chunk.modules.some(m => m.name.includes('node_modules') && m.size > 50)) {
      recommendations.push({
        type: 'tree-shaking',
        priority: 'medium',
        description: `Large dependencies detected in "${chunk.name}"`,
        potentialSavings: Math.round(chunk.size * 0.2),
        implementation: 'Review imports and enable tree-shaking for unused code'
      })
    }
  }
  
  const score = getBundleScore(totalSize)
  
  return {
    totalSize,
    chunks,
    recommendations,
    score,
    timestamp: new Date().toISOString()
  }
}

/**
 * Get bundle performance score
 */
function getBundleScore(size: number): 'excellent' | 'good' | 'needs-improvement' | 'poor' {
  if (size <= BUNDLE_THRESHOLDS.excellent) return 'excellent'
  if (size <= BUNDLE_THRESHOLDS.good) return 'good'  
  if (size <= BUNDLE_THRESHOLDS.needsImprovement) return 'needs-improvement'
  return 'poor'
}

/**
 * Generate optimization script based on analysis
 */
export function generateOptimizationScript(report: BundleAnalysisReport): string {
  const scripts: string[] = []
  
  scripts.push('#!/bin/bash')
  scripts.push('# Bundle Optimization Script')
  scripts.push('# Generated from bundle analysis')
  scripts.push('')
  
  for (const rec of report.recommendations) {
    scripts.push(`# ${rec.type.toUpperCase()}: ${rec.description}`)
    scripts.push(`# Priority: ${rec.priority} | Potential savings: ${rec.potentialSavings}KB`)
    scripts.push(`# Implementation: ${rec.implementation}`)
    scripts.push('')
  }
  
  scripts.push('echo "Bundle optimization analysis complete"')
  scripts.push(`echo "Current bundle size: ${Math.round(report.totalSize)}KB"`)
  scripts.push(`echo "Bundle score: ${report.score}"`)
  
  return scripts.join('\n')
}

/**
 * Performance budget checker
 */
export interface PerformanceBudget {
  maxTotalSize: number      // KB
  maxChunkSize: number      // KB  
  maxInitialSize: number    // KB
  maxAsyncChunkSize: number // KB
}

export const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  maxTotalSize: 300,
  maxChunkSize: 200,
  maxInitialSize: 150,
  maxAsyncChunkSize: 100
}

/**
 * Check if bundle meets performance budget
 */
export function checkPerformanceBudget(
  chunks: ChunkAnalysis[], 
  budget: PerformanceBudget = DEFAULT_PERFORMANCE_BUDGET
): { 
  passed: boolean
  violations: string[]
  totalSize: number 
} {
  const violations: string[] = []
  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0)
  
  if (totalSize > budget.maxTotalSize) {
    violations.push(`Total bundle size (${Math.round(totalSize)}KB) exceeds budget (${budget.maxTotalSize}KB)`)
  }
  
  for (const chunk of chunks) {
    if (chunk.size > budget.maxChunkSize) {
      violations.push(`Chunk "${chunk.name}" (${Math.round(chunk.size)}KB) exceeds max chunk size (${budget.maxChunkSize}KB)`)
    }
    
    if (chunk.isInitial && chunk.size > budget.maxInitialSize) {
      violations.push(`Initial chunk "${chunk.name}" (${Math.round(chunk.size)}KB) exceeds max initial size (${budget.maxInitialSize}KB)`)
    }
    
    if (chunk.isAsync && chunk.size > budget.maxAsyncChunkSize) {
      violations.push(`Async chunk "${chunk.name}" (${Math.round(chunk.size)}KB) exceeds max async size (${budget.maxAsyncChunkSize}KB)`)
    }
  }
  
  return {
    passed: violations.length === 0,
    violations,
    totalSize
  }
}

/**
 * Extract bundle analysis from Next.js build stats
 */
export function parseNextJSBundleStats(buildOutput: string): ChunkAnalysis[] {
  const chunks: ChunkAnalysis[] = []
  const lines = buildOutput.split('\n')
  
  // Parse Next.js build output format
  for (const line of lines) {
    const chunkMatch = line.match(/^\s*(\S+)\s+(\d+(?:\.\d+)?)\s*kB\s*(\d+(?:\.\d+)?)\s*kB/)
    if (chunkMatch) {
      const [, name, size, gzippedSize] = chunkMatch
      
      chunks.push({
        name: name.trim(),
        size: parseFloat(size),
        gzippedSize: parseFloat(gzippedSize),
        modules: [], // Would need more detailed parsing
        isInitial: !name.includes('app/') || name.includes('layout'),
        isAsync: name.includes('app/') && !name.includes('layout')
      })
    }
  }
  
  return chunks
}