/**
 * Production Security Headers Configuration
 * 
 * Comprehensive security headers implementation for TaskMaster Pro
 * Includes CSP, HSTS, and other security-focused HTTP headers
 */

export interface SecurityHeadersConfig {
  environment: 'development' | 'staging' | 'production'
  cspReportUri?: string
  hstsMaxAge?: number
  allowedDomains?: string[]
  enableCspReporting?: boolean
}

/**
 * Content Security Policy Configuration
 */
export function generateCSP(config: SecurityHeadersConfig): string {
  const isDev = config.environment === 'development'
  const allowedDomains = config.allowedDomains || []
  
  // Base CSP directives
  const csp = {
    'default-src': ["'self'"],
    
    // Scripts: Next.js requires 'unsafe-eval' and 'unsafe-inline' in development
    'script-src': [
      "'self'",
      ...(isDev ? ["'unsafe-eval'", "'unsafe-inline'"] : []),
      // Allow Next.js runtime
      "'sha256-' + btoa('next.js')",
      // Supabase
      'https://*.supabase.co',
      // Analytics (if enabled)
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com'
    ],
    
    // Styles: Allow inline styles for CSS-in-JS and component libraries
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for CSS-in-JS and component libraries
      'https://fonts.googleapis.com'
    ],
    
    // Images: Allow data URIs and external images
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      // Supabase Storage
      'https://*.supabase.co',
      // User avatars from OAuth providers
      'https://lh3.googleusercontent.com', // Google
      'https://avatars.githubusercontent.com', // GitHub
      ...allowedDomains
    ],
    
    // Fonts
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com'
    ],
    
    // API connections
    'connect-src': [
      "'self'",
      // Supabase
      'https://*.supabase.co',
      'wss://*.supabase.co', // WebSocket connections
      // OpenRouter AI
      'https://openrouter.ai',
      // Analytics
      'https://www.google-analytics.com',
      // Development HMR
      ...(isDev ? ['ws://localhost:3000', 'http://localhost:3000'] : []),
      ...allowedDomains
    ],
    
    // Media sources
    'media-src': [
      "'self'",
      'data:',
      'blob:',
      'https://*.supabase.co'
    ],
    
    // Web Workers
    'worker-src': [
      "'self'",
      'blob:' // Required for some web workers
    ],
    
    // Child sources (for iframes, workers, etc.)
    'child-src': [
      "'self'",
      'blob:'
    ],
    
    // Frame sources (no iframes allowed by default)
    'frame-src': [
      "'none'"
    ],
    
    // Object sources (no plugins)
    'object-src': [
      "'none'"
    ],
    
    // Base URI
    'base-uri': [
      "'self'"
    ],
    
    // Form actions
    'form-action': [
      "'self'",
      // OAuth providers
      'https://accounts.google.com',
      'https://github.com'
    ],
    
    // Frame ancestors (prevent clickjacking)
    'frame-ancestors': [
      "'none'"
    ],
    
    // Manifest source
    'manifest-src': [
      "'self'"
    ]
  }
  
  // Add reporting directive if enabled
  if (config.enableCspReporting && config.cspReportUri) {
    (csp as any)['report-uri'] = [config.cspReportUri]
    (csp as any)['report-to'] = ['csp-endpoint']
  }
  
  // Convert to CSP string
  return Object.entries(csp)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ')
}

/**
 * Generate all security headers
 */
export function generateSecurityHeaders(config: SecurityHeadersConfig): Record<string, string> {
  const isDev = config.environment === 'development'
  const hstsMaxAge = config.hstsMaxAge || 31536000 // 1 year
  
  const headers: Record<string, string> = {
    // Content Security Policy
    'Content-Security-Policy': generateCSP(config),
    
    // Strict Transport Security (only in production)
    ...(config.environment === 'production' ? {
      'Strict-Transport-Security': `max-age=${hstsMaxAge}; includeSubDomains; preload`
    } : {}),
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // XSS Protection (legacy, but still useful)
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy (Feature Policy replacement)
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'accelerometer=()',
      'gyroscope=()',
      'fullscreen=(self)'
    ].join(', '),
    
    // Cross-Origin Embedder Policy
    'Cross-Origin-Embedder-Policy': 'credentialless',
    
    // Cross-Origin Opener Policy
    'Cross-Origin-Opener-Policy': 'same-origin',
    
    // Cross-Origin Resource Policy
    'Cross-Origin-Resource-Policy': 'same-origin'
  }
  
  // Add CSP reporting headers if enabled
  if (config.enableCspReporting && config.cspReportUri) {
    headers['Report-To'] = JSON.stringify({
      group: 'csp-endpoint',
      max_age: 10886400,
      endpoints: [{ url: config.cspReportUri }]
    })
  }
  
  return headers
}

/**
 * Middleware function to apply security headers
 */
export function applySecurityHeaders(
  headers: Headers,
  config: SecurityHeadersConfig
): void {
  const securityHeaders = generateSecurityHeaders(config)
  
  Object.entries(securityHeaders).forEach(([name, value]) => {
    headers.set(name, value)
  })
}

/**
 * Validate CSP for common issues
 */
export function validateCSP(csp: string): {
  isValid: boolean
  warnings: string[]
  errors: string[]
} {
  const warnings: string[] = []
  const errors: string[] = []
  let isValid = true
  
  // Check for unsafe directives
  if (csp.includes("'unsafe-inline'") && csp.includes("'unsafe-eval'")) {
    warnings.push("Both 'unsafe-inline' and 'unsafe-eval' are present - consider removing in production")
  }
  
  // Check for missing important directives
  const requiredDirectives = ['default-src', 'script-src', 'style-src', 'img-src']
  for (const directive of requiredDirectives) {
    if (!csp.includes(directive)) {
      warnings.push(`Missing recommended directive: ${directive}`)
    }
  }
  
  // Check for overly permissive directives
  if (csp.includes("'unsafe-eval'") && !csp.includes('development')) {
    warnings.push("'unsafe-eval' detected - ensure this is intentional for production")
  }
  
  // Check for HTTP sources in production CSP
  const httpSources = csp.match(/http:\/\/[^\s;]*/g)
  if (httpSources && httpSources.length > 0) {
    errors.push(`HTTP sources detected in CSP: ${httpSources.join(', ')} - use HTTPS only`)
    isValid = false
  }
  
  return { isValid, warnings, errors }
}

/**
 * CSP violation reporting handler
 */
export interface CSPViolation {
  'csp-report': {
    'blocked-uri': string
    'document-uri': string
    'original-policy': string
    'referrer': string
    'violated-directive': string
    'effective-directive': string
    'source-file'?: string
    'line-number'?: number
    'column-number'?: number
  }
}

/**
 * Process CSP violation report
 */
export function processCSPViolation(violation: CSPViolation): {
  severity: 'low' | 'medium' | 'high' | 'critical'
  action: 'log' | 'alert' | 'block'
  details: any
} {
  const report = violation['csp-report']
  const violatedDirective = report['violated-directive']
  const blockedUri = report['blocked-uri']
  
  // Determine severity
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
  let action: 'log' | 'alert' | 'block' = 'log'
  
  // Critical: script-src violations (potential XSS)
  if (violatedDirective.startsWith('script-src')) {
    severity = 'critical'
    action = 'alert'
  }
  
  // High: connect-src violations to unknown domains
  else if (violatedDirective.startsWith('connect-src')) {
    severity = 'high'
    action = 'alert'
  }
  
  // Medium: style-src violations
  else if (violatedDirective.startsWith('style-src')) {
    severity = 'medium'
    action = 'log'
  }
  
  // High: frame-src violations (potential clickjacking)
  else if (violatedDirective.startsWith('frame-src')) {
    severity = 'high'
    action = 'block'
  }
  
  return {
    severity,
    action,
    details: {
      directive: violatedDirective,
      blockedUri,
      documentUri: report['document-uri'],
      sourceFile: report['source-file'],
      lineNumber: report['line-number']
    }
  }
}

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityHeadersConfig = {
  environment: process.env.NODE_ENV as 'development' | 'staging' | 'production' || 'development',
  hstsMaxAge: 31536000, // 1 year
  enableCspReporting: process.env.NODE_ENV === 'production',
  cspReportUri: '/api/security/csp-report',
  allowedDomains: [
    // Add any additional allowed domains here
  ]
}

/**
 * Get security headers for environment
 */
export function getSecurityHeaders(environment?: 'development' | 'staging' | 'production'): Record<string, string> {
  const config: SecurityHeadersConfig = {
    ...DEFAULT_SECURITY_CONFIG,
    environment: environment || DEFAULT_SECURITY_CONFIG.environment
  }
  
  return generateSecurityHeaders(config)
}