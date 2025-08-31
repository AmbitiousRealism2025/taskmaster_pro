# Calendar Service Layer Architecture

This document outlines the clean service layer architecture for calendar operations, extracting complex integration logic from React components and implementing proper separation of concerns.

## Architecture Overview

### Service Layer Hierarchy

```
┌─────────────────────────────────────────┐
│             UI Components               │
│     (TaskForm, CalendarView, etc.)      │
└─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│          Calendar Controller            │
│         (API Route Handlers)            │
└─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│         Calendar Service Layer          │
│      (Business Logic & Orchestration)   │
└─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│       Calendar Repository Layer         │
│       (Data Access & Persistence)       │
└─────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│        External Calendar Providers      │
│    (Google Calendar, Outlook, etc.)     │
└─────────────────────────────────────────┘
```

## Core Service Layer Components

### 1. Calendar Service Interface

```typescript
// lib/calendar/interfaces/calendar-service.interface.ts
export interface ICalendarService {
  // Provider Management
  getAvailableProviders(): CalendarProvider[]
  authenticateProvider(providerId: string, credentials: AuthCredentials): Promise<boolean>
  disconnectProvider(providerId: string): Promise<void>
  
  // Calendar Operations
  getCalendars(userId: string): Promise<Calendar[]>
  syncCalendar(calendarId: string): Promise<SyncResult>
  enableCalendarSync(calendarId: string, settings: SyncSettings): Promise<void>
  disableCalendarSync(calendarId: string): Promise<void>
  
  // Event Operations
  getEvents(calendarId: string, dateRange?: DateRange): Promise<CalendarEvent[]>
  createEvent(calendarId: string, eventData: CreateEventRequest): Promise<CalendarEvent>
  updateEvent(eventId: string, updates: UpdateEventRequest): Promise<CalendarEvent>
  deleteEvent(eventId: string): Promise<void>
  
  // Sync Operations
  syncAllCalendars(userId: string): Promise<SyncResult[]>
  resolveSyncConflict(conflictId: string, resolution: ConflictResolution): Promise<void>
  getSyncStatus(calendarId: string): Promise<SyncStatus>
}
```

### 2. Calendar Provider Abstraction

```typescript
// lib/calendar/interfaces/calendar-provider.interface.ts
export interface ICalendarProvider {
  readonly providerId: string
  readonly displayName: string
  readonly supportedFeatures: CalendarFeature[]
  
  // Authentication
  authenticate(credentials: AuthCredentials): Promise<AuthResult>
  refreshToken(refreshToken: string): Promise<TokenResult>
  validateToken(token: string): Promise<boolean>
  
  // Calendar Management
  getCalendars(token: string): Promise<ExternalCalendar[]>
  getCalendarById(token: string, calendarId: string): Promise<ExternalCalendar>
  
  // Event Management
  getEvents(token: string, calendarId: string, options?: GetEventsOptions): Promise<ExternalCalendarEvent[]>
  createEvent(token: string, calendarId: string, eventData: ExternalEventData): Promise<ExternalCalendarEvent>
  updateEvent(token: string, calendarId: string, eventId: string, updates: Partial<ExternalEventData>): Promise<ExternalCalendarEvent>
  deleteEvent(token: string, calendarId: string, eventId: string): Promise<void>
  
  // Webhook/Change Detection
  setupWebhook?(token: string, calendarId: string, webhookUrl: string): Promise<WebhookResult>
  removeWebhook?(token: string, webhookId: string): Promise<void>
}

export enum CalendarFeature {
  READ_EVENTS = 'READ_EVENTS',
  WRITE_EVENTS = 'WRITE_EVENTS',
  RECURRING_EVENTS = 'RECURRING_EVENTS',
  ATTENDEES = 'ATTENDEES',
  WEBHOOKS = 'WEBHOOKS',
  PUSH_NOTIFICATIONS = 'PUSH_NOTIFICATIONS'
}
```

### 3. Calendar Repository Layer

```typescript
// lib/calendar/repositories/calendar.repository.ts
export interface ICalendarRepository {
  // Calendar CRUD
  createCalendar(calendarData: CreateCalendarData): Promise<Calendar>
  getCalendarById(calendarId: string): Promise<Calendar | null>
  getCalendarsByUserId(userId: string): Promise<Calendar[]>
  updateCalendar(calendarId: string, updates: Partial<CalendarData>): Promise<Calendar>
  deleteCalendar(calendarId: string): Promise<void>
  
  // Event CRUD  
  createEvent(eventData: CreateEventData): Promise<CalendarEvent>
  getEventById(eventId: string): Promise<CalendarEvent | null>
  getEventsByCalendarId(calendarId: string, dateRange?: DateRange): Promise<CalendarEvent[]>
  updateEvent(eventId: string, updates: Partial<EventData>): Promise<CalendarEvent>
  deleteEvent(eventId: string): Promise<void>
  
  // Sync Management
  createSyncRecord(syncData: SyncRecordData): Promise<SyncRecord>
  updateSyncRecord(recordId: string, updates: Partial<SyncRecordData>): Promise<SyncRecord>
  getSyncRecordsByCalendarId(calendarId: string): Promise<SyncRecord[]>
  
  // Conflict Management
  createConflict(conflictData: ConflictData): Promise<SyncConflict>
  getUnresolvedConflicts(userId: string): Promise<SyncConflict[]>
  resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void>
}

export class CalendarRepository implements ICalendarRepository {
  constructor(private prisma: PrismaClient) {}
  
  async createCalendar(calendarData: CreateCalendarData): Promise<Calendar> {
    return await this.prisma.calendar.create({
      data: calendarData,
      include: {
        events: true,
        syncSettings: true
      }
    })
  }
  
  async getCalendarsByUserId(userId: string): Promise<Calendar[]> {
    return await this.prisma.calendar.findMany({
      where: { userId },
      include: {
        events: {
          where: {
            startTime: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          orderBy: { startTime: 'asc' }
        },
        syncSettings: true,
        _count: {
          select: { events: true }
        }
      }
    })
  }
  
  // Additional repository methods...
}
```

## Provider Implementations

### 1. Google Calendar Provider

```typescript
// lib/calendar/providers/google-calendar.provider.ts
export class GoogleCalendarProvider implements ICalendarProvider {
  readonly providerId = 'google'
  readonly displayName = 'Google Calendar'
  readonly supportedFeatures = [
    CalendarFeature.READ_EVENTS,
    CalendarFeature.WRITE_EVENTS,
    CalendarFeature.RECURRING_EVENTS,
    CalendarFeature.ATTENDEES,
    CalendarFeature.WEBHOOKS
  ]
  
  private readonly baseUrl = 'https://www.googleapis.com/calendar/v3'
  private readonly scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ]
  
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          code: credentials.authCode,
          grant_type: 'authorization_code',
          redirect_uri: credentials.redirectUri
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error_description || 'Authentication failed'
        }
      }
      
      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown authentication error'
      }
    }
  }
  
  async getCalendars(token: string): Promise<ExternalCalendar[]> {
    const response = await this.makeAuthorizedRequest(
      `${this.baseUrl}/users/me/calendarList`,
      token
    )
    
    if (!response.ok) {
      throw new CalendarProviderError('Failed to fetch calendars', {
        provider: this.providerId,
        statusCode: response.status
      })
    }
    
    const data = await response.json()
    return data.items.map(this.mapGoogleCalendarToExternal)
  }
  
  async getEvents(
    token: string, 
    calendarId: string, 
    options?: GetEventsOptions
  ): Promise<ExternalCalendarEvent[]> {
    const params = new URLSearchParams({
      calendarId: calendarId,
      singleEvents: 'true',
      orderBy: 'startTime'
    })
    
    if (options?.timeMin) {
      params.append('timeMin', options.timeMin.toISOString())
    }
    if (options?.timeMax) {
      params.append('timeMax', options.timeMax.toISOString())
    }
    if (options?.updatedMin) {
      params.append('updatedMin', options.updatedMin.toISOString())
    }
    
    const response = await this.makeAuthorizedRequest(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      token
    )
    
    if (!response.ok) {
      throw new CalendarProviderError('Failed to fetch events', {
        provider: this.providerId,
        calendarId,
        statusCode: response.status
      })
    }
    
    const data = await response.json()
    return data.items.map(this.mapGoogleEventToExternal)
  }
  
  async createEvent(
    token: string, 
    calendarId: string, 
    eventData: ExternalEventData
  ): Promise<ExternalCalendarEvent> {
    const googleEventData = this.mapExternalEventToGoogle(eventData)
    
    const response = await this.makeAuthorizedRequest(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events`,
      token,
      {
        method: 'POST',
        body: JSON.stringify(googleEventData)
      }
    )
    
    if (!response.ok) {
      throw new CalendarProviderError('Failed to create event', {
        provider: this.providerId,
        calendarId,
        statusCode: response.status
      })
    }
    
    const data = await response.json()
    return this.mapGoogleEventToExternal(data)
  }
  
  private async makeAuthorizedRequest(
    url: string, 
    token: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
  }
  
  private mapGoogleCalendarToExternal(googleCalendar: any): ExternalCalendar {
    return {
      id: googleCalendar.id,
      name: googleCalendar.summary,
      description: googleCalendar.description,
      color: googleCalendar.backgroundColor,
      isDefault: googleCalendar.primary || false,
      accessLevel: this.mapAccessRole(googleCalendar.accessRole),
      timeZone: googleCalendar.timeZone
    }
  }
  
  private mapGoogleEventToExternal(googleEvent: any): ExternalCalendarEvent {
    return {
      id: googleEvent.id,
      title: googleEvent.summary || '',
      description: googleEvent.description,
      startTime: new Date(googleEvent.start.dateTime || googleEvent.start.date),
      endTime: new Date(googleEvent.end.dateTime || googleEvent.end.date),
      isAllDay: !googleEvent.start.dateTime,
      location: googleEvent.location,
      attendees: googleEvent.attendees?.map(this.mapGoogleAttendee) || [],
      status: this.mapEventStatus(googleEvent.status),
      etag: googleEvent.etag,
      lastModified: new Date(googleEvent.updated),
      recurrence: googleEvent.recurrence ? {
        rule: googleEvent.recurrence[0] // Simplified for now
      } : undefined
    }
  }
  
  private mapExternalEventToGoogle(eventData: ExternalEventData): any {
    return {
      summary: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start: eventData.isAllDay 
        ? { date: eventData.startTime.toISOString().split('T')[0] }
        : { dateTime: eventData.startTime.toISOString() },
      end: eventData.isAllDay
        ? { date: eventData.endTime.toISOString().split('T')[0] }
        : { dateTime: eventData.endTime.toISOString() },
      attendees: eventData.attendees?.map(attendee => ({
        email: attendee.email,
        displayName: attendee.name
      }))
    }
  }
  
  // Additional mapping methods...
}
```

### 2. Microsoft Outlook Provider

```typescript
// lib/calendar/providers/outlook-calendar.provider.ts
export class OutlookCalendarProvider implements ICalendarProvider {
  readonly providerId = 'microsoft'
  readonly displayName = 'Microsoft Outlook'
  readonly supportedFeatures = [
    CalendarFeature.READ_EVENTS,
    CalendarFeature.WRITE_EVENTS,
    CalendarFeature.RECURRING_EVENTS,
    CalendarFeature.ATTENDEES,
    CalendarFeature.PUSH_NOTIFICATIONS
  ]
  
  private readonly baseUrl = 'https://graph.microsoft.com/v1.0'
  
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const response = await fetch(
        `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: credentials.clientId,
            client_secret: credentials.clientSecret,
            code: credentials.authCode,
            grant_type: 'authorization_code',
            redirect_uri: credentials.redirectUri,
            scope: 'https://graph.microsoft.com/calendars.readwrite'
          })
        }
      )
      
      const data = await response.json()
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error_description || 'Authentication failed'
        }
      }
      
      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown authentication error'
      }
    }
  }
  
  async getCalendars(token: string): Promise<ExternalCalendar[]> {
    const response = await this.makeAuthorizedRequest(
      `${this.baseUrl}/me/calendars`,
      token
    )
    
    if (!response.ok) {
      throw new CalendarProviderError('Failed to fetch calendars', {
        provider: this.providerId,
        statusCode: response.status
      })
    }
    
    const data = await response.json()
    return data.value.map(this.mapOutlookCalendarToExternal)
  }
  
  async getEvents(
    token: string,
    calendarId: string,
    options?: GetEventsOptions
  ): Promise<ExternalCalendarEvent[]> {
    const params = new URLSearchParams({
      '$orderby': 'start/dateTime'
    })
    
    if (options?.timeMin || options?.timeMax) {
      const filter = []
      if (options.timeMin) {
        filter.push(`start/dateTime ge '${options.timeMin.toISOString()}'`)
      }
      if (options.timeMax) {
        filter.push(`end/dateTime le '${options.timeMax.toISOString()}'`)
      }
      params.append('$filter', filter.join(' and '))
    }
    
    const response = await this.makeAuthorizedRequest(
      `${this.baseUrl}/me/calendars/${calendarId}/events?${params}`,
      token
    )
    
    if (!response.ok) {
      throw new CalendarProviderError('Failed to fetch events', {
        provider: this.providerId,
        calendarId,
        statusCode: response.status
      })
    }
    
    const data = await response.json()
    return data.value.map(this.mapOutlookEventToExternal)
  }
  
  // Additional Outlook-specific methods...
  
  private mapOutlookCalendarToExternal(outlookCalendar: any): ExternalCalendar {
    return {
      id: outlookCalendar.id,
      name: outlookCalendar.name,
      description: '',
      color: outlookCalendar.color,
      isDefault: outlookCalendar.isDefaultCalendar || false,
      accessLevel: 'OWNER', // Simplified for now
      timeZone: '' // Will need to fetch separately
    }
  }
  
  private mapOutlookEventToExternal(outlookEvent: any): ExternalCalendarEvent {
    return {
      id: outlookEvent.id,
      title: outlookEvent.subject || '',
      description: outlookEvent.body?.content,
      startTime: new Date(outlookEvent.start.dateTime),
      endTime: new Date(outlookEvent.end.dateTime),
      isAllDay: outlookEvent.isAllDay,
      location: outlookEvent.location?.displayName,
      attendees: outlookEvent.attendees?.map(this.mapOutlookAttendee) || [],
      status: this.mapEventStatus(outlookEvent.showAs),
      etag: outlookEvent['@odata.etag'],
      lastModified: new Date(outlookEvent.lastModifiedDateTime)
    }
  }
  
  // Additional mapping methods...
}
```

## Service Implementation

### Main Calendar Service

```typescript
// lib/calendar/services/calendar.service.ts
export class CalendarService implements ICalendarService {
  private providers: Map<string, ICalendarProvider>
  private repository: ICalendarRepository
  private tokenManager: ITokenManager
  
  constructor(
    repository: ICalendarRepository,
    tokenManager: ITokenManager
  ) {
    this.repository = repository
    this.tokenManager = tokenManager
    this.providers = new Map()
    
    // Register providers
    this.providers.set('google', new GoogleCalendarProvider())
    this.providers.set('microsoft', new OutlookCalendarProvider())
  }
  
  getAvailableProviders(): CalendarProvider[] {
    return Array.from(this.providers.values()).map(provider => ({
      id: provider.providerId,
      name: provider.displayName,
      features: provider.supportedFeatures
    }))
  }
  
  async authenticateProvider(
    providerId: string, 
    credentials: AuthCredentials
  ): Promise<boolean> {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new CalendarServiceError(`Provider '${providerId}' not found`)
    }
    
    try {
      const authResult = await provider.authenticate(credentials)
      
      if (!authResult.success) {
        throw new CalendarServiceError(`Authentication failed: ${authResult.error}`)
      }
      
      // Store tokens securely
      await this.tokenManager.storeTokens(credentials.userId, providerId, {
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        expiresAt: new Date(Date.now() + (authResult.expiresIn * 1000))
      })
      
      return true
    } catch (error) {
      console.error(`Authentication failed for provider ${providerId}:`, error)
      throw new CalendarServiceError(
        `Failed to authenticate with ${provider.displayName}`,
        { cause: error }
      )
    }
  }
  
  async syncCalendar(calendarId: string): Promise<SyncResult> {
    const calendar = await this.repository.getCalendarById(calendarId)
    if (!calendar) {
      throw new CalendarServiceError(`Calendar '${calendarId}' not found`)
    }
    
    const provider = this.providers.get(calendar.providerId)
    if (!provider) {
      throw new CalendarServiceError(`Provider '${calendar.providerId}' not available`)
    }
    
    const token = await this.tokenManager.getValidToken(calendar.userId, calendar.providerId)
    if (!token) {
      throw new CalendarServiceError(`No valid token for provider '${calendar.providerId}'`)
    }
    
    try {
      const syncResult: SyncResult = {
        calendarId,
        startedAt: new Date(),
        status: 'IN_PROGRESS',
        eventsProcessed: 0,
        eventsCreated: 0,
        eventsUpdated: 0,
        eventsDeleted: 0,
        conflicts: [],
        errors: []
      }
      
      // Get events from external provider
      const externalEvents = await provider.getEvents(
        token,
        calendar.externalId,
        {
          updatedMin: calendar.lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      )
      
      syncResult.eventsProcessed = externalEvents.length
      
      // Process each external event
      for (const externalEvent of externalEvents) {
        try {
          const existingEvent = await this.repository.getEventByExternalId(
            externalEvent.id,
            calendarId
          )
          
          if (existingEvent) {
            // Check for conflicts
            if (this.hasConflict(existingEvent, externalEvent)) {
              const conflict = await this.createConflict(existingEvent, externalEvent)
              syncResult.conflicts.push(conflict)
            } else {
              // Update existing event
              await this.repository.updateEvent(existingEvent.id, {
                title: externalEvent.title,
                description: externalEvent.description,
                startTime: externalEvent.startTime,
                endTime: externalEvent.endTime,
                location: externalEvent.location,
                lastModified: externalEvent.lastModified,
                etag: externalEvent.etag
              })
              syncResult.eventsUpdated++
            }
          } else {
            // Create new event
            await this.repository.createEvent({
              calendarId,
              externalId: externalEvent.id,
              title: externalEvent.title,
              description: externalEvent.description,
              startTime: externalEvent.startTime,
              endTime: externalEvent.endTime,
              isAllDay: externalEvent.isAllDay,
              location: externalEvent.location,
              status: externalEvent.status,
              lastModified: externalEvent.lastModified,
              etag: externalEvent.etag
            })
            syncResult.eventsCreated++
          }
        } catch (error) {
          syncResult.errors.push({
            eventId: externalEvent.id,
            message: error instanceof Error ? error.message : 'Unknown error',
            severity: 'ERROR'
          })
        }
      }
      
      // Update calendar sync timestamp
      await this.repository.updateCalendar(calendarId, {
        lastSyncAt: new Date()
      })
      
      syncResult.completedAt = new Date()
      syncResult.status = syncResult.errors.length > 0 ? 'PARTIAL' : 'SUCCESS'
      
      return syncResult
      
    } catch (error) {
      console.error(`Sync failed for calendar ${calendarId}:`, error)
      throw new CalendarServiceError(
        `Failed to sync calendar '${calendarId}'`,
        { cause: error }
      )
    }
  }
  
  private hasConflict(
    localEvent: CalendarEvent, 
    externalEvent: ExternalCalendarEvent
  ): boolean {
    if (!localEvent.lastModified || !externalEvent.lastModified) {
      return false
    }
    
    const timeDiff = Math.abs(
      localEvent.lastModified.getTime() - externalEvent.lastModified.getTime()
    )
    
    // Consider it a conflict if both were modified within 5 minutes of each other
    return timeDiff < 5 * 60 * 1000
  }
  
  private async createConflict(
    localEvent: CalendarEvent,
    externalEvent: ExternalCalendarEvent
  ): Promise<SyncConflict> {
    return await this.repository.createConflict({
      eventId: localEvent.id,
      conflictType: 'MODIFIED_BOTH',
      localVersion: localEvent,
      externalVersion: externalEvent,
      detectedAt: new Date()
    })
  }
  
  // Additional service methods...
}
```

## Error Handling and Retry Logic

### Calendar Service Errors

```typescript
// lib/calendar/errors/calendar-errors.ts
export class CalendarServiceError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, any>
  ) {
    super(message)
    this.name = 'CalendarServiceError'
  }
}

export class CalendarProviderError extends CalendarServiceError {
  constructor(
    message: string,
    context: { provider: string; statusCode?: number } & Record<string, any>
  ) {
    super(message, context)
    this.name = 'CalendarProviderError'
  }
}

export class TokenExpiredError extends CalendarServiceError {
  constructor(provider: string) {
    super(`Token expired for provider: ${provider}`)
    this.name = 'TokenExpiredError'
  }
}
```

### Retry Mechanism

```typescript
// lib/calendar/utils/retry.ts
export interface RetryOptions {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  retryCondition?: (error: Error) => boolean
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === options.maxAttempts) {
        break
      }
      
      if (options.retryCondition && !options.retryCondition(lastError)) {
        break
      }
      
      const delay = Math.min(
        options.baseDelay * Math.pow(2, attempt - 1),
        options.maxDelay
      )
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Usage in calendar service
export const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryCondition: (error) => {
    if (error instanceof CalendarProviderError) {
      const statusCode = error.context?.statusCode
      // Retry on server errors and rate limits, but not client errors
      return statusCode >= 500 || statusCode === 429
    }
    return false
  }
}
```

## Dependency Injection Container

```typescript
// lib/calendar/container/calendar-container.ts
export class CalendarContainer {
  private static instance: CalendarContainer
  private services = new Map<string, any>()
  
  static getInstance(): CalendarContainer {
    if (!CalendarContainer.instance) {
      CalendarContainer.instance = new CalendarContainer()
    }
    return CalendarContainer.instance
  }
  
  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory)
  }
  
  resolve<T>(key: string): T {
    const factory = this.services.get(key)
    if (!factory) {
      throw new Error(`Service '${key}' not registered`)
    }
    return factory()
  }
  
  // Register default services
  static setup(): void {
    const container = CalendarContainer.getInstance()
    
    container.register('CalendarRepository', () => 
      new CalendarRepository(prisma)
    )
    
    container.register('TokenManager', () =>
      new TokenManager(prisma)
    )
    
    container.register('CalendarService', () =>
      new CalendarService(
        container.resolve('CalendarRepository'),
        container.resolve('TokenManager')
      )
    )
  }
}
```

## Updated React Components

### Clean Component Example

```typescript
// components/calendar/CalendarSync.tsx
export function CalendarSync() {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Use custom hook that wraps service layer
  const {
    calendars,
    isLoading,
    syncCalendar,
    isSyncing,
    syncResults
  } = useCalendarSync(user?.id)
  
  const handleSync = async (calendarId: string) => {
    try {
      await syncCalendar(calendarId)
      toast({
        title: "Sync completed",
        description: "Calendar has been synchronized successfully"
      })
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    }
  }
  
  if (isLoading) {
    return <CalendarSyncSkeleton />
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Calendar Sync</h2>
        <Button 
          onClick={() => window.location.href = '/api/auth/calendar/connect'}
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          Connect Calendar
        </Button>
      </div>
      
      <div className="grid gap-4">
        {calendars.map((calendar) => (
          <CalendarSyncCard
            key={calendar.id}
            calendar={calendar}
            onSync={() => handleSync(calendar.id)}
            isSyncing={isSyncing[calendar.id]}
            syncResult={syncResults[calendar.id]}
          />
        ))}
      </div>
    </div>
  )
}
```

### Custom Hook for Service Layer

```typescript
// hooks/useCalendarSync.ts
export function useCalendarSync(userId?: string) {
  const queryClient = useQueryClient()
  
  const { data: calendars, isLoading } = useQuery({
    queryKey: ['calendars', userId],
    queryFn: async (): Promise<Calendar[]> => {
      if (!userId) return []
      
      const response = await fetch(`/api/calendars?userId=${userId}`)
      if (!response.ok) throw new Error('Failed to fetch calendars')
      return response.json()
    },
    enabled: !!userId
  })
  
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({})
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({})
  
  const syncCalendar = useCallback(async (calendarId: string) => {
    setIsSyncing(prev => ({ ...prev, [calendarId]: true }))
    
    try {
      const response = await fetch(`/api/calendars/${calendarId}/sync`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Sync failed')
      }
      
      const result: SyncResult = await response.json()
      setSyncResults(prev => ({ ...prev, [calendarId]: result }))
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['calendars'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      
    } finally {
      setIsSyncing(prev => ({ ...prev, [calendarId]: false }))
    }
  }, [queryClient])
  
  return {
    calendars: calendars || [],
    isLoading,
    syncCalendar,
    isSyncing,
    syncResults
  }
}
```

## Testing Strategy

### Unit Tests for Service Layer

```typescript
// __tests__/lib/calendar/calendar.service.test.ts
describe('CalendarService', () => {
  let calendarService: CalendarService
  let mockRepository: jest.Mocked<ICalendarRepository>
  let mockTokenManager: jest.Mocked<ITokenManager>
  
  beforeEach(() => {
    mockRepository = {
      getCalendarById: jest.fn(),
      updateCalendar: jest.fn(),
      createEvent: jest.fn(),
      updateEvent: jest.fn(),
      getEventByExternalId: jest.fn(),
      createConflict: jest.fn()
    } as any
    
    mockTokenManager = {
      getValidToken: jest.fn(),
      storeTokens: jest.fn(),
      refreshToken: jest.fn()
    } as any
    
    calendarService = new CalendarService(mockRepository, mockTokenManager)
  })
  
  describe('syncCalendar', () => {
    it('should sync calendar events successfully', async () => {
      // Arrange
      const calendarId = 'calendar-1'
      const mockCalendar = {
        id: calendarId,
        providerId: 'google',
        externalId: 'external-cal-1',
        userId: 'user-1',
        lastSyncAt: new Date('2025-01-01')
      }
      
      mockRepository.getCalendarById.mockResolvedValue(mockCalendar as any)
      mockTokenManager.getValidToken.mockResolvedValue('valid-token')
      
      // Mock provider behavior
      const mockProvider = {
        getEvents: jest.fn().mockResolvedValue([
          {
            id: 'event-1',
            title: 'Meeting',
            startTime: new Date(),
            endTime: new Date(),
            lastModified: new Date()
          }
        ])
      }
      
      // Act
      const result = await calendarService.syncCalendar(calendarId)
      
      // Assert
      expect(result.status).toBe('SUCCESS')
      expect(result.eventsCreated).toBe(1)
      expect(mockRepository.updateCalendar).toHaveBeenCalledWith(
        calendarId,
        { lastSyncAt: expect.any(Date) }
      )
    })
    
    it('should handle sync conflicts', async () => {
      // Test conflict detection and resolution
    })
    
    it('should retry on transient failures', async () => {
      // Test retry mechanism
    })
  })
})
```

This architecture provides:

1. **Clean Separation of Concerns**: UI components only handle presentation, services handle business logic, repositories handle data access
2. **Testable Components**: Each layer can be unit tested independently with proper mocking
3. **Provider Abstraction**: Easy to add new calendar providers without changing existing code
4. **Error Handling**: Comprehensive error handling with retry logic and proper error propagation
5. **Dependency Injection**: Clean dependency management for better testability and maintenance

The calendar integration logic is now properly extracted from React components and organized in a maintainable service layer architecture.