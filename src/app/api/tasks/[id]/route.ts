import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateTaskSchema } from '@/lib/validations/task'
import { ApiResponse } from '@/types/api'
import { TaskStatus } from '@prisma/client'

// GET /api/tasks/[id] - Get task by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', success: false },
        { status: 401 }
      )
    }

    const task = await prisma.task.findUnique({
      where: { 
        id: params.id,
        userId: session.user.id // Ensure user owns the task
      },
      include: {
        project: {
          select: { id: true, name: true, color: true }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found', code: 'TASK_NOT_FOUND', success: false },
        { status: 404 }
      )
    }

    const response: ApiResponse = {
      data: task,
      success: true
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}

// PUT /api/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', success: false },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = updateTaskSchema.safeParse(body)

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

    // Check if task exists and user owns it
    const existingTask = await prisma.task.findUnique({
      where: { 
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found', code: 'TASK_NOT_FOUND', success: false },
        { status: 404 }
      )
    }

    const updateData = validationResult.data

    // If projectId is being updated, verify user owns the new project
    if (updateData.projectId && updateData.projectId !== existingTask.projectId) {
      const project = await prisma.project.findUnique({
        where: { 
          id: updateData.projectId,
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
    const processedData = {
      ...updateData,
      dueDate: updateData.dueDate ? new Date(updateData.dueDate) : undefined,
      completedAt: updateData.completedAt ? new Date(updateData.completedAt) : undefined
    }

    // Auto-set completedAt when status changes to COMPLETED
    if (updateData.status === TaskStatus.COMPLETED && !existingTask.completedAt && !updateData.completedAt) {
      processedData.completedAt = new Date()
    }

    // Clear completedAt when status changes from COMPLETED
    if (updateData.status && updateData.status !== TaskStatus.COMPLETED && existingTask.completedAt) {
      processedData.completedAt = null
    }

    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: processedData,
      include: {
        project: {
          select: { id: true, name: true, color: true }
        }
      }
    })

    const response: ApiResponse = {
      data: updatedTask,
      success: true,
      message: 'Task updated successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', success: false },
        { status: 401 }
      )
    }

    // Check if task exists and user owns it
    const existingTask = await prisma.task.findUnique({
      where: { 
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found', code: 'TASK_NOT_FOUND', success: false },
        { status: 404 }
      )
    }

    await prisma.task.delete({
      where: { id: params.id }
    })

    const response: ApiResponse = {
      success: true,
      message: 'Task deleted successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}