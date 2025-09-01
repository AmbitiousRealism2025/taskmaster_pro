import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateTaskSchema, batchTaskSchema } from '@/lib/validations/task'
import { ApiResponse } from '@/types/api'
import { z } from 'zod'

const batchUpdateSchema = z.object({
  taskIds: z.array(z.string()).min(1, 'At least one task ID is required'),
  updates: updateTaskSchema
})

// POST /api/tasks/batch - Batch update tasks
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', success: false },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = batchUpdateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          code: 'VALIDATION_ERROR',
          success: false,
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { taskIds, updates } = validationResult.data

    // Verify all tasks belong to the user
    const existingTasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        userId: session.user.id
      },
      select: { id: true }
    })

    const foundTaskIds = existingTasks.map(task => task.id)
    const notFoundTaskIds = taskIds.filter(id => !foundTaskIds.includes(id))

    if (notFoundTaskIds.length > 0) {
      return NextResponse.json(
        { 
          error: `Tasks not found or access denied: ${notFoundTaskIds.join(', ')}`, 
          code: 'TASKS_NOT_FOUND',
          success: false 
        },
        { status: 404 }
      )
    }

    // If projectId is being updated, verify user owns the project
    if (updates.projectId) {
      const project = await prisma.project.findUnique({
        where: { 
          id: updates.projectId,
          userId: session.user.id
        }
      })

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found or access denied', code: 'PROJECT_NOT_FOUND', success: false },
          { status: 404 }
        )
      }
    }

    // Process date fields
    const processedUpdates = {
      ...updates,
      dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
      completedAt: updates.completedAt ? new Date(updates.completedAt) : undefined
    }

    // Batch update tasks
    const updatedTasks = await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        userId: session.user.id
      },
      data: processedUpdates
    })

    // Fetch updated tasks to return
    const refreshedTasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        userId: session.user.id
      },
      include: {
        project: {
          select: { id: true, name: true, color: true }
        }
      }
    })

    const response: ApiResponse = {
      data: {
        count: updatedTasks.count,
        tasks: refreshedTasks
      },
      success: true,
      message: `Successfully updated ${updatedTasks.count} tasks`
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error batch updating tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}

// PUT /api/tasks/batch - Batch create tasks
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', success: false },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = batchTaskSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          code: 'VALIDATION_ERROR',
          success: false,
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { tasks, projectId } = validationResult.data

    // If projectId is specified, verify user owns the project
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { 
          id: projectId,
          userId: session.user.id
        }
      })

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found or access denied', code: 'PROJECT_NOT_FOUND', success: false },
          { status: 404 }
        )
      }
    }

    // Create tasks in batch
    const createdTasks = await Promise.all(
      tasks.map(taskData => {
        // Process the task data
        const processedData = {
          ...taskData,
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
          projectId: taskData.projectId || projectId,
          userId: session.user.id
        }

        return prisma.task.create({
          data: processedData,
          include: {
            project: {
              select: { id: true, name: true, color: true }
            }
          }
        })
      })
    )

    const response: ApiResponse = {
      data: {
        count: createdTasks.length,
        tasks: createdTasks
      },
      success: true,
      message: `Successfully created ${createdTasks.length} tasks`
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error batch creating tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}