/**
 * Content Security Policy Configuration
 * 
 * Implements strict CSP for XSS protection
 */

export interface CSPDirectives {
  'default-src': string[]
  'script-src': string[]
  'style-src': string[]
  'img-src': string[]
  'font-src': string[]
  'connect-src': string[]
  'media-src': string[]
  'object-src': string[]
  'frame-src': string[]
  'worker-src': string[]
  'form-action': string[]
  'frame-ancestors': string[]
  'base-uri': string[]
  'manifest-src': string[]
}

/**
 * Get CSP directives based on environment
 */
export function getCSPDirectives(isDevelopment: boolean = false): CSPDirectives {
  const self = "'self'"
  const none = "'none'"
  const data = 'data:'
  const blob = 'blob:'
  const https = 'https:'
  const wss = 'wss:'
  const ws = isDevelopment ? 'ws:' : ''
  
  // Nonces for inline scripts (generated per request)
  const scriptNonce = "'nonce-{{SCRIPT_NONCE}}'"
  const styleNonce = "'nonce-{{STYLE_NONCE}}'"
  
  const directives: CSPDirectives = {
    'default-src': [self],
    'script-src': [
      self,
      scriptNonce,
      // Required for Next.js
      isDevelopment && "'unsafe-eval'",
      // Analytics and monitoring
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://browser.sentry-cdn.com',
      // Supabase
      'https://*.supabase.co',
    ].filter(Boolean) as string[],
    'style-src': [
      self,
      styleNonce,
      // Required for inline styles
      isDevelopment && "'unsafe-inline'",
      // Google Fonts
      'https://fonts.googleapis.com',
    ].filter(Boolean) as string[],
    'img-src': [
      self,
      data,
      blob,
      https,
      // Supabase storage
      'https://*.supabase.co',
      // User avatars
      'https://avatars.githubusercontent.com',
      'https://lh3.googleusercontent.com',
    ],
    'font-src': [
      self,
      data,
      // Google Fonts
      'https://fonts.gstatic.com',
    ],
    'connect-src': [
      self,
      https,
      wss,
      ws,
      // API endpoints
      'https://*.supabase.co',
      'wss://*.supabase.co',
      // Analytics
      'https://www.google-analytics.com',
      'https://sentry.io',
      // Development
      isDevelopment && 'http://localhost:*',
      isDevelopment && 'ws://localhost:*',
    ].filter(Boolean) as string[],
    'media-src': [self, blob],
    'object-src': [none],
    'frame-src': [
      self,
      // OAuth providers
      'https://accounts.google.com',
      'https://github.com',
    ],
    'worker-src': [self, blob],
    'form-action': [self],
    'frame-ancestors': [none],
    'base-uri': [self],
    'manifest-src': [self],
  }
  
  return directives
}

/**
 * Build CSP header string from directives
 */
export function buildCSPHeader(directives: CSPDirectives): string {
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return null
      return `${key} ${values.join(' ')}`
    })
    .filter(Boolean)
    .join('; ')
}

/**
 * Generate CSP nonce for inline scripts/styles
 */
export function generateCSPNonce(): string {
  const crypto = require('crypto')
  return crypto.randomBytes(16).toString('base64')
}

/**
 * Replace nonce placeholders in CSP header
 */
export function injectCSPNonces(
  cspHeader: string,
  scriptNonce: string,
  styleNonce: string
): string {
  return cspHeader
    .replace(/{{SCRIPT_NONCE}}/g, scriptNonce)
    .replace(/{{STYLE_NONCE}}/g, styleNonce)
}

/**
 * CSP violation report handler
 */
export interface CSPViolation {
  'document-uri': string
  'violated-directive': string
  'effective-directive': string
  'original-policy': string
  'disposition': string
  'blocked-uri': string
  'status-code': number
  'script-sample'?: string
  'source-file'?: string
  'line-number'?: number
  'column-number'?: number
}

/**
 * Process CSP violation reports
 */
export function processCSPViolation(violation: CSPViolation) {
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.warn('CSP Violation:', {
      directive: violation['violated-directive'],
      blockedUri: violation['blocked-uri'],
      source: violation['source-file'],
      line: violation['line-number'],
    })
  }
  
  // Send to monitoring in production
  if (process.env.NODE_ENV === 'production') {
    // Send to Sentry or monitoring service
    // This would be implemented based on your monitoring setup
  }
  
  return {
    timestamp: new Date().toISOString(),
    ...violation,
  }
}

/**
 * Security headers configuration
 */
export function getSecurityHeaders(nonce?: string) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const cspDirectives = getCSPDirectives(isDevelopment)
  let cspHeader = buildCSPHeader(cspDirectives)
  
  if (nonce) {
    cspHeader = injectCSPNonces(cspHeader, nonce, nonce)
  }
  
  return {
    // Content Security Policy
    'Content-Security-Policy': cspHeader,
    'Content-Security-Policy-Report-Only': isDevelopment ? cspHeader : undefined,
    
    // Strict Transport Security
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // XSS Protection (legacy browsers)
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', '),
    
    // Additional security headers
    'X-Permitted-Cross-Domain-Policies': 'none',
    'X-Download-Options': 'noopen',
    'X-DNS-Prefetch-Control': 'on',
  }
}