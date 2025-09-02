/**
 * API Route: CSP Violation Reporting
 * 
 * Handles Content Security Policy violation reports
 * Provides security monitoring and alerting for CSP issues
 */

import { NextRequest, NextResponse } from 'next/server'
import { processCSPViolation, type CSPViolation } from '@/lib/security/headers'
import { logSecurityEvent } from '@/lib/middleware/security-middleware'

// Store violations for analysis (replace with database in production)
const cspViolations: Array<CSPViolation & { timestamp: string; userAgent: string; ip: string }> = []

/**
 * POST /api/security/csp-report
 * Handle CSP violation reports
 */
export async function POST(request: NextRequest) {
  try {
    // Parse CSP violation report
    const body = await request.json() as CSPViolation
    
    if (!body['csp-report']) {
      return NextResponse.json(
        { error: 'Invalid CSP report format' },
        { status: 400 }
      )
    }

    // Process violation
    const analysis = processCSPViolation(body)
    
    // Store violation with metadata
    const violationRecord = {
      ...body,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || 'unknown',
      ip: getClientIP(request),
      analysis
    }
    
    cspViolations.push(violationRecord)
    
    // Log security event
    await logSecurityEvent('csp_violation', {
      violatedDirective: body['csp-report']['violated-directive'],
      blockedUri: body['csp-report']['blocked-uri'],
      documentUri: body['csp-report']['document-uri'],
      severity: analysis.severity,
      action: analysis.action
    })
    
    // Take action based on severity
    if (analysis.severity === 'critical') {
      console.error('CRITICAL CSP VIOLATION:', {
        directive: body['csp-report']['violated-directive'],
        blockedUri: body['csp-report']['blocked-uri'],
        documentUri: body['csp-report']['document-uri']
      })
      
      // In production: trigger immediate alerts
      // await triggerSecurityAlert(violationRecord)
    }
    
    // Return 204 No Content (standard for CSP reporting)
    return new NextResponse(null, { status: 204 })

  } catch (error) {
    console.error('CSP violation processing error:', error)
    
    // Still return 204 to not break the browser's reporting
    return new NextResponse(null, { status: 204 })
  }
}

/**
 * GET /api/security/csp-report
 * Retrieve CSP violation reports (for security analysis)
 */
export async function GET(request: NextRequest) {
  try {
    // Only allow in development or with proper authentication
    if (process.env.NODE_ENV === 'production') {
      // In production, this would require admin authentication
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const severity = searchParams.get('severity')
    const directive = searchParams.get('directive')
    
    // Filter violations
    let filteredViolations = [...cspViolations]
    
    if (severity) {
      filteredViolations = filteredViolations.filter(v => 
        v.analysis?.severity === severity
      )
    }
    
    if (directive) {
      filteredViolations = filteredViolations.filter(v =>
        v['csp-report']['violated-directive'].includes(directive)
      )
    }
    
    // Sort by timestamp (newest first) and limit
    const sortedViolations = filteredViolations
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
    
    // Generate analysis summary
    const summary = generateViolationSummary(filteredViolations)
    
    return NextResponse.json({
      violations: sortedViolations,
      summary,
      total: filteredViolations.length,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error retrieving CSP violations:', error)
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve CSP violations'
      },
      { status: 500 }
    )
  }
}

/**
 * Generate violation summary for analysis
 */
function generateViolationSummary(violations: any[]) {
  const now = new Date()
  const oneHour = 60 * 60 * 1000
  const oneDay = 24 * 60 * 60 * 1000
  
  const recentViolations = violations.filter(v => 
    new Date(v.timestamp).getTime() > now.getTime() - oneHour
  )
  
  const dailyViolations = violations.filter(v =>
    new Date(v.timestamp).getTime() > now.getTime() - oneDay
  )
  
  // Group by violated directive
  const directiveBreakdown = violations.reduce((acc, v) => {
    const directive = v['csp-report']['violated-directive']
    acc[directive] = (acc[directive] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Group by blocked URI
  const blockedUriBreakdown = violations.reduce((acc, v) => {
    const uri = v['csp-report']['blocked-uri']
    acc[uri] = (acc[uri] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Group by severity
  const severityBreakdown = violations.reduce((acc, v) => {
    const severity = v.analysis?.severity || 'unknown'
    acc[severity] = (acc[severity] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Group by document URI (pages with violations)
  const pageBreakdown = violations.reduce((acc, v) => {
    const uri = v['csp-report']['document-uri']
    const path = new URL(uri).pathname
    acc[path] = (acc[path] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return {
    totalViolations: violations.length,
    recentViolations: recentViolations.length,
    dailyViolations: dailyViolations.length,
    
    topViolatedDirectives: Object.entries(directiveBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([directive, count]) => ({ directive, count })),
      
    topBlockedUris: Object.entries(blockedUriBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([uri, count]) => ({ uri, count })),
      
    severityDistribution: severityBreakdown,
    
    topProblematicPages: Object.entries(pageBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([page, count]) => ({ page, count })),
      
    violationRate: {
      perHour: recentViolations.length,
      perDay: dailyViolations.length
    },
    
    recommendations: generateCSPRecommendations(violations)
  }
}

/**
 * Generate CSP recommendations based on violations
 */
function generateCSPRecommendations(violations: any[]): string[] {
  const recommendations: string[] = []
  
  // Check for common patterns
  const scriptViolations = violations.filter(v => 
    v['csp-report']['violated-directive'].includes('script-src')
  ).length
  
  const styleViolations = violations.filter(v =>
    v['csp-report']['violated-directive'].includes('style-src')
  ).length
  
  const connectViolations = violations.filter(v =>
    v['csp-report']['violated-directive'].includes('connect-src')
  ).length
  
  if (scriptViolations > violations.length * 0.3) {
    recommendations.push('High number of script-src violations detected. Consider reviewing inline scripts and third-party scripts.')
  }
  
  if (styleViolations > violations.length * 0.3) {
    recommendations.push('High number of style-src violations detected. Consider using CSS-in-JS libraries or adding style nonces.')
  }
  
  if (connectViolations > violations.length * 0.2) {
    recommendations.push('Multiple connect-src violations detected. Review API endpoints and external connections.')
  }
  
  // Check for eval usage
  const evalViolations = violations.filter(v =>
    v['csp-report']['blocked-uri'].includes('eval')
  )
  
  if (evalViolations.length > 0) {
    recommendations.push('eval() usage detected in violations. Consider removing eval() or using unsafe-eval directive temporarily.')
  }
  
  // Check for inline violations
  const inlineViolations = violations.filter(v =>
    v['csp-report']['blocked-uri'] === 'inline'
  )
  
  if (inlineViolations.length > violations.length * 0.4) {
    recommendations.push('High number of inline violations. Consider using nonces or hashes for inline content.')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('CSP violations appear to be minor. Monitor trends and investigate any recurring patterns.')
  }
  
  return recommendations
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  // Try various headers for real IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-cluster-client-ip'
  ]
  
  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      // Handle comma-separated IPs (take first one)
      return value.split(',')[0].trim()
    }
  }
  
  return 'unknown'
}