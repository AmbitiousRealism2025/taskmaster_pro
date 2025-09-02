// API Route for notification preferences management
// Part of Phase 3.2 - External Integration Layer

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const NotificationPreferencesSchema = z.object({
  pushNotificationsEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
  inAppNotificationsEnabled: z.boolean().optional(),
  taskDeadlines: z.boolean().optional(),
  habitReminders: z.boolean().optional(),
  weeklyReports: z.boolean().optional(),
  projectUpdates: z.boolean().optional(),
  teamMentions: z.boolean().optional(),
  systemAlerts: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  batchingEnabled: z.boolean().optional(),
  maxBatchSize: z.number().min(1).max(50).optional(),
  batchWindowMinutes: z.number().min(5).max(240).optional(),
  maxNotificationsPerHour: z.number().min(1).max(100).optional(),
  digestMode: z.enum(['IMMEDIATE', 'HOURLY', 'DAILY', 'WEEKLY']).optional(),
  minimumPriority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional(),
  dndEnabled: z.boolean().optional(),
  dndSchedule: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/)
  })).optional(),
  intelligentTimingEnabled: z.boolean().optional(),
  learningEnabled: z.boolean().optional()
})

// Get user's notification preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId: session.user.id! }
    })

    if (!preferences) {
      // Return default preferences if none exist
      const defaultPreferences = {
        pushNotificationsEnabled: true,
        emailNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
        taskDeadlines: true,
        habitReminders: true,
        weeklyReports: true,
        projectUpdates: true,
        teamMentions: true,
        systemAlerts: true,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        batchingEnabled: true,
        maxBatchSize: 5,
        batchWindowMinutes: 30,
        maxNotificationsPerHour: 10,
        digestMode: 'IMMEDIATE',
        minimumPriority: 'LOW',
        dndEnabled: false,
        dndSchedule: [],
        intelligentTimingEnabled: true,
        learningEnabled: true
      }

      return NextResponse.json(defaultPreferences)
    }

    return NextResponse.json(preferences)

  } catch (error) {
    console.error('Get notification preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update user's notification preferences
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
    const validatedData = NotificationPreferencesSchema.parse(body)

    const updatedPreferences = await prisma.notificationPreferences.upsert({
      where: { userId: session.user.id! },
      update: {
        ...validatedData,
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id!,
        pushNotificationsEnabled: true,
        emailNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
        taskDeadlines: true,
        habitReminders: true,
        weeklyReports: true,
        projectUpdates: true,
        teamMentions: true,
        systemAlerts: true,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        batchingEnabled: true,
        maxBatchSize: 5,
        batchWindowMinutes: 30,
        maxNotificationsPerHour: 10,
        digestMode: 'IMMEDIATE',
        minimumPriority: 'LOW',
        dndEnabled: false,
        dndSchedule: [],
        intelligentTimingEnabled: true,
        learningEnabled: true,
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences,
      message: 'Notification preferences updated successfully'
    })

  } catch (error) {
    console.error('Update notification preferences error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Reset preferences to defaults
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const defaultPreferences = {
      pushNotificationsEnabled: true,
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
      taskDeadlines: true,
      habitReminders: true,
      weeklyReports: true,
      projectUpdates: true,
      teamMentions: true,
      systemAlerts: true,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      batchingEnabled: true,
      maxBatchSize: 5,
      batchWindowMinutes: 30,
      maxNotificationsPerHour: 10,
      digestMode: 'IMMEDIATE' as const,
      minimumPriority: 'LOW' as const,
      dndEnabled: false,
      dndSchedule: [],
      intelligentTimingEnabled: true,
      learningEnabled: true
    }

    const resetPreferences = await prisma.notificationPreferences.upsert({
      where: { userId: session.user.id! },
      update: {
        ...defaultPreferences,
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id!,
        ...defaultPreferences,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      preferences: resetPreferences,
      message: 'Notification preferences reset to defaults'
    })

  } catch (error) {
    console.error('Reset notification preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}