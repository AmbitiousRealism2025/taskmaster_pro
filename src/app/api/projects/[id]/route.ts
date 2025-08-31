import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateProjectSchema } from '@/lib/validations/project'
import { ApiResponse } from '@/types/api'

// GET /api/projects/[id] - Get project by ID
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

    const project = await prisma.project.findUnique({
      where: { 
        id: params.id,
        userId: session.user.id // Ensure user owns the project
      },
      include: {
        _count: {
          select: { tasks: true }
        },
        tasks: {
          take: 5, // Recent tasks
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND', success: false },
        { status: 404 }
      )
    }

    const response: ApiResponse = {
      data: project,
      success: true
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}

// PUT /api/projects/[id] - Update project
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
    const validationResult = updateProjectSchema.safeParse(body)

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

    // Check if project exists and user owns it
    const existingProject = await prisma.project.findUnique({
      where: { 
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND', success: false },
        { status: 404 }
      )
    }

    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: validationResult.data,
      include: {
        _count: {
          select: { tasks: true }
        }
      }
    })

    const response: ApiResponse = {
      data: updatedProject,
      success: true,
      message: 'Project updated successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id] - Delete project
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

    // Check if project exists and user owns it
    const existingProject = await prisma.project.findUnique({
      where: { 
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND', success: false },
        { status: 404 }
      )
    }

    await prisma.project.delete({
      where: { id: params.id }
    })

    const response: ApiResponse = {
      success: true,
      message: 'Project deleted successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}