# Content & Focus Systems Subgroup - Phase 2 Week 6

## ⚠️ Implementation Notes
- **Subgroup Number**: 7 (Content & Focus Systems)
- **Compact After Completion**: MANDATORY - Must compact before proceeding to Subgroup 8
- **Test Coverage**: Phase2_Feature_Tests.md (Tests 13-22)
- **Dependencies**: Task Management Core (Subgroup 6) must be complete
- **Related Enhancements**: Includes dashboard fixes from Phase 1
- **Estimated Context Usage**: 60-70%

---

**Subgroup**: 02 - Content & Focus Systems  
**Phase**: Core Features (Week 6)  
**Focus**: Notes + Focus Mode + Projects Systems  

## Subgroup Overview

The Content & Focus Systems subgroup implements the core content creation and productivity enhancement features of TaskMaster Pro. This combines rich text editing capabilities, intelligent note organization, focus session management with timer functionality, and project hierarchy systems. The subgroup emphasizes seamless integration with AI task extraction and time tracking analytics.

### Primary Responsibilities

- **Rich Text Editor**: Tiptap-based editor with markdown support and content templates
- **Note Organization**: Hierarchical folders, tagging system, and advanced search capabilities  
- **Focus Session Management**: Pomodoro and Flowtime timers with Web Workers for precision
- **Project Hierarchy**: Nested project structures with milestone tracking and progress analytics
- **Content Templates**: Quick notes, meeting templates, and project planning formats
- **AI Integration**: Task extraction from note content and intelligent content summarization
- **Time Analytics**: Focus session insights, productivity metrics, and time tracking visualization

## Test Coverage Requirements

Based on `Phase2_Feature_Tests.md`, the following tests must pass:

### Notes Editor Tests (5 tests)
- **Rich Text Editing** (`__tests__/modules/notes/notes-editor.test.ts`)
  - Tiptap editor initialization and basic text formatting
  - Markdown shortcuts and toolbar functionality
  - Content autosave and version management
  - Image and file attachment handling
  - Real-time collaboration features

### Focus Mode Tests (6 tests)
- **Timer Functionality** (`__tests__/modules/focus/timer.test.ts`)
  - Pomodoro and custom timer sessions
  - Web Worker precision timing
  - Task association and progress tracking
  - Session pause/resume functionality
  - Completion notifications and statistics

### Project Management Tests (5 tests)
- **Project Hierarchy** (`__tests__/modules/projects/project-management.test.ts`)
  - Project creation with metadata and milestones
  - Nested project structures and progress calculation
  - Task assignment and project filtering
  - Progress visualization and analytics
  - Project templates and quick setup

### Content Integration Tests (4 tests)
- **AI Content Processing** (`__tests__/ai/content-processing.test.ts`)
  - Task extraction from note content
  - Content summarization and insights
  - Template generation and suggestions
  - Cross-content search and linking

## Core Data Models and Types

### Note Model Definition

```typescript
// types/note.ts
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
```

### Focus Session Types

```typescript
// types/focus.ts
export interface FocusSession {
  id: string
  userId: string
  type: FocusType
  duration: number // In minutes
  startTime: Date
  endTime?: Date
  status: FocusStatus
  
  // Task Integration
  taskId?: string
  taskTitle?: string
  projectId?: string
  
  // Session Data
  actualFocusTime: number // Excluding breaks
  breakTime: number
  interruptions: Interruption[]
  
  // Analytics
  productivity: number // 1-10 self-rating
  mood: string // pre/post session mood
  notes?: string
  goals?: string[]
  achievements?: string[]
  
  createdAt: Date
  updatedAt: Date
}

export type FocusType = 'POMODORO' | 'FLOWTIME' | 'CUSTOM' | 'DEEP_WORK'
export type FocusStatus = 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'

export interface FocusSettings {
  userId: string
  defaultFocusDuration: number // 25 minutes for Pomodoro
  shortBreakDuration: number // 5 minutes
  longBreakDuration: number // 15 minutes
  sessionsUntilLongBreak: number // 4
  enableNotifications: boolean
  playBreakSounds: boolean
  blockDistractions: boolean
  autoStartBreaks: boolean
  preferredFocusType: FocusType
}

export interface Interruption {
  id: string
  sessionId: string
  type: 'INTERNAL' | 'EXTERNAL' | 'URGENT'
  description?: string
  timestamp: Date
  resumedAt?: Date
  impactMinutes: number
}

export interface FocusAnalytics {
  totalSessions: number
  totalFocusTime: number
  averageSessionLength: number
  longestStreak: number
  currentStreak: number
  completionRate: number
  productivityTrend: number[]
  topFocusTimes: string[] // Hour of day
  interruptionPattern: InterruptionSummary
  weeklyGoals: FocusGoal[]
}

export interface FocusGoal {
  id: string
  userId: string
  type: 'DAILY_SESSIONS' | 'WEEKLY_HOURS' | 'STREAK_DAYS'
  target: number
  current: number
  deadline: Date
  isActive: boolean
}
```

### Project Management Types

```typescript
// types/project.ts
export interface Project {
  id: string
  name: string
  description?: string
  
  // Hierarchy
  parentId?: string
  level: number // 0 = top level, 1 = sub-project, etc.
  path: string[] // Array of ancestor IDs for breadcrumb
  
  // Status & Progress
  status: ProjectStatus
  priority: Priority
  progress: number // 0-100 calculated from tasks/milestones
  
  // Timeline
  startDate?: Date
  dueDate?: Date
  estimatedHours?: number
  actualHours?: number
  
  // Visual
  color: string
  icon?: string
  coverImage?: string
  
  // Resources
  budget?: number
  assignedUsers: string[]
  
  // Metadata
  userId: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  archivedAt?: Date
  
  // Relations
  children?: Project[]
  parent?: Project
  tasks?: Task[]
  milestones?: Milestone[]
  notes?: Note[]
  documents?: Document[]
}

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED'

export interface Milestone {
  id: string
  projectId: string
  title: string
  description?: string
  dueDate: Date
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  progress: number
  dependsOn: string[] // Other milestone IDs
  tasks: string[] // Associated task IDs
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  category: string
  structure: ProjectTemplateStructure
  defaultTasks: TaskTemplate[]
  defaultMilestones: MilestoneTemplate[]
  estimatedDuration: number // In days
  isPublic: boolean
  createdBy: string
  useCount: number
}

export interface ProjectTemplateStructure {
  phases: ProjectPhase[]
  dependencies: PhaseDependency[]
}

export interface ProjectPhase {
  id: string
  name: string
  description: string
  estimatedDuration: number
  order: number
  tasks: TaskTemplate[]
  milestones: MilestoneTemplate[]
}
```

## Rich Text Editor Implementation

### Tiptap Editor Configuration

```typescript
// components/notes/TiptapEditor.tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { lowlight } from 'lowlight'
import { Markdown } from 'tiptap-markdown'
import { Note } from '@/types/note'
import { EditorToolbar } from './EditorToolbar'
import { useNotesStore } from '@/stores/notesStore'
import { useDebounce } from '@/hooks/useDebounce'
import { extractTasksFromText } from '@/lib/ai/task-extractor'
import React from 'react'

interface TiptapEditorProps {
  note?: Note
  placeholder?: string
  onUpdate?: (content: string, plainText: string) => void
  onTaskExtraction?: (tasks: ExtractedTask[]) => void
  className?: string
  readOnly?: boolean
}

export function TiptapEditor({ 
  note, 
  placeholder = "Start writing...",
  onUpdate,
  onTaskExtraction,
  className,
  readOnly = false
}: TiptapEditorProps) {
  const { updateNote, autosaveNote } = useNotesStore()
  const [isExtracting, setIsExtracting] = React.useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
      }),
      Placeholder.configure({
        placeholder: placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: !readOnly,
        HTMLAttributes: {
          class: 'text-primary hover:text-primary/80 underline',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'plaintext',
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: false,
      }),
    ],
    content: note?.content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const plainText = editor.getText()
      
      onUpdate?.(html, plainText)
      
      if (note) {
        autosaveNote(note.id, html, plainText)
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl mx-auto focus:outline-none min-h-[200px]',
      },
    },
  })

  // Debounced AI task extraction
  const debouncedContent = useDebounce(editor?.getText() || '', 2000)

  React.useEffect(() => {
    if (debouncedContent.length > 100 && onTaskExtraction) {
      handleTaskExtraction(debouncedContent)
    }
  }, [debouncedContent, onTaskExtraction])

  const handleTaskExtraction = async (content: string) => {
    if (isExtracting) return
    
    setIsExtracting(true)
    try {
      const tasks = await extractTasksFromText(content, {
        userId: note?.userId || '',
        noteId: note?.id
      })
      
      if (tasks.length > 0) {
        onTaskExtraction?.(tasks)
      }
    } catch (error) {
      console.error('Task extraction failed:', error)
    } finally {
      setIsExtracting(false)
    }
  }

  if (!editor) return null

  return (
    <div className={className}>
      {!readOnly && (
        <EditorToolbar 
          editor={editor} 
          isExtracting={isExtracting}
          onTaskExtraction={() => handleTaskExtraction(editor.getText())}
        />
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
```

### Editor Toolbar Component

```typescript
// components/notes/EditorToolbar.tsx
'use client'

import React from 'react'
import { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link,
  Image,
  CheckSquare,
  Sparkles,
  Loader2
} from 'lucide-react'

interface EditorToolbarProps {
  editor: Editor
  isExtracting?: boolean
  onTaskExtraction?: () => void
}

export function EditorToolbar({ editor, isExtracting, onTaskExtraction }: EditorToolbarProps) {
  const addImage = () => {
    const url = window.prompt('Image URL')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    if (url === null) return

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="border border-input rounded-t-lg p-2 flex flex-wrap items-center gap-1 bg-muted/30">
      {/* Text Formatting */}
      <Toggle
        size="sm"
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('strike')}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('code')}
        onPressedChange={() => editor.chain().focus().toggleCode().run()}
        aria-label="Code"
      >
        <Code className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6" />

      {/* Headings */}
      <Toggle
        size="sm"
        pressed={editor.isActive('heading', { level: 1 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        aria-label="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('heading', { level: 2 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        aria-label="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('heading', { level: 3 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        aria-label="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6" />

      {/* Lists */}
      <Toggle
        size="sm"
        pressed={editor.isActive('bulletList')}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Bullet List"
      >
        <List className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('orderedList')}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('taskList')}
        onPressedChange={() => editor.chain().focus().toggleTaskList().run()}
        aria-label="Task List"
      >
        <CheckSquare className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6" />

      {/* Block Elements */}
      <Toggle
        size="sm"
        pressed={editor.isActive('blockquote')}
        onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        aria-label="Quote"
      >
        <Quote className="h-4 w-4" />
      </Toggle>

      {/* Media & Links */}
      <Button
        variant="ghost"
        size="sm"
        onClick={addLink}
        className={editor.isActive('link') ? 'bg-muted' : ''}
        aria-label="Add Link"
      >
        <Link className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={addImage}
        aria-label="Add Image"
      >
        <Image className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* History */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        aria-label="Undo"
      >
        <Undo className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        aria-label="Redo"
      >
        <Redo className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* AI Features */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onTaskExtraction}
        disabled={isExtracting}
        aria-label="Extract Tasks with AI"
      >
        {isExtracting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}
```

## Focus Timer Implementation

### Web Worker for Precise Timing

```typescript
// public/workers/focus-timer.worker.ts
interface TimerMessage {
  type: 'START' | 'PAUSE' | 'RESUME' | 'STOP' | 'RESET'
  duration?: number // in seconds
}

interface TimerState {
  isRunning: boolean
  startTime: number
  pausedTime: number
  duration: number
  remaining: number
}

let state: TimerState = {
  isRunning: false,
  startTime: 0,
  pausedTime: 0,
  duration: 0,
  remaining: 0
}

let intervalId: number | null = null

const updateTimer = () => {
  if (!state.isRunning) return

  const now = Date.now()
  const elapsed = Math.floor((now - state.startTime - state.pausedTime) / 1000)
  state.remaining = Math.max(0, state.duration - elapsed)

  // Send update to main thread
  self.postMessage({
    type: 'TICK',
    remaining: state.remaining,
    elapsed,
    isComplete: state.remaining === 0
  })

  // Auto-complete when timer reaches zero
  if (state.remaining === 0) {
    state.isRunning = false
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    
    self.postMessage({
      type: 'COMPLETE',
      totalTime: state.duration
    })
  }
}

const startInterval = () => {
  if (intervalId) clearInterval(intervalId)
  intervalId = setInterval(updateTimer, 100) as unknown as number // Update every 100ms for smooth display
}

self.addEventListener('message', (event) => {
  const message: TimerMessage = event.data

  switch (message.type) {
    case 'START':
      state.isRunning = true
      state.startTime = Date.now()
      state.pausedTime = 0
      state.duration = message.duration || 1500 // Default 25 minutes
      state.remaining = state.duration
      startInterval()
      break

    case 'PAUSE':
      if (state.isRunning) {
        state.isRunning = false
        if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
      }
      break

    case 'RESUME':
      if (!state.isRunning && state.remaining > 0) {
        const pauseDuration = Date.now() - state.startTime - state.pausedTime
        state.pausedTime = pauseDuration
        state.isRunning = true
        startInterval()
      }
      break

    case 'STOP':
    case 'RESET':
      state.isRunning = false
      state.remaining = 0
      state.pausedTime = 0
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      break
  }

  // Send current state back
  self.postMessage({
    type: 'STATE_UPDATE',
    state: { ...state }
  })
})
```

### Focus Timer Hook

```typescript
// hooks/useFocusTimer.ts
import { useState, useEffect, useRef, useCallback } from 'react'
import { FocusSession, FocusSettings, FocusStatus } from '@/types/focus'
import { useNotificationStore } from '@/stores/notificationStore'
import { useFocusStore } from '@/stores/focusStore'

interface UseFocusTimerReturn {
  // Timer State
  timeRemaining: number
  isActive: boolean
  isPaused: boolean
  currentSession: FocusSession | null
  
  // Controls
  startTimer: (taskId?: string, customDuration?: number) => void
  pauseTimer: () => void
  resumeTimer: () => void
  stopTimer: () => void
  resetTimer: () => void
  
  // Settings
  settings: FocusSettings
  updateSettings: (newSettings: Partial<FocusSettings>) => void
}

export function useFocusTimer(): UseFocusTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const workerRef = useRef<Worker | null>(null)
  
  const { showNotification } = useNotificationStore()
  const { 
    currentSession, 
    settings, 
    createSession, 
    updateSession, 
    completeSession,
    updateSettings 
  } = useFocusStore()

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker('/workers/focus-timer.worker.ts')
    
    workerRef.current.onmessage = (event) => {
      const { type, remaining, isComplete, totalTime } = event.data

      switch (type) {
        case 'TICK':
          setTimeRemaining(remaining)
          
          // Update session progress
          if (currentSession) {
            const elapsed = totalTime - remaining
            updateSession(currentSession.id, { actualFocusTime: elapsed })
          }
          break

        case 'COMPLETE':
          handleTimerComplete(totalTime)
          break

        case 'STATE_UPDATE':
          // Handle state updates from worker
          break
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [currentSession])

  const handleTimerComplete = useCallback(async (totalTime: number) => {
    setIsActive(false)
    setIsPaused(false)
    setTimeRemaining(0)

    if (currentSession) {
      await completeSession(currentSession.id, {
        actualFocusTime: totalTime,
        endTime: new Date(),
        status: 'COMPLETED' as FocusStatus
      })

      // Show completion notification
      showNotification({
        title: 'Focus Session Complete!',
        message: `Great work! You focused for ${Math.round(totalTime / 60)} minutes.`,
        type: 'success',
        duration: 5000,
        actions: [
          {
            label: 'Start Break',
            action: () => startBreakTimer()
          },
          {
            label: 'Continue Working',
            action: () => startTimer(currentSession.taskId)
          }
        ]
      })

      // Play completion sound if enabled
      if (settings.playBreakSounds) {
        playCompletionSound()
      }
    }
  }, [currentSession, settings, showNotification, completeSession])

  const startTimer = useCallback((taskId?: string, customDuration?: number) => {
    const duration = customDuration || settings.defaultFocusDuration * 60 // Convert to seconds
    
    // Create new focus session
    const sessionData = {
      type: settings.preferredFocusType,
      duration: Math.round(duration / 60),
      taskId,
      status: 'ACTIVE' as FocusStatus,
      startTime: new Date(),
      actualFocusTime: 0,
      breakTime: 0,
      interruptions: [],
      userId: '' // This would come from auth context
    }

    const session = createSession(sessionData)
    
    setIsActive(true)
    setIsPaused(false)
    setTimeRemaining(duration)
    
    // Send start message to worker
    workerRef.current?.postMessage({
      type: 'START',
      duration
    })

    // Block distractions if enabled
    if (settings.blockDistractions) {
      enableDistrationBlocking()
    }
  }, [settings, createSession])

  const pauseTimer = useCallback(() => {
    if (isActive && !isPaused) {
      setIsPaused(true)
      workerRef.current?.postMessage({ type: 'PAUSE' })
      
      // Log interruption
      if (currentSession) {
        const interruption = {
          id: crypto.randomUUID(),
          sessionId: currentSession.id,
          type: 'INTERNAL' as const,
          timestamp: new Date(),
          impactMinutes: 0
        }
        
        updateSession(currentSession.id, {
          interruptions: [...(currentSession.interruptions || []), interruption]
        })
      }
    }
  }, [isActive, isPaused, currentSession, updateSession])

  const resumeTimer = useCallback(() => {
    if (isActive && isPaused) {
      setIsPaused(false)
      workerRef.current?.postMessage({ type: 'RESUME' })
    }
  }, [isActive, isPaused])

  const stopTimer = useCallback(() => {
    setIsActive(false)
    setIsPaused(false)
    setTimeRemaining(0)
    
    workerRef.current?.postMessage({ type: 'STOP' })
    
    if (currentSession) {
      updateSession(currentSession.id, {
        status: 'CANCELLED' as FocusStatus,
        endTime: new Date()
      })
    }
  }, [currentSession, updateSession])

  const resetTimer = useCallback(() => {
    setIsActive(false)
    setIsPaused(false)
    setTimeRemaining(settings.defaultFocusDuration * 60)
    
    workerRef.current?.postMessage({ type: 'RESET' })
  }, [settings.defaultFocusDuration])

  const startBreakTimer = useCallback(() => {
    const breakDuration = settings.shortBreakDuration * 60
    setTimeRemaining(breakDuration)
    
    workerRef.current?.postMessage({
      type: 'START',
      duration: breakDuration
    })
    
    showNotification({
      title: 'Break Time!',
      message: `Take a ${settings.shortBreakDuration} minute break.`,
      type: 'info'
    })
  }, [settings, showNotification])

  const enableDistrationBlocking = () => {
    // This would implement website blocking, notification muting, etc.
    // For now, just a placeholder
    console.log('Distraction blocking enabled')
  }

  const playCompletionSound = () => {
    const audio = new Audio('/sounds/completion-bell.mp3')
    audio.play().catch(console.error)
  }

  return {
    timeRemaining,
    isActive,
    isPaused,
    currentSession,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    settings,
    updateSettings
  }
}
```

### Focus Timer Component

```typescript
// components/focus/FocusTimer.tsx
'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Clock,
  Target,
  Settings,
  Zap
} from 'lucide-react'
import { useFocusTimer } from '@/hooks/useFocusTimer'
import { formatTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils'
import { TaskSelector } from './TaskSelector'
import { FocusSettings } from './FocusSettings'

export function FocusTimer() {
  const {
    timeRemaining,
    isActive,
    isPaused,
    currentSession,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    settings
  } = useFocusTimer()

  const [showTaskSelector, setShowTaskSelector] = React.useState(false)
  const [showSettings, setShowSettings] = React.useState(false)
  
  const totalDuration = settings.defaultFocusDuration * 60
  const progress = totalDuration > 0 ? ((totalDuration - timeRemaining) / totalDuration) * 100 : 0

  const handleStart = (taskId?: string) => {
    startTimer(taskId)
    setShowTaskSelector(false)
  }

  const getTimerStatus = () => {
    if (!isActive) return 'Ready to focus'
    if (isPaused) return 'Paused'
    return 'Focus mode active'
  }

  const getStatusColor = () => {
    if (!isActive) return 'default'
    if (isPaused) return 'warning'
    return 'success'
  }

  return (
    <div className="space-y-6">
      {/* Main Timer */}
      <Card className="relative overflow-hidden">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-between">
            <Badge variant={getStatusColor() as any}>
              {getTimerStatus()}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              aria-label="Focus settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          
          {currentSession?.taskTitle && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                {currentSession.taskTitle}
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="text-center space-y-6">
          {/* Timer Display */}
          <div className="relative">
            <div className={cn(
              "text-6xl md:text-7xl font-mono font-bold transition-colors duration-300",
              isActive && !isPaused ? "text-primary" : "text-foreground"
            )}>
              {formatTime(timeRemaining)}
            </div>
            
            {/* Progress Ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={cn(
                "w-48 h-48 md:w-56 md:h-56 rounded-full border-4 transition-colors duration-300",
                "border-muted",
                isActive && !isPaused && "border-primary/20"
              )}>
                <div 
                  className={cn(
                    "absolute inset-0 rounded-full border-4 border-transparent transition-all duration-300",
                    isActive && "border-t-primary"
                  )}
                  style={{
                    transform: `rotate(${(progress * 3.6) - 90}deg)`,
                    borderTopColor: isActive ? 'hsl(var(--primary))' : 'transparent'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {formatTime(totalDuration - timeRemaining)} elapsed
              </span>
              <span>
                {Math.round(progress)}% complete
              </span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-3">
            {!isActive ? (
              <>
                <Button
                  onClick={() => setShowTaskSelector(true)}
                  size="lg"
                  className="min-w-[140px]"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Focus
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={resetTimer}
                  aria-label="Reset timer"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                {isPaused ? (
                  <Button
                    onClick={resumeTimer}
                    size="lg"
                    className="min-w-[120px]"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    onClick={pauseTimer}
                    size="lg"
                    variant="outline"
                    className="min-w-[120px]"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                )}
                
                <Button
                  onClick={stopTimer}
                  size="lg"
                  variant="destructive"
                  aria-label="Stop timer"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button
          variant="outline"
          onClick={() => handleStart()}
          className="flex flex-col items-center gap-2 h-auto py-4"
        >
          <Clock className="h-5 w-5" />
          <span className="text-xs">25 min Focus</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={() => startTimer(undefined, 15 * 60)}
          className="flex flex-col items-center gap-2 h-auto py-4"
        >
          <Zap className="h-5 w-5" />
          <span className="text-xs">15 min Sprint</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={() => startTimer(undefined, 45 * 60)}
          className="flex flex-col items-center gap-2 h-auto py-4"
        >
          <Target className="h-5 w-5" />
          <span className="text-xs">45 min Deep</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={() => setShowTaskSelector(true)}
          className="flex flex-col items-center gap-2 h-auto py-4"
        >
          <Play className="h-5 w-5" />
          <span className="text-xs">With Task</span>
        </Button>
      </div>

      {/* Task Selector Dialog */}
      <TaskSelector
        open={showTaskSelector}
        onOpenChange={setShowTaskSelector}
        onTaskSelect={handleStart}
      />

      {/* Settings Dialog */}
      <FocusSettings
        open={showSettings}
        onOpenChange={setShowSettings}
      />
    </div>
  )
}
```

## Project Management Implementation

### Project Hierarchy Component

```typescript
// components/projects/ProjectHierarchy.tsx
'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Plus,
  MoreHorizontal,
  Calendar,
  Users,
  Target
} from 'lucide-react'
import { Project, ProjectStatus } from '@/types/project'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/date'

interface ProjectHierarchyProps {
  projects: Project[]
  onProjectSelect?: (project: Project) => void
  onCreateSubproject?: (parentId: string) => void
  className?: string
}

export function ProjectHierarchy({ 
  projects, 
  onProjectSelect, 
  onCreateSubproject,
  className 
}: ProjectHierarchyProps) {
  const [expandedProjects, setExpandedProjects] = React.useState<Set<string>>(new Set())

  // Build hierarchical structure
  const projectTree = React.useMemo(() => {
    const map = new Map<string, Project & { children: Project[] }>()
    const roots: (Project & { children: Project[] })[] = []

    // Initialize all projects with empty children
    projects.forEach(project => {
      map.set(project.id, { ...project, children: [] })
    })

    // Build parent-child relationships
    projects.forEach(project => {
      const projectWithChildren = map.get(project.id)!
      
      if (project.parentId) {
        const parent = map.get(project.parentId)
        if (parent) {
          parent.children.push(projectWithChildren)
        }
      } else {
        roots.push(projectWithChildren)
      }
    })

    // Sort by status (active first) then by creation date
    const sortProjects = (projects: (Project & { children: Project[] })[]) => {
      return projects.sort((a, b) => {
        const statusOrder: Record<ProjectStatus, number> = {
          'ACTIVE': 0,
          'PLANNING': 1,
          'ON_HOLD': 2,
          'COMPLETED': 3,
          'CANCELLED': 4,
          'ARCHIVED': 5
        }
        
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status]
        }
        
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    }

    const sortRecursively = (projects: (Project & { children: Project[] })[]) => {
      projects.forEach(project => {
        if (project.children.length > 0) {
          project.children = sortProjects(project.children)
          sortRecursively(project.children)
        }
      })
    }

    const sortedRoots = sortProjects(roots)
    sortRecursively(sortedRoots)

    return sortedRoots
  }, [projects])

  const toggleExpanded = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  const getStatusColor = (status: ProjectStatus): string => {
    const colors: Record<ProjectStatus, string> = {
      'PLANNING': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'ACTIVE': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'ON_HOLD': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'COMPLETED': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'CANCELLED': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'ARCHIVED': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
    return colors[status]
  }

  const renderProject = (project: Project & { children: Project[] }, level = 0) => {
    const hasChildren = project.children.length > 0
    const isExpanded = expandedProjects.has(project.id)
    const paddingLeft = level * 24

    return (
      <div key={project.id} className="space-y-1">
        <Card 
          className={cn(
            "transition-colors hover:bg-muted/50 cursor-pointer",
            level > 0 && "border-l-4 ml-4",
            project.status === 'ACTIVE' && "border-l-green-500",
            project.status === 'ON_HOLD' && "border-l-yellow-500",
            project.status === 'COMPLETED' && "border-l-purple-500"
          )}
          style={{ 
            borderLeftColor: level > 0 ? project.color : undefined,
            marginLeft: paddingLeft 
          }}
          onClick={() => onProjectSelect?.(project)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {/* Expand/Collapse Button */}
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-6 h-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpanded(project.id)
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              ) : (
                <div className="w-6 h-6 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-muted" />
                </div>
              )}

              {/* Project Icon */}
              <div className="flex items-center justify-center w-8 h-8 rounded-lg" 
                   style={{ backgroundColor: `${project.color}20` }}>
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4" style={{ color: project.color }} />
                ) : (
                  <Folder className="h-4 w-4" style={{ color: project.color }} />
                )}
              </div>

              {/* Project Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">{project.name}</h4>
                  <Badge variant="secondary" className={cn("text-xs", getStatusColor(project.status))}>
                    {project.status.replace('_', ' ')}
                  </Badge>
                </div>

                {project.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                    {project.description}
                  </p>
                )}

                {/* Progress & Metadata */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Progress value={project.progress} className="w-12 h-1" />
                    <span>{project.progress}%</span>
                  </div>

                  {project.dueDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(project.dueDate)}</span>
                    </div>
                  )}

                  {project.assignedUsers.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{project.assignedUsers.length}</span>
                    </div>
                  )}

                  {project.tasks && (
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      <span>{project.tasks.filter(t => t.status === 'DONE').length}/{project.tasks.length}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCreateSubproject?.(project.id)
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
                
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {project.children.map(child => renderProject(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {projectTree.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Folder className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first project to get started
            </p>
            <Button onClick={() => onCreateSubproject?.('')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        projectTree.map(project => renderProject(project))
      )}
    </div>
  )
}
```

## State Management with Zustand

### Notes Store Implementation

```typescript
// stores/notesStore.ts
import { create } from 'zustand'
import { devtools, subscribeWithSelector, persist } from 'zustand/middleware'
import { Note, Folder, NotePermission } from '@/types/note'

interface NotesState {
  // State
  notes: Note[]
  folders: Folder[]
  currentNote: Note | null
  isLoading: boolean
  error: string | null
  
  // Search & Filtering
  searchQuery: string
  selectedFolder: string | null
  selectedTags: string[]
  
  // Editor State
  unsavedChanges: Map<string, { content: string; plainText: string; lastSaved: Date }>
  
  // Actions
  // Notes CRUD
  setNotes: (notes: Note[]) => void
  addNote: (note: Partial<Note>) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void
  duplicateNote: (id: string) => void
  
  // Folders CRUD
  setFolders: (folders: Folder[]) => void
  addFolder: (folder: Partial<Folder>) => void
  updateFolder: (id: string, updates: Partial<Folder>) => void
  deleteFolder: (id: string) => void
  moveNote: (noteId: string, folderId: string | null) => void
  
  // Editor Actions
  setCurrentNote: (note: Note | null) => void
  autosaveNote: (noteId: string, content: string, plainText: string) => void
  saveNote: (noteId: string) => Promise<void>
  discardChanges: (noteId: string) => void
  
  // Search & Filter
  setSearchQuery: (query: string) => void
  setSelectedFolder: (folderId: string | null) => void
  setSelectedTags: (tags: string[]) => void
  clearFilters: () => void
  
  // Computed
  getFilteredNotes: () => Note[]
  getFolderHierarchy: () => Folder[]
  getAllTags: () => string[]
  hasUnsavedChanges: (noteId: string) => boolean
}

export const useNotesStore = create<NotesState>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          // Initial state
          notes: [],
          folders: [],
          currentNote: null,
          isLoading: false,
          error: null,
          searchQuery: '',
          selectedFolder: null,
          selectedTags: [],
          unsavedChanges: new Map(),

          // Notes CRUD
          setNotes: (notes) => set({ notes, error: null }),

          addNote: (noteData) =>
            set((state) => {
              const newNote: Note = {
                id: `note-${Date.now()}`,
                title: noteData.title || 'Untitled Note',
                content: noteData.content || '',
                plainTextContent: noteData.plainTextContent || '',
                folderId: noteData.folderId || state.selectedFolder,
                tags: noteData.tags || [],
                isPinned: false,
                isArchived: false,
                userId: 'current-user', // This would come from auth
                extractedTasks: [],
                isShared: false,
                sharedWith: [],
                permissions: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                ...noteData
              } as Note

              return {
                notes: [newNote, ...state.notes],
                currentNote: newNote
              }
            }),

          updateNote: (id, updates) =>
            set((state) => ({
              notes: state.notes.map(note =>
                note.id === id
                  ? { ...note, ...updates, updatedAt: new Date() }
                  : note
              ),
              currentNote: state.currentNote?.id === id
                ? { ...state.currentNote, ...updates, updatedAt: new Date() }
                : state.currentNote
            })),

          deleteNote: (id) =>
            set((state) => {
              // Remove from unsaved changes
              const newUnsavedChanges = new Map(state.unsavedChanges)
              newUnsavedChanges.delete(id)

              return {
                notes: state.notes.filter(note => note.id !== id),
                currentNote: state.currentNote?.id === id ? null : state.currentNote,
                unsavedChanges: newUnsavedChanges
              }
            }),

          duplicateNote: (id) =>
            set((state) => {
              const originalNote = state.notes.find(note => note.id === id)
              if (!originalNote) return state

              const duplicatedNote: Note = {
                ...originalNote,
                id: `note-${Date.now()}`,
                title: `${originalNote.title} (Copy)`,
                createdAt: new Date(),
                updatedAt: new Date(),
                extractedTasks: [],
                isShared: false,
                sharedWith: [],
                permissions: []
              }

              return {
                notes: [duplicatedNote, ...state.notes]
              }
            }),

          // Folders CRUD
          setFolders: (folders) => set({ folders }),

          addFolder: (folderData) =>
            set((state) => {
              const newFolder: Folder = {
                id: `folder-${Date.now()}`,
                name: folderData.name || 'New Folder',
                color: folderData.color || '#3b82f6',
                parentId: folderData.parentId || null,
                userId: 'current-user',
                noteCount: 0,
                path: '', // This would be calculated
                createdAt: new Date(),
                updatedAt: new Date(),
                ...folderData
              } as Folder

              return {
                folders: [...state.folders, newFolder]
              }
            }),

          updateFolder: (id, updates) =>
            set((state) => ({
              folders: state.folders.map(folder =>
                folder.id === id
                  ? { ...folder, ...updates, updatedAt: new Date() }
                  : folder
              )
            })),

          deleteFolder: (id) =>
            set((state) => ({
              folders: state.folders.filter(folder => folder.id !== id),
              // Move notes from deleted folder to root
              notes: state.notes.map(note =>
                note.folderId === id
                  ? { ...note, folderId: null, updatedAt: new Date() }
                  : note
              )
            })),

          moveNote: (noteId, folderId) =>
            set((state) => ({
              notes: state.notes.map(note =>
                note.id === noteId
                  ? { ...note, folderId, updatedAt: new Date() }
                  : note
              )
            })),

          // Editor Actions
          setCurrentNote: (note) => set({ currentNote: note }),

          autosaveNote: (noteId, content, plainText) =>
            set((state) => {
              const newUnsavedChanges = new Map(state.unsavedChanges)
              newUnsavedChanges.set(noteId, {
                content,
                plainText,
                lastSaved: new Date()
              })

              return { unsavedChanges: newUnsavedChanges }
            }),

          saveNote: async (noteId) => {
            const state = get()
            const changes = state.unsavedChanges.get(noteId)
            
            if (!changes) return

            try {
              // Save to server (mock implementation)
              await fetch(`/api/notes/${noteId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  content: changes.content,
                  plainTextContent: changes.plainText
                })
              })

              // Update local state
              state.updateNote(noteId, {
                content: changes.content,
                plainTextContent: changes.plainText
              })

              // Remove from unsaved changes
              const newUnsavedChanges = new Map(state.unsavedChanges)
              newUnsavedChanges.delete(noteId)
              set({ unsavedChanges: newUnsavedChanges })

            } catch (error) {
              set({ error: 'Failed to save note' })
            }
          },

          discardChanges: (noteId) =>
            set((state) => {
              const newUnsavedChanges = new Map(state.unsavedChanges)
              newUnsavedChanges.delete(noteId)
              return { unsavedChanges: newUnsavedChanges }
            }),

          // Search & Filter
          setSearchQuery: (query) => set({ searchQuery: query }),
          setSelectedFolder: (folderId) => set({ selectedFolder: folderId }),
          setSelectedTags: (tags) => set({ selectedTags: tags }),
          clearFilters: () => set({ 
            searchQuery: '', 
            selectedFolder: null, 
            selectedTags: [] 
          }),

          // Computed getters
          getFilteredNotes: () => {
            const { notes, searchQuery, selectedFolder, selectedTags } = get()
            
            return notes.filter(note => {
              // Folder filter
              if (selectedFolder !== null && note.folderId !== selectedFolder) {
                return false
              }

              // Search filter
              if (searchQuery) {
                const query = searchQuery.toLowerCase()
                if (!note.title.toLowerCase().includes(query) &&
                    !note.plainTextContent?.toLowerCase().includes(query) &&
                    !note.tags.some(tag => tag.toLowerCase().includes(query))) {
                  return false
                }
              }

              // Tags filter
              if (selectedTags.length > 0) {
                if (!selectedTags.some(tag => note.tags.includes(tag))) {
                  return false
                }
              }

              return true
            })
          },

          getFolderHierarchy: () => {
            const { folders } = get()
            
            // Build hierarchical structure
            const map = new Map<string, Folder & { children: Folder[] }>()
            const roots: (Folder & { children: Folder[] })[] = []

            folders.forEach(folder => {
              map.set(folder.id, { ...folder, children: [] })
            })

            folders.forEach(folder => {
              const folderWithChildren = map.get(folder.id)!
              
              if (folder.parentId) {
                const parent = map.get(folder.parentId)
                if (parent) {
                  parent.children.push(folderWithChildren)
                }
              } else {
                roots.push(folderWithChildren)
              }
            })

            return roots
          },

          getAllTags: () => {
            const { notes } = get()
            const tagSet = new Set<string>()
            
            notes.forEach(note => {
              note.tags.forEach(tag => tagSet.add(tag))
            })

            return Array.from(tagSet).sort()
          },

          hasUnsavedChanges: (noteId) => {
            const { unsavedChanges } = get()
            return unsavedChanges.has(noteId)
          }
        }),
        {
          name: 'notes-store',
          partialize: (state) => ({
            // Only persist essential data
            folders: state.folders,
            selectedFolder: state.selectedFolder,
            // Don't persist notes (they come from server)
            // Don't persist unsaved changes (session-only)
          })
        }
      )
    ),
    { name: 'notes-store' }
  )
)

// Utility hooks
export const useFilteredNotes = () => useNotesStore(state => state.getFilteredNotes())
export const useFolderHierarchy = () => useNotesStore(state => state.getFolderHierarchy())
export const useAllTags = () => useNotesStore(state => state.getAllTags())
```

## AI Integration Patterns

### Content Analysis Service

```typescript
// lib/ai/content-analyzer.ts
import { aiClient } from './client'
import { Note } from '@/types/note'
import { ExtractedTask } from '@/types/ai'

// REFACTORED: Calendar Integration moved to Clean Service Layer Architecture
// See CALENDAR_SERVICE_ARCHITECTURE.md for complete implementation details
// React components now use service layer through custom hooks instead of direct API calls

// Clean Calendar Hook Integration Example:
export function useCalendarIntegration(userId?: string) {
  const queryClient = useQueryClient()
  
  const { data: calendars, isLoading } = useQuery({
    queryKey: ['calendars', userId],
    queryFn: async (): Promise<Calendar[]> => {
      const response = await fetch(`/api/calendars?userId=${userId}`)
      return response.json()
    },
    enabled: !!userId
  })
  
  const syncCalendar = useCallback(async (calendarId: string) => {
    const response = await fetch(`/api/calendars/${calendarId}/sync`, { method: 'POST' })
    if (!response.ok) throw new Error('Sync failed')
    
    queryClient.invalidateQueries({ queryKey: ['calendars', 'events'] })
  }, [queryClient])
  
  return { calendars, isLoading, syncCalendar }
}

export class ContentAnalyzer {
  async extractTasksFromNote(note: Note): Promise<ExtractedTask[]> {
    if (!note.plainTextContent || note.plainTextContent.length < 50) {
      return []
    }

    try {
      const systemPrompt = `You are an expert task extraction AI for TaskMaster Pro.

      Extract actionable tasks from the provided note content. Focus on:
      - Explicit action items and to-dos
      - Meeting action items and follow-ups
      - Project deliverables and milestones
      - Time-sensitive commitments

      For each task:
      - Create a specific, actionable title
      - Infer priority from context (URGENT/HIGH/MEDIUM/LOW)
      - Extract or estimate due dates if mentioned
      - Assign relevant tags based on content
      - Estimate completion time in hours

      Return ONLY a JSON array of tasks.`

      const userPrompt = `Note Title: ${note.title}
      
      Content:
      ${note.plainTextContent}
      
      Existing Tags: ${note.tags.join(', ')}`

      const response = await aiClient.generateCompletion({
        model: 'anthropic/claude-3-haiku',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        maxTokens: 2000
      })

      const tasks = JSON.parse(response.choices[0].message.content)
      
      return tasks.map((task: any) => ({
        ...task,
        confidence: task.confidence || 0.8,
        extractedFrom: note.id,
        tags: [...(task.tags || []), ...note.tags.slice(0, 2)] // Inherit some note tags
      }))

    } catch (error) {
      console.error('Task extraction failed:', error)
      return []
    }
  }

  async generateNoteSummary(note: Note): Promise<string> {
    if (!note.plainTextContent || note.plainTextContent.length < 100) {
      return ''
    }

    try {
      const systemPrompt = `Create a concise summary of the following note content.
      
      Guidelines:
      - 2-3 sentences maximum
      - Focus on key topics and main points
      - Use professional, clear language
      - Include any important dates or action items`

      const response = await aiClient.generateCompletion({
        model: 'anthropic/claude-3-haiku',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: note.plainTextContent }
        ],
        temperature: 0.2,
        maxTokens: 150
      })

      return response.choices[0].message.content.trim()

    } catch (error) {
      console.error('Summary generation failed:', error)
      return ''
    }
  }

  async extractTopics(note: Note): Promise<string[]> {
    if (!note.plainTextContent || note.plainTextContent.length < 100) {
      return []
    }

    try {
      const systemPrompt = `Extract 3-5 main topics from the following content.
      
      Return topics as:
      - Single words or short phrases
      - Relevant to the content
      - Useful for categorization and search
      
      Return as a JSON array of strings.`

      const response = await aiClient.generateCompletion({
        model: 'anthropic/claude-3-haiku',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: note.plainTextContent }
        ],
        temperature: 0.3,
        maxTokens: 200
      })

      return JSON.parse(response.choices[0].message.content)

    } catch (error) {
      console.error('Topic extraction failed:', error)
      return []
    }
  }

  async suggestRelatedNotes(note: Note, allNotes: Note[]): Promise<Note[]> {
    if (!note.plainTextContent) return []

    // Simple similarity based on tags and content keywords
    const noteKeywords = this.extractKeywords(note.plainTextContent)
    
    const scored = allNotes
      .filter(n => n.id !== note.id)
      .map(n => ({
        note: n,
        score: this.calculateSimilarity(note, n, noteKeywords)
      }))
      .filter(item => item.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.note)

    return scored
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'been', 'have'].includes(word))

    // Get word frequencies
    const freq: Record<string, number> = {}
    words.forEach(word => {
      freq[word] = (freq[word] || 0) + 1
    })

    // Return top keywords
    return Object.entries(freq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word)
  }

  private calculateSimilarity(note1: Note, note2: Note, keywords1: string[]): number {
    let score = 0

    // Tag overlap
    const commonTags = note1.tags.filter(tag => note2.tags.includes(tag))
    score += commonTags.length * 0.3

    // Keyword overlap
    const keywords2 = this.extractKeywords(note2.plainTextContent || '')
    const commonKeywords = keywords1.filter(keyword => keywords2.includes(keyword))
    score += commonKeywords.length * 0.2

    // Same folder
    if (note1.folderId === note2.folderId && note1.folderId) {
      score += 0.2
    }

    return Math.min(score, 1)
  }
}

export const contentAnalyzer = new ContentAnalyzer()
```

## Complete Dashboard Components Implementation

### Dashboard Data Layer with TanStack Query

```typescript
// hooks/useDashboardData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useErrorBoundary } from 'react-error-boundary'
import { dashboardApi } from '@/lib/api/dashboard'
import { DashboardMetrics, TaskSummary, ProjectProgress, FocusStats } from '@/types/dashboard'

interface DashboardData {
  metrics: DashboardMetrics
  recentTasks: TaskSummary[]
  projectProgress: ProjectProgress[]
  focusStats: FocusStats
  upcomingDeadlines: TaskSummary[]
  activityFeed: ActivityItem[]
}

export function useDashboardData() {
  const { showBoundary } = useErrorBoundary()
  const queryClient = useQueryClient()

  // Main dashboard data query
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async (): Promise<DashboardData> => {
      try {
        const [metrics, tasks, projects, focus, deadlines, activity] = await Promise.all([
          dashboardApi.getMetrics(),
          dashboardApi.getRecentTasks(),
          dashboardApi.getProjectProgress(),
          dashboardApi.getFocusStats(),
          dashboardApi.getUpcomingDeadlines(),
          dashboardApi.getActivityFeed()
        ])

        return {
          metrics,
          recentTasks: tasks,
          projectProgress: projects,
          focusStats: focus,
          upcomingDeadlines: deadlines,
          activityFeed: activity
        }
      } catch (err) {
        console.error('Dashboard data fetch failed:', err)
        throw err
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors
      if (failureCount < 3 && error.message.includes('fetch')) {
        return true
      }
      return false
    },
    onError: (error) => {
      console.error('Dashboard query error:', error)
      // Don't show boundary for network errors, only for critical errors
      if (!error.message.includes('fetch')) {
        showBoundary(error)
      }
    }
  })

  // Real-time updates mutation
  const updateMetrics = useMutation({
    mutationFn: dashboardApi.refreshMetrics,
    onSuccess: (newMetrics) => {
      queryClient.setQueryData(['dashboard'], (old: DashboardData | undefined) => {
        if (!old) return old
        return { ...old, metrics: newMetrics }
      })
    }
  })

  // Optimistic task completion
  const completeTask = useMutation({
    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) =>
      dashboardApi.updateTaskStatus(taskId, completed),
    onMutate: async ({ taskId, completed }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['dashboard'] })

      // Snapshot previous value
      const previousData = queryClient.getQueryData<DashboardData>(['dashboard'])

      // Optimistically update
      if (previousData) {
        queryClient.setQueryData<DashboardData>(['dashboard'], (old) => {
          if (!old) return old
          return {
            ...old,
            recentTasks: old.recentTasks.map(task =>
              task.id === taskId ? { ...task, completed } : task
            ),
            metrics: {
              ...old.metrics,
              completedTasks: completed 
                ? old.metrics.completedTasks + 1 
                : old.metrics.completedTasks - 1
            }
          }
        })
      }

      return { previousData }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['dashboard'], context.previousData)
      }
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    updateMetrics: updateMetrics.mutate,
    completeTask: completeTask.mutate,
    isUpdatingMetrics: updateMetrics.isPending,
    isCompletingTask: completeTask.isPending
  }
}

// Specialized hooks for individual components
export function useTaskSummary() {
  return useQuery({
    queryKey: ['dashboard', 'tasks'],
    queryFn: dashboardApi.getTaskSummary,
    staleTime: 2 * 60 * 1000,
    select: (data) => ({
      ...data,
      completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0
    })
  })
}

export function useProjectStats() {
  return useQuery({
    queryKey: ['dashboard', 'projects'],
    queryFn: dashboardApi.getProjectStats,
    staleTime: 5 * 60 * 1000,
    select: (data) => ({
      ...data,
      averageProgress: data.length > 0 
        ? data.reduce((sum, project) => sum + project.progress, 0) / data.length 
        : 0
    })
  })
}
```

### Error Boundaries and Fallback Components

```typescript
// components/dashboard/DashboardErrorBoundary.tsx
import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface DashboardErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

function DashboardErrorFallback({ error, resetErrorBoundary }: DashboardErrorFallbackProps) {
  const isNetworkError = error.message.includes('fetch') || error.message.includes('network')
  const isAuthError = error.message.includes('401') || error.message.includes('unauthorized')

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <CardTitle className="text-xl">
            {isNetworkError ? 'Connection Problem' : 
             isAuthError ? 'Authentication Required' : 
             'Something went wrong'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="mt-2">
              {isNetworkError ? 
                'Unable to connect to the server. Please check your internet connection.' :
                isAuthError ?
                'Your session has expired. Please log in again.' :
                'An unexpected error occurred while loading your dashboard.'
              }
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2">
            <Button 
              onClick={resetErrorBoundary}
              className="flex-1"
              variant={isAuthError ? "outline" : "default"}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isNetworkError ? 'Retry Connection' : 'Try Again'}
            </Button>
            
            {isAuthError && (
              <Button 
                onClick={() => window.location.href = '/auth/login'}
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground">Technical Details</summary>
              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                {error.stack}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function DashboardErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={DashboardErrorFallback}
      onError={(error, errorInfo) => {
        // Log error to monitoring service
        console.error('Dashboard Error:', error, errorInfo)
        // In production, send to error tracking service like Sentry
        if (process.env.NODE_ENV === 'production') {
          // Sentry.captureException(error, { contexts: { errorInfo } })
        }
      }}
      onReset={() => {
        // Clear any stale data and reset state
        window.location.reload()
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
```

### Loading States and Suspense Boundaries

```typescript
// components/dashboard/DashboardSkeleton.tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function MetricsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full`} style={{ height }} />
      </CardContent>
    </Card>
  )
}

export function TaskListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="h-4 w-4 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricsCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      
      {/* Lists Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <TaskListSkeleton />
        <TaskListSkeleton />
      </div>
    </div>
  )
}
```

### Complete Dashboard Analytics with Recharts

```typescript
// components/dashboard/ProductivityChart.tsx
import React from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { formatDate } from '@/lib/utils/date'

interface ProductivityDataPoint {
  date: string
  tasksCompleted: number
  focusMinutes: number
  productivityScore: number
  goal: number
}

export function ProductivityChart() {
  const { data, isLoading, isError } = useDashboardData()
  
  if (isLoading) {
    return <ChartSkeleton height={300} />
  }
  
  if (isError || !data?.focusStats?.productivityData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Productivity Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Unable to load productivity data</p>
        </CardContent>
      </Card>
    )
  }

  const productivityData = data.focusStats.productivityData
  const currentScore = productivityData[productivityData.length - 1]?.productivityScore || 0
  const previousScore = productivityData[productivityData.length - 2]?.productivityScore || 0
  const trend = currentScore - previousScore
  const trendPercentage = previousScore > 0 ? ((trend / previousScore) * 100) : 0

  const getTrendIcon = () => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  const getTrendColor = () => {
    if (trend > 0) return 'text-green-600'
    if (trend < 0) return 'text-red-600'
    return 'text-muted-foreground'
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm">{entry.name}:</span>
              </div>
              <span className="text-sm font-medium">
                {entry.name === 'Focus Minutes' ? `${entry.value}m` : entry.value}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Productivity Trends</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Tasks completed and focus time over the last 7 days
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <Badge variant={trend > 0 ? 'default' : trend < 0 ? 'destructive' : 'secondary'}>
              <span className={getTrendColor()}>
                {trend > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
              </span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={productivityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => formatDate(value, 'MMM dd')}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Goal Reference Line */}
            <ReferenceLine 
              y={data.focusStats.dailyGoal} 
              stroke="hsl(var(--primary))" 
              strokeDasharray="5 5" 
              label="Daily Goal"
            />
            
            <Line
              type="monotone"
              dataKey="tasksCompleted"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              name="Tasks Completed"
            />
            <Line
              type="monotone"
              dataKey="focusMinutes"
              stroke="hsl(var(--secondary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: 'hsl(var(--secondary))', strokeWidth: 2 }}
              name="Focus Minutes"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

### Complete Dashboard State Management

```typescript
// stores/dashboardStore.ts
import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { DashboardMetrics, DashboardFilters, DashboardView } from '@/types/dashboard'

interface DashboardState {
  // View State
  currentView: DashboardView
  sidebarCollapsed: boolean
  activeMetricCard: string | null
  
  // Filter State
  filters: DashboardFilters
  dateRange: { start: Date; end: Date }
  selectedProjects: string[]
  
  // Real-time State
  lastUpdated: Date | null
  updateInterval: number
  isAutoRefreshEnabled: boolean
  
  // UI State
  expandedSections: Set<string>
  notifications: DashboardNotification[]
  
  // Actions
  setCurrentView: (view: DashboardView) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setActiveMetricCard: (cardId: string | null) => void
  
  // Filter Actions
  setFilters: (filters: Partial<DashboardFilters>) => void
  setDateRange: (range: { start: Date; end: Date }) => void
  addProjectFilter: (projectId: string) => void
  removeProjectFilter: (projectId: string) => void
  clearFilters: () => void
  
  // Real-time Actions
  setLastUpdated: (timestamp: Date) => void
  setUpdateInterval: (interval: number) => void
  toggleAutoRefresh: () => void
  
  // UI Actions
  toggleSection: (sectionId: string) => void
  addNotification: (notification: Omit<DashboardNotification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

export const useDashboardStore = create<DashboardState>()()
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        // Initial state
        currentView: 'overview',
        sidebarCollapsed: false,
        activeMetricCard: null,
        
        filters: {
          timeframe: '7d',
          status: 'all',
          priority: 'all'
        },
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date()
        },
        selectedProjects: [],
        
        lastUpdated: null,
        updateInterval: 30000, // 30 seconds
        isAutoRefreshEnabled: true,
        
        expandedSections: new Set(['metrics', 'charts']),
        notifications: [],
        
        // View Actions
        setCurrentView: (view) => set({ currentView: view }),
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        setActiveMetricCard: (cardId) => set({ activeMetricCard: cardId }),
        
        // Filter Actions
        setFilters: (newFilters) => set((state) => ({
          filters: { ...state.filters, ...newFilters }
        })),
        
        setDateRange: (range) => set({ dateRange: range }),
        
        addProjectFilter: (projectId) => set((state) => ({
          selectedProjects: [...state.selectedProjects, projectId]
        })),
        
        removeProjectFilter: (projectId) => set((state) => ({
          selectedProjects: state.selectedProjects.filter(id => id !== projectId)
        })),
        
        clearFilters: () => set({
          filters: { timeframe: '7d', status: 'all', priority: 'all' },
          selectedProjects: [],
          dateRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date()
          }
        }),
        
        // Real-time Actions
        setLastUpdated: (timestamp) => set({ lastUpdated: timestamp }),
        
        setUpdateInterval: (interval) => set({ updateInterval: interval }),
        
        toggleAutoRefresh: () => set((state) => ({
          isAutoRefreshEnabled: !state.isAutoRefreshEnabled
        })),
        
        // UI Actions
        toggleSection: (sectionId) => set((state) => {
          const newExpanded = new Set(state.expandedSections)
          if (newExpanded.has(sectionId)) {
            newExpanded.delete(sectionId)
          } else {
            newExpanded.add(sectionId)
          }
          return { expandedSections: newExpanded }
        }),
        
        addNotification: (notification) => set((state) => ({
          notifications: [...state.notifications, {
            ...notification,
            id: crypto.randomUUID(),
            timestamp: new Date()
          }]
        })),
        
        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),
        
        clearNotifications: () => set({ notifications: [] })
      })
    ),
    { name: 'dashboard-store' }
  )
)

// WebSocket integration for real-time updates
export function useRealtimeDashboard() {
  const { 
    isAutoRefreshEnabled, 
    updateInterval, 
    setLastUpdated, 
    addNotification 
  } = useDashboardStore()
  
  React.useEffect(() => {
    if (!isAutoRefreshEnabled) return
    
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001')
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'TASK_COMPLETED':
          addNotification({
            type: 'success',
            title: 'Task Completed',
            message: `"${data.taskTitle}" has been completed!`,
            actions: [{
              label: 'View Task',
              action: () => window.location.href = `/tasks/${data.taskId}`
            }]
          })
          break
          
        case 'DEADLINE_APPROACHING':
          addNotification({
            type: 'warning',
            title: 'Deadline Approaching',
            message: `"${data.taskTitle}" is due in ${data.timeRemaining}`,
            actions: [{
              label: 'View Task',
              action: () => window.location.href = `/tasks/${data.taskId}`
            }]
          })
          break
          
        case 'METRICS_UPDATE':
          setLastUpdated(new Date())
          break
      }
    }
    
    return () => ws.close()
  }, [isAutoRefreshEnabled, updateInterval])
}
```

### Integration Points with Other Systems

### Task Management Integration

```typescript
// Integration with Task Management Core subgroup
export interface NotesTaskIntegration {
  // Extract tasks from note content
  extractTasksFromNote(noteId: string): Promise<ExtractedTask[]>
  
  // Link tasks back to source notes
  linkTaskToNote(taskId: string, noteId: string): Promise<void>
  
  // Get tasks created from a specific note
  getTasksFromNote(noteId: string): Promise<Task[]>
  
  // Show task extraction suggestions in editor
  showTaskSuggestions(note: Note): void
}
```

### Focus Mode Integration

```typescript
// Integration with Focus Mode for time tracking
export interface FocusNotesIntegration {
  // Get notes suitable for focus sessions
  getNotesForFocus(): Promise<Note[]>
  
  // Create session notes automatically
  createSessionNote(sessionId: string, insights: string): Promise<Note>
  
  // Link notes to focus sessions
  linkNoteToSession(noteId: string, sessionId: string): Promise<void>
}
```

### Project Integration

```typescript
// Integration with Projects for organization
export interface ProjectNotesIntegration {
  // Get notes by project
  getNotesByProject(projectId: string): Promise<Note[]>
  
  // Link notes to projects
  linkNoteToProject(noteId: string, projectId: string): Promise<void>
  
  // Project progress from notes
  updateProjectProgressFromNotes(projectId: string): Promise<void>
}
```

## Implementation Priority

### Week 6 Development Order

1. **Day 1**: Rich text editor with Tiptap and basic functionality
2. **Day 2**: Note organization (folders, tags, search)
3. **Day 3**: Focus timer with Web Worker implementation
4. **Day 4**: Project hierarchy and management components
5. **Day 5**: AI content analysis and task extraction
6. **Day 6**: State management and integration testing
7. **Day 7**: Analytics, reporting, and performance optimization

### Critical Path Dependencies

- **Editor Foundation** → Content creation → AI extraction
- **Timer Web Worker** → Focus sessions → Analytics
- **Project Structure** → Task assignment → Progress tracking
- **State Management** → Real-time updates → Cross-system integration

## Success Metrics

### Phase 2 Week 6 Completion Requirements

**Core Functionality (Required)**
- [ ] Rich text editor with formatting and content templates
- [ ] Note organization with folders and advanced search
- [ ] Focus timer with session tracking and analytics
- [ ] Project hierarchy with progress calculation
- [ ] AI task extraction from note content

**Performance Benchmarks**
- Editor response time: < 50ms for formatting actions
- Search results: < 200ms for full-text search
- Timer precision: ±100ms accuracy with Web Worker
- Project calculations: < 100ms for progress updates

**Integration Points Ready**
- Task extraction and assignment to projects
- Focus time tracking for tasks and projects
- Content search across notes and project documentation
- Real-time collaboration for shared notes and projects

### Complete Dashboard API Layer

```typescript
// lib/api/dashboard.ts
import { apiClient } from './client'
import { DashboardMetrics, TaskSummary, ProjectProgress, FocusStats, ActivityItem } from '@/types/dashboard'

class DashboardAPI {
  async getMetrics(): Promise<DashboardMetrics> {
    try {
      const response = await apiClient.get<DashboardMetrics>('/api/dashboard/metrics')
      return response.data
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error)
      throw new Error('Unable to load dashboard metrics')
    }
  }
  
  async getRecentTasks(): Promise<TaskSummary[]> {
    try {
      const response = await apiClient.get<TaskSummary[]>('/api/dashboard/tasks/recent')
      return response.data
    } catch (error) {
      console.error('Failed to fetch recent tasks:', error)
      throw new Error('Unable to load recent tasks')
    }
  }
  
  async getProjectProgress(): Promise<ProjectProgress[]> {
    try {
      const response = await apiClient.get<ProjectProgress[]>('/api/dashboard/projects/progress')
      return response.data
    } catch (error) {
      console.error('Failed to fetch project progress:', error)
      throw new Error('Unable to load project progress')
    }
  }
  
  async getFocusStats(): Promise<FocusStats> {
    try {
      const response = await apiClient.get<FocusStats>('/api/dashboard/focus/stats')
      return response.data
    } catch (error) {
      console.error('Failed to fetch focus stats:', error)
      throw new Error('Unable to load focus statistics')
    }
  }
  
  async getUpcomingDeadlines(): Promise<TaskSummary[]> {
    try {
      const response = await apiClient.get<TaskSummary[]>('/api/dashboard/deadlines')
      return response.data
    } catch (error) {
      console.error('Failed to fetch upcoming deadlines:', error)
      throw new Error('Unable to load upcoming deadlines')
    }
  }
  
  async getActivityFeed(limit = 10): Promise<ActivityItem[]> {
    try {
      const response = await apiClient.get<ActivityItem[]>(`/api/dashboard/activity?limit=${limit}`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch activity feed:', error)
      throw new Error('Unable to load activity feed')
    }
  }
  
  async refreshMetrics(): Promise<DashboardMetrics> {
    try {
      const response = await apiClient.post<DashboardMetrics>('/api/dashboard/metrics/refresh')
      return response.data
    } catch (error) {
      console.error('Failed to refresh metrics:', error)
      throw new Error('Unable to refresh metrics')
    }
  }
  
  async updateTaskStatus(taskId: string, completed: boolean): Promise<void> {
    try {
      await apiClient.patch(`/api/tasks/${taskId}`, { completed })
    } catch (error) {
      console.error('Failed to update task status:', error)
      throw new Error('Unable to update task status')
    }
  }
  
  // Cache invalidation strategies
  async invalidateCache(keys: string[] = []): Promise<void> {
    try {
      await apiClient.post('/api/dashboard/cache/invalidate', { keys })
    } catch (error) {
      console.warn('Cache invalidation failed:', error)
      // Non-critical error, don't throw
    }
  }
}

export const dashboardApi = new DashboardAPI()
```

### Performance Optimized Dashboard Container

```typescript
// components/dashboard/DashboardContainer.tsx
import React, { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useDashboardData, useRealtimeDashboard } from '@/hooks/useDashboardData'
import { DashboardErrorBoundary } from './DashboardErrorBoundary'
import { DashboardSkeleton } from './DashboardSkeleton'
import { MetricsOverview } from './MetricsOverview'
import { ProductivityChart } from './ProductivityChart'
import { TasksOverview } from './TasksOverview'
import { ProjectsOverview } from './ProjectsOverview'
import { ActivityFeed } from './ActivityFeed'
import { QuickActions } from './QuickActions'

// Lazy load heavy components for better initial page load
const AnalyticsCharts = React.lazy(() => 
  import('./AnalyticsCharts').then(mod => ({ default: mod.AnalyticsCharts }))
)

const DetailedMetrics = React.lazy(() => 
  import('./DetailedMetrics').then(mod => ({ default: mod.DetailedMetrics }))
)

export function DashboardContainer() {
  const { data, isLoading, isError, error, refetch } = useDashboardData()
  
  // Enable real-time updates
  useRealtimeDashboard()
  
  if (isLoading) {
    return <DashboardSkeleton />
  }
  
  if (isError) {
    return (
      <DashboardErrorFallback 
        error={error} 
        resetErrorBoundary={refetch}
      />
    )
  }
  
  return (
    <DashboardErrorBoundary>
      <div className="space-y-6">
        {/* Quick Actions Bar */}
        <QuickActions />
        
        {/* Key Metrics */}
        <MetricsOverview metrics={data.metrics} />
        
        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Primary Content */}
          <div className="lg:col-span-2 space-y-6">
            <ProductivityChart />
            
            <div className="grid gap-6 md:grid-cols-2">
              <TasksOverview tasks={data.recentTasks} />
              <ProjectsOverview projects={data.projectProgress} />
            </div>
            
            {/* Advanced Analytics - Lazy Loaded */}
            <Suspense fallback={<ChartSkeleton height={400} />}>
              <AnalyticsCharts focusStats={data.focusStats} />
            </Suspense>
          </div>
          
          {/* Right Column - Secondary Content */}
          <div className="space-y-6">
            <ActivityFeed activities={data.activityFeed} />
            
            {/* Detailed Metrics - Lazy Loaded */}
            <Suspense fallback={<MetricsCardSkeleton />}>
              <DetailedMetrics 
                upcomingDeadlines={data.upcomingDeadlines}
                focusStats={data.focusStats}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </DashboardErrorBoundary>
  )
}
```

This comprehensive Content & Focus Systems implementation provides the core productivity features for TaskMaster Pro, combining intelligent content creation with focused work session management and project organization. The dashboard components now include complete data fetching with TanStack Query, comprehensive error handling with error boundaries, loading states with Suspense, real-time updates with WebSocket integration, and performance optimization through lazy loading and proper caching strategies.