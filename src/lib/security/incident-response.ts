/**
 * Security Incident Response System
 * Automated threat detection and response capabilities
 */

import { NextRequest } from 'next/server'
import { redis } from '@/lib/redis/client'
import { prisma } from '@/lib/db/client'

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IncidentType = 
  | 'brute_force_attack'
  | 'sql_injection_attempt'
  | 'xss_attempt'
  | 'session_hijacking'
  | 'account_takeover'
  | 'suspicious_login'
  | 'data_breach_attempt'
  | 'rate_limit_exceeded'
  | 'unauthorized_access'
  | 'malicious_request'

export interface SecurityIncident {
  id: string
  type: IncidentType
  severity: IncidentSeverity
  timestamp: Date
  source: {
    ipAddress: string
    userAgent: string
    userId?: string
    sessionId?: string
    location?: string
  }
  details: Record<string, any>
  status: 'open' | 'investigating' | 'contained' | 'resolved'
  actions: IncidentAction[]
  riskScore: number
}

export interface IncidentAction {
  type: 'block_ip' | 'invalidate_session' | 'notify_admin' | 'rate_limit' | 'quarantine_user'
  timestamp: Date
  details: Record<string, any>
  success: boolean
}

export interface ThreatPattern {
  name: string
  pattern: RegExp | ((request: NextRequest) => boolean)
  severity: IncidentSeverity
  type: IncidentType
  autoResponse: boolean
}

export class SecurityIncidentManager {
  private static readonly INCIDENT_RETENTION = 90 * 24 * 60 * 60 // 90 days
  private static readonly THREAT_PATTERNS: ThreatPattern[] = [
    {
      name: 'SQL Injection Attempt',
      pattern: /(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b|\bexec\b).*(\bfrom\b|\binto\b|\bwhere\b)/i,
      severity: 'high',
      type: 'sql_injection_attempt',
      autoResponse: true
    },
    {
      name: 'XSS Script Injection',
      pattern: /<script[^>]*>[\s\S]*?<\/script>/i,
      severity: 'high',
      type: 'xss_attempt',
      autoResponse: true
    },
    {
      name: 'Path Traversal',
      pattern: /(\.\.[\/\\]){2,}/,
      severity: 'high',
      type: 'malicious_request',
      autoResponse: true
    },
    {
      name: 'Brute Force Login',
      pattern: (request) => {
        return request.nextUrl.pathname.includes('/auth/signin') &&
               request.method === 'POST'
      },
      severity: 'medium',
      type: 'brute_force_attack',
      autoResponse: false
    },
    {
      name: 'Admin Panel Probe',
      pattern: /\/(admin|wp-admin|administrator|panel|dashboard|control)/i,
      severity: 'medium',
      type: 'unauthorized_access',
      autoResponse: false
    }
  ]
  
  /**
   * Analyze request for security threats
   */
  static async analyzeRequest(request: NextRequest): Promise<SecurityIncident[]> {
    const incidents: SecurityIncident[] = []
    const requestUrl = request.nextUrl.toString()
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ipAddress = this.getClientIP(request)
    
    // Check against threat patterns
    for (const pattern of this.THREAT_PATTERNS) {
      let isMatch = false
      
      if (pattern.pattern instanceof RegExp) {
        isMatch = pattern.pattern.test(requestUrl) || 
                 pattern.pattern.test(userAgent) ||
                 this.checkRequestBody(request, pattern.pattern)
      } else if (typeof pattern.pattern === 'function') {
        isMatch = pattern.pattern(request)
      }
      
      if (isMatch) {
        const incident = await this.createIncident({
          type: pattern.type,
          severity: pattern.severity,
          source: { ipAddress, userAgent },
          details: {
            pattern: pattern.name,
            url: requestUrl,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries())
          },
          autoResponse: pattern.autoResponse
        })
        
        incidents.push(incident)
      }
    }
    
    // Check for anomalous behavior
    const behaviorIncidents = await this.detectAnomalousBehavior(request)
    incidents.push(...behaviorIncidents)
    
    return incidents
  }
  
  /**
   * Create security incident
   */
  static async createIncident(params: {
    type: IncidentType
    severity: IncidentSeverity
    source: SecurityIncident['source']
    details: Record<string, any>
    autoResponse?: boolean
  }): Promise<SecurityIncident> {
    const incident: SecurityIncident = {
      id: crypto.randomUUID(),
      type: params.type,
      severity: params.severity,
      timestamp: new Date(),
      source: params.source,
      details: params.details,
      status: 'open',
      actions: [],
      riskScore: this.calculateRiskScore(params)
    }
    
    // Store incident
    await this.storeIncident(incident)
    
    // Trigger automated response if configured
    if (params.autoResponse) {
      await this.triggerAutomatedResponse(incident)
    }
    
    // Notify security team for high/critical incidents
    if (['high', 'critical'].includes(params.severity)) {
      await this.notifySecurityTeam(incident)
    }
    
    return incident
  }
  
  /**
   * Detect anomalous user behavior
   */
  private static async detectAnomalousBehavior(request: NextRequest): Promise<SecurityIncident[]> {
    const incidents: SecurityIncident[] = []
    const ipAddress = this.getClientIP(request)
    
    // Check request frequency
    const requestCount = await this.getRequestCount(ipAddress, 60) // Last minute
    if (requestCount > 120) { // More than 2 requests per second
      incidents.push(await this.createIncident({
        type: 'rate_limit_exceeded',
        severity: 'medium',
        source: { 
          ipAddress, 
          userAgent: request.headers.get('user-agent') || 'unknown' 
        },
        details: {
          requestCount,
          timeWindow: '60 seconds',
          threshold: 120
        },
        autoResponse: true
      }))
    }
    
    // Check for rapid authentication attempts
    if (request.nextUrl.pathname.includes('/auth/')) {
      const authAttempts = await this.getAuthAttempts(ipAddress, 300) // Last 5 minutes
      if (authAttempts > 10) {
        incidents.push(await this.createIncident({
          type: 'brute_force_attack',
          severity: 'high',
          source: { 
            ipAddress, 
            userAgent: request.headers.get('user-agent') || 'unknown' 
          },
          details: {
            authAttempts,
            timeWindow: '5 minutes',
            threshold: 10
          },
          autoResponse: true
        }))
      }
    }
    
    return incidents
  }
  
  /**
   * Trigger automated incident response
   */
  private static async triggerAutomatedResponse(incident: SecurityIncident): Promise<void> {
    const actions: IncidentAction[] = []
    
    switch (incident.type) {
      case 'sql_injection_attempt':
      case 'xss_attempt':
      case 'malicious_request':
        // Block IP immediately for obvious attacks
        actions.push(await this.blockIP(incident.source.ipAddress, 3600)) // 1 hour
        break
        
      case 'brute_force_attack':
        // Progressive rate limiting
        actions.push(await this.applyRateLimit(incident.source.ipAddress, 'aggressive'))
        break
        
      case 'rate_limit_exceeded':
        // Temporary IP block
        actions.push(await this.blockIP(incident.source.ipAddress, 300)) // 5 minutes
        break
        
      case 'session_hijacking':
        // Invalidate all sessions for the user
        if (incident.source.userId) {
          actions.push(await this.invalidateUserSessions(incident.source.userId))
        }
        break
        
      case 'account_takeover':
        // Quarantine user account
        if (incident.source.userId) {
          actions.push(await this.quarantineUser(incident.source.userId))
        }
        break
    }
    
    // Update incident with actions taken
    incident.actions.push(...actions)
    incident.status = actions.some(a => a.success) ? 'contained' : 'investigating'
    
    await this.updateIncident(incident)
  }
  
  /**
   * Block IP address
   */
  private static async blockIP(ipAddress: string, duration: number): Promise<IncidentAction> {
    const action: IncidentAction = {
      type: 'block_ip',
      timestamp: new Date(),
      details: { ipAddress, duration },
      success: false
    }
    
    try {
      await redis.setex(`blocked_ip:${ipAddress}`, duration, JSON.stringify({
        blockedAt: new Date().toISOString(),
        duration,
        reason: 'security_incident'
      }))
      
      action.success = true
    } catch (error) {
      action.details.error = error instanceof Error ? error.message : 'Unknown error'
    }
    
    return action
  }
  
  /**
   * Apply rate limiting
   */
  private static async applyRateLimit(ipAddress: string, level: 'normal' | 'aggressive'): Promise<IncidentAction> {
    const action: IncidentAction = {
      type: 'rate_limit',
      timestamp: new Date(),
      details: { ipAddress, level },
      success: false
    }
    
    try {
      const limits = level === 'aggressive' ? 
        { requests: 10, window: 60 } : 
        { requests: 100, window: 60 }
      
      await redis.setex(`rate_limit:${ipAddress}`, 3600, JSON.stringify(limits))
      action.success = true
    } catch (error) {
      action.details.error = error instanceof Error ? error.message : 'Unknown error'
    }
    
    return action
  }
  
  /**
   * Invalidate all user sessions
   */
  private static async invalidateUserSessions(userId: string): Promise<IncidentAction> {
    const action: IncidentAction = {
      type: 'invalidate_session',
      timestamp: new Date(),
      details: { userId },
      success: false
    }
    
    try {
      // This would integrate with your session management
      // For now, we'll simulate the action
      console.log(`Invalidating all sessions for user: ${userId}`)
      action.success = true
    } catch (error) {
      action.details.error = error instanceof Error ? error.message : 'Unknown error'
    }
    
    return action
  }
  
  /**
   * Quarantine user account
   */
  private static async quarantineUser(userId: string): Promise<IncidentAction> {
    const action: IncidentAction = {
      type: 'quarantine_user',
      timestamp: new Date(),
      details: { userId },
      success: false
    }
    
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          // This assumes you have a quarantined field
          // quarantined: true,
          // quarantinedAt: new Date(),
          // quarantineReason: 'security_incident'
        }
      })
      
      action.success = true
    } catch (error) {
      action.details.error = error instanceof Error ? error.message : 'Unknown error'
    }
    
    return action
  }
  
  /**
   * Notify security team
   */
  private static async notifySecurityTeam(incident: SecurityIncident): Promise<void> {
    const notification = {
      severity: incident.severity,
      type: incident.type,
      source: incident.source.ipAddress,
      timestamp: incident.timestamp,
      details: incident.details
    }
    
    // In production, this would integrate with your notification system
    console.log('🚨 SECURITY ALERT:', notification)
    
    // Could integrate with:
    // - Slack/Discord webhooks
    // - Email alerts
    // - PagerDuty
    // - SMS notifications
  }
  
  /**
   * Calculate risk score for incident
   */
  private static calculateRiskScore(params: {
    type: IncidentType
    severity: IncidentSeverity
    details: Record<string, any>
  }): number {
    let score = 0
    
    // Base score by severity
    switch (params.severity) {
      case 'low': score += 20; break
      case 'medium': score += 40; break
      case 'high': score += 70; break
      case 'critical': score += 90; break
    }
    
    // Type-specific scoring
    switch (params.type) {
      case 'sql_injection_attempt':
      case 'account_takeover':
        score += 30
        break
      case 'brute_force_attack':
      case 'session_hijacking':
        score += 20
        break
      case 'xss_attempt':
      case 'data_breach_attempt':
        score += 25
        break
    }
    
    return Math.min(100, score)
  }
  
  /**
   * Helper methods
   */
  private static getClientIP(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    return forwardedFor?.split(',')[0].trim() || realIP || request.ip || 'unknown'
  }
  
  private static checkRequestBody(request: NextRequest, pattern: RegExp): boolean {
    // In a real implementation, you'd parse the request body safely
    // This is a simplified example
    return false
  }
  
  private static async getRequestCount(ipAddress: string, seconds: number): Promise<number> {
    const key = `requests:${ipAddress}:${Math.floor(Date.now() / 1000 / seconds)}`
    const count = await redis.get(key)
    return count ? parseInt(count, 10) : 0
  }
  
  private static async getAuthAttempts(ipAddress: string, seconds: number): Promise<number> {
    const key = `auth_attempts:${ipAddress}:${Math.floor(Date.now() / 1000 / seconds)}`
    const count = await redis.get(key)
    return count ? parseInt(count, 10) : 0
  }
  
  private static async storeIncident(incident: SecurityIncident): Promise<void> {
    await redis.setex(
      `incident:${incident.id}`,
      this.INCIDENT_RETENTION,
      JSON.stringify(incident)
    )
  }
  
  private static async updateIncident(incident: SecurityIncident): Promise<void> {
    await redis.setex(
      `incident:${incident.id}`,
      this.INCIDENT_RETENTION,
      JSON.stringify(incident)
    )
  }
  
  /**
   * Get incident by ID
   */
  static async getIncident(id: string): Promise<SecurityIncident | null> {
    const data = await redis.get(`incident:${id}`)
    return data ? JSON.parse(data) : null
  }
  
  /**
   * List recent incidents
   */
  static async getRecentIncidents(limit: number = 50): Promise<SecurityIncident[]> {
    const keys = await redis.keys('incident:*')
    const incidents: SecurityIncident[] = []
    
    for (const key of keys.slice(0, limit)) {
      const data = await redis.get(key)
      if (data) {
        incidents.push(JSON.parse(data))
      }
    }
    
    return incidents.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }
  
  /**
   * Check if IP is blocked
   */
  static async isIPBlocked(ipAddress: string): Promise<boolean> {
    const blockData = await redis.get(`blocked_ip:${ipAddress}`)
    return blockData !== null
  }
}