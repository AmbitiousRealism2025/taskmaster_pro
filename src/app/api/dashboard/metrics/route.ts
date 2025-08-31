import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types/api'
import { TaskStatus, Priority } from '@prisma/client'

export interface DashboardMetrics {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  todoTasks: number
  totalProjects: number
  activeProjects: number
  completionRate: number
  priorityBreakdown: {
    high: number
    urgent: number
    medium: number
    low: number
  }
  recentActivity: {
    tasksCreatedToday: number
    tasksCompletedToday: number
    tasksCreatedThisWeek: number
    tasksCompletedThisWeek: number
  }
}

// GET /api/dashboard/metrics - Get dashboard metrics for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', success: false },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    // Get all metrics in parallel for performance
    const [
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      totalProjects,
      activeProjects,
      tasksCreatedToday,
      tasksCompletedToday,
      tasksCreatedThisWeek,
      tasksCompletedThisWeek
    ] = await Promise.all([
      // Total tasks
      prisma.task.count({ where: { userId } }),
      
      // Tasks by status
      prisma.task.groupBy({
        by: ['status'],
        where: { userId },
        _count: { status: true }
      }),
      
      // Tasks by priority
      prisma.task.groupBy({
        by: ['priority'],
        where: { userId },
        _count: { priority: true }
      }),
      
      // Total projects
      prisma.project.count({ where: { userId } }),
      
      // Active projects (projects with incomplete tasks)
      prisma.project.count({
        where: {
          userId,
          tasks: {
            some: {
              status: {
                in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
              }
            }
          }
        }
      }),
      
      // Tasks created today
      prisma.task.count({
        where: {
          userId,
          createdAt: { gte: today }
        }
      }),
      
      // Tasks completed today
      prisma.task.count({
        where: {
          userId,
          status: TaskStatus.COMPLETED,
          completedAt: { gte: today }
        }
      }),
      
      // Tasks created this week
      prisma.task.count({
        where: {
          userId,
          createdAt: { gte: weekAgo }
        }
      }),
      
      // Tasks completed this week
      prisma.task.count({
        where: {
          userId,
          status: TaskStatus.COMPLETED,
          completedAt: { gte: weekAgo }
        }
      })
    ])

    // Process status counts
    const statusCounts = {
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.COMPLETED]: 0,
      [TaskStatus.CANCELLED]: 0
    }
    
    tasksByStatus.forEach(item => {
      statusCounts[item.status] = item._count.status
    })

    // Process priority counts
    const priorityCounts = {
      [Priority.LOW]: 0,
      [Priority.MEDIUM]: 0,
      [Priority.HIGH]: 0,
      [Priority.URGENT]: 0
    }
    
    tasksByPriority.forEach(item => {
      priorityCounts[item.priority] = item._count.priority
    })

    // Calculate completion rate
    const completionRate = totalTasks > 0 ? 
      Math.round((statusCounts[TaskStatus.COMPLETED] / totalTasks) * 100) : 0

    const metrics: DashboardMetrics = {
      totalTasks,
      completedTasks: statusCounts[TaskStatus.COMPLETED],
      inProgressTasks: statusCounts[TaskStatus.IN_PROGRESS],
      todoTasks: statusCounts[TaskStatus.TODO],
      totalProjects,
      activeProjects,
      completionRate,
      priorityBreakdown: {
        low: priorityCounts[Priority.LOW],
        medium: priorityCounts[Priority.MEDIUM],
        high: priorityCounts[Priority.HIGH],
        urgent: priorityCounts[Priority.URGENT]
      },
      recentActivity: {
        tasksCreatedToday,
        tasksCompletedToday,
        tasksCreatedThisWeek,
        tasksCompletedThisWeek
      }
    }

    const response: ApiResponse<DashboardMetrics> = {
      data: metrics,
      success: true
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}