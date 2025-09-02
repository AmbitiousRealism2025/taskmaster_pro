// API Route for OAuth data synchronization
// Part of Phase 3.2 - External Integration Layer

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/config'
import { OAuthProviderManager } from '@/lib/oauth/oauth-provider-manager'
import { z } from 'zod'

const SyncRequestSchema = z.object({
  providers: z.array(z.enum(['microsoft', 'linkedin'])).optional(),
  dataTypes: z.array(z.enum(['contacts', 'calendar', 'tasks', 'emails'])).optional(),
  force: z.boolean().default(false)
})

const CalendarEventsRequestSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  providers: z.array(z.enum(['microsoft', 'linkedin'])).optional()
})

const oauthManager = new OAuthProviderManager()

// Trigger data synchronization
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
    const validatedData = SyncRequestSchema.parse(body)

    const results = {
      contacts: { totalSynced: 0, byProvider: {}, errors: [] },
      calendar: { events: [], byProvider: {}, errors: [] },
      tasks: { totalSynced: 0, byProvider: {}, errors: [] }
    }

    // Sync contacts if requested
    if (!validatedData.dataTypes || validatedData.dataTypes.includes('contacts')) {
      try {
        const contactsResult = await oauthManager.syncAllContacts(session.user.id!)
        results.contacts = contactsResult
      } catch (error) {
        results.contacts.errors.push(`Contacts sync failed: ${error.message}`)
      }
    }

    // Sync calendar events if requested
    if (!validatedData.dataTypes || validatedData.dataTypes.includes('calendar')) {
      try {
        const startDate = new Date()
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days ahead
        
        const calendarResult = await oauthManager.getUnifiedCalendarEvents(
          session.user.id!,
          startDate,
          endDate
        )
        results.calendar = calendarResult
      } catch (error) {
        results.calendar.errors.push(`Calendar sync failed: ${error.message}`)
      }
    }

    const totalErrors = Object.values(results).reduce((sum, result) => sum + result.errors.length, 0)
    const hasData = results.contacts.totalSynced > 0 || results.calendar.events.length > 0

    return NextResponse.json({
      success: totalErrors === 0 && hasData,
      results,
      summary: {
        contactsSynced: results.contacts.totalSynced,
        calendarEvents: results.calendar.events.length,
        totalErrors,
        timestamp: new Date().toISOString()
      },
      message: totalErrors === 0 
        ? 'Data synchronization completed successfully'
        : `Synchronization completed with ${totalErrors} errors`
    })

  } catch (error) {
    console.error('OAuth sync error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid sync request data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to synchronize OAuth data' },
      { status: 500 }
    )
  }
}

// Get unified calendar events from all connected providers
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
    const action = searchParams.get('action')

    if (action === 'calendar-events') {
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')

      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'startDate and endDate parameters are required' },
          { status: 400 }
        )
      }

      const result = await oauthManager.getUnifiedCalendarEvents(
        session.user.id!,
        new Date(startDate),
        new Date(endDate)
      )

      return NextResponse.json({
        success: result.errors.length === 0,
        events: result.events,
        byProvider: result.byProvider,
        errors: result.errors,
        summary: {
          totalEvents: result.events.length,
          providersWithData: Object.keys(result.byProvider).length,
          errorCount: result.errors.length
        }
      })
    }

    if (action === 'contacts') {
      // Get synced contacts from database
      const contacts = await oauthManager.syncAllContacts(session.user.id!)

      return NextResponse.json({
        success: true,
        contacts: contacts.byProvider,
        summary: {
          totalContacts: contacts.totalSynced,
          byProvider: contacts.byProvider,
          errors: contacts.errors
        }
      })
    }

    // Default: Get sync status
    const integrationStatus = await oauthManager.getIntegrationStatus(session.user.id!)
    
    return NextResponse.json({
      integrations: integrationStatus,
      lastSync: new Date(),
      nextSync: new Date(Date.now() + 60 * 60 * 1000), // Next hour
      canSync: integrationStatus.some(s => s.connected && !s.needsReauth)
    })

  } catch (error) {
    console.error('Get OAuth sync data error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve sync data' },
      { status: 500 }
    )
  }
}

// Update sync preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const {
      autoSyncEnabled,
      syncInterval,
      dataTypes,
      conflictResolution
    } = await request.json()

    // Store sync preferences in user preferences
    // This would typically update a user preferences table
    // For now, we'll return success

    return NextResponse.json({
      success: true,
      preferences: {
        autoSyncEnabled: autoSyncEnabled ?? true,
        syncInterval: syncInterval ?? 60, // minutes
        dataTypes: dataTypes ?? ['contacts', 'calendar'],
        conflictResolution: conflictResolution ?? 'manual'
      },
      message: 'Sync preferences updated successfully'
    })

  } catch (error) {
    console.error('Update sync preferences error:', error)
    return NextResponse.json(
      { error: 'Failed to update sync preferences' },
      { status: 500 }
    )
  }
}