import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Note, Folder, CreateNoteData, UpdateNoteData, NoteSearchOptions } from '@/types/note'

interface NotesState {
  // Notes
  notes: Note[]
  selectedNote: Note | null
  isLoading: boolean
  
  // Folders
  folders: Folder[]
  selectedFolderId: string | null
  
  // Search & Filters
  searchQuery: string
  selectedTags: string[]
  showArchived: boolean
  sortBy: 'title' | 'createdAt' | 'updatedAt' | 'lastViewedAt'
  sortOrder: 'asc' | 'desc'
  
  // UI State
  isCreating: boolean
  sidebarOpen: boolean
  viewMode: 'grid' | 'list'
  
  // Actions
  setNotes: (notes: Note[]) => void
  addNote: (note: Note) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  removeNote: (id: string) => void
  selectNote: (note: Note | null) => void
  
  // Folders
  setFolders: (folders: Folder[]) => void
  addFolder: (folder: Folder) => void
  updateFolder: (id: string, updates: Partial<Folder>) => void
  removeFolder: (id: string) => void
  selectFolder: (folderId: string | null) => void
  
  // Search & Filters
  setSearchQuery: (query: string) => void
  setSelectedTags: (tags: string[]) => void
  toggleTag: (tag: string) => void
  setShowArchived: (show: boolean) => void
  setSortBy: (sortBy: 'title' | 'createdAt' | 'updatedAt' | 'lastViewedAt') => void
  setSortOrder: (order: 'asc' | 'desc') => void
  
  // UI Actions
  setIsCreating: (creating: boolean) => void
  setSidebarOpen: (open: boolean) => void
  setViewMode: (mode: 'grid' | 'list') => void
  setIsLoading: (loading: boolean) => void
  
  // Computed getters
  getFilteredNotes: () => Note[]
  getNotesInFolder: (folderId: string | null) => Note[]
  getAllTags: () => string[]
  
  // Optimistic updates
  optimisticUpdateNote: (id: string, updates: Partial<Note>) => void
  rollbackOptimisticUpdate: (id: string, originalNote: Note) => void
  
  // Auto-save functionality
  autosaveNote: (id: string, content: string, plainText: string) => void
}

export const useNotesStore = create<NotesState>()(
  devtools(
    (set, get) => ({
      // Initial state
      notes: [],
      selectedNote: null,
      isLoading: false,
      
      folders: [],
      selectedFolderId: null,
      
      searchQuery: '',
      selectedTags: [],
      showArchived: false,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      
      isCreating: false,
      sidebarOpen: true,
      viewMode: 'list',
      
      // Notes actions
      setNotes: (notes) => set({ notes }),
      
      addNote: (note) => set(state => ({
        notes: [note, ...state.notes],
        selectedNote: note
      })),
      
      updateNote: (id, updates) => set(state => ({
        notes: state.notes.map(note => 
          note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note
        ),
        selectedNote: state.selectedNote?.id === id 
          ? { ...state.selectedNote, ...updates, updatedAt: new Date() }
          : state.selectedNote
      })),
      
      removeNote: (id) => set(state => ({
        notes: state.notes.filter(note => note.id !== id),
        selectedNote: state.selectedNote?.id === id ? null : state.selectedNote
      })),
      
      selectNote: (note) => set({ selectedNote: note }),
      
      // Folders actions
      setFolders: (folders) => set({ folders }),
      
      addFolder: (folder) => set(state => ({
        folders: [...state.folders, folder]
      })),
      
      updateFolder: (id, updates) => set(state => ({
        folders: state.folders.map(folder => 
          folder.id === id ? { ...folder, ...updates } : folder
        )
      })),
      
      removeFolder: (id) => set(state => ({
        folders: state.folders.filter(folder => folder.id !== id),
        selectedFolderId: state.selectedFolderId === id ? null : state.selectedFolderId
      })),
      
      selectFolder: (folderId) => set({ selectedFolderId: folderId }),
      
      // Search & Filters
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setSelectedTags: (tags) => set({ selectedTags: tags }),
      
      toggleTag: (tag) => set(state => ({
        selectedTags: state.selectedTags.includes(tag)
          ? state.selectedTags.filter(t => t !== tag)
          : [...state.selectedTags, tag]
      })),
      
      setShowArchived: (show) => set({ showArchived: show }),
      
      setSortBy: (sortBy) => set({ sortBy }),
      
      setSortOrder: (order) => set({ sortOrder: order }),
      
      // UI Actions
      setIsCreating: (creating) => set({ isCreating: creating }),
      
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      setViewMode: (mode) => set({ viewMode: mode }),
      
      setIsLoading: (loading) => set({ isLoading: loading }),
      
      // Computed getters
      getFilteredNotes: () => {
        const state = get()
        let filtered = [...state.notes]
        
        // Filter by search query
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase()
          filtered = filtered.filter(note => 
            note.title.toLowerCase().includes(query) ||
            note.plainTextContent?.toLowerCase().includes(query) ||
            note.tags.some(tag => tag.toLowerCase().includes(query))
          )
        }
        
        // Filter by folder
        if (state.selectedFolderId) {
          filtered = filtered.filter(note => note.folderId === state.selectedFolderId)
        }
        
        // Filter by tags
        if (state.selectedTags.length > 0) {
          filtered = filtered.filter(note => 
            state.selectedTags.every(tag => note.tags.includes(tag))
          )
        }
        
        // Filter by archived status
        if (!state.showArchived) {
          filtered = filtered.filter(note => !note.isArchived)
        }
        
        // Sort
        filtered.sort((a, b) => {
          const aValue = a[state.sortBy]
          const bValue = b[state.sortBy]
          
          if (aValue instanceof Date && bValue instanceof Date) {
            const comparison = aValue.getTime() - bValue.getTime()
            return state.sortOrder === 'desc' ? -comparison : comparison
          }
          
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            const comparison = aValue.localeCompare(bValue)
            return state.sortOrder === 'desc' ? -comparison : comparison
          }
          
          return 0
        })
        
        return filtered
      },
      
      getNotesInFolder: (folderId) => {
        const state = get()
        return state.notes.filter(note => note.folderId === folderId)
      },
      
      getAllTags: () => {
        const state = get()
        const allTags = state.notes.flatMap(note => note.tags)
        return [...new Set(allTags)].sort()
      },
      
      // Optimistic updates
      optimisticUpdateNote: (id, updates) => {
        get().updateNote(id, updates)
      },
      
      rollbackOptimisticUpdate: (id, originalNote) => {
        set(state => ({
          notes: state.notes.map(note => 
            note.id === id ? originalNote : note
          ),
          selectedNote: state.selectedNote?.id === id ? originalNote : state.selectedNote
        }))
      },
      
      // Auto-save functionality with debounce
      autosaveNote: (id, content, plainText) => {
        // Clear any existing autosave timeout
        const timeoutKey = `autosave-${id}`
        const existingTimeout = (globalThis as any)[timeoutKey]
        if (existingTimeout) {
          clearTimeout(existingTimeout)
        }
        
        // Set new autosave timeout
        (globalThis as any)[timeoutKey] = setTimeout(() => {
          get().updateNote(id, { 
            content, 
            plainTextContent: plainText,
            updatedAt: new Date()
          })
        }, 1000) // 1 second debounce
      }
    }),
    {
      name: 'notes-store'
    }
  )
)