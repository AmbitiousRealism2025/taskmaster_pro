import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateNoteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  folderId: z.string().nullish(),
  tags: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const note = await prisma.note.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        folder: true,
      },
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Update last viewed timestamp
    await prisma.note.update({
      where: { id: params.id },
      data: { lastViewedAt: new Date() },
    })

    return NextResponse.json(note)
  } catch (error) {
    console.error('Note fetch error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = UpdateNoteSchema.parse(body)

    // Check if note exists and belongs to user
    const existingNote = await prisma.note.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Build update data
    const updateData: any = {
      ...validatedData,
      updatedAt: new Date(),
    }

    // Generate plain text content if content is being updated
    if (validatedData.content !== undefined) {
      updateData.plainTextContent = validatedData.content
        ? validatedData.content.replace(/<[^>]*>/g, '').trim()
        : ''
    }

    const updatedNote = await prisma.note.update({
      where: { id: params.id },
      data: updateData,
      include: {
        folder: true,
      },
    })

    return NextResponse.json(updatedNote)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }

    console.error('Note update error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if note exists and belongs to user
    const existingNote = await prisma.note.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    await prisma.note.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Note deleted successfully' })
  } catch (error) {
    console.error('Note deletion error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}