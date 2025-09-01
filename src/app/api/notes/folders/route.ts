import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateFolderSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().default('#6366f1'),
  parentId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all folders for the user
    const folders = await prisma.folder.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            notes: true,
            children: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { parentId: { sort: 'asc', nulls: 'first' } },
        { name: 'asc' },
      ],
    })

    // Build hierarchical structure and calculate note counts
    const folderMap = new Map()
    const rootFolders = []

    // First pass: create folder objects with note counts
    for (const folder of folders) {
      folderMap.set(folder.id, {
        ...folder,
        noteCount: folder._count.notes,
        children: [],
      })
    }

    // Second pass: build hierarchy
    for (const folder of folders) {
      const folderData = folderMap.get(folder.id)
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId)
        if (parent) {
          parent.children.push(folderData)
        }
      } else {
        rootFolders.push(folderData)
      }
    }

    // Third pass: calculate total note counts including subfolders
    const calculateTotalNotes = (folder: any): number => {
      let total = folder.noteCount
      for (const child of folder.children) {
        total += calculateTotalNotes(child)
      }
      folder.totalNoteCount = total
      return total
    }

    rootFolders.forEach(calculateTotalNotes)

    return NextResponse.json(rootFolders)
  } catch (error) {
    console.error('Folders fetch error:', error)
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
    const validatedData = CreateFolderSchema.parse(body)

    // Verify parent folder exists if parentId is provided
    if (validatedData.parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: validatedData.parentId,
          userId: session.user.id,
        },
      })

      if (!parentFolder) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 })
      }
    }

    // Build path for breadcrumb navigation
    let path = ''
    if (validatedData.parentId) {
      const parent = await prisma.folder.findFirst({
        where: {
          id: validatedData.parentId,
          userId: session.user.id,
        },
      })
      if (parent) {
        path = parent.path ? `${parent.path}/${parent.name}` : parent.name
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name: validatedData.name,
        color: validatedData.color,
        parentId: validatedData.parentId,
        path,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            notes: true,
            children: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      ...folder,
      noteCount: folder._count.notes,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }

    console.error('Folder creation error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}