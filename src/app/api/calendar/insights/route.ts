// API Route for calendar insights and analytics
// Part of Phase 3.2 - External Integration Layer

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/config'
import { prisma } from '@/lib/prisma'

// Get calendar insights and productivity analytics
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
    const timeframe = searchParams.get('timeframe') || '30' // days
    const insightType = searchParams.get('type') // pattern, optimization, conflict, productivity

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(timeframe))

    // Get calendar insights
    const whereClause: any = {
      userId: session.user.id!,
      createdAt: {
        gte: startDate
      }
    }

    if (insightType) {
      whereClause.type = insightType
    }

    const insights = await prisma.calendarInsight.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // Get focus time blocks for productivity analysis
    const focusBlocks = await prisma.focusTimeBlock.findMany({
      where: {
        userId: session.user.id!,
        startTime: {
          gte: startDate
        },
        completedAt: { not: null }
      },
      orderBy: { startTime: 'desc' }
    })

    // Get productivity patterns
    const productivityPatterns = await prisma.productivityPattern.findMany({
      where: {
        userId: session.user.id!,
        confidence: { gt: 0.3 } // Only show patterns with reasonable confidence
      },
      orderBy: { productivityScore: 'desc' },
      take: 10
    })

    // Calculate productivity metrics
    const productivityMetrics = calculateProductivityMetrics(focusBlocks)

    // Get calendar conflicts
    const conflicts = await prisma.calendarConflict.findMany({
      where: {
        userId: session.user.id!,
        createdAt: {
          gte: startDate
        },
        status: 'pending'
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Generate meeting-aware metrics
    const meetingMetrics = await generateMeetingAwareMetrics(session.user.id!, startDate)

    const response = {
      insights: insights.map(insight => ({
        ...insight,
        data: JSON.parse(insight.data),
        recommendations: JSON.parse(insight.recommendations)
      })),
      focusTimeAnalytics: {
        totalBlocks: focusBlocks.length,
        totalHours: focusBlocks.reduce((sum, block) => sum + block.duration, 0) / 60,
        averageProductivity: productivityMetrics.averageProductivity,
        completionRate: productivityMetrics.completionRate,
        trendDirection: productivityMetrics.trendDirection
      },
      productivityPatterns: productivityPatterns.map(pattern => ({
        timeOfDay: pattern.timeOfDay,
        dayOfWeek: getDayName(pattern.dayOfWeek),
        score: pattern.productivityScore,
        confidence: pattern.confidence,
        sampleSize: pattern.sampleSize
      })),
      conflicts: conflicts.map(conflict => ({
        id: conflict.id,
        type: conflict.type,
        severity: conflict.severity,
        description: conflict.description,
        createdAt: conflict.createdAt,
        metadata: JSON.parse(conflict.metadata || '{}')
      })),
      meetingAwareMetrics,
      summary: {
        totalInsights: insights.length,
        criticalIssues: conflicts.filter(c => c.severity === 'critical').length,
        productivityTrend: productivityMetrics.trendDirection,
        bestProductivityTime: productivityPatterns[0] ? 
          `${productivityPatterns[0].timeOfDay} on ${this.getDayName(productivityPatterns[0].dayOfWeek)}` : 
          'Not enough data'
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Get calendar insights error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar insights' },
      { status: 500 }
    )
  }

}

// Helper methods (these would typically be in a separate utility class)
function calculateProductivityMetrics(focusBlocks: any[]) {
    if (focusBlocks.length === 0) {
      return {
        averageProductivity: 0,
        completionRate: 0,
        trendDirection: 'stable'
      }
    }

    const totalProductivity = focusBlocks.reduce((sum, block) => 
      sum + (block.actualProductivity || 5), 0)
    const averageProductivity = totalProductivity / focusBlocks.length

    const completedTasks = focusBlocks.reduce((sum, block) => 
      sum + (block.completedTasks || 0), 0)
    const totalTasks = focusBlocks.reduce((sum, block) => 
      sum + (block.taskIds?.length || 0), 0)
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    // Calculate trend (last 5 blocks vs previous 5)
    let trendDirection = 'stable'
    if (focusBlocks.length >= 10) {
      const recent = focusBlocks.slice(0, 5)
      const previous = focusBlocks.slice(5, 10)
      
      const recentAvg = recent.reduce((sum, b) => sum + (b.actualProductivity || 5), 0) / 5
      const previousAvg = previous.reduce((sum, b) => sum + (b.actualProductivity || 5), 0) / 5
      
      if (recentAvg > previousAvg * 1.1) trendDirection = 'improving'
      else if (recentAvg < previousAvg * 0.9) trendDirection = 'declining'
    }

    return {
      averageProductivity,
      completionRate,
      trendDirection
    }
  }

async function generateMeetingAwareMetrics(userId: string, startDate: Date) {
  // This would typically analyze calendar events and focus blocks
  // For now, return a simplified version
  return {
    totalMeetingTime: 0,
    focusTimeBlocks: 0,
    averageFocusBlockDuration: 60,
    meetingProductivityImpact: {
      beforeMeeting: 7.0,
      afterMeeting: 5.5,
      recoveryTime: 25
    },
    recommendations: [
      'Schedule focus time after meetings with 30-minute buffers',
      'Limit back-to-back meetings to maintain productivity',
      'Use your peak hours (9-11 AM) for deep work, not meetings'
    ]
  }
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek] || 'Unknown'
}

// Create or update calendar insight
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { 
      type, 
      title, 
      description, 
      data, 
      recommendations 
    } = await request.json()

    if (!type || !title || !description) {
      return NextResponse.json(
        { error: 'Type, title, and description are required' },
        { status: 400 }
      )
    }

    const insight = await prisma.calendarInsight.create({
      data: {
        userId: session.user.id!,
        type,
        title,
        description,
        data: JSON.stringify(data || {}),
        recommendations: JSON.stringify(recommendations || [])
      }
    })

    return NextResponse.json({
      success: true,
      insight: {
        ...insight,
        data: JSON.parse(insight.data),
        recommendations: JSON.parse(insight.recommendations)
      },
      message: 'Calendar insight created successfully'
    })

  } catch (error) {
    console.error('Create calendar insight error:', error)
    return NextResponse.json(
      { error: 'Failed to create calendar insight' },
      { status: 500 }
    )
  }
}

// Mark insight as resolved or update status
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
    const insightId = searchParams.get('insightId')

    if (!insightId) {
      return NextResponse.json(
        { error: 'Insight ID is required' },
        { status: 400 }
      )
    }

    const { resolved, feedback } = await request.json()

    const insight = await prisma.calendarInsight.update({
      where: {
        id: insightId,
        userId: session.user.id! // Ensure user can only update their own insights
      },
      data: {
        resolved: resolved,
        userFeedback: feedback,
        resolvedAt: resolved ? new Date() : null
      }
    })

    return NextResponse.json({
      success: true,
      insight,
      message: 'Calendar insight updated successfully'
    })

  } catch (error) {
    console.error('Update calendar insight error:', error)
    return NextResponse.json(
      { error: 'Failed to update calendar insight' },
      { status: 500 }
    )
  }
}