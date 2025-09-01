import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createUserSchema } from '@/lib/validations/user'
import { ApiResponse } from '@/types/api'
import bcrypt from 'bcryptjs'

// GET /api/users - List users (admin only for now, simplified for testing)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', success: false },
        { status: 401 }
      )
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const response: ApiResponse = {
      data: users,
      success: true
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}

// POST /api/users - Create user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = createUserSchema.safeParse(body)

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

    const { email, name, hashedPassword } = validationResult.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists', code: 'USER_EXISTS', success: false },
        { status: 409 }
      )
    }

    // Hash password if provided
    let finalHashedPassword = hashedPassword
    if (hashedPassword && !hashedPassword.startsWith('$2')) {
      finalHashedPassword = await bcrypt.hash(hashedPassword, 12)
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword: finalHashedPassword
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    })

    const response: ApiResponse = {
      data: user,
      success: true,
      message: 'User created successfully'
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR', success: false },
      { status: 500 }
    )
  }
}