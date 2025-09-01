import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createTaskSchema, taskQuerySchema } from '@/lib/validations/task'
import { ApiResponse, PaginatedResponse } from '@/types/api'
import { Prisma, TaskStatus } from '@prisma/client'

// GET /api/tasks - List user's tasks with filtering and pagination
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
    
    // Parse and validate query parameters
    const queryResult = taskQuerySchema.safeParse({
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      status: searchParams.get('status'),
      priority: searchParams.get('priority'),
      projectId: searchParams.get('projectId'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc'
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters', 
          code: 'VALIDATION_ERROR',
          success: false,
          details: queryResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { page, limit, status, priority, projectId, search, sortBy, sortOrder } = queryResult.data

    // Build where clause
    const where: Prisma.TaskWhereInput = {
      userId: session.user.id,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(projectId && { projectId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    }

    // Execute queries in parallel
    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          project: {
            select: { id: true, name: true, color: true }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.task.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    const response: PaginatedResponse = {
      data: tasks,
      success: true,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}

// POST /api/tasks - Create task
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
    const validationResult = createTaskSchema.safeParse(body)

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

    const taskData = validationResult.data

    // If projectId provided, verify user owns the project
    if (taskData.projectId) {
      const project = await prisma.project.findUnique({
        where: { 
          id: taskData.projectId,
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

    // Convert dueDate string to Date object if provided
    const processedData = {
      ...taskData,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined
    }

    const task = await prisma.task.create({
      data: {
        ...processedData,
        userId: session.user.id
      },
      include: {
        project: {
          select: { id: true, name: true, color: true }
        }
      }
    })

    const response: ApiResponse = {
      data: task,
      success: true,
      message: 'Task created successfully'
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}