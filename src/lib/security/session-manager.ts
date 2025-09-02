/**
 * Advanced Session Security Manager
 * Handles secure session management with threat detection
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/config'
import { prisma } from '@/lib/db/client'
import { redis } from '@/lib/redis/client'

export interface SessionSecurity {
  sessionId: string
  userId: string
  ipAddress: string
  userAgent: string
  location?: string
  createdAt: Date
  lastActivity: Date
  isActive: boolean
  riskScore: number
  deviceFingerprint: string
}

export interface SecurityThreat {
  type: 'suspicious_login' | 'session_hijacking' | 'concurrent_sessions' | 'location_anomaly'
  severity: 'low' | 'medium' | 'high' | 'critical'
  details: Record<string, any>
  timestamp: Date
}

export class SessionSecurityManager {
  private static readonly SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000 // 7 days
  private static readonly ACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes
  private static readonly MAX_CONCURRENT_SESSIONS = 5
  
  /**
   * Create secure session with device fingerprinting
   */
  static async createSecureSession(
    userId: string,
    request: NextRequest
  ): Promise<SessionSecurity> {
    const sessionId = this.generateSecureSessionId()
    const ipAddress = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const deviceFingerprint = this.generateDeviceFingerprint(request)
    
    // Check for suspicious patterns
    const riskScore = await this.calculateRiskScore(userId, ipAddress, userAgent)
    
    const sessionData: SessionSecurity = {
      sessionId,
      userId,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      riskScore,
      deviceFingerprint
    }
    
    // Store session in Redis for fast access
    await redis.setex(
      `session:${sessionId}`,
      this.SESSION_TIMEOUT / 1000,
      JSON.stringify(sessionData)
    )
    
    // Store in database for audit trail
    await this.storeSessionAudit(sessionData)
    
    // Check concurrent session limits
    await this.enforceConcurrentSessionLimits(userId, sessionId)
    
    return sessionData
  }
  
  /**
   * Validate session security
   */
  static async validateSession(
    sessionId: string,
    request: NextRequest
  ): Promise<{ isValid: boolean; threats: SecurityThreat[] }> {
    const threats: SecurityThreat[] = []
    
    // Get session data
    const sessionData = await this.getSessionData(sessionId)
    if (!sessionData) {
      return { isValid: false, threats: [] }
    }
    
    // Check session timeout
    const now = new Date()
    const lastActivity = new Date(sessionData.lastActivity)
    if (now.getTime() - lastActivity.getTime() > this.ACTIVITY_TIMEOUT) {
      threats.push({
        type: 'session_hijacking',
        severity: 'medium',
        details: { reason: 'session_timeout' },
        timestamp: now
      })
      
      await this.invalidateSession(sessionId)
      return { isValid: false, threats }
    }
    
    // Check IP address consistency
    const currentIP = this.getClientIP(request)
    if (sessionData.ipAddress !== currentIP) {
      threats.push({
        type: 'session_hijacking',
        severity: 'high',
        details: { 
          originalIP: sessionData.ipAddress,
          currentIP,
          reason: 'ip_mismatch'
        },
        timestamp: now
      })
    }
    
    // Check User-Agent consistency
    const currentUserAgent = request.headers.get('user-agent') || 'unknown'
    if (sessionData.userAgent !== currentUserAgent) {
      threats.push({
        type: 'session_hijacking',
        severity: 'medium',
        details: {
          originalUserAgent: sessionData.userAgent,
          currentUserAgent,
          reason: 'user_agent_mismatch'
        },
        timestamp: now
      })
    }
    
    // Update last activity
    await this.updateSessionActivity(sessionId)
    
    // High-risk sessions require additional validation
    const isValid = threats.filter(t => t.severity === 'high' || t.severity === 'critical').length === 0
    
    return { isValid, threats }
  }
  
  /**
   * Invalidate all user sessions (for password change, etc.)
   */
  static async invalidateAllUserSessions(userId: string): Promise<void> {
    // Get all active sessions for user
    const sessions = await this.getUserSessions(userId)
    
    // Invalidate each session
    await Promise.all(
      sessions.map(session => this.invalidateSession(session.sessionId))
    )
    
    // Log security event
    await this.logSecurityEvent(userId, {
      type: 'all_sessions_invalidated',
      reason: 'password_change',
      sessionCount: sessions.length
    })
  }
  
  /**
   * Generate secure session ID
   */
  private static generateSecureSessionId(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
  
  /**
   * Generate device fingerprint
   */
  private static generateDeviceFingerprint(request: NextRequest): string {
    const components = [
      request.headers.get('user-agent'),
      request.headers.get('accept-language'),
      request.headers.get('accept-encoding'),
      request.headers.get('sec-ch-ua'),
      request.headers.get('sec-ch-ua-platform')
    ].filter(Boolean)
    
    const fingerprint = components.join('|')
    return this.hashString(fingerprint)
  }
  
  /**
   * Calculate risk score based on various factors
   */
  private static async calculateRiskScore(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<number> {
    let riskScore = 0
    
    // Check for new IP address
    const recentIPs = await this.getRecentUserIPs(userId)
    if (!recentIPs.includes(ipAddress)) {
      riskScore += 30 // New IP address
    }
    
    // Check for suspicious User-Agent
    if (this.isSuspiciousUserAgent(userAgent)) {
      riskScore += 50
    }
    
    // Check login frequency
    const recentLogins = await this.getRecentLoginAttempts(userId)
    if (recentLogins > 10) {
      riskScore += 40 // High frequency logins
    }
    
    // Check for concurrent sessions
    const activeSessions = await this.getUserActiveSessions(userId)
    if (activeSessions.length > 3) {
      riskScore += 25 // Multiple active sessions
    }
    
    return Math.min(100, riskScore)
  }
  
  /**
   * Get client IP address
   */
  private static getClientIP(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const clientIP = request.ip
    
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim()
    }
    
    if (realIP) {
      return realIP
    }
    
    return clientIP || 'unknown'
  }
  
  /**
   * Check if User-Agent appears suspicious
   */
  private static isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /curl/i,
      /wget/i,
      /python/i,
      /script/i
    ]
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent))
  }
  
  /**
   * Get session data from cache
   */
  private static async getSessionData(sessionId: string): Promise<SessionSecurity | null> {
    const data = await redis.get(`session:${sessionId}`)
    return data ? JSON.parse(data) : null
  }
  
  /**
   * Update session activity timestamp
   */
  private static async updateSessionActivity(sessionId: string): Promise<void> {
    const sessionData = await this.getSessionData(sessionId)
    if (sessionData) {
      sessionData.lastActivity = new Date()
      await redis.setex(
        `session:${sessionId}`,
        this.SESSION_TIMEOUT / 1000,
        JSON.stringify(sessionData)
      )
    }
  }
  
  /**
   * Invalidate session
   */
  private static async invalidateSession(sessionId: string): Promise<void> {
    await redis.del(`session:${sessionId}`)
  }
  
  /**
   * Enforce concurrent session limits
   */
  private static async enforceConcurrentSessionLimits(
    userId: string,
    newSessionId: string
  ): Promise<void> {
    const activeSessions = await this.getUserActiveSessions(userId)
    
    if (activeSessions.length >= this.MAX_CONCURRENT_SESSIONS) {
      // Remove oldest sessions
      const sessionsToRemove = activeSessions
        .sort((a, b) => new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime())
        .slice(0, activeSessions.length - this.MAX_CONCURRENT_SESSIONS + 1)
      
      await Promise.all(
        sessionsToRemove.map(session => this.invalidateSession(session.sessionId))
      )
    }
  }
  
  /**
   * Get all active sessions for user
   */
  private static async getUserActiveSessions(userId: string): Promise<SessionSecurity[]> {
    const sessions = await this.getUserSessions(userId)
    return sessions.filter(s => s.isActive)
  }
  
  /**
   * Get all sessions for user from database
   */
  private static async getUserSessions(userId: string): Promise<SessionSecurity[]> {
    // This would query your session audit table
    // For now, we'll simulate with Redis scan
    const keys = await redis.keys(`session:*`)
    const sessions: SessionSecurity[] = []
    
    for (const key of keys) {
      const data = await redis.get(key)
      if (data) {
        const session = JSON.parse(data)
        if (session.userId === userId) {
          sessions.push(session)
        }
      }
    }
    
    return sessions
  }
  
  /**
   * Get recent IP addresses for user
   */
  private static async getRecentUserIPs(userId: string): Promise<string[]> {
    // This would query your audit logs
    // Placeholder implementation
    return []
  }
  
  /**
   * Get recent login attempts
   */
  private static async getRecentLoginAttempts(userId: string): Promise<number> {
    // This would query your audit logs
    // Placeholder implementation
    return 0
  }
  
  /**
   * Store session audit record
   */
  private static async storeSessionAudit(sessionData: SessionSecurity): Promise<void> {
    // Store in your audit table
    // Implementation depends on your database schema
  }
  
  /**
   * Log security event
   */
  private static async logSecurityEvent(userId: string, event: any): Promise<void> {
    // Log to your security monitoring system
    console.log(`Security Event for User ${userId}:`, event)
  }
  
  /**
   * Hash string for fingerprinting
   */
  private static hashString(input: string): string {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(16)
  }
}