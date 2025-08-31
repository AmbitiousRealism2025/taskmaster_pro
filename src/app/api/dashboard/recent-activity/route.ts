import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types/api'

export interface RecentActivityItem {
  id: string
  type: 'task_created' | 'task_completed' | 'task_updated' | 'project_created'
  title: string
  description?: string
  timestamp: Date
  metadata?: {
    projectName?: string
    previousStatus?: string
    newStatus?: string
    priority?: string
  }
}

// GET /api/dashboard/recent-activity - Get recent user activity
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', success: false },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const days = parseInt(searchParams.get('days') || '7')

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    // Get recent tasks and projects
    const [recentTasks, recentProjects, recentCompletions] = await Promise.all([
      // Recently created tasks
      prisma.task.findMany({
        where: {
          userId: session.user.id,
          createdAt: { gte: cutoffDate }
        },
        include: {
          project: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Math.floor(limit * 0.4) // 40% of limit for created tasks
      }),

      // Recently created projects
      prisma.project.findMany({
        where: {
          userId: session.user.id,
          createdAt: { gte: cutoffDate }
        },
        orderBy: { createdAt: 'desc' },
        take: Math.floor(limit * 0.2) // 20% of limit for projects
      }),

      // Recently completed tasks
      prisma.task.findMany({
        where: {
          userId: session.user.id,
          completedAt: { 
            gte: cutoffDate,
            not: null
          }
        },
        include: {
          project: {
            select: { name: true }
          }
        },
        orderBy: { completedAt: 'desc' },
        take: Math.floor(limit * 0.4) // 40% of limit for completed tasks
      })
    ])

    // Convert to activity items
    const activityItems: RecentActivityItem[] = []

    // Add task creations
    recentTasks.forEach(task => {
      activityItems.push({
        id: `task_created_${task.id}`,
        type: 'task_created',
        title: `Created task: ${task.title}`,
        description: task.description || undefined,
        timestamp: task.createdAt,
        metadata: {
          projectName: task.project?.name,
          priority: task.priority
        }
      })
    })

    // Add project creations
    recentProjects.forEach(project => {
      activityItems.push({
        id: `project_created_${project.id}`,
        type: 'project_created',
        title: `Created project: ${project.name}`,
        description: project.description || undefined,
        timestamp: project.createdAt
      })
    })

    // Add task completions
    recentCompletions.forEach(task => {
      if (task.completedAt) {
        activityItems.push({
          id: `task_completed_${task.id}`,
          type: 'task_completed',
          title: `Completed task: ${task.title}`,
          description: task.description || undefined,
          timestamp: task.completedAt,
          metadata: {
            projectName: task.project?.name,
            priority: task.priority
          }
        })
      }
    })

    // Sort all activity by timestamp (most recent first) and limit results
    const sortedActivity = activityItems
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)

    const response: ApiResponse<RecentActivityItem[]> = {
      data: sortedActivity,
      success: true
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}