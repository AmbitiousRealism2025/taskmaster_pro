// API Route for calendar events management
// Part of Phase 3.2 - External Integration Layer

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/config'
import { GoogleCalendarService } from '@/lib/calendar/google-calendar-service'
import { z } from 'zod'

const CreateEventSchema = z.object({
  calendarId: z.string().optional(),
  summary: z.string().min(1).max(100),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.object({
    dateTime: z.string().datetime(),
    timeZone: z.string().optional()
  }),
  end: z.object({
    dateTime: z.string().datetime(),
    timeZone: z.string().optional()
  }),
  attendees: z.array(z.object({
    email: z.string().email(),
    displayName: z.string().optional()
  })).optional(),
  reminders: z.object({
    useDefault: z.boolean(),
    overrides: z.array(z.object({
      method: z.enum(['email', 'popup']),
      minutes: z.number().min(0).max(40320) // Up to 4 weeks
    })).optional()
  }).optional(),
  transparency: z.enum(['opaque', 'transparent']).optional(),
  visibility: z.enum(['default', 'public', 'private', 'confidential']).optional()
})

const UpdateEventSchema = CreateEventSchema.partial()

const googleCalendar = new GoogleCalendarService()

// Get calendar events
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const calendarId = searchParams.get('calendarId') || 'primary'
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')

    if (!timeMin || !timeMax) {
      return NextResponse.json(
        { error: 'timeMin and timeMax parameters are required' },
        { status: 400 }
      )
    }

    const events = await googleCalendar.getEvents(
      session.user.id!,
      calendarId,
      new Date(timeMin),
      new Date(timeMax)
    )

    return NextResponse.json({
      events,
      count: events.length,
      calendarId,
      timeRange: { timeMin, timeMax }
    })

  } catch (error) {
    console.error('Get calendar events error:', error)
    
    let errorMessage = 'Failed to fetch calendar events'
    let statusCode = 500

    if (error.message === 'User not authenticated with Google Calendar') {
      errorMessage = 'Google Calendar not connected'
      statusCode = 401
    } else if (error.message === 'Unable to fetch calendars') {
      errorMessage = 'Unable to access Google Calendar'
      statusCode = 503
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}

// Create new calendar event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = CreateEventSchema.parse(body)
    const calendarId = validatedData.calendarId || 'primary'

    // Check for conflicts before creating
    const conflicts = await googleCalendar.detectConflicts(
      session.user.id!,
      calendarId,
      {
        ...validatedData,
        id: 'temp', // Temporary ID for conflict checking
        calendarId,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        status: 'confirmed'
      }
    )

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: 'Scheduling conflict detected',
          conflicts,
          suggestion: 'Please choose a different time or resolve conflicts'
        },
        { status: 409 }
      )
    }

    const event = await googleCalendar.createEvent(
      session.user.id!,
      calendarId,
      validatedData
    )

    return NextResponse.json({
      success: true,
      event,
      message: 'Calendar event created successfully'
    })

  } catch (error) {
    console.error('Create calendar event error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid event data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    let errorMessage = 'Failed to create calendar event'
    let statusCode = 500

    if (error.message === 'User not authenticated with Google Calendar') {
      errorMessage = 'Google Calendar not connected'
      statusCode = 401
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}

// Update existing calendar event
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const calendarId = searchParams.get('calendarId') || 'primary'

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = UpdateEventSchema.parse(body)

    // Check for conflicts if time is being updated
    if (validatedData.start || validatedData.end) {
      const conflicts = await googleCalendar.detectConflicts(
        session.user.id!,
        calendarId,
        {
          ...validatedData,
          id: eventId,
          calendarId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          status: 'confirmed'
        }
      )

      if (conflicts.length > 0) {
        return NextResponse.json(
          {
            error: 'Scheduling conflict detected',
            conflicts,
            suggestion: 'Please choose a different time or resolve conflicts'
          },
          { status: 409 }
        )
      }
    }

    const event = await googleCalendar.updateEvent(
      session.user.id!,
      calendarId,
      eventId,
      validatedData
    )

    return NextResponse.json({
      success: true,
      event,
      message: 'Calendar event updated successfully'
    })

  } catch (error) {
    console.error('Update calendar event error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid event data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    let errorMessage = 'Failed to update calendar event'
    let statusCode = 500

    if (error.message === 'User not authenticated with Google Calendar') {
      errorMessage = 'Google Calendar not connected'
      statusCode = 401
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}

// Delete calendar event
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const calendarId = searchParams.get('calendarId') || 'primary'

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    await googleCalendar.deleteEvent(
      session.user.id!,
      calendarId,
      eventId
    )

    return NextResponse.json({
      success: true,
      message: 'Calendar event deleted successfully'
    })

  } catch (error) {
    console.error('Delete calendar event error:', error)
    
    let errorMessage = 'Failed to delete calendar event'
    let statusCode = 500

    if (error.message === 'User not authenticated with Google Calendar') {
      errorMessage = 'Google Calendar not connected'
      statusCode = 401
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}