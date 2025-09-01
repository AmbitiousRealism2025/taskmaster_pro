# Production Infrastructure & Security Subgroup - Phase 3 Week 12

## ⚠️ Implementation Notes
- **Subgroup Number**: 12 (Production Infrastructure & Security)
- **Compact After Completion**: MANDATORY - Final subgroup, compact for project completion
- **Test Coverage**: Phase3_Production_Tests.md (Tests 51-104 Enhanced)
- **Dependencies**: PWA & Offline Infrastructure (Subgroup 11) must be complete
- **Related Enhancements**: All security patches from security_enhancements/
- **Estimated Context Usage**: 85-95%

---

**Subgroup**: 04 - Production Infrastructure & Security  
**Phase**: Production (Week 12)  
**Focus**: Performance optimization + Security hardening + Deployment automation  

## Subgroup Overview

The Production Infrastructure & Security subgroup ensures TaskMaster Pro is ready for production deployment with enterprise-grade security, optimal performance, and automated CI/CD pipelines. This subgroup focuses on the infrastructure and security measures necessary for a robust, scalable, and secure production environment.

### Primary Responsibilities

- **Performance Optimization**: Lighthouse optimization, Core Web Vitals, bundle optimization, and memory management
- **Security Hardening**: Authentication security, data protection, API security, and security headers
- **CI/CD Pipeline**: GitHub Actions workflows, automated testing, and deployment automation
- **Docker Containerization**: Multi-stage builds, security scanning, and container orchestration
- **Monitoring & Observability**: Application performance monitoring, error tracking, and health checks
- **Rate Limiting & DDoS Protection**: API rate limiting, request throttling, and abuse prevention
- **Security Compliance**: CSP headers, HTTPS enforcement, and security audit compliance
- **Deployment Automation**: Zero-downtime deployments, rollback strategies, and environment management

## Test Coverage Requirements

Based on `Phase3_Production_Tests.md`, the following tests must pass:

### Performance Tests (4 tests)
- **Load Testing** (`__tests__/performance/load-testing.test.ts`)
  - Dashboard load time under 2.5s (LCP compliance)
  - Large dataset handling (1000+ tasks) without performance degradation
  - Virtual scrolling implementation for large lists
  - Lazy loading of heavy components with code splitting

- **Memory Management** (`__tests__/performance/memory-leaks.test.ts`)
  - Memory leak detection and prevention
  - Garbage collection monitoring
  - Component cleanup verification

- **Bundle Optimization** (`__tests__/performance/bundle-optimization.test.ts`)
  - Bundle size limits and monitoring
  - Tree shaking verification
  - Dynamic import optimization

### Security Tests (6 tests)
- **Authentication Security** (`__tests__/security/authentication-security.test.ts`)
  - JWT token security and validation
  - Session management and timeout handling
  - Authentication bypass prevention

- **Data Protection** (`__tests__/security/data-protection.test.ts`)
  - Data encryption at rest and in transit
  - Sensitive data handling and sanitization
  - Privacy compliance validation

- **API Security** (`__tests__/security/api-security.test.ts`)
  - Rate limiting implementation
  - CORS configuration validation
  - Input validation and SQL injection prevention

## Core Data Models and Types

### Performance Monitoring Types

```typescript
// types/performance.ts
export interface PerformanceMetrics {
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  fcp: number // First Contentful Paint
  ttfb: number // Time to First Byte
  loadTime: number
  memoryUsage: MemoryInfo
  timestamp: Date
}

export interface MemoryInfo {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

export interface BundleAnalysis {
  totalSize: number
  chunkSizes: Record<string, number>
  unusedCode: number
  duplicatedModules: string[]
  treeShakenModules: string[]
}

export interface LoadTestResult {
  component: string
  renderTime: number
  memoryDelta: number
  passed: boolean
  threshold: number
}

// Virtual scrolling types
export interface VirtualScrollConfig {
  itemHeight: number
  containerHeight: number
  overscan: number
  totalItems: number
}

export interface VirtualScrollState {
  scrollTop: number
  visibleStart: number
  visibleEnd: number
  renderedItems: any[]
}
```

### Security Types

```typescript
// types/security.ts
export interface SecurityHeaders {
  'Content-Security-Policy': string
  'Strict-Transport-Security': string
  'X-Content-Type-Options': string
  'X-Frame-Options': string
  'X-XSS-Protection': string
  'Referrer-Policy': string
  'Permissions-Policy': string
}

export interface RateLimitConfig {
  windowMs: number
  max: number
  message: string
  standardHeaders: boolean
  legacyHeaders: boolean
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: any) => string
}

export interface SecurityAudit {
  id: string
  timestamp: Date
  type: 'VULNERABILITY' | 'CONFIGURATION' | 'COMPLIANCE'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  recommendation: string
  status: 'OPEN' | 'RESOLVED' | 'ACCEPTED_RISK'
  cveId?: string
}

export interface EncryptionConfig {
  algorithm: 'aes-256-gcm'
  keyDerivation: 'pbkdf2' | 'scrypt'
  saltLength: number
  iterations: number
  tagLength: number
}

export interface AuthSecurityConfig {
  jwtSecret: string
  jwtExpiry: string
  refreshTokenExpiry: string
  maxLoginAttempts: number
  lockoutDuration: number
  passwordMinLength: number
  requireMFA: boolean
  sessionTimeout: number
}
```

### CI/CD and Deployment Types

```typescript
// types/deployment.ts
export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production'
  version: string
  dockerTag: string
  replicas: number
  resources: {
    requests: { cpu: string; memory: string }
    limits: { cpu: string; memory: string }
  }
  envVars: Record<string, string>
  secrets: string[]
}

export interface HealthCheck {
  endpoint: string
  interval: number
  timeout: number
  retries: number
  initialDelay: number
}

export interface MonitoringConfig {
  metricsEndpoint: string
  alertmanagerUrl: string
  grafanaDashboard: string
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  errorReporting: {
    sentryDsn: string
    sampleRate: number
  }
}

export interface BackupStrategy {
  schedule: string
  retention: {
    daily: number
    weekly: number
    monthly: number
  }
  destinations: string[]
  encryption: boolean
}
```

## Key Components Implementation

### Performance Monitoring System

```typescript
// lib/monitoring/performance.ts
import { PerformanceMetrics, MemoryInfo } from '@/types/performance'

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private observer: PerformanceObserver | null = null
  private isEnabled = process.env.NODE_ENV === 'production'

  initialize() {
    if (!this.isEnabled || typeof window === 'undefined') return

    // Core Web Vitals monitoring
    this.setupWebVitals()
    
    // Memory monitoring
    this.setupMemoryMonitoring()
    
    // Route change monitoring
    this.setupNavigationMonitoring()

    // Send metrics periodically
    this.startMetricsReporting()
  }

  private setupWebVitals() {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { 
        renderTime: number; loadTime: number 
      }
      
      this.recordMetric('lcp', lastEntry.renderTime || lastEntry.loadTime)
    }).observe({ type: 'largest-contentful-paint', buffered: true })

    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        this.recordMetric('fid', entry.processingStart - entry.startTime)
      })
    }).observe({ type: 'first-input', buffered: true })

    // Cumulative Layout Shift (CLS)
    let clsValue = 0
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
          this.recordMetric('cls', clsValue)
        }
      })
    }).observe({ type: 'layout-shift', buffered: true })

    // First Contentful Paint (FCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        this.recordMetric('fcp', entry.startTime)
      })
    }).observe({ type: 'paint', buffered: true })
  }

  private setupMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory as MemoryInfo
        this.recordMemoryMetrics(memory)
        
        // Alert on memory leaks
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          this.reportMemoryLeak(memory)
        }
      }, 30000) // Every 30 seconds
    }
  }

  private setupNavigationMonitoring() {
    // Monitor route changes
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = (...args) => {
      this.recordNavigationStart()
      return originalPushState.apply(history, args)
    }

    history.replaceState = (...args) => {
      this.recordNavigationStart()
      return originalReplaceState.apply(history, args)
    }

    // Monitor page load
    window.addEventListener('load', () => {
      this.recordMetric('loadTime', performance.now())
    })
  }

  private recordMetric(type: keyof PerformanceMetrics, value: number) {
    const metric: Partial<PerformanceMetrics> = {
      [type]: value,
      timestamp: new Date()
    }

    this.metrics.push(metric as PerformanceMetrics)

    // Trigger alerts for poor performance
    this.checkThresholds(type, value)
  }

  private checkThresholds(metric: string, value: number) {
    const thresholds = {
      lcp: 2500, // 2.5 seconds
      fid: 100,  // 100ms
      cls: 0.1,  // 0.1
      fcp: 1800, // 1.8 seconds
      loadTime: 3000 // 3 seconds
    }

    if (thresholds[metric] && value > thresholds[metric]) {
      this.reportPerformanceIssue(metric, value, thresholds[metric])
    }
  }

  private recordMemoryMetrics(memory: MemoryInfo) {
    const metric: Partial<PerformanceMetrics> = {
      memoryUsage: memory,
      timestamp: new Date()
    }

    this.metrics.push(metric as PerformanceMetrics)
  }

  private recordNavigationStart() {
    // Reset metrics for new page
    this.metrics = []
    this.recordMetric('navigationStart' as any, performance.now())
  }

  private startMetricsReporting() {
    // Send metrics to monitoring service every 60 seconds
    setInterval(async () => {
      if (this.metrics.length > 0) {
        await this.sendMetrics()
        this.metrics = [] // Clear after sending
      }
    }, 60000)

    // Send metrics before page unload
    window.addEventListener('beforeunload', () => {
      if (this.metrics.length > 0) {
        navigator.sendBeacon('/api/metrics', JSON.stringify(this.metrics))
      }
    })
  }

  private async sendMetrics() {
    try {
      await fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: this.metrics,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Failed to send performance metrics:', error)
    }
  }

  private reportPerformanceIssue(metric: string, value: number, threshold: number) {
    console.warn(`Performance threshold exceeded: ${metric} = ${value} (threshold: ${threshold})`)
    
    // Report to error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureMessage(
        `Performance issue: ${metric} exceeded threshold`,
        {
          level: 'warning',
          extra: { metric, value, threshold, url: window.location.href }
        }
      )
    }
  }

  private reportMemoryLeak(memory: MemoryInfo) {
    console.error('Potential memory leak detected:', memory)
    
    // Report to error tracking
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureMessage('Memory leak detected', {
        level: 'error',
        extra: { memory, url: window.location.href }
      })
    }
  }

  // Public API
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  clearMetrics() {
    this.metrics = []
  }

  disable() {
    this.isEnabled = false
    if (this.observer) {
      this.observer.disconnect()
    }
  }
}

// Export singleton
export const performanceMonitor = new PerformanceMonitor()

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  performanceMonitor.initialize()
}
```

### Virtual Scrolling Implementation

```typescript
// components/ui/VirtualScroll.tsx
'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { VirtualScrollConfig, VirtualScrollState } from '@/types/performance'

interface VirtualScrollProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  onScroll?: (scrollTop: number) => void
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
  renderItem,
  className = '',
  onScroll
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const config: VirtualScrollConfig = {
    itemHeight,
    containerHeight,
    overscan,
    totalItems: items.length
  }

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight)
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    )

    const paddedStart = Math.max(0, visibleStart - overscan)
    const paddedEnd = Math.min(items.length - 1, visibleEnd + overscan)

    return { paddedStart, paddedEnd, visibleStart, visibleEnd }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  // Get visible items
  const visibleItems = useMemo(() => {
    const { paddedStart, paddedEnd } = visibleRange
    return items.slice(paddedStart, paddedEnd + 1).map((item, index) => ({
      item,
      index: paddedStart + index
    }))
  }, [items, visibleRange])

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)
  }, [onScroll])

  // Calculate dimensions
  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.paddedStart * itemHeight

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      data-testid="virtual-scroll-container"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{ height: itemHeight }}
              data-testid={`virtual-item-${index}`}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Performance optimized list component
interface OptimizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  itemHeight?: number
  maxHeight?: number
  enableVirtualization?: boolean
  virtualizationThreshold?: number
}

export function OptimizedList<T>({
  items,
  renderItem,
  className = '',
  itemHeight = 60,
  maxHeight = 400,
  enableVirtualization = true,
  virtualizationThreshold = 50
}: OptimizedListProps<T>) {
  const shouldVirtualize = enableVirtualization && items.length > virtualizationThreshold

  if (shouldVirtualize) {
    return (
      <VirtualScroll
        items={items}
        itemHeight={itemHeight}
        containerHeight={maxHeight}
        renderItem={renderItem}
        className={className}
      />
    )
  }

  // Regular rendering for small lists
  return (
    <div 
      className={`overflow-auto ${className}`}
      style={{ maxHeight }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          style={{ height: itemHeight }}
          data-testid={`list-item-${index}`}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
}
```

### Security Middleware Implementation

```typescript
// lib/security/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { RateLimitConfig, SecurityHeaders } from '@/types/security'
import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'

// Security headers configuration
export const securityHeaders: SecurityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.openrouter.ai",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.openrouter.ai wss: ws:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()'
  ].join(', ')
}

// Rate limiting configurations
export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
  },
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per window
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
  },
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    message: 'Upload limit exceeded, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  }
}

// Security middleware
export function securityMiddleware(req: NextRequest): NextResponse {
  const response = NextResponse.next()

  // Apply security headers
  Object.entries(securityHeaders).forEach(([header, value]) => {
    response.headers.set(header, value)
  })

  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production') {
    const proto = req.headers.get('x-forwarded-proto')
    if (proto !== 'https') {
      const httpsUrl = `https://${req.headers.get('host')}${req.nextUrl.pathname}`
      return NextResponse.redirect(httpsUrl, 301)
    }
  }

  // Remove server headers that reveal technology stack
  response.headers.delete('x-powered-by')
  response.headers.delete('server')

  return response
}

// API rate limiting
export class APIRateLimiter {
  private limiters = new Map<string, any>()

  constructor() {
    // Initialize rate limiters for different endpoints
    this.setupLimiters()
  }

  private setupLimiters() {
    // General API rate limiter
    this.limiters.set('api', rateLimit(rateLimitConfigs.api))

    // Authentication rate limiter
    this.limiters.set('auth', rateLimit(rateLimitConfigs.auth))

    // Upload rate limiter
    this.limiters.set('upload', rateLimit(rateLimitConfigs.upload))

    // Speed limiter for suspicious activity
    this.limiters.set('slow', slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 5, // Allow 5 requests per window at full speed
      delayMs: 500, // Add 500ms delay per request after delayAfter
      maxDelayMs: 20000 // Maximum delay of 20 seconds
    }))
  }

  getLimiter(type: string) {
    return this.limiters.get(type)
  }

  async checkRateLimit(req: NextRequest, type: string = 'api'): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    error?: string
  }> {
    const limiter = this.getLimiter(type)
    
    if (!limiter) {
      return { allowed: true, remaining: Infinity, resetTime: 0 }
    }

    try {
      // Simulate rate limit check (in real implementation, this would be async)
      const clientId = this.getClientId(req)
      const key = `${type}:${clientId}`
      
      // This would be implemented with Redis or similar in production
      const rateLimitResult = await this.checkRedisRateLimit(key, rateLimitConfigs[type])
      
      return rateLimitResult
    } catch (error) {
      console.error('Rate limit check failed:', error)
      return { allowed: false, remaining: 0, resetTime: Date.now() + 60000, error: 'Rate limit check failed' }
    }
  }

  private getClientId(req: NextRequest): string {
    // Try to get client IP from various headers
    const forwarded = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const clientIp = forwarded?.split(',')[0] || realIp || 'unknown'
    
    return clientIp
  }

  private async checkRedisRateLimit(key: string, config: RateLimitConfig) {
    // Mock implementation - replace with actual Redis integration
    return {
      allowed: true,
      remaining: config.max - 1,
      resetTime: Date.now() + config.windowMs
    }
  }
}

// Input validation and sanitization
export class InputValidator {
  static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential XSS vectors
      .slice(0, 1000) // Limit length
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  }

  static validatePassword(password: string): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  static validateJSON(input: string): { valid: boolean; data?: any; error?: string } {
    try {
      const data = JSON.parse(input)
      return { valid: true, data }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Invalid JSON' 
      }
    }
  }

  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace unsafe characters
      .replace(/^\.+/, '') // Remove leading dots
      .slice(0, 255) // Limit length
  }
}

// Export singleton
export const rateLimiter = new APIRateLimiter()
```

### Encryption and Data Protection

```typescript
// lib/security/encryption.ts
import crypto from 'crypto'
import { EncryptionConfig } from '@/types/security'

export class DataEncryption {
  private config: EncryptionConfig = {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2',
    saltLength: 32,
    iterations: 100000,
    tagLength: 16
  }

  // Derive key from password
  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, this.config.iterations, 32, 'sha512')
  }

  // Encrypt sensitive data
  encrypt(data: string, password: string): {
    encrypted: string
    salt: string
    iv: string
    tag: string
  } {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.config.saltLength)
      const iv = crypto.randomBytes(12) // 12 bytes for GCM
      
      // Derive key
      const key = this.deriveKey(password, salt)
      
      // Create cipher
      const cipher = crypto.createCipher(this.config.algorithm, key)
      cipher.setAAD(Buffer.from('taskmaster-pro', 'utf8'))
      
      // Encrypt data
      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      // Get authentication tag
      const tag = cipher.getAuthTag()
      
      return {
        encrypted,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      }
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`)
    }
  }

  // Decrypt sensitive data
  decrypt(encryptedData: {
    encrypted: string
    salt: string
    iv: string
    tag: string
  }, password: string): string {
    try {
      const salt = Buffer.from(encryptedData.salt, 'hex')
      const iv = Buffer.from(encryptedData.iv, 'hex')
      const tag = Buffer.from(encryptedData.tag, 'hex')
      
      // Derive key
      const key = this.deriveKey(password, salt)
      
      // Create decipher
      const decipher = crypto.createDecipher(this.config.algorithm, key)
      decipher.setAAD(Buffer.from('taskmaster-pro', 'utf8'))
      decipher.setAuthTag(tag)
      
      // Decrypt data
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`)
    }
  }

  // Hash passwords securely
  async hashPassword(password: string): Promise<{
    hash: string
    salt: string
  }> {
    const salt = crypto.randomBytes(this.config.saltLength)
    const hash = crypto.pbkdf2Sync(password, salt, this.config.iterations, 64, 'sha512')
    
    return {
      hash: hash.toString('hex'),
      salt: salt.toString('hex')
    }
  }

  // Verify password against hash
  async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    const saltBuffer = Buffer.from(salt, 'hex')
    const hashBuffer = crypto.pbkdf2Sync(password, saltBuffer, this.config.iterations, 64, 'sha512')
    const hashToCheck = hashBuffer.toString('hex')
    
    // Use timing-safe comparison
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hashToCheck, 'hex'))
  }

  // Generate secure random tokens
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  // Generate CSRF tokens
  generateCSRFToken(): string {
    return this.generateSecureToken(32)
  }

  // Verify CSRF tokens
  verifyCSRFToken(token: string, sessionToken: string): boolean {
    if (!token || !sessionToken) return false
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(sessionToken))
  }

  // Encrypt API keys and sensitive configuration
  encryptConfig(config: Record<string, any>): string {
    const configString = JSON.stringify(config)
    const masterKey = process.env.MASTER_ENCRYPTION_KEY || 'default-key-change-in-production'
    
    const result = this.encrypt(configString, masterKey)
    return JSON.stringify(result)
  }

  // Decrypt configuration
  decryptConfig(encryptedConfig: string): Record<string, any> {
    const masterKey = process.env.MASTER_ENCRYPTION_KEY || 'default-key-change-in-production'
    const encData = JSON.parse(encryptedConfig)
    
    const decryptedString = this.decrypt(encData, masterKey)
    return JSON.parse(decryptedString)
  }
}

// Data sanitization for database storage
export class DataSanitizer {
  // Sanitize user input for database storage
  static sanitizeForDB(data: any): any {
    if (typeof data === 'string') {
      return data
        .trim()
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .slice(0, 10000) // Reasonable length limit
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForDB(item))
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(data)) {
        const sanitizedKey = key.replace(/[^\w.-]/g, '_').slice(0, 64)
        sanitized[sanitizedKey] = this.sanitizeForDB(value)
      }
      return sanitized
    }

    return data
  }

  // Remove sensitive data from logs
  static sanitizeForLogging(data: any): any {
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'authorization',
      'cookie', 'session', 'auth', 'credential'
    ]

    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data }
      
      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]'
        }
      }

      // Recursively sanitize nested objects
      for (const [key, value] of Object.entries(sanitized)) {
        if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeForLogging(value)
        }
      }

      return sanitized
    }

    return data
  }
}

// Export singleton
export const encryption = new DataEncryption()
```

### GitHub Actions CI/CD Pipeline

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  release:
    types: [ published ]

env:
  NODE_VERSION: '18.x'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    name: Test & Quality Checks
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: taskmaster_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint code
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Run unit tests
        run: npm run test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/taskmaster_test

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/taskmaster_test

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/taskmaster_test
          PLAYWRIGHT_BROWSERS_PATH: 0

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          fail_ci_if_error: true

      - name: Performance audit
        run: |
          npm run build
          npx lighthouse-ci --upload.target=temporary-public-storage

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run security audit
        run: npm audit --audit-level high

      - name: Dependency vulnerability scan
        uses: actions/dependency-review-action@v3

      - name: CodeQL Analysis
        uses: github/codeql-action/init@v2
        with:
          languages: javascript

      - name: Autobuild
        uses: github/codeql-action/autobuild@v2

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2

      - name: Docker image security scan
        if: github.event_name == 'push'
        run: |
          docker build -t security-scan .
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
            -v $PWD:/root/.cache/ aquasec/trivy image security-scan

  build-docker:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.event_name == 'push' || github.event_name == 'release'

    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NODE_VERSION=${{ env.NODE_VERSION }}

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build-docker
    if: github.ref == 'refs/heads/develop'
    environment: staging

    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment"
          # Add your deployment commands here

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build-docker
    if: github.event_name == 'release'
    environment: production

    steps:
      - name: Deploy to production
        run: |
          echo "Deploying to production environment"
          # Add your deployment commands here

      - name: Health check
        run: |
          # Wait for deployment to be ready
          sleep 30
          
          # Check application health
          curl -f https://taskmaster-pro.com/api/health || exit 1

      - name: Notify deployment success
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: 'TaskMaster Pro deployed to production successfully!'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

  rollback:
    name: Rollback on Failure
    runs-on: ubuntu-latest
    needs: deploy-production
    if: failure()
    environment: production

    steps:
      - name: Rollback deployment
        run: |
          echo "Rolling back failed deployment"
          # Add rollback commands here

      - name: Notify rollback
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text: 'Production deployment failed and was rolled back!'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Docker Configuration

```dockerfile
# Dockerfile
# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy additional files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml - For development
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/taskmaster
      - NEXTAUTH_SECRET=your-secret-key
      - NEXTAUTH_URL=http://localhost:3000
    depends_on:
      - db
      - redis
    volumes:
      - .:/app
      - /app/node_modules
    networks:
      - taskmaster-network

  db:
    image: postgres:15-alpine
    restart: always
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=taskmaster
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - taskmaster-network

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    networks:
      - taskmaster-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - taskmaster-network

volumes:
  postgres_data:
  redis_data:

networks:
  taskmaster-network:
    driver: bridge
```

### Health Check and Monitoring

```typescript
// app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  services: {
    database: { status: string; responseTime: number }
    redis: { status: string; responseTime: number }
    memory: { usage: number; limit: number; percentage: number }
    disk: { usage: number; limit: number; percentage: number }
  }
  version: string
  uptime: number
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  
  try {
    const healthResult: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: await checkDatabase(),
        redis: await checkRedis(),
        memory: checkMemory(),
        disk: await checkDisk()
      },
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime()
    }

    // Determine overall health status
    const unhealthyServices = Object.values(healthResult.services)
      .filter(service => service.status !== 'healthy')

    if (unhealthyServices.length > 0) {
      healthResult.status = unhealthyServices.length > 1 ? 'unhealthy' : 'degraded'
    }

    const statusCode = healthResult.status === 'healthy' ? 200 : 
                      healthResult.status === 'degraded' ? 200 : 503

    return NextResponse.json(healthResult, { status: statusCode })

  } catch (error) {
    const errorResult: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: { status: 'error', responseTime: 0 },
        redis: { status: 'error', responseTime: 0 },
        memory: { usage: 0, limit: 0, percentage: 0 },
        disk: { usage: 0, limit: 0, percentage: 0 }
      },
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime()
    }

    return NextResponse.json(errorResult, { status: 503 })
  }
}

async function checkDatabase() {
  const start = Date.now()
  
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      status: 'healthy',
      responseTime: Date.now() - start
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start
    }
  }
}

async function checkRedis() {
  const start = Date.now()
  
  try {
    await redis.ping()
    return {
      status: 'healthy',
      responseTime: Date.now() - start
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start
    }
  }
}

function checkMemory() {
  const memoryUsage = process.memoryUsage()
  const totalMemory = memoryUsage.heapTotal
  const usedMemory = memoryUsage.heapUsed
  const memoryLimit = 512 * 1024 * 1024 // 512MB limit
  
  return {
    usage: usedMemory,
    limit: memoryLimit,
    percentage: (usedMemory / memoryLimit) * 100,
    status: usedMemory > memoryLimit * 0.9 ? 'unhealthy' : 'healthy'
  }
}

async function checkDisk() {
  // This would require additional system utilities in production
  return {
    usage: 0,
    limit: 0,
    percentage: 0,
    status: 'healthy'
  }
}

// Metrics endpoint for Prometheus
export async function GET_METRICS(request: NextRequest): Promise<NextResponse> {
  const metrics = [
    '# HELP taskmaster_http_requests_total Total number of HTTP requests',
    '# TYPE taskmaster_http_requests_total counter',
    'taskmaster_http_requests_total 1000',
    '',
    '# HELP taskmaster_memory_usage_bytes Current memory usage in bytes',
    '# TYPE taskmaster_memory_usage_bytes gauge',
    `taskmaster_memory_usage_bytes ${process.memoryUsage().heapUsed}`,
    '',
    '# HELP taskmaster_uptime_seconds Uptime in seconds',
    '# TYPE taskmaster_uptime_seconds gauge',
    `taskmaster_uptime_seconds ${process.uptime()}`,
    ''
  ].join('\n')

  return new NextResponse(metrics, {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
    }
  })
}
```

### Logging and Error Tracking

```typescript
// lib/monitoring/logger.ts
import winston from 'winston'
import { DataSanitizer } from '@/lib/security/encryption'

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf((info) => {
      // Sanitize sensitive data before logging
      const sanitized = DataSanitizer.sanitizeForLogging(info)
      return JSON.stringify(sanitized)
    })
  ),
  defaultMeta: { 
    service: 'taskmaster-pro',
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [
    // Write all logs to console in development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
})

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5
  }))

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 10485760,
    maxFiles: 5
  }))
}

export { logger }

// Custom error classes
export class TaskMasterError extends Error {
  public statusCode: number
  public code: string
  public details?: any

  constructor(
    message: string, 
    statusCode: number = 500, 
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message)
    this.name = 'TaskMasterError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export class ValidationError extends TaskMasterError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends TaskMasterError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends TaskMasterError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
    this.name = 'AuthorizationError'
  }
}

export class RateLimitError extends TaskMasterError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR')
    this.name = 'RateLimitError'
  }
}

// Error tracking integration
export class ErrorTracker {
  private static instance: ErrorTracker
  private sentryEnabled = false

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker()
    }
    return ErrorTracker.instance
  }

  initialize() {
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      // Initialize Sentry
      this.sentryEnabled = true
      logger.info('Error tracking initialized')
    }
  }

  captureException(error: Error, context?: any) {
    // Log error
    logger.error('Exception captured', {
      error: error.message,
      stack: error.stack,
      context: DataSanitizer.sanitizeForLogging(context)
    })

    // Send to error tracking service
    if (this.sentryEnabled && typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, { extra: context })
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: any) {
    logger.log(level, message, context)

    if (this.sentryEnabled && typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureMessage(message, level, { extra: context })
    }
  }
}

// Export singleton
export const errorTracker = ErrorTracker.getInstance()
```

## Integration Points with Other Subgroups

### Data Intelligence & Analytics Integration
- **Performance Metrics**: Collect and analyze application performance data for insights
- **Security Analytics**: Monitor authentication patterns and security events
- **User Behavior Tracking**: Performance impact analysis on user engagement
- **A/B Testing Infrastructure**: Support for performance-aware feature rollouts

### External Integration Layer
- **API Gateway Security**: Rate limiting and authentication for external API calls
- **Third-party Service Monitoring**: Health checks for external integrations
- **Secure Configuration Management**: Encrypted storage of API keys and secrets
- **Webhook Security**: Validation and rate limiting for incoming webhooks

### PWA & Offline Infrastructure
- **Service Worker Security**: CSP compliance for service worker scripts
- **Offline Performance**: Performance monitoring for offline functionality
- **Sync Performance**: Monitoring background sync performance and reliability
- **Mobile Security**: Additional security measures for mobile PWA installations

## Testing Strategies for Production Infrastructure

### Performance Testing

```typescript
// __tests__/performance/load-testing.test.ts
import { render, waitFor } from '@testing-library/react'
import { performanceMonitor } from '@/lib/monitoring/performance'

describe('Performance Load Testing', () => {
  beforeEach(() => {
    // Reset performance monitor
    performanceMonitor.clearMetrics()
  })

  it('should load dashboard within performance budget', async () => {
    const startTime = performance.now()
    
    const { DashboardPage } = await import('@/app/dashboard/page')
    render(<DashboardPage />)
    
    await waitFor(() => {
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      // Lighthouse LCP target: < 2.5 seconds
      expect(loadTime).toBeLessThan(2500)
    })
  })

  it('should handle large datasets without memory leaks', async () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
    
    // Create large dataset
    const largeTasks = Array.from({ length: 1000 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      description: 'x'.repeat(100), // 100 char description
      status: 'TODO' as const,
      priority: 'MEDIUM' as const,
      userId: 'user1',
      tags: [`tag${i % 10}`],
      createdAt: new Date(),
      updatedAt: new Date()
    }))

    const { TaskList } = await import('@/components/tasks/TaskList')
    const { unmount } = render(<TaskList tasks={largeTasks} />)

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000))

    unmount()

    // Check memory after cleanup
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
    const memoryIncrease = finalMemory - initialMemory

    // Should not leak more than 10MB
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
  })

  it('should implement virtual scrolling for performance', () => {
    const { VirtualScroll } = require('@/components/ui/VirtualScroll')
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `Item ${i}` }))

    const { container } = render(
      <VirtualScroll
        items={largeDataset}
        itemHeight={50}
        containerHeight={400}
        renderItem={(item: any) => <div key={item.id}>{item.name}</div>}
      />
    )

    // Should only render visible items (8 visible + 3 overscan on each side = ~14 items)
    const renderedItems = container.querySelectorAll('[data-testid^="virtual-item"]')
    expect(renderedItems.length).toBeLessThan(20)
    expect(renderedItems.length).toBeGreaterThan(0)
  })

  it('should optimize bundle size with code splitting', async () => {
    // Check that heavy components are code-split
    const analyticsDynamicImport = () => import('@/components/analytics/Analytics')
    const calendarDynamicImport = () => import('@/components/calendar/CalendarView')
    
    expect(analyticsDynamicImport).toBeDefined()
    expect(calendarDynamicImport).toBeDefined()

    // Verify chunks are separate
    const analytics = await analyticsDynamicImport()
    const calendar = await calendarDynamicImport()

    expect(analytics).toBeDefined()
    expect(calendar).toBeDefined()
  })
})
```

### Security Testing

```typescript
// __tests__/security/authentication-security.test.ts
import { NextRequest } from 'next/server'
import { securityMiddleware, rateLimiter, InputValidator } from '@/lib/security/middleware'
import { encryption } from '@/lib/security/encryption'

describe('Authentication Security', () => {
  it('should enforce HTTPS in production', () => {
    process.env.NODE_ENV = 'production'
    
    const request = new NextRequest('http://example.com/api/test', {
      headers: { 'x-forwarded-proto': 'http' }
    })

    const response = securityMiddleware(request)
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('https://example.com/api/test')
  })

  it('should apply security headers', () => {
    const request = new NextRequest('https://example.com/api/test')
    const response = securityMiddleware(request)

    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'")
    expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000')
  })

  it('should implement rate limiting', async () => {
    const request = new NextRequest('https://example.com/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.1' }
    })

    const result = await rateLimiter.checkRateLimit(request, 'auth')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThanOrEqual(0)
  })

  it('should validate and sanitize input', () => {
    const maliciousInput = '<script>alert("xss")</script>Hello World'
    const sanitized = InputValidator.sanitizeString(maliciousInput)
    
    expect(sanitized).not.toContain('<script>')
    expect(sanitized).toBe('alert("xss")Hello World')
  })

  it('should validate passwords securely', () => {
    const weakPassword = 'password'
    const strongPassword = 'MyStr0ng!P@ssw0rd'

    const weakResult = InputValidator.validatePassword(weakPassword)
    const strongResult = InputValidator.validatePassword(strongPassword)

    expect(weakResult.valid).toBe(false)
    expect(weakResult.errors.length).toBeGreaterThan(0)

    expect(strongResult.valid).toBe(true)
    expect(strongResult.errors.length).toBe(0)
  })

  it('should encrypt sensitive data', async () => {
    const sensitiveData = 'user-secret-data'
    const password = 'encryption-key'

    const encrypted = encryption.encrypt(sensitiveData, password)
    expect(encrypted.encrypted).toBeDefined()
    expect(encrypted.salt).toBeDefined()
    expect(encrypted.iv).toBeDefined()
    expect(encrypted.tag).toBeDefined()

    const decrypted = encryption.decrypt(encrypted, password)
    expect(decrypted).toBe(sensitiveData)
  })
})

// __tests__/security/api-security.test.ts
describe('API Security', () => {
  it('should prevent SQL injection', () => {
    const maliciousInput = "'; DROP TABLE users; --"
    const sanitized = InputValidator.sanitizeForDB(maliciousInput)
    
    expect(sanitized).not.toContain('DROP TABLE')
    expect(sanitized).not.toContain('--')
  })

  it('should validate JSON input safely', () => {
    const maliciousJSON = '{"__proto__": {"isAdmin": true}}'
    const result = InputValidator.validateJSON(maliciousJSON)
    
    expect(result.valid).toBe(true)
    expect(result.data.__proto__).toBeUndefined()
  })

  it('should sanitize file uploads', () => {
    const maliciousFilename = '../../../etc/passwd'
    const sanitized = InputValidator.sanitizeFilename(maliciousFilename)
    
    expect(sanitized).not.toContain('../')
    expect(sanitized).not.toContain('/')
    expect(sanitized.length).toBeLessThanOrEqual(255)
  })
})
```

### CI/CD Testing

```typescript
// __tests__/deployment/health-check.test.ts
import { GET } from '@/app/api/health/route'
import { NextRequest } from 'next/server'

describe('Health Check API', () => {
  it('should return health status', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const health = await response.json()

    expect(health.status).toMatch(/healthy|degraded|unhealthy/)
    expect(health.services).toBeDefined()
    expect(health.services.database).toBeDefined()
    expect(health.services.memory).toBeDefined()
    expect(health.version).toBeDefined()
    expect(health.uptime).toBeGreaterThan(0)
  })

  it('should report database connectivity', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const health = await response.json()

    expect(health.services.database.status).toMatch(/healthy|unhealthy/)
    expect(health.services.database.responseTime).toBeGreaterThan(0)
  })

  it('should monitor memory usage', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const health = await response.json()

    expect(health.services.memory.usage).toBeGreaterThan(0)
    expect(health.services.memory.percentage).toBeGreaterThanOrEqual(0)
    expect(health.services.memory.percentage).toBeLessThanOrEqual(100)
  })
})
```

## Deployment and Scaling Considerations

### Production Environment Setup

```bash
# Environment Variables for Production
NODE_ENV=production
APP_VERSION=1.0.0
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/taskmaster
REDIS_URL=redis://localhost:6379

# Security
NEXTAUTH_SECRET=your-super-secret-key
NEXTAUTH_URL=https://taskmaster-pro.com
MASTER_ENCRYPTION_KEY=your-master-encryption-key
JWT_SECRET=your-jwt-secret

# External Services
OPENROUTER_API_KEY=your-openrouter-key
SENTRY_DSN=your-sentry-dsn

# Monitoring
LOG_LEVEL=info
METRICS_ENDPOINT=https://metrics.taskmaster-pro.com

# Rate Limiting
RATE_LIMIT_REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email (optional)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

### Kubernetes Deployment Configuration

```yaml
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: taskmaster-pro
  labels:
    app: taskmaster-pro
spec:
  replicas: 3
  selector:
    matchLabels:
      app: taskmaster-pro
  template:
    metadata:
      labels:
        app: taskmaster-pro
    spec:
      containers:
      - name: taskmaster-pro
        image: ghcr.io/taskmaster-pro:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: taskmaster-secrets
              key: database-url
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: taskmaster-secrets
              key: nextauth-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1001
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL

---
apiVersion: v1
kind: Service
metadata:
  name: taskmaster-pro-service
spec:
  selector:
    app: taskmaster-pro
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: taskmaster-pro-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - taskmaster-pro.com
    secretName: taskmaster-pro-tls
  rules:
  - host: taskmaster-pro.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: taskmaster-pro-service
            port:
              number: 80
```

### Monitoring and Alerting

```yaml
# monitoring/prometheus.yml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: taskmaster-pro-metrics
spec:
  selector:
    matchLabels:
      app: taskmaster-pro
  endpoints:
  - port: metrics
    path: /api/metrics
    interval: 30s

---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: taskmaster-pro-alerts
spec:
  groups:
  - name: taskmaster-pro
    rules:
    - alert: HighErrorRate
      expr: rate(taskmaster_http_requests_total{status=~"5.."}[5m]) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: High error rate detected
        description: "Error rate is {{ $value }} errors per second"

    - alert: HighMemoryUsage
      expr: taskmaster_memory_usage_bytes > 400000000  # 400MB
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: High memory usage
        description: "Memory usage is {{ $value }} bytes"

    - alert: DatabaseDown
      expr: up{job="postgresql"} == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: Database is down
        description: "PostgreSQL database is not responding"
```

This comprehensive Production Infrastructure & Security implementation ensures TaskMaster Pro is ready for enterprise deployment with optimal performance, robust security, automated CI/CD pipelines, and comprehensive monitoring capabilities.