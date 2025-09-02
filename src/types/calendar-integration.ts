// Calendar Integration Type Definitions
// Part of Phase 3.2 - External Integration Layer

export interface GoogleCalendarCredentials {
  accessToken: string
  refreshToken: string
  expiryDate: number
  scope: string[]
  tokenType: string
}

export interface CalendarEvent {
  id: string
  calendarId: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  }>
  recurrence?: string[]
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
  created: string
  updated: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  transparency: 'opaque' | 'transparent'
  visibility: 'default' | 'public' | 'private' | 'confidential'
}

export interface TaskCalendarEvent extends CalendarEvent {
  taskId: string
  taskType: 'task' | 'deadline' | 'meeting' | 'focus-time'
  priority: 'low' | 'normal' | 'high' | 'critical'
  projectId?: string
  tags?: string[]
  estimatedDuration?: number // minutes
  actualDuration?: number // minutes
  productivityScore?: number
}

export interface CalendarSyncConfig {
  userId: string
  calendarId: string
  syncDirection: 'import' | 'export' | 'bidirectional'
  autoSync: boolean
  syncInterval: number // minutes
  conflictResolution: 'manual' | 'calendar-wins' | 'task-wins' | 'latest-wins'
  includeTaskTypes: Array<'task' | 'deadline' | 'meeting' | 'focus-time'>
  workingHours: {
    enabled: boolean
    timezone: string
    schedule: Array<{
      dayOfWeek: number // 0 = Sunday, 6 = Saturday
      startTime: string // HH:MM format
      endTime: string // HH:MM format
    }>
  }
  focusTimePreferences: {
    minimumDuration: number // minutes
    bufferTime: number // minutes before/after
    preferredTimeSlots: Array<{
      startTime: string
      endTime: string
    }>
  }
}

export interface CalendarConflict {
  id: string
  type: 'overlap' | 'double-booking' | 'insufficient-time' | 'outside-working-hours'
  severity: 'low' | 'medium' | 'high'
  events: CalendarEvent[]
  suggestedResolution: {
    action: 'reschedule' | 'shorten' | 'split' | 'cancel' | 'ignore'
    description: string
    alternatives?: Array<{
      startTime: string
      endTime: string
      confidence: number
    }>
  }
  createdAt: Date
  resolvedAt?: Date
}

export interface FocusTimeBlock {
  id: string
  userId: string
  startTime: Date
  endTime: Date
  duration: number // minutes
  taskIds: string[]
  calendarEventId?: string
  productivity: {
    planned: number // estimated productivity score
    actual?: number // measured productivity score
    interruptions: number
    completedTasks: number
    totalTasks: number
  }
  environment: {
    location?: string
    distractionLevel: 'low' | 'medium' | 'high'
    tools: string[] // e.g., ['slack-off', 'phone-silent', 'notifications-disabled']
  }
}

export interface CalendarInsight {
  id: string
  userId: string
  type: 'pattern' | 'optimization' | 'conflict' | 'productivity'
  title: string
  description: string
  data: {
    timeframe: {
      start: Date
      end: Date
    }
    metrics: Record<string, number>
    trend: 'improving' | 'declining' | 'stable'
    confidence: number
  }
  recommendations: Array<{
    action: string
    impact: 'low' | 'medium' | 'high'
    effort: 'low' | 'medium' | 'high'
    description: string
  }>
  createdAt: Date
}

export interface CalendarSyncResult {
  success: boolean
  eventsImported: number
  eventsExported: number
  conflictsDetected: number
  errors: Array<{
    type: 'authentication' | 'network' | 'validation' | 'conflict'
    message: string
    eventId?: string
  }>
  nextSyncAt: Date
}

export interface MeetingAwareMetrics {
  userId: string
  period: {
    start: Date
    end: Date
  }
  totalMeetingTime: number // minutes
  focusTimeBlocks: number
  averageFocusBlockDuration: number
  meetingProductivityImpact: {
    beforeMeeting: number // productivity score
    afterMeeting: number // productivity score
    recoveryTime: number // minutes to return to baseline
  }
  meetingPatterns: {
    mostProductiveTime: string // HH:MM
    leastProductiveTime: string // HH:MM
    optimalMeetingDuration: number // minutes
    backToBackTolerance: number // max consecutive meetings
  }
  recommendations: {
    focusTimeOptimization: string[]
    meetingSchedulingTips: string[]
    productivityImprovements: string[]
  }
}

export interface CalendarIntegrationHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  lastSyncAt: Date
  nextSyncAt: Date
  syncSuccess: boolean
  apiQuotaUsage: {
    current: number
    limit: number
    resetAt: Date
  }
  errors: Array<{
    timestamp: Date
    type: string
    message: string
    resolved: boolean
  }>
  metrics: {
    avgSyncDuration: number // milliseconds
    conflictRate: number // percentage
    userSatisfactionScore: number
  }
}