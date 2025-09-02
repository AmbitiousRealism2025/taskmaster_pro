// Google Calendar Service Integration
// Part of Phase 3.2 - External Integration Layer

// Dynamic imports for Google APIs to prevent bundle bloat
// import { google } from 'googleapis'
// import { OAuth2Client } from 'google-auth-library'
import { prisma } from '@/lib/prisma'
import { 
  GoogleCalendarCredentials, 
  CalendarEvent, 
  TaskCalendarEvent, 
  CalendarSyncResult,
  CalendarConflict 
} from '../../types/calendar-integration'

export class GoogleCalendarService {
  private oauth2Client: any
  private calendar: any
  private googleAuth: any
  private googleCalendar: any

  constructor() {
    // Lazy initialization - APIs loaded only when needed
  }

  // Dynamically load Google APIs
  private async loadGoogleAPIs() {
    if (this.oauth2Client) return

    const [{ google }, { OAuth2Client }] = await Promise.all([
      import('googleapis'),
      import('google-auth-library')
    ])

    this.googleAuth = google.auth
    this.googleCalendar = google.calendar

    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    this.calendar = this.googleCalendar({ version: 'v3', auth: this.oauth2Client })
  }

  // Initialize OAuth2 client with user credentials
  private async setCredentials(userId: string): Promise<void> {
    await this.loadGoogleAPIs()
    const credentials = await this.getUserCredentials(userId)
    if (!credentials) {
      throw new Error('User not authenticated with Google Calendar')
    }

    this.oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
      expiry_date: credentials.expiryDate,
      token_type: credentials.tokenType,
      scope: credentials.scope.join(' ')
    })

    // Auto-refresh tokens if expired
    this.oauth2Client.on('tokens', async (tokens) => {
      await this.updateUserCredentials(userId, tokens)
    })
  }

  // Get user's stored Google Calendar credentials
  private async getUserCredentials(userId: string): Promise<GoogleCalendarCredentials | null> {
    const userAuth = await prisma.userAuthProvider.findFirst({
      where: {
        userId,
        provider: 'google',
        providerType: 'calendar'
      }
    })

    if (!userAuth) return null

    return {
      accessToken: userAuth.accessToken!,
      refreshToken: userAuth.refreshToken!,
      expiryDate: userAuth.expiresAt?.getTime() || 0,
      scope: userAuth.scope?.split(' ') || [],
      tokenType: 'Bearer'
    }
  }

  // Update user credentials after refresh
  private async updateUserCredentials(userId: string, tokens: any): Promise<void> {
    await prisma.userAuthProvider.updateMany({
      where: {
        userId,
        provider: 'google',
        providerType: 'calendar'
      },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined
      }
    })
  }

  // Generate OAuth2 authorization URL
  async getAuthUrl(userId: string): Promise<string> {
    await this.loadGoogleAPIs()
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ]

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: userId // Pass user ID for callback handling
    })
  }

  // Handle OAuth2 callback and store credentials
  async handleAuthCallback(code: string, userId: string): Promise<void> {
    await this.loadGoogleAPIs()
    try {
      const { tokens } = await this.oauth2Client.getToken(code)
      
      await prisma.userAuthProvider.upsert({
        where: {
          userId_provider_providerType: {
            userId,
            provider: 'google',
            providerType: 'calendar'
          }
        },
        create: {
          userId,
          provider: 'google',
          providerType: 'calendar',
          providerId: `google_calendar_${userId}`,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          scope: tokens.scope || 'calendar.readonly calendar.events'
        },
        update: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || undefined,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          scope: tokens.scope || 'calendar.readonly calendar.events'
        }
      })
    } catch (error) {
      console.error('Failed to handle OAuth callback:', error)
      throw new Error('Authentication failed')
    }
  }

  // Get user's calendar list
  async getCalendars(userId: string): Promise<Array<{
    id: string
    summary: string
    description?: string
    primary: boolean
    accessRole: string
  }>> {
    await this.setCredentials(userId)

    try {
      const response = await this.calendar.calendarList.list()
      
      return response.data.items?.map((calendar: any) => ({
        id: calendar.id,
        summary: calendar.summary,
        description: calendar.description,
        primary: calendar.primary || false,
        accessRole: calendar.accessRole
      })) || []
    } catch (error) {
      console.error('Failed to fetch calendars:', error)
      throw new Error('Unable to fetch calendars')
    }
  }

  // Get events from a specific calendar
  async getEvents(
    userId: string,
    calendarId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<CalendarEvent[]> {
    await this.setCredentials(userId)

    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 500
      })

      return response.data.items?.map((event: any) => this.transformGoogleEvent(event, calendarId)) || []
    } catch (error) {
      console.error('Failed to fetch events:', error)
      throw new Error('Unable to fetch calendar events')
    }
  }

  // Create a new calendar event
  async createEvent(
    userId: string,
    calendarId: string,
    eventData: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    await this.setCredentials(userId)

    try {
      const googleEvent = this.transformToGoogleEvent(eventData)
      const response = await this.calendar.events.insert({
        calendarId,
        resource: googleEvent
      })

      return this.transformGoogleEvent(response.data, calendarId)
    } catch (error) {
      console.error('Failed to create event:', error)
      throw new Error('Unable to create calendar event')
    }
  }

  // Update an existing calendar event
  async updateEvent(
    userId: string,
    calendarId: string,
    eventId: string,
    eventData: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    await this.setCredentials(userId)

    try {
      const googleEvent = this.transformToGoogleEvent(eventData)
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        resource: googleEvent
      })

      return this.transformGoogleEvent(response.data, calendarId)
    } catch (error) {
      console.error('Failed to update event:', error)
      throw new Error('Unable to update calendar event')
    }
  }

  // Delete a calendar event
  async deleteEvent(userId: string, calendarId: string, eventId: string): Promise<void> {
    await this.setCredentials(userId)

    try {
      await this.calendar.events.delete({
        calendarId,
        eventId
      })
    } catch (error) {
      console.error('Failed to delete event:', error)
      throw new Error('Unable to delete calendar event')
    }
  }

  // Create event from TaskMaster task
  async createTaskEvent(
    userId: string,
    calendarId: string,
    task: any,
    focusTimeOptions?: {
      duration?: number
      bufferTime?: number
      preferredTimeSlot?: { start: string; end: string }
    }
  ): Promise<TaskCalendarEvent> {
    const eventData: Partial<TaskCalendarEvent> = {
      summary: `📋 ${task.title}`,
      description: this.generateTaskEventDescription(task),
      start: {
        dateTime: task.dueDate || this.findOptimalTimeSlot(userId, focusTimeOptions),
        timeZone: 'UTC'
      },
      end: {
        dateTime: this.calculateEndTime(
          task.dueDate || this.findOptimalTimeSlot(userId, focusTimeOptions),
          focusTimeOptions?.duration || task.estimatedTime || 60
        ),
        timeZone: 'UTC'
      },
      taskId: task.id,
      taskType: task.type || 'task',
      priority: task.priority || 'normal',
      projectId: task.projectId,
      tags: task.tags,
      estimatedDuration: focusTimeOptions?.duration || task.estimatedTime || 60
    }

    return await this.createEvent(userId, calendarId, eventData) as TaskCalendarEvent
  }

  // Transform Google Calendar event to our format
  private transformGoogleEvent(googleEvent: any, calendarId: string): CalendarEvent {
    return {
      id: googleEvent.id,
      calendarId,
      summary: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description,
      location: googleEvent.location,
      start: {
        dateTime: googleEvent.start?.dateTime || googleEvent.start?.date,
        timeZone: googleEvent.start?.timeZone || 'UTC'
      },
      end: {
        dateTime: googleEvent.end?.dateTime || googleEvent.end?.date,
        timeZone: googleEvent.end?.timeZone || 'UTC'
      },
      attendees: googleEvent.attendees?.map((attendee: any) => ({
        email: attendee.email,
        displayName: attendee.displayName,
        responseStatus: attendee.responseStatus
      })),
      recurrence: googleEvent.recurrence,
      reminders: googleEvent.reminders,
      created: googleEvent.created,
      updated: googleEvent.updated,
      status: googleEvent.status,
      transparency: googleEvent.transparency || 'opaque',
      visibility: googleEvent.visibility || 'default'
    }
  }

  // Transform our event format to Google Calendar format
  private transformToGoogleEvent(event: Partial<CalendarEvent>): any {
    return {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: event.start,
      end: event.end,
      attendees: event.attendees,
      recurrence: event.recurrence,
      reminders: event.reminders,
      transparency: event.transparency,
      visibility: event.visibility
    }
  }

  // Generate description for task-based events
  private generateTaskEventDescription(task: any): string {
    const parts = []
    
    if (task.description) {
      parts.push(`📝 ${task.description}`)
    }
    
    if (task.project?.name) {
      parts.push(`📁 Project: ${task.project.name}`)
    }
    
    if (task.priority) {
      const priorityEmoji = {
        low: '🟢',
        normal: '🟡',
        high: '🟠',
        critical: '🔴'
      }
      parts.push(`${priorityEmoji[task.priority]} Priority: ${task.priority}`)
    }
    
    if (task.estimatedTime) {
      parts.push(`⏱️ Estimated time: ${task.estimatedTime} minutes`)
    }
    
    if (task.tags?.length) {
      parts.push(`🏷️ Tags: ${task.tags.join(', ')}`)
    }

    parts.push('')
    parts.push('🚀 Generated by TaskMaster Pro')
    
    return parts.join('\n')
  }

  // Find optimal time slot for focus time
  private findOptimalTimeSlot(
    userId: string,
    options?: {
      duration?: number
      bufferTime?: number
      preferredTimeSlot?: { start: string; end: string }
    }
  ): string {
    // Simplified implementation - in production, this would analyze:
    // - User's working hours
    // - Existing calendar events
    // - Historical productivity data
    // - Buffer time requirements
    
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0) // Default to 9 AM tomorrow
    
    return tomorrow.toISOString()
  }

  // Calculate end time based on start time and duration
  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const start = new Date(startTime)
    const end = new Date(start.getTime() + (durationMinutes * 60000))
    return end.toISOString()
  }

  // Check for calendar conflicts
  async detectConflicts(
    userId: string,
    calendarId: string,
    proposedEvent: Partial<CalendarEvent>
  ): Promise<CalendarConflict[]> {
    if (!proposedEvent.start || !proposedEvent.end) {
      return []
    }

    const existingEvents = await this.getEvents(
      userId,
      calendarId,
      new Date(proposedEvent.start.dateTime),
      new Date(proposedEvent.end.dateTime)
    )

    const conflicts: CalendarConflict[] = []

    for (const event of existingEvents) {
      const conflict = this.checkEventConflict(proposedEvent as CalendarEvent, event)
      if (conflict) {
        conflicts.push(conflict)
      }
    }

    return conflicts
  }

  // Check if two events conflict
  private checkEventConflict(event1: CalendarEvent, event2: CalendarEvent): CalendarConflict | null {
    const start1 = new Date(event1.start.dateTime)
    const end1 = new Date(event1.end.dateTime)
    const start2 = new Date(event2.start.dateTime)
    const end2 = new Date(event2.end.dateTime)

    // Check for overlap
    if (start1 < end2 && end1 > start2) {
      return {
        id: `conflict_${Date.now()}`,
        type: 'overlap',
        severity: 'medium',
        events: [event1, event2],
        suggestedResolution: {
          action: 'reschedule',
          description: `Events "${event1.summary}" and "${event2.summary}" overlap`,
          alternatives: [
            {
              startTime: end2.toISOString(),
              endTime: new Date(end2.getTime() + (end1.getTime() - start1.getTime())).toISOString(),
              confidence: 0.8
            }
          ]
        },
        createdAt: new Date()
      }
    }

    return null
  }
}