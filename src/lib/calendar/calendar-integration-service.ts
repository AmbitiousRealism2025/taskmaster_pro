// Calendar Integration Service Orchestrator
// Part of Phase 3.2 - External Integration Layer

import { GoogleCalendarService } from './google-calendar-service'
import { CalendarSyncManager } from './calendar-sync-manager'
import { FocusTimeOptimizer } from './focus-time-optimizer'
import { prisma } from '@/lib/prisma'
import { 
  CalendarIntegrationHealth,
  CalendarSyncResult,
  FocusTimeBlock 
} from '../../types/calendar-integration'

export class CalendarIntegrationService {
  private googleCalendar: GoogleCalendarService
  private syncManager: CalendarSyncManager
  private focusOptimizer: FocusTimeOptimizer

  constructor() {
    this.googleCalendar = new GoogleCalendarService()
    this.syncManager = new CalendarSyncManager()
    this.focusOptimizer = new FocusTimeOptimizer()
  }

  // Initialize calendar integration for a user
  async initializeIntegration(userId: string, authCode: string): Promise<{
    success: boolean
    message: string
    authUrl?: string
  }> {
    try {
      // Handle OAuth callback
      await this.googleCalendar.handleAuthCallback(authCode, userId)

      // Create default sync configuration
      await this.syncManager.updateSyncConfig(userId, {
        syncDirection: 'bidirectional',
        autoSync: true,
        syncInterval: 15,
        conflictResolution: 'manual',
        includeTaskTypes: ['task', 'deadline', 'meeting', 'focus-time'],
        workingHours: {
          enabled: true,
          timezone: 'UTC',
          schedule: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Monday
            { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }, // Tuesday
            { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' }, // Wednesday
            { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' }, // Thursday
            { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' }  // Friday
          ]
        },
        focusTimePreferences: {
          minimumDuration: 30,
          bufferTime: 15,
          preferredTimeSlots: [
            { startTime: '09:00', endTime: '11:00' },
            { startTime: '14:00', endTime: '16:00' }
          ]
        }
      })

      // Perform initial sync
      const syncResult = await this.syncManager.syncUserCalendar(userId)

      return {
        success: true,
        message: `Calendar integration initialized. Synced ${syncResult.eventsImported} events from calendar and ${syncResult.eventsExported} tasks to calendar.`
      }

    } catch (error) {
      console.error('Calendar integration initialization failed:', error)
      return {
        success: false,
        message: 'Failed to initialize calendar integration',
        authUrl: await this.googleCalendar.getAuthUrl(userId)
      }
    }
  }

  // Get integration health status
  async getIntegrationHealth(userId: string): Promise<CalendarIntegrationHealth> {
    try {
      const config = await this.syncManager.getSyncConfig(userId)
      
      if (!config) {
        return {
          status: 'unhealthy',
          lastSyncAt: new Date(0),
          nextSyncAt: new Date(0),
          syncSuccess: false,
          apiQuotaUsage: {
            current: 0,
            limit: 1000,
            resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          },
          errors: [{
            timestamp: new Date(),
            type: 'configuration',
            message: 'Calendar sync not configured',
            resolved: false
          }],
          metrics: {
            avgSyncDuration: 0,
            conflictRate: 0,
            userSatisfactionScore: 0
          }
        }
      }

      // Check recent sync results
      const lastSyncResult = await this.getLastSyncResult(userId)
      const recentConflicts = await this.getRecentConflicts(userId)
      const recentErrors = await this.getRecentErrors(userId)

      const status = this.determineHealthStatus(
        lastSyncResult,
        recentConflicts,
        recentErrors
      )

      return {
        status,
        lastSyncAt: config.lastSyncAt || new Date(0),
        nextSyncAt: new Date(
          (config.lastSyncAt?.getTime() || Date.now()) + 
          config.syncInterval * 60000
        ),
        syncSuccess: lastSyncResult?.success || false,
        apiQuotaUsage: {
          current: 42, // Would track actual API usage
          limit: 1000,
          resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        },
        errors: recentErrors,
        metrics: {
          avgSyncDuration: 2500, // milliseconds - would track actual
          conflictRate: (recentConflicts.length / Math.max(1, lastSyncResult?.eventsImported + lastSyncResult?.eventsExported || 1)) * 100,
          userSatisfactionScore: 8.5 // Would calculate from user feedback
        }
      }

    } catch (error) {
      console.error('Health check failed:', error)
      return {
        status: 'unhealthy',
        lastSyncAt: new Date(0),
        nextSyncAt: new Date(0),
        syncSuccess: false,
        apiQuotaUsage: {
          current: 0,
          limit: 1000,
          resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        },
        errors: [{
          timestamp: new Date(),
          type: 'system',
          message: error.message,
          resolved: false
        }],
        metrics: {
          avgSyncDuration: 0,
          conflictRate: 100,
          userSatisfactionScore: 0
        }
      }
    }
  }

  // Create smart focus time suggestions
  async createSmartFocusTime(
    userId: string,
    taskIds?: string[],
    preferences?: {
      duration?: number
      preferredDay?: string // 'today', 'tomorrow', 'this-week'
      urgencyLevel?: 'low' | 'medium' | 'high'
    }
  ): Promise<{
    suggestions: Array<{
      timeSlot: any
      tasks: any[]
      estimatedProductivity: number
      reasoning: string[]
    }>
    focusBlock?: FocusTimeBlock
  }> {
    try {
      // Get user's tasks if not specified
      let tasks = []
      if (taskIds?.length) {
        tasks = await prisma.task.findMany({
          where: { 
            id: { in: taskIds },
            userId,
            status: { not: 'COMPLETED' }
          }
        })
      } else {
        // Smart task selection based on urgency and user preferences
        const whereClause: any = {
          userId,
          status: { not: 'COMPLETED' }
        }

        if (preferences?.urgencyLevel === 'high') {
          whereClause.OR = [
            { priority: 'URGENT' },
            { dueDate: { lte: new Date(Date.now() + 24 * 60 * 60 * 1000) } } // Due within 24 hours
          ]
        } else if (preferences?.urgencyLevel === 'medium') {
          whereClause.priority = { in: ['HIGH', 'URGENT'] }
        } else {
          whereClause.estimatedTime = { lte: preferences?.duration || 60 }
        }

        tasks = await prisma.task.findMany({
          where: whereClause,
          orderBy: [
            { priority: 'desc' },
            { dueDate: 'asc' }
          ],
          take: 5
        })
      }

      if (tasks.length === 0) {
        return {
          suggestions: [],
          focusBlock: undefined
        }
      }

      // Calculate optimal duration
      const totalEstimatedTime = tasks.reduce((sum, task) => 
        sum + (task.estimatedTime || task.estimatedMinutes || 30), 0)
      const optimalDuration = Math.min(
        Math.max(totalEstimatedTime, 30), // At least 30 minutes
        preferences?.duration || 90 // Max 90 minutes or user preference
      )

      // Find optimal time slots
      const timeSlots = await this.focusOptimizer.findOptimalFocusTime(
        userId,
        optimalDuration,
        {
          earliestStart: preferences?.preferredDay === 'today' ? new Date() : 
            preferences?.preferredDay === 'tomorrow' ? 
              new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined
        }
      )

      // Create suggestions with reasoning
      const suggestions = timeSlots.slice(0, 3).map(slot => ({
        timeSlot: slot,
        tasks: tasks,
        estimatedProductivity: slot.score,
        reasoning: [
          ...slot.reasoning,
          `${tasks.length} task(s) selected for ${optimalDuration} minutes`,
          `Estimated completion: ${Math.round(slot.score * tasks.length)} out of ${tasks.length} tasks`
        ]
      }))

      return {
        suggestions,
        focusBlock: undefined
      }

    } catch (error) {
      console.error('Smart focus time creation failed:', error)
      return {
        suggestions: [],
        focusBlock: undefined
      }
    }
  }

  // Get productivity recommendations based on calendar data
  async getProductivityRecommendations(userId: string): Promise<Array<{
    type: 'schedule' | 'habits' | 'optimization' | 'warning'
    title: string
    description: string
    priority: 'low' | 'medium' | 'high'
    actionable: boolean
    action?: string
  }>> {
    try {
      const recommendations = []

      // Get recent productivity patterns
      const patterns = await prisma.productivityPattern.findMany({
        where: {
          userId,
          confidence: { gt: 0.5 }
        },
        orderBy: { productivityScore: 'desc' },
        take: 5
      })

      if (patterns.length > 0) {
        const bestPattern = patterns[0]
        recommendations.push({
          type: 'schedule',
          title: 'Optimize Your Peak Hours',
          description: `Your most productive time is ${bestPattern.timeOfDay} on ${this.getDayName(bestPattern.dayOfWeek)}s. Consider blocking this time for your most important work.`,
          priority: 'high' as const,
          actionable: true,
          action: `Block ${bestPattern.timeOfDay} on ${this.getDayName(bestPattern.dayOfWeek)}s for focus work`
        })
      }

      // Get recent focus blocks performance
      const recentBlocks = await prisma.focusTimeBlock.findMany({
        where: {
          userId,
          completedAt: { not: null },
          startTime: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        orderBy: { startTime: 'desc' },
        take: 10
      })

      if (recentBlocks.length > 0) {
        const avgProductivity = recentBlocks.reduce((sum, block) => 
          sum + (block.actualProductivity || 5), 0) / recentBlocks.length

        if (avgProductivity < 6) {
          recommendations.push({
            type: 'optimization',
            title: 'Focus Time Needs Improvement',
            description: `Your recent focus sessions averaged ${avgProductivity.toFixed(1)}/10. Consider reducing session length, minimizing distractions, or adjusting your environment.`,
            priority: 'medium' as const,
            actionable: true,
            action: 'Review and adjust focus time settings'
          })
        }

        const avgInterruptions = recentBlocks.reduce((sum, block) => 
          sum + (block.interruptions || 0), 0) / recentBlocks.length

        if (avgInterruptions > 2) {
          recommendations.push({
            type: 'warning',
            title: 'High Interruption Rate',
            description: `You're averaging ${avgInterruptions.toFixed(1)} interruptions per focus session. Consider setting boundaries or finding a quieter workspace.`,
            priority: 'high' as const,
            actionable: true,
            action: 'Set up interruption-free focus environment'
          })
        }
      }

      // Get calendar conflicts
      const activeConflicts = await prisma.calendarConflict.findMany({
        where: {
          userId,
          status: 'pending',
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        take: 5
      })

      if (activeConflicts.length > 0) {
        recommendations.push({
          type: 'warning',
          title: 'Scheduling Conflicts Detected',
          description: `You have ${activeConflicts.length} unresolved scheduling conflicts that may impact your productivity.`,
          priority: 'high' as const,
          actionable: true,
          action: 'Review and resolve calendar conflicts'
        })
      }

      // Check for lack of focus time
      const upcomingFocusBlocks = await prisma.focusTimeBlock.findMany({
        where: {
          userId,
          startTime: { 
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      })

      if (upcomingFocusBlocks.length === 0) {
        recommendations.push({
          type: 'habits',
          title: 'Schedule Focus Time',
          description: 'You have no scheduled focus time for the upcoming week. Regular focus blocks can significantly improve your productivity.',
          priority: 'medium' as const,
          actionable: true,
          action: 'Schedule 2-3 focus time blocks for this week'
        })
      }

      return recommendations

    } catch (error) {
      console.error('Failed to get productivity recommendations:', error)
      return []
    }
  }

  // Helper methods
  private async getLastSyncResult(userId: string): Promise<CalendarSyncResult | null> {
    // This would typically be stored in a separate sync history table
    // For now, return a mock result
    return {
      success: true,
      eventsImported: 5,
      eventsExported: 3,
      conflictsDetected: 1,
      errors: [],
      nextSyncAt: new Date(Date.now() + 15 * 60000)
    }
  }

  private async getRecentConflicts(userId: string) {
    const conflicts = await prisma.calendarConflict.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    return conflicts.map(conflict => ({
      id: conflict.id,
      type: conflict.type,
      severity: conflict.severity,
      description: conflict.description
    }))
  }

  private async getRecentErrors(userId: string) {
    // This would typically come from error logging
    return []
  }

  private determineHealthStatus(
    syncResult: CalendarSyncResult | null,
    conflicts: any[],
    errors: any[]
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (!syncResult || !syncResult.success) return 'unhealthy'
    if (conflicts.filter(c => c.severity === 'critical').length > 0) return 'unhealthy'
    if (errors.length > 0 || conflicts.length > 3) return 'degraded'
    return 'healthy'
  }

  private getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayOfWeek] || 'Unknown'
  }
}