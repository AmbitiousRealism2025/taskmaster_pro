import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Note, Folder, CreateNoteData, UpdateNoteData, NoteSearchOptions } from '@/types/note'
import { useNotesStore } from '@/stores/notesStore'
import { toast } from 'sonner'

// API functions
async function fetchNotes(options: NoteSearchOptions = {}): Promise<Note[]> {
  const params = new URLSearchParams()
  
  if (options.query) params.append('query', options.query)
  if (options.folderId) params.append('folderId', options.folderId)
  if (options.tags?.length) params.append('tags', options.tags.join(','))
  if (options.includeArchived) params.append('includeArchived', 'true')
  if (options.sortBy) params.append('sortBy', options.sortBy)
  if (options.sortOrder) params.append('sortOrder', options.sortOrder)
  if (options.limit) params.append('limit', options.limit.toString())
  if (options.offset) params.append('offset', options.offset.toString())

  const response = await fetch(`/api/notes?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch notes')
  }
  
  return response.json()
}

async function fetchNote(id: string): Promise<Note> {
  const response = await fetch(`/api/notes/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch note')
  }
  
  return response.json()
}

async function createNote(data: CreateNoteData): Promise<Note> {
  const response = await fetch('/api/notes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error('Failed to create note')
  }
  
  return response.json()
}

async function updateNote(id: string, data: UpdateNoteData): Promise<Note> {
  const response = await fetch(`/api/notes/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error('Failed to update note')
  }
  
  return response.json()
}

async function deleteNote(id: string): Promise<void> {
  const response = await fetch(`/api/notes/${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    throw new Error('Failed to delete note')
  }
}

async function fetchFolders(): Promise<Folder[]> {
  const response = await fetch('/api/notes/folders')
  if (!response.ok) {
    throw new Error('Failed to fetch folders')
  }
  
  return response.json()
}

async function createFolder(data: { name: string; color: string; parentId?: string }): Promise<Folder> {
  const response = await fetch('/api/notes/folders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error('Failed to create folder')
  }
  
  return response.json()
}

// React Query hooks
export function useNotes(options: NoteSearchOptions = {}) {
  const { setNotes, setIsLoading } = useNotesStore()
  
  const result = useQuery({
    queryKey: ['notes', options],
    queryFn: () => fetchNotes(options),
  })

  React.useEffect(() => {
    if (result.data) {
      setNotes(result.data)
      setIsLoading(false)
    }
  }, [result.data, setNotes, setIsLoading])

  React.useEffect(() => {
    if (result.error) {
      setIsLoading(false)
      toast.error('Failed to load notes')
    }
  }, [result.error, setIsLoading])
  
  return result
}

export function useNote(id: string) {
  return useQuery({
    queryKey: ['notes', id],
    queryFn: () => fetchNote(id),
    enabled: !!id,
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  const { addNote, optimisticUpdateNote, rollbackOptimisticUpdate } = useNotesStore()
  
  return useMutation({
    mutationFn: createNote,
    onMutate: async (data) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      
      // Create optimistic note
      const optimisticNote: Note = {
        id: `temp-${Date.now()}`,
        title: data.title,
        content: data.content || '',
        plainTextContent: data.content || '',
        folderId: data.folderId,
        tags: data.tags || [],
        isPinned: data.isPinned || false,
        isArchived: false,
        userId: '', // Will be set by server
        createdAt: new Date(),
        updatedAt: new Date(),
        extractedTasks: [],
        isShared: false,
        sharedWith: [],
        permissions: [],
      }
      
      // Optimistically add to store
      addNote(optimisticNote)
      
      return { optimisticNote }
    },
    onSuccess: (newNote, variables, context) => {
      // Replace optimistic note with real note
      if (context?.optimisticNote) {
        const { optimisticUpdateNote } = useNotesStore.getState()
        optimisticUpdateNote(context.optimisticNote.id, newNote)
      }
      
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Note created successfully')
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.optimisticNote) {
        const { removeNote } = useNotesStore.getState()
        removeNote(context.optimisticNote.id)
      }
      
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast.error('Failed to create note')
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()
  const { optimisticUpdateNote, rollbackOptimisticUpdate } = useNotesStore()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNoteData }) => 
      updateNote(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notes', id] })
      
      // Snapshot the previous value
      const previousNote = queryClient.getQueryData<Note>(['notes', id])
      
      // Optimistically update
      if (previousNote) {
        optimisticUpdateNote(id, data)
        queryClient.setQueryData(['notes', id], { ...previousNote, ...data })
      }
      
      return { previousNote }
    },
    onSuccess: (updatedNote, { id }) => {
      queryClient.setQueryData(['notes', id], updatedNote)
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
    onError: (error, { id }, context) => {
      // Rollback
      if (context?.previousNote) {
        rollbackOptimisticUpdate(id, context.previousNote)
        queryClient.setQueryData(['notes', id], context.previousNote)
      }
      
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast.error('Failed to update note')
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  const { removeNote } = useNotesStore()
  
  return useMutation({
    mutationFn: deleteNote,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      
      const previousNote = queryClient.getQueryData<Note>(['notes', id])
      
      // Optimistically remove
      removeNote(id)
      queryClient.removeQueries({ queryKey: ['notes', id] })
      
      return { previousNote }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Note deleted successfully')
    },
    onError: (error, id, context) => {
      // Rollback
      if (context?.previousNote) {
        const { addNote } = useNotesStore.getState()
        addNote(context.previousNote)
      }
      
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast.error('Failed to delete note')
    },
  })
}

export function useFolders() {
  const { setFolders } = useNotesStore()
  
  const result = useQuery({
    queryKey: ['folders'],
    queryFn: fetchFolders,
  })

  React.useEffect(() => {
    if (result.data) {
      setFolders(result.data)
    }
  }, [result.data, setFolders])
  
  return result
}

export function useCreateFolder() {
  const queryClient = useQueryClient()
  const { addFolder } = useNotesStore()
  
  return useMutation({
    mutationFn: createFolder,
    onSuccess: (newFolder) => {
      addFolder(newFolder)
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      toast.success('Folder created successfully')
    },
    onError: () => {
      toast.error('Failed to create folder')
    },
  })
}