// API Route for focus time optimization and scheduling
// Part of Phase 3.2 - External Integration Layer

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/config'
import { FocusTimeOptimizer } from '@/lib/calendar/focus-time-optimizer'
import { z } from 'zod'

const FindOptimalTimeSchema = z.object({
  duration: z.number().min(15).max(480), // 15 minutes to 8 hours
  earliestStart: z.string().datetime().optional(),
  latestEnd: z.string().datetime().optional(),
  preferredDays: z.array(z.number().min(0).max(6)).optional(),
  avoidMeetingBuffer: z.number().min(0).max(120).optional(),
  minimumGap: z.number().min(0).max(60).optional()
})

const CreateFocusBlockSchema = z.object({
  taskIds: z.array(z.string()).min(1),
  duration: z.number().min(15).max(480).optional(),
  location: z.string().optional(),
  tools: z.array(z.string()).optional(),
  distractionLevel: z.enum(['low', 'medium', 'high']).optional()
})

const CompleteFocusBlockSchema = z.object({
  completedTasks: z.number().min(0),
  actualDuration: z.number().min(0).optional(),
  interruptions: z.number().min(0).optional(),
  productivityScore: z.number().min(1).max(10).optional(),
  notes: z.string().optional()
})

const optimizer = new FocusTimeOptimizer()

// Find optimal focus time slots
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
    const duration = parseInt(searchParams.get('duration') || '60')
    const earliestStart = searchParams.get('earliestStart')
    const latestEnd = searchParams.get('latestEnd')
    const preferredDays = searchParams.get('preferredDays')?.split(',').map(d => parseInt(d))
    const avoidMeetingBuffer = parseInt(searchParams.get('avoidMeetingBuffer') || '15')
    const minimumGap = parseInt(searchParams.get('minimumGap') || '30')

    const preferences = {
      earliestStart: earliestStart ? new Date(earliestStart) : undefined,
      latestEnd: latestEnd ? new Date(latestEnd) : undefined,
      preferredDays,
      avoidMeetingBuffer,
      minimumGap
    }

    const timeSlots = await optimizer.findOptimalFocusTime(
      session.user.id!,
      duration,
      preferences
    )

    return NextResponse.json({
      timeSlots,
      count: timeSlots.length,
      message: `Found ${timeSlots.length} optimal time slots`
    })

  } catch (error) {
    console.error('Find optimal focus time error:', error)
    return NextResponse.json(
      { error: 'Failed to find optimal focus time slots' },
      { status: 500 }
    )
  }
}

// Create focus time block
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
    const validatedData = CreateFocusBlockSchema.parse(body)

    const focusBlock = await optimizer.createFocusTimeBlock(
      session.user.id!,
      validatedData.taskIds,
      {
        duration: validatedData.duration,
        location: validatedData.location,
        tools: validatedData.tools,
        distractionLevel: validatedData.distractionLevel
      }
    )

    return NextResponse.json({
      success: true,
      focusBlock,
      message: 'Focus time block created successfully'
    })

  } catch (error) {
    console.error('Create focus time block error:', error)

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

    let errorMessage = 'Failed to create focus time block'
    let statusCode = 500

    if (error.message === 'No valid tasks found') {
      errorMessage = 'No valid tasks found for focus block'
      statusCode = 400
    } else if (error.message === 'No suitable time slots found') {
      errorMessage = 'No suitable time slots available'
      statusCode = 409
    } else if (error.message === 'Calendar sync not configured') {
      errorMessage = 'Calendar integration required for focus time blocks'
      statusCode = 400
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}

// Complete focus time block with results
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
    const blockId = searchParams.get('blockId')

    if (!blockId) {
      return NextResponse.json(
        { error: 'Focus block ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = CompleteFocusBlockSchema.parse(body)

    await optimizer.completeFocusTimeBlock(blockId, {
      completedTasks: validatedData.completedTasks,
      actualDuration: validatedData.actualDuration,
      interruptions: validatedData.interruptions,
      productivityScore: validatedData.productivityScore,
      notes: validatedData.notes
    })

    return NextResponse.json({
      success: true,
      message: 'Focus time block completed successfully'
    })

  } catch (error) {
    console.error('Complete focus time block error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid completion data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    let errorMessage = 'Failed to complete focus time block'
    let statusCode = 500

    if (error.message === 'Focus time block not found') {
      errorMessage = 'Focus time block not found'
      statusCode = 404
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}