export interface Note {
  id: string
  title: string
  content: string // Rich text JSON from Tiptap
  plainTextContent?: string // For search indexing
  
  // Organization
  folderId?: string
  tags: string[]
  isPinned: boolean
  isArchived: boolean
  
  // Metadata
  userId: string
  createdAt: Date
  updatedAt: Date
  lastViewedAt?: Date
  
  // AI Features
  extractedTasks: string[] // Task IDs created from this note
  aiSummary?: string
  aiTopics?: string[]
  
  // Sharing & Collaboration
  isShared: boolean
  sharedWith: string[]
  permissions: NotePermission[]
  
  // Relations
  folder?: Folder
  attachments?: Attachment[]
  linkedNotes?: Note[]
}

export interface Folder {
  id: string
  name: string
  color: string
  parentId?: string
  userId: string
  noteCount: number
  children?: Folder[]
  path: string // For breadcrumb navigation
  createdAt: Date
  updatedAt: Date
}

export interface NotePermission {
  userId: string
  role: 'VIEWER' | 'EDITOR' | 'OWNER'
  grantedAt: Date
}

export interface Attachment {
  id: string
  noteId: string
  fileName: string
  fileSize: number
  fileType: string
  url: string
  uploadedAt: Date
}

// Create and update types
export interface CreateNoteData {
  title: string
  content?: string
  folderId?: string
  tags?: string[]
  isPinned?: boolean
}

export interface UpdateNoteData {
  title?: string
  content?: string
  folderId?: string
  tags?: string[]
  isPinned?: boolean
  isArchived?: boolean
}

export interface NoteSearchOptions {
  query?: string
  folderId?: string
  tags?: string[]
  includeArchived?: boolean
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'lastViewedAt'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// Template types
export interface NoteTemplate {
  id: string
  name: string
  description: string
  content: string
  category: string
  isPublic: boolean
  useCount: number
  createdBy: string
  createdAt: Date
}

// Tiptap editor types
export interface ExtractedTask {
  text: string
  priority?: 'low' | 'medium' | 'high'
  dueDate?: string
  project?: string
}

export interface ContentSuggestion {
  type: 'task' | 'link' | 'template'
  text: string
  confidence: number
  metadata?: any
}