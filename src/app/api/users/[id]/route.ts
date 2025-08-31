import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateUserSchema } from '@/lib/validations/user'
import { ApiResponse } from '@/types/api'

// GET /api/users/[id] - Get user by ID
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

    // Users can only access their own data or admin access
    if (session.user.id !== params.id) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN', success: false },
        { status: 403 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projects: true,
            tasks: true,
            notes: true,
            habits: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND', success: false },
        { status: 404 }
      )
    }

    const response: ApiResponse = {
      data: user,
      success: true
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id] - Update user
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

    // Users can only update their own data
    if (session.user.id !== params.id) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN', success: false },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = updateUserSchema.safeParse(body)

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

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: validationResult.data,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        updatedAt: true
      }
    })

    const response: ApiResponse = {
      data: updatedUser,
      success: true,
      message: 'User updated successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Delete user
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

    // Users can only delete their own account
    if (session.user.id !== params.id) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN', success: false },
        { status: 403 }
      )
    }

    await prisma.user.delete({
      where: { id: params.id }
    })

    const response: ApiResponse = {
      success: true,
      message: 'User deleted successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}