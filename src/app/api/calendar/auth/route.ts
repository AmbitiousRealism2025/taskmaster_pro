// API Route for Google Calendar authentication
// Part of Phase 3.2 - External Integration Layer

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/config'
import { GoogleCalendarService } from '@/lib/calendar/google-calendar-service'

// Get Google Calendar authorization URL
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const googleCalendar = new GoogleCalendarService()
    const authUrl = await googleCalendar.getAuthUrl(session.user.id!)

    return NextResponse.json({
      authUrl,
      message: 'Authorization URL generated successfully'
    })

  } catch (error) {
    console.error('Calendar auth URL generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    )
  }
}

// Handle Google Calendar OAuth callback
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { code, state } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      )
    }

    // Verify state matches user ID for security
    if (state !== session.user.id) {
      return NextResponse.json(
        { error: 'Invalid authorization state' },
        { status: 400 }
      )
    }

    const googleCalendar = new GoogleCalendarService()
    await googleCalendar.handleAuthCallback(code, session.user.id!)

    return NextResponse.json({
      success: true,
      message: 'Google Calendar connected successfully'
    })

  } catch (error) {
    console.error('Calendar auth callback error:', error)
    return NextResponse.json(
      { error: 'Failed to complete authorization' },
      { status: 500 }
    )
  }
}