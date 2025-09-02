// Calendar Sync Manager for bidirectional synchronization
// Part of Phase 3.2 - External Integration Layer

import { prisma } from '@/lib/prisma'
import { GoogleCalendarService } from './google-calendar-service'
import { 
  CalendarSyncConfig, 
  CalendarSyncResult, 
  CalendarEvent, 
  TaskCalendarEvent,
  CalendarConflict,
  FocusTimeBlock
} from '../../types/calendar-integration'
import { getNotificationService } from '../notifications/EnhancedNotificationService'

export class CalendarSyncManager {
  private googleCalendar: GoogleCalendarService
  private syncJobsRunning = new Set<string>()

  constructor() {
    this.googleCalendar = new GoogleCalendarService()
    this.startPeriodicSync()
  }

  // Get user's sync configuration
  async getSyncConfig(userId: string): Promise<CalendarSyncConfig | null> {
    const config = await prisma.calendarSyncConfig.findUnique({
      where: { userId }
    })

    if (!config) return null

    return {
      userId: config.userId,
      calendarId: config.calendarId,
      syncDirection: config.syncDirection as 'import' | 'export' | 'bidirectional',
      autoSync: config.autoSync,
      syncInterval: config.syncInterval,
      conflictResolution: config.conflictResolution as 'manual' | 'calendar-wins' | 'task-wins' | 'latest-wins',
      includeTaskTypes: config.includeTaskTypes as Array<'task' | 'deadline' | 'meeting' | 'focus-time'>,
      workingHours: {
        enabled: config.workingHoursEnabled,
        timezone: config.timezone || 'UTC',
        schedule: JSON.parse(config.workingHoursSchedule || '[]')
      },
      focusTimePreferences: {
        minimumDuration: config.focusTimeMinDuration || 30,
        bufferTime: config.focusTimeBuffer || 15,
        preferredTimeSlots: JSON.parse(config.focusTimeSlots || '[]')
      }
    }
  }

  // Update user's sync configuration
  async updateSyncConfig(userId: string, config: Partial<CalendarSyncConfig>): Promise<CalendarSyncConfig> {
    const updatedConfig = await prisma.calendarSyncConfig.upsert({
      where: { userId },
      create: {
        userId,
        calendarId: config.calendarId || 'primary',
        syncDirection: config.syncDirection || 'bidirectional',
        autoSync: config.autoSync ?? true,
        syncInterval: config.syncInterval || 15,
        conflictResolution: config.conflictResolution || 'manual',
        includeTaskTypes: config.includeTaskTypes || ['task', 'deadline', 'meeting', 'focus-time'],
        workingHoursEnabled: config.workingHours?.enabled ?? true,
        timezone: config.workingHours?.timezone || 'UTC',
        workingHoursSchedule: JSON.stringify(config.workingHours?.schedule || []),
        focusTimeMinDuration: config.focusTimePreferences?.minimumDuration || 30,
        focusTimeBuffer: config.focusTimePreferences?.bufferTime || 15,
        focusTimeSlots: JSON.stringify(config.focusTimePreferences?.preferredTimeSlots || [])
      },
      update: {
        calendarId: config.calendarId,
        syncDirection: config.syncDirection,
        autoSync: config.autoSync,
        syncInterval: config.syncInterval,
        conflictResolution: config.conflictResolution,
        includeTaskTypes: config.includeTaskTypes,
        workingHoursEnabled: config.workingHours?.enabled,
        timezone: config.workingHours?.timezone,
        workingHoursSchedule: config.workingHours?.schedule ? JSON.stringify(config.workingHours.schedule) : undefined,
        focusTimeMinDuration: config.focusTimePreferences?.minimumDuration,
        focusTimeBuffer: config.focusTimePreferences?.bufferTime,
        focusTimeSlots: config.focusTimePreferences?.preferredTimeSlots ? JSON.stringify(config.focusTimePreferences.preferredTimeSlots) : undefined,
        updatedAt: new Date()
      }
    })

    return await this.getSyncConfig(userId) as CalendarSyncConfig
  }

  // Perform full synchronization for a user
  async syncUserCalendar(userId: string, force: boolean = false): Promise<CalendarSyncResult> {
    if (this.syncJobsRunning.has(userId) && !force) {
      throw new Error('Sync already in progress for this user')
    }

    this.syncJobsRunning.add(userId)

    try {
      const config = await this.getSyncConfig(userId)
      if (!config) {
        throw new Error('No sync configuration found for user')
      }

      const result: CalendarSyncResult = {
        success: false,
        eventsImported: 0,
        eventsExported: 0,
        conflictsDetected: 0,
        errors: [],
        nextSyncAt: new Date(Date.now() + config.syncInterval * 60000)
      }

      // Import from Google Calendar to TaskMaster
      if (config.syncDirection === 'import' || config.syncDirection === 'bidirectional') {
        try {
          const importResult = await this.importFromGoogleCalendar(userId, config)
          result.eventsImported = importResult.imported
          result.conflictsDetected += importResult.conflicts
        } catch (error) {
          result.errors.push({
            type: 'network',
            message: `Import failed: ${error.message}`
          })
        }
      }

      // Export from TaskMaster to Google Calendar
      if (config.syncDirection === 'export' || config.syncDirection === 'bidirectional') {
        try {
          const exportResult = await this.exportToGoogleCalendar(userId, config)
          result.eventsExported = exportResult.exported
          result.conflictsDetected += exportResult.conflicts
        } catch (error) {
          result.errors.push({
            type: 'network',
            message: `Export failed: ${error.message}`
          })
        }
      }

      result.success = result.errors.length === 0

      // Update last sync time
      await prisma.calendarSyncConfig.update({
        where: { userId },
        data: { lastSyncAt: new Date() }
      })

      // Send notification about sync results
      if (result.conflictsDetected > 0) {
        const notificationService = getNotificationService()
        await notificationService.sendNotification(
          userId,
          {
            title: 'Calendar Sync Issues Detected',
            body: `Found ${result.conflictsDetected} scheduling conflicts that need your attention.`,
            icon: '/icons/calendar-warning.png',
            data: {
              type: 'calendar_conflict',
              actionUrl: '/dashboard/calendar?tab=conflicts'
            }
          },
          'NORMAL'
        )
      }

      return result

    } finally {
      this.syncJobsRunning.delete(userId)
    }
  }

  // Import events from Google Calendar to TaskMaster
  private async importFromGoogleCalendar(
    userId: string, 
    config: CalendarSyncConfig
  ): Promise<{ imported: number; conflicts: number }> {
    const now = new Date()
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days ahead

    const googleEvents = await this.googleCalendar.getEvents(
      userId,
      config.calendarId,
      now,
      futureDate
    )

    let imported = 0
    let conflicts = 0

    for (const event of googleEvents) {
      try {
        // Check if this event should be imported as a task
        if (this.shouldImportAsTask(event, config)) {
          const existingTask = await this.findExistingTask(event)
          
          if (!existingTask) {
            // Create new task from calendar event
            await this.createTaskFromCalendarEvent(userId, event)
            imported++
          } else {
            // Check for conflicts and resolve
            const hasConflict = await this.resolveConflict(existingTask, event, config)
            if (hasConflict) conflicts++
          }
        }
      } catch (error) {
        console.error(`Failed to import event ${event.id}:`, error)
      }
    }

    return { imported, conflicts }
  }

  // Export tasks from TaskMaster to Google Calendar
  private async exportToGoogleCalendar(
    userId: string, 
    config: CalendarSyncConfig
  ): Promise<{ exported: number; conflicts: number }> {
    // Get tasks that should be exported to calendar
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        OR: [
          { dueDate: { gte: new Date() } },
          { scheduledFor: { gte: new Date() } }
        ],
        AND: [
          { type: { in: config.includeTaskTypes } },
          { status: { not: 'completed' } }
        ]
      },
      include: {
        project: true,
        tags: true
      }
    })

    let exported = 0
    let conflicts = 0

    for (const task of tasks) {
      try {
        // Check if task already has a calendar event
        const existingCalendarEvent = await this.findExistingCalendarEvent(task.id)
        
        if (!existingCalendarEvent) {
          // Create new calendar event from task
          await this.googleCalendar.createTaskEvent(
            userId,
            config.calendarId,
            task,
            {
              duration: task.estimatedTime || config.focusTimePreferences.minimumDuration,
              bufferTime: config.focusTimePreferences.bufferTime
            }
          )
          exported++
        } else {
          // Update existing calendar event if task was modified
          if (task.updatedAt > existingCalendarEvent.updatedAt) {
            const hasConflict = await this.updateCalendarEventFromTask(
              userId,
              config.calendarId,
              existingCalendarEvent,
              task,
              config
            )
            if (hasConflict) conflicts++
          }
        }
      } catch (error) {
        console.error(`Failed to export task ${task.id}:`, error)
      }
    }

    return { exported, conflicts }
  }

  // Check if a calendar event should be imported as a task
  private shouldImportAsTask(event: CalendarEvent, config: CalendarSyncConfig): boolean {
    // Skip all-day events
    if (!event.start.dateTime || !event.end.dateTime) {
      return false
    }

    // Skip events outside working hours if configured
    if (config.workingHours.enabled) {
      const eventStart = new Date(event.start.dateTime)
      const eventDay = eventStart.getDay()
      const eventTime = eventStart.toTimeString().substring(0, 5) // HH:MM

      const workingDay = config.workingHours.schedule.find(s => s.dayOfWeek === eventDay)
      if (!workingDay || eventTime < workingDay.startTime || eventTime > workingDay.endTime) {
        return false
      }
    }

    // Skip events marked as free time (transparent)
    if (event.transparency === 'transparent') {
      return false
    }

    // Skip events we created (contains TaskMaster identifier)
    if (event.description?.includes('Generated by TaskMaster Pro')) {
      return false
    }

    // Import meetings and focus time blocks
    return event.summary.includes('Meeting') || 
           event.summary.includes('Focus') ||
           event.attendees && event.attendees.length > 1
  }

  // Find existing task by calendar event
  private async findExistingTask(event: CalendarEvent): Promise<any> {
    return await prisma.task.findFirst({
      where: {
        OR: [
          { calendarEventId: event.id },
          { 
            AND: [
              { title: { contains: event.summary } },
              { dueDate: new Date(event.start.dateTime) }
            ]
          }
        ]
      }
    })
  }

  // Find existing calendar event by task ID
  private async findExistingCalendarEvent(taskId: string): Promise<any> {
    return await prisma.calendarEvent.findFirst({
      where: { taskId }
    })
  }

  // Create task from calendar event
  private async createTaskFromCalendarEvent(userId: string, event: CalendarEvent): Promise<void> {
    const duration = this.calculateEventDuration(event)
    
    await prisma.task.create({
      data: {
        userId,
        title: this.cleanEventTitle(event.summary),
        description: event.description || `Imported from calendar: ${event.summary}`,
        type: this.determineTaskType(event),
        priority: 'normal',
        dueDate: new Date(event.start.dateTime),
        scheduledFor: new Date(event.start.dateTime),
        estimatedTime: duration,
        calendarEventId: event.id,
        source: 'calendar_import'
      }
    })
  }

  // Clean event title for task creation
  private cleanEventTitle(title: string): string {
    return title
      .replace(/^(Meeting:|Focus:|Call:)\s*/i, '')
      .replace(/📋|🎯|📞|💼/g, '')
      .trim()
  }

  // Determine task type from calendar event
  private determineTaskType(event: CalendarEvent): string {
    const summary = event.summary.toLowerCase()
    
    if (summary.includes('meeting') || summary.includes('call') || (event.attendees && event.attendees.length > 1)) {
      return 'meeting'
    }
    
    if (summary.includes('focus') || summary.includes('deep work')) {
      return 'focus-time'
    }
    
    if (summary.includes('deadline') || summary.includes('due')) {
      return 'deadline'
    }
    
    return 'task'
  }

  // Calculate event duration in minutes
  private calculateEventDuration(event: CalendarEvent): number {
    const start = new Date(event.start.dateTime)
    const end = new Date(event.end.dateTime)
    return Math.round((end.getTime() - start.getTime()) / 60000)
  }

  // Resolve conflicts between tasks and calendar events
  private async resolveConflict(
    task: any, 
    event: CalendarEvent, 
    config: CalendarSyncConfig
  ): Promise<boolean> {
    switch (config.conflictResolution) {
      case 'calendar-wins':
        await this.updateTaskFromCalendarEvent(task, event)
        return false
      
      case 'task-wins':
        // Calendar event will be updated on next export
        return false
      
      case 'latest-wins':
        const taskUpdated = new Date(task.updatedAt)
        const eventUpdated = new Date(event.updated)
        
        if (eventUpdated > taskUpdated) {
          await this.updateTaskFromCalendarEvent(task, event)
        }
        return false
      
      case 'manual':
        // Create conflict record for manual resolution
        await this.createConflictRecord(task, event)
        return true
    }
  }

  // Update task from calendar event
  private async updateTaskFromCalendarEvent(task: any, event: CalendarEvent): Promise<void> {
    await prisma.task.update({
      where: { id: task.id },
      data: {
        title: this.cleanEventTitle(event.summary),
        description: event.description || task.description,
        dueDate: new Date(event.start.dateTime),
        scheduledFor: new Date(event.start.dateTime),
        estimatedTime: this.calculateEventDuration(event)
      }
    })
  }

  // Update calendar event from task
  private async updateCalendarEventFromTask(
    userId: string,
    calendarId: string,
    calendarEvent: any,
    task: any,
    config: CalendarSyncConfig
  ): Promise<boolean> {
    try {
      const conflicts = await this.googleCalendar.detectConflicts(
        userId,
        calendarId,
        {
          id: calendarEvent.eventId,
          summary: `📋 ${task.title}`,
          start: {
            dateTime: task.dueDate || task.scheduledFor,
            timeZone: config.workingHours.timezone
          },
          end: {
            dateTime: new Date((task.dueDate || task.scheduledFor).getTime() + (task.estimatedTime || 60) * 60000).toISOString(),
            timeZone: config.workingHours.timezone
          }
        } as CalendarEvent
      )

      if (conflicts.length > 0) {
        await this.storeConflicts(userId, conflicts)
        return true
      }

      await this.googleCalendar.updateEvent(
        userId,
        calendarId,
        calendarEvent.eventId,
        {
          summary: `📋 ${task.title}`,
          description: this.generateTaskEventDescription(task),
          start: {
            dateTime: task.dueDate || task.scheduledFor,
            timeZone: config.workingHours.timezone
          },
          end: {
            dateTime: new Date((task.dueDate || task.scheduledFor).getTime() + (task.estimatedTime || 60) * 60000).toISOString(),
            timeZone: config.workingHours.timezone
          }
        } as CalendarEvent
      )

      return false
    } catch (error) {
      console.error('Failed to update calendar event:', error)
      return false
    }
  }

  // Generate task event description
  private generateTaskEventDescription(task: any): string {
    const parts = []
    
    if (task.description) {
      parts.push(`📝 ${task.description}`)
    }
    
    if (task.project?.name) {
      parts.push(`📁 Project: ${task.project.name}`)
    }
    
    if (task.priority) {
      const priorityEmoji = { low: '🟢', normal: '🟡', high: '🟠', critical: '🔴' }
      parts.push(`${priorityEmoji[task.priority]} Priority: ${task.priority}`)
    }
    
    if (task.estimatedTime) {
      parts.push(`⏱️ Estimated time: ${task.estimatedTime} minutes`)
    }
    
    parts.push('\n🚀 Generated by TaskMaster Pro')
    
    return parts.join('\n')
  }

  // Create conflict record for manual resolution
  private async createConflictRecord(task: any, event: CalendarEvent): Promise<void> {
    await prisma.calendarConflict.create({
      data: {
        userId: task.userId,
        type: 'sync_conflict',
        severity: 'medium',
        taskId: task.id,
        calendarEventId: event.id,
        description: `Conflict between task "${task.title}" and calendar event "${event.summary}"`,
        metadata: JSON.stringify({ task, event }),
        status: 'pending'
      }
    })
  }

  // Store conflicts in database
  private async storeConflicts(userId: string, conflicts: CalendarConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      await prisma.calendarConflict.create({
        data: {
          userId,
          type: conflict.type,
          severity: conflict.severity,
          description: conflict.suggestedResolution.description,
          metadata: JSON.stringify(conflict),
          status: 'pending'
        }
      })
    }
  }

  // Start periodic sync for all users
  private startPeriodicSync(): void {
    setInterval(async () => {
      try {
        const activeConfigs = await prisma.calendarSyncConfig.findMany({
          where: { autoSync: true }
        })

        for (const config of activeConfigs) {
          const lastSync = config.lastSyncAt || new Date(0)
          const nextSync = new Date(lastSync.getTime() + config.syncInterval * 60000)

          if (new Date() >= nextSync && !this.syncJobsRunning.has(config.userId)) {
            try {
              await this.syncUserCalendar(config.userId)
            } catch (error) {
              console.error(`Periodic sync failed for user ${config.userId}:`, error)
            }
          }
        }
      } catch (error) {
        console.error('Periodic sync check failed:', error)
      }
    }, 60000) // Check every minute

    console.log('Calendar sync manager: Periodic sync started')
  }
}