// Focus Time Optimizer for intelligent task scheduling
// Part of Phase 3.2 - External Integration Layer

import { prisma } from '@/lib/prisma'
import { GoogleCalendarService } from './google-calendar-service'
import { 
  FocusTimeBlock, 
  CalendarSyncConfig, 
  CalendarInsight,
  MeetingAwareMetrics
} from '../../types/calendar-integration'

interface TimeSlot {
  start: Date
  end: Date
  duration: number // minutes
  score: number // 0-1, higher is better
  reasoning: string[]
}

interface ProductivityPattern {
  userId: string
  timeOfDay: string // HH:MM
  dayOfWeek: number
  productivityScore: number
  sampleSize: number
  confidence: number
}

export class FocusTimeOptimizer {
  private googleCalendar: GoogleCalendarService

  constructor() {
    this.googleCalendar = new GoogleCalendarService()
  }

  // Find optimal focus time blocks for a user
  async findOptimalFocusTime(
    userId: string,
    duration: number, // minutes
    preferences?: {
      earliestStart?: Date
      latestEnd?: Date
      preferredDays?: number[] // 0-6, Sunday-Saturday
      avoidMeetingBuffer?: number // minutes to avoid before/after meetings
      minimumGap?: number // minutes between focus blocks
    }
  ): Promise<TimeSlot[]> {
    const config = await this.getSyncConfig(userId)
    if (!config) {
      throw new Error('Calendar sync not configured')
    }

    const now = new Date()
    const endDate = preferences?.latestEnd || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days ahead

    // Get existing calendar events
    const existingEvents = await this.googleCalendar.getEvents(
      userId,
      config.calendarId,
      preferences?.earliestStart || now,
      endDate
    )

    // Get user's productivity patterns
    const patterns = await this.getUserProductivityPatterns(userId)

    // Generate potential time slots
    const potentialSlots = this.generatePotentialSlots(
      preferences?.earliestStart || now,
      endDate,
      duration,
      config,
      preferences
    )

    // Score each slot based on multiple factors
    const scoredSlots = await this.scoreTimeSlots(
      potentialSlots,
      existingEvents,
      patterns,
      config,
      preferences
    )

    // Return top 10 best options
    return scoredSlots
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }

  // Create optimized focus time block
  async createFocusTimeBlock(
    userId: string,
    taskIds: string[],
    preferences?: {
      duration?: number
      location?: string
      tools?: string[]
      distractionLevel?: 'low' | 'medium' | 'high'
    }
  ): Promise<FocusTimeBlock> {
    const tasks = await prisma.task.findMany({
      where: { 
        id: { in: taskIds },
        userId 
      }
    })

    if (tasks.length === 0) {
      throw new Error('No valid tasks found')
    }

    // Calculate total estimated duration
    const totalDuration = preferences?.duration || 
      tasks.reduce((sum, task) => sum + (task.estimatedTime || 30), 0)

    // Find optimal time slot
    const timeSlots = await this.findOptimalFocusTime(userId, totalDuration)
    if (timeSlots.length === 0) {
      throw new Error('No suitable time slots found')
    }

    const bestSlot = timeSlots[0]

    // Create focus time block
    const focusBlock = await prisma.focusTimeBlock.create({
      data: {
        userId,
        startTime: bestSlot.start,
        endTime: bestSlot.end,
        duration: totalDuration,
        taskIds,
        plannedProductivity: bestSlot.score,
        location: preferences?.location,
        distractionLevel: preferences?.distractionLevel || 'low',
        tools: preferences?.tools || []
      }
    })

    // Create calendar event for focus time
    try {
      const config = await this.getSyncConfig(userId)
      if (config) {
        const calendarEvent = await this.googleCalendar.createEvent(
          userId,
          config.calendarId,
          {
            summary: `🎯 Focus Time: ${tasks.map(t => t.title).join(', ')}`,
            description: this.generateFocusTimeDescription(tasks, preferences),
            start: {
              dateTime: bestSlot.start.toISOString(),
              timeZone: config.workingHours.timezone
            },
            end: {
              dateTime: bestSlot.end.toISOString(),
              timeZone: config.workingHours.timezone
            },
            transparency: 'opaque' // Block time on calendar
          }
        )

        // Update focus block with calendar event ID
        await prisma.focusTimeBlock.update({
          where: { id: focusBlock.id },
          data: { calendarEventId: calendarEvent.id }
        })
      }
    } catch (error) {
      console.error('Failed to create calendar event for focus time:', error)
    }

    return {
      id: focusBlock.id,
      userId: focusBlock.userId,
      startTime: focusBlock.startTime,
      endTime: focusBlock.endTime,
      duration: focusBlock.duration,
      taskIds: focusBlock.taskIds,
      calendarEventId: focusBlock.calendarEventId,
      productivity: {
        planned: focusBlock.plannedProductivity,
        interruptions: 0,
        completedTasks: 0,
        totalTasks: tasks.length
      },
      environment: {
        location: focusBlock.location,
        distractionLevel: focusBlock.distractionLevel as 'low' | 'medium' | 'high',
        tools: focusBlock.tools
      }
    }
  }

  // Track focus time block completion and productivity
  async completeFocusTimeBlock(
    blockId: string,
    results: {
      completedTasks: number
      actualDuration?: number
      interruptions?: number
      productivityScore?: number // 1-10
      notes?: string
    }
  ): Promise<void> {
    const block = await prisma.focusTimeBlock.findUnique({
      where: { id: blockId }
    })

    if (!block) {
      throw new Error('Focus time block not found')
    }

    // Update block with results
    await prisma.focusTimeBlock.update({
      where: { id: blockId },
      data: {
        actualDuration: results.actualDuration,
        completedTasks: results.completedTasks,
        interruptions: results.interruptions || 0,
        actualProductivity: results.productivityScore,
        notes: results.notes,
        completedAt: new Date()
      }
    })

    // Store productivity data for pattern learning
    await this.updateProductivityPatterns(
      block.userId,
      block.startTime,
      results.productivityScore || 5
    )

    // Generate insights if enough data collected
    await this.generateProductivityInsights(block.userId)
  }

  // Get user productivity patterns
  private async getUserProductivityPatterns(userId: string): Promise<ProductivityPattern[]> {
    const patterns = await prisma.productivityPattern.findMany({
      where: { userId },
      orderBy: { confidence: 'desc' }
    })

    return patterns.map(p => ({
      userId: p.userId,
      timeOfDay: p.timeOfDay,
      dayOfWeek: p.dayOfWeek,
      productivityScore: p.productivityScore,
      sampleSize: p.sampleSize,
      confidence: p.confidence
    }))
  }

  // Generate potential time slots
  private generatePotentialSlots(
    start: Date,
    end: Date,
    duration: number,
    config: CalendarSyncConfig,
    preferences?: any
  ): TimeSlot[] {
    const slots: TimeSlot[] = []
    const current = new Date(start)

    while (current < end) {
      // Check if current time is within working hours
      if (this.isWithinWorkingHours(current, config)) {
        const slotEnd = new Date(current.getTime() + duration * 60000)
        
        if (slotEnd <= end && this.isWithinWorkingHours(slotEnd, config)) {
          slots.push({
            start: new Date(current),
            end: slotEnd,
            duration,
            score: 0,
            reasoning: []
          })
        }
      }

      // Move to next 15-minute interval
      current.setMinutes(current.getMinutes() + 15)
    }

    return slots
  }

  // Score time slots based on multiple factors
  private async scoreTimeSlots(
    slots: TimeSlot[],
    existingEvents: any[],
    patterns: ProductivityPattern[],
    config: CalendarSyncConfig,
    preferences?: any
  ): Promise<TimeSlot[]> {
    return slots.map(slot => {
      const scores: number[] = []
      const reasoning: string[] = []

      // 1. Conflict avoidance (40% weight)
      const conflictScore = this.scoreConflictAvoidance(slot, existingEvents, preferences)
      scores.push(conflictScore * 0.4)
      if (conflictScore < 1) {
        reasoning.push(`Conflicts with existing events (${(conflictScore * 100).toFixed(0)}% clear)`)
      } else {
        reasoning.push('No scheduling conflicts')
      }

      // 2. Historical productivity (30% weight)
      const productivityScore = this.scoreProductivity(slot, patterns)
      scores.push(productivityScore * 0.3)
      reasoning.push(`${(productivityScore * 100).toFixed(0)}% historical productivity for this time`)

      // 3. Time of day preferences (15% weight)
      const timeOfDayScore = this.scoreTimeOfDay(slot)
      scores.push(timeOfDayScore * 0.15)
      reasoning.push(`${(timeOfDayScore * 100).toFixed(0)}% ideal time of day`)

      // 4. Buffer time around meetings (10% weight)
      const bufferScore = this.scoreBufferTime(slot, existingEvents)
      scores.push(bufferScore * 0.1)
      if (bufferScore < 1) {
        reasoning.push('Close to meetings (may impact focus)')
      } else {
        reasoning.push('Good buffer time from meetings')
      }

      // 5. Day of week preferences (5% weight)
      const dayOfWeekScore = this.scoreDayOfWeek(slot, preferences)
      scores.push(dayOfWeekScore * 0.05)

      const totalScore = scores.reduce((sum, score) => sum + score, 0)

      return {
        ...slot,
        score: totalScore,
        reasoning
      }
    })
  }

  // Score conflict avoidance
  private scoreConflictAvoidance(
    slot: TimeSlot,
    existingEvents: any[],
    preferences?: any
  ): number {
    for (const event of existingEvents) {
      const eventStart = new Date(event.start.dateTime)
      const eventEnd = new Date(event.end.dateTime)

      // Check for direct overlap
      if (slot.start < eventEnd && slot.end > eventStart) {
        return 0 // Complete conflict
      }

      // Check for insufficient buffer
      const bufferMinutes = preferences?.avoidMeetingBuffer || 15
      const bufferMs = bufferMinutes * 60000

      if (
        (slot.start.getTime() - eventEnd.getTime()) < bufferMs ||
        (eventStart.getTime() - slot.end.getTime()) < bufferMs
      ) {
        return 0.5 // Too close to meeting
      }
    }

    return 1 // No conflicts
  }

  // Score based on historical productivity
  private scoreProductivity(slot: TimeSlot, patterns: ProductivityPattern[]): number {
    const timeOfDay = slot.start.toTimeString().substring(0, 5) // HH:MM
    const dayOfWeek = slot.start.getDay()

    // Find matching patterns
    const exactMatch = patterns.find(p => 
      p.timeOfDay === timeOfDay && p.dayOfWeek === dayOfWeek
    )

    if (exactMatch && exactMatch.sampleSize >= 3) {
      return exactMatch.productivityScore / 10 // Convert 1-10 to 0-1
    }

    // Find similar time patterns
    const timeMatches = patterns.filter(p => {
      const patternHour = parseInt(p.timeOfDay.split(':')[0])
      const slotHour = slot.start.getHours()
      return Math.abs(patternHour - slotHour) <= 1
    })

    if (timeMatches.length > 0) {
      const avgScore = timeMatches.reduce((sum, p) => sum + p.productivityScore, 0) / timeMatches.length
      return (avgScore / 10) * 0.8 // Slightly lower confidence for approximate matches
    }

    // Default mid-range score for new time slots
    return 0.6
  }

  // Score time of day (morning typically better for focus)
  private scoreTimeOfDay(slot: TimeSlot): number {
    const hour = slot.start.getHours()

    if (hour >= 8 && hour <= 11) return 1.0 // Peak morning hours
    if (hour >= 6 && hour <= 7) return 0.8  // Early morning
    if (hour >= 12 && hour <= 14) return 0.6 // Post-lunch
    if (hour >= 15 && hour <= 17) return 0.7 // Afternoon
    if (hour >= 18 && hour <= 20) return 0.5 // Evening
    return 0.3 // Early morning or late evening
  }

  // Score buffer time from meetings
  private scoreBufferTime(slot: TimeSlot, existingEvents: any[]): number {
    const idealBuffer = 30 * 60000 // 30 minutes in ms
    let minDistance = Infinity

    for (const event of existingEvents) {
      const eventStart = new Date(event.start.dateTime)
      const eventEnd = new Date(event.end.dateTime)

      const distanceBefore = slot.start.getTime() - eventEnd.getTime()
      const distanceAfter = eventStart.getTime() - slot.end.getTime()

      if (distanceBefore > 0) {
        minDistance = Math.min(minDistance, distanceBefore)
      }
      if (distanceAfter > 0) {
        minDistance = Math.min(minDistance, distanceAfter)
      }
    }

    if (minDistance === Infinity) return 1.0 // No nearby meetings

    return Math.min(1.0, minDistance / idealBuffer)
  }

  // Score day of week preferences
  private scoreDayOfWeek(slot: TimeSlot, preferences?: any): number {
    if (!preferences?.preferredDays) return 1.0

    const dayOfWeek = slot.start.getDay()
    return preferences.preferredDays.includes(dayOfWeek) ? 1.0 : 0.5
  }

  // Check if time is within working hours
  private isWithinWorkingHours(time: Date, config: CalendarSyncConfig): boolean {
    if (!config.workingHours.enabled) return true

    const dayOfWeek = time.getDay()
    const timeString = time.toTimeString().substring(0, 5) // HH:MM

    const workingDay = config.workingHours.schedule.find(s => s.dayOfWeek === dayOfWeek)
    if (!workingDay) return false

    return timeString >= workingDay.startTime && timeString <= workingDay.endTime
  }

  // Get sync config
  private async getSyncConfig(userId: string): Promise<CalendarSyncConfig | null> {
    const config = await prisma.calendarSyncConfig.findUnique({
      where: { userId }
    })

    if (!config) return null

    return {
      userId: config.userId,
      calendarId: config.calendarId,
      syncDirection: config.syncDirection as any,
      autoSync: config.autoSync,
      syncInterval: config.syncInterval,
      conflictResolution: config.conflictResolution as any,
      includeTaskTypes: config.includeTaskTypes as any,
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

  // Generate focus time description
  private generateFocusTimeDescription(tasks: any[], preferences?: any): string {
    const parts = []
    
    parts.push('🎯 Dedicated focus time block')
    parts.push('')
    
    parts.push('📋 Tasks:')
    tasks.forEach(task => {
      parts.push(`• ${task.title} (${task.estimatedTime || 30}min)`)
    })
    
    if (preferences?.location) {
      parts.push(`📍 Location: ${preferences.location}`)
    }
    
    if (preferences?.tools?.length) {
      parts.push(`🔧 Tools: ${preferences.tools.join(', ')}`)
    }
    
    parts.push('')
    parts.push('💡 Tips for maximum productivity:')
    parts.push('• Turn off notifications')
    parts.push('• Close unnecessary browser tabs')
    parts.push('• Have water and snacks ready')
    parts.push('• Use the Pomodoro technique')
    
    parts.push('')
    parts.push('🚀 Generated by TaskMaster Pro')
    
    return parts.join('\n')
  }

  // Update productivity patterns
  private async updateProductivityPatterns(
    userId: string,
    sessionTime: Date,
    productivityScore: number
  ): Promise<void> {
    const timeOfDay = sessionTime.toTimeString().substring(0, 5) // HH:MM
    const dayOfWeek = sessionTime.getDay()

    const existingPattern = await prisma.productivityPattern.findFirst({
      where: {
        userId,
        timeOfDay,
        dayOfWeek
      }
    })

    if (existingPattern) {
      // Update existing pattern with weighted average
      const newSampleSize = existingPattern.sampleSize + 1
      const newScore = (
        (existingPattern.productivityScore * existingPattern.sampleSize) + productivityScore
      ) / newSampleSize

      await prisma.productivityPattern.update({
        where: { id: existingPattern.id },
        data: {
          productivityScore: newScore,
          sampleSize: newSampleSize,
          confidence: Math.min(1.0, newSampleSize / 10), // Higher confidence with more samples
          updatedAt: new Date()
        }
      })
    } else {
      // Create new pattern
      await prisma.productivityPattern.create({
        data: {
          userId,
          timeOfDay,
          dayOfWeek,
          productivityScore,
          sampleSize: 1,
          confidence: 0.1 // Low confidence with single sample
        }
      })
    }
  }

  // Generate productivity insights
  private async generateProductivityInsights(userId: string): Promise<void> {
    const patterns = await this.getUserProductivityPatterns(userId)
    
    if (patterns.length < 10) return // Need more data

    const insights: CalendarInsight[] = []

    // Find peak productivity times
    const peakTimes = patterns
      .filter(p => p.confidence > 0.5 && p.sampleSize >= 3)
      .sort((a, b) => b.productivityScore - a.productivityScore)
      .slice(0, 3)

    if (peakTimes.length > 0) {
      insights.push({
        id: `insight_peak_${Date.now()}`,
        userId,
        type: 'productivity',
        title: 'Peak Productivity Times Identified',
        description: `Your most productive times are ${peakTimes.map(p => `${p.timeOfDay} on ${this.dayName(p.dayOfWeek)}`).join(', ')}`,
        data: {
          timeframe: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
          metrics: { 'Peak Score': peakTimes[0].productivityScore },
          trend: 'stable',
          confidence: peakTimes[0].confidence
        },
        recommendations: [
          {
            action: 'Schedule important tasks during peak times',
            impact: 'high',
            effort: 'low',
            description: 'Block calendar for focus work during your most productive hours'
          }
        ],
        createdAt: new Date()
      })
    }

    // Store insights in database
    for (const insight of insights) {
      await prisma.calendarInsight.create({
        data: {
          userId: insight.userId,
          type: insight.type,
          title: insight.title,
          description: insight.description,
          data: JSON.stringify(insight.data),
          recommendations: JSON.stringify(insight.recommendations)
        }
      })
    }
  }

  // Helper to get day name
  private dayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayOfWeek]
  }
}