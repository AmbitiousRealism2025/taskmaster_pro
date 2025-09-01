import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateNoteSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional().default(''),
  folderId: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  isPinned: z.boolean().optional().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const folderId = searchParams.get('folderId')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const sortBy = searchParams.get('sortBy') || 'updatedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {
      userId: session.user.id,
    }

    if (!includeArchived) {
      where.isArchived = false
    }

    if (folderId) {
      where.folderId = folderId
    }

    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { plainTextContent: { contains: query, mode: 'insensitive' } },
        { tags: { hasSome: [query] } },
      ]
    }

    if (tags && tags.length > 0) {
      where.tags = { hasEvery: tags }
    }

    // Build orderBy
    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const notes = await prisma.note.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
      include: {
        folder: true,
      },
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Notes fetch error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateNoteSchema.parse(body)

    // Generate plain text content from HTML content
    const plainTextContent = validatedData.content
      ? validatedData.content.replace(/<[^>]*>/g, '').trim()
      : ''

    const note = await prisma.note.create({
      data: {
        title: validatedData.title,
        content: validatedData.content,
        plainTextContent,
        folderId: validatedData.folderId,
        tags: validatedData.tags,
        isPinned: validatedData.isPinned,
        userId: session.user.id,
      },
      include: {
        folder: true,
      },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }

    console.error('Note creation error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}