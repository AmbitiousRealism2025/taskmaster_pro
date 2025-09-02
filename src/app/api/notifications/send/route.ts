// API Route for sending notifications through Enhanced Notification System
// Part of Phase 3.2 - External Integration Layer

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/config'
import { getNotificationService } from '@/lib/notifications/EnhancedNotificationService'
import { z } from 'zod'

const SendNotificationSchema = z.object({
  userId: z.string().optional(),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  icon: z.string().url().optional(),
  image: z.string().url().optional(),
  badge: z.string().url().optional(),
  tag: z.string().optional(),
  requireInteraction: z.boolean().default(false),
  silent: z.boolean().default(false),
  priority: z.enum(['CRITICAL', 'HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
  data: z.object({
    type: z.string().optional(),
    entityId: z.string().optional(),
    actionUrl: z.string().optional()
  }).optional(),
  actions: z.array(z.object({
    action: z.string(),
    title: z.string(),
    icon: z.string().optional()
  })).optional(),
  options: z.object({
    batchable: z.boolean().default(true),
    dedupKey: z.string().optional(),
    scheduleFor: z.string().datetime().optional(),
    bypassRateLimit: z.boolean().default(false)
  }).optional()
})

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
    const validatedData = SendNotificationSchema.parse(body)

    // Use authenticated user ID if not specified
    const targetUserId = validatedData.userId || session.user.id!

    // Check if user can send notifications to other users (admin check)
    if (validatedData.userId && validatedData.userId !== session.user.id) {
      // In production, check admin permissions here
      const isAdmin = session.user.role === 'admin' // Assuming role field exists
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Insufficient permissions to send notifications to other users' },
          { status: 403 }
        )
      }
    }

    const notificationService = getNotificationService()

    const result = await notificationService.sendNotification(
      targetUserId,
      {
        title: validatedData.title,
        body: validatedData.body,
        icon: validatedData.icon,
        image: validatedData.image,
        badge: validatedData.badge,
        tag: validatedData.tag,
        requireInteraction: validatedData.requireInteraction,
        silent: validatedData.silent,
        timestamp: Date.now(),
        data: validatedData.data,
        actions: validatedData.actions
      },
      validatedData.priority,
      {
        batchable: validatedData.options?.batchable,
        dedupKey: validatedData.options?.dedupKey,
        scheduleFor: validatedData.options?.scheduleFor ? new Date(validatedData.options.scheduleFor) : undefined,
        bypassRateLimit: validatedData.options?.bypassRateLimit
      }
    )

    return NextResponse.json({
      success: result.success,
      queued: result.queued,
      batchId: result.batchId,
      error: result.error,
      message: result.success 
        ? (result.queued ? 'Notification queued for delivery' : 'Notification sent successfully')
        : 'Failed to send notification'
    })

  } catch (error) {
    console.error('Send notification API error:', error)

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

// Get notification sending statistics (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check admin permissions
    const isAdmin = session.user.role === 'admin' // Assuming role field exists
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const notificationService = getNotificationService()
    const systemHealth = await notificationService.getSystemHealth()

    return NextResponse.json({
      health: systemHealth,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Get notification stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}