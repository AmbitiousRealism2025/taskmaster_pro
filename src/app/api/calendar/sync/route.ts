// API Route for calendar synchronization
// Part of Phase 3.2 - External Integration Layer

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/config'
import { CalendarSyncManager } from '@/lib/calendar/calendar-sync-manager'
import { z } from 'zod'

const SyncConfigSchema = z.object({
  calendarId: z.string().optional(),
  syncDirection: z.enum(['import', 'export', 'bidirectional']).optional(),
  autoSync: z.boolean().optional(),
  syncInterval: z.number().min(5).max(1440).optional(), // 5 minutes to 24 hours
  conflictResolution: z.enum(['manual', 'calendar-wins', 'task-wins', 'latest-wins']).optional(),
  includeTaskTypes: z.array(z.enum(['task', 'deadline', 'meeting', 'focus-time'])).optional(),
  workingHours: z.object({
    enabled: z.boolean(),
    timezone: z.string(),
    schedule: z.array(z.object({
      dayOfWeek: z.number().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/)
    }))
  }).optional(),
  focusTimePreferences: z.object({
    minimumDuration: z.number().min(15).max(480),
    bufferTime: z.number().min(0).max(120),
    preferredTimeSlots: z.array(z.object({
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/)
    }))
  }).optional()
})

const syncManager = new CalendarSyncManager()

// Get sync configuration and status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const config = await syncManager.getSyncConfig(session.user.id!)

    return NextResponse.json({
      config,
      isConfigured: !!config,
      message: config ? 'Sync configuration found' : 'No sync configuration found'
    })

  } catch (error) {
    console.error('Get sync config error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve sync configuration' },
      { status: 500 }
    )
  }
}

// Update sync configuration
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = SyncConfigSchema.parse(body)

    const updatedConfig = await syncManager.updateSyncConfig(
      session.user.id!,
      validatedData
    )

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      message: 'Sync configuration updated successfully'
    })

  } catch (error) {
    console.error('Update sync config error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid configuration data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update sync configuration' },
      { status: 500 }
    )
  }
}

// Trigger manual sync
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { force } = await request.json().catch(() => ({}))

    const result = await syncManager.syncUserCalendar(session.user.id!, force)

    return NextResponse.json({
      success: result.success,
      result,
      message: result.success 
        ? 'Calendar sync completed successfully' 
        : 'Calendar sync completed with errors'
    })

  } catch (error) {
    console.error('Manual sync error:', error)
    
    let errorMessage = 'Sync failed'
    let statusCode = 500

    if (error.message === 'Sync already in progress for this user') {
      errorMessage = 'Sync already in progress'
      statusCode = 409
    } else if (error.message === 'No sync configuration found for user') {
      errorMessage = 'Calendar sync not configured'
      statusCode = 400
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}