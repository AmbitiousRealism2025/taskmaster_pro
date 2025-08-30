# Phase 2 Feature Tests - TDD Framework

## Overview
Phase 2 focuses on core productivity modules and AI integration. All tests must FAIL initially and drive the implementation of Tasks, Projects, Notes, and Focus Mode modules.

## Test Structure for Phase 2

```
__tests__/
├── modules/
│   ├── tasks/
│   │   ├── task-crud.test.ts      # Task creation, editing, deletion
│   │   ├── task-filtering.test.ts # Filtering and sorting
│   │   ├── kanban-board.test.ts   # Drag-drop kanban
│   │   └── task-ai-extraction.test.ts # AI task extraction
│   ├── projects/
│   │   ├── project-management.test.ts # Project CRUD
│   │   ├── project-progress.test.ts   # Progress tracking
│   │   └── project-tasks.test.ts      # Task-project linking
│   ├── notes/
│   │   ├── notes-editor.test.ts       # Tiptap editor
│   │   ├── notes-search.test.ts       # Search functionality
│   │   └── notes-ai-features.test.ts  # AI task extraction
│   └── focus/
│       ├── timer.test.ts              # Focus timer
│       ├── time-tracking.test.ts      # Time logging
│       └── session-analytics.test.ts  # Session insights
├── ai/
│   ├── task-extractor.test.ts         # AI task extraction
│   ├── smart-scheduling.test.ts       # AI scheduling
│   └── content-summarization.test.ts  # AI summarization
└── integration/
    ├── cross-module.test.ts           # Module interactions
    ├── state-management.test.ts       # TanStack Query + Zustand
    └── real-time-updates.test.ts      # Live data sync
```

## Critical Failing Tests

### 1. Tasks Module Tests

**File: `__tests__/modules/tasks/task-crud.test.ts`**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskList } from '@/components/tasks/TaskList'
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog'

describe('Task CRUD Operations', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
  })

  it('should create new task with all metadata', async () => {
    // FAILING TEST: No TaskForm component exists
    render(
      <QueryClientProvider client={queryClient}>
        <CreateTaskDialog open={true} />
      </QueryClientProvider>
    )

    // Fill out task form
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Complete project proposal' }
    })
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Draft the Q4 project proposal document' }
    })
    
    // Set priority
    fireEvent.click(screen.getByLabelText(/priority/i))
    fireEvent.click(screen.getByText('High'))

    // Set due date
    fireEvent.click(screen.getByLabelText(/due date/i))
    fireEvent.click(screen.getByText('Tomorrow'))

    // Select project
    fireEvent.click(screen.getByLabelText(/project/i))
    fireEvent.click(screen.getByText('Work Projects'))

    // Add tags
    fireEvent.change(screen.getByLabelText(/tags/i), {
      target: { value: 'proposal, urgent' }
    })

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))

    await waitFor(() => {
      expect(screen.getByText(/task created successfully/i)).toBeInTheDocument()
    })
  })

  it('should display tasks in list view', async () => {
    // FAILING TEST: No TaskList component
    const mockTasks = [
      {
        id: '1',
        title: 'Review code',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: '2025-09-01',
        project: { name: 'Development', color: '#3b82f6' }
      },
      {
        id: '2',
        title: 'Write documentation',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        dueDate: '2025-09-03',
        project: { name: 'Documentation', color: '#10b981' }
      }
    ]

    render(
      <QueryClientProvider client={queryClient}>
        <TaskList tasks={mockTasks} />
      </QueryClientProvider>
    )

    expect(screen.getByText('Review code')).toBeInTheDocument()
    expect(screen.getByText('Write documentation')).toBeInTheDocument()
    expect(screen.getByText('HIGH')).toBeInTheDocument()
    expect(screen.getByText('MEDIUM')).toBeInTheDocument()
  })

  it('should edit task inline', async () => {
    // FAILING TEST: No inline editing capability
    const mockTask = {
      id: '1',
      title: 'Original title',
      status: 'TODO',
      priority: 'MEDIUM'
    }

    render(
      <QueryClientProvider client={queryClient}>
        <TaskList tasks={[mockTask]} />
      </QueryClientProvider>
    )

    // Double-click to edit
    fireEvent.doubleClick(screen.getByText('Original title'))
    
    const editInput = screen.getByDisplayValue('Original title')
    fireEvent.change(editInput, {
      target: { value: 'Updated title' }
    })
    fireEvent.keyDown(editInput, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('Updated title')).toBeInTheDocument()
    })
  })

  it('should delete task with confirmation', async () => {
    // FAILING TEST: No delete functionality
    const mockTask = {
      id: '1',
      title: 'Task to delete',
      status: 'TODO'
    }

    render(
      <QueryClientProvider client={queryClient}>
        <TaskList tasks={[mockTask]} />
      </QueryClientProvider>
    )

    // Click delete button
    fireEvent.click(screen.getByTestId('delete-task-1'))
    
    // Confirm deletion
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(screen.queryByText('Task to delete')).not.toBeInTheDocument()
    })
  })
})
```

**File: `__tests__/modules/tasks/kanban-board.test.ts`**

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { TaskCard } from '@/components/tasks/TaskCard'

describe('Kanban Board', () => {
  const mockTasks = [
    { id: '1', title: 'Task 1', status: 'TODO', priority: 'HIGH' },
    { id: '2', title: 'Task 2', status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { id: '3', title: 'Task 3', status: 'DONE', priority: 'LOW' }
  ]

  it('should render kanban columns', () => {
    // FAILING TEST: No KanbanBoard component
    render(<KanbanBoard tasks={mockTasks} />)

    expect(screen.getByText('To Do')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('should display tasks in correct columns', () => {
    // FAILING TEST: No task-to-column logic
    render(<KanbanBoard tasks={mockTasks} />)

    const todoColumn = screen.getByTestId('column-TODO')
    const progressColumn = screen.getByTestId('column-IN_PROGRESS')
    const doneColumn = screen.getByTestId('column-DONE')

    expect(todoColumn).toContainElement(screen.getByText('Task 1'))
    expect(progressColumn).toContainElement(screen.getByText('Task 2'))
    expect(doneColumn).toContainElement(screen.getByText('Task 3'))
  })

  it('should support drag and drop between columns', async () => {
    // FAILING TEST: No drag-drop functionality
    const mockOnTaskMove = jest.fn()
    
    render(
      <KanbanBoard 
        tasks={mockTasks} 
        onTaskMove={mockOnTaskMove}
      />
    )

    // Simulate drag from TODO to IN_PROGRESS
    const taskCard = screen.getByText('Task 1').closest('[data-testid*="task-card"]')
    const targetColumn = screen.getByTestId('column-IN_PROGRESS')

    // This should trigger drag-drop event
    fireEvent.dragStart(taskCard!)
    fireEvent.dragEnter(targetColumn)
    fireEvent.dragOver(targetColumn)
    fireEvent.drop(targetColumn)

    expect(mockOnTaskMove).toHaveBeenCalledWith('1', 'IN_PROGRESS')
  })

  it('should show task count per column', () => {
    // FAILING TEST: No task counting
    render(<KanbanBoard tasks={mockTasks} />)

    expect(screen.getByText('To Do (1)')).toBeInTheDocument()
    expect(screen.getByText('In Progress (1)')).toBeInTheDocument()
    expect(screen.getByText('Done (1)')).toBeInTheDocument()
  })
})
```

### 2. AI Integration Tests

**File: `__tests__/ai/task-extractor.test.ts`**

```typescript
import { extractTasksFromText } from '@/lib/ai/task-extractor'
import { TaskExtractor } from '@/components/ai/TaskExtractor'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock OpenRouter/LLM API
jest.mock('@/lib/ai/client', () => ({
  generateCompletion: jest.fn()
}))

describe('AI Task Extraction', () => {
  it('should extract tasks from meeting notes', async () => {
    // FAILING TEST: No AI task extraction function
    const meetingNotes = `
    Team Meeting Notes - Sprint Planning
    
    Action Items:
    - Review the authentication system by Friday
    - Update documentation for the API endpoints
    - Schedule user testing sessions next week
    - Fix the bug in the payment processing module
    
    Follow up with design team about the new mockups.
    `

    const extractedTasks = await extractTasksFromText(meetingNotes)

    expect(extractedTasks).toHaveLength(5)
    expect(extractedTasks[0]).toMatchObject({
      title: 'Review the authentication system',
      priority: 'HIGH', // Should infer from "by Friday"
      dueDate: expect.any(String),
      tags: ['review', 'authentication']
    })
    expect(extractedTasks[1]).toMatchObject({
      title: 'Update documentation for the API endpoints',
      priority: 'MEDIUM',
      tags: ['documentation', 'api']
    })
  })

  it('should render TaskExtractor component', () => {
    // FAILING TEST: No TaskExtractor UI component
    render(<TaskExtractor />)

    expect(screen.getByLabelText(/paste text/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /extract tasks/i })).toBeInTheDocument()
  })

  it('should process text and show extracted tasks', async () => {
    // FAILING TEST: No text processing logic
    const { generateCompletion } = require('@/lib/ai/client')
    generateCompletion.mockResolvedValue({
      tasks: [
        {
          title: 'Complete quarterly report',
          description: 'Prepare Q3 financial summary',
          priority: 'HIGH',
          estimatedHours: 4
        },
        {
          title: 'Schedule team meeting',
          description: 'Plan sprint retrospective',
          priority: 'MEDIUM',
          estimatedHours: 1
        }
      ]
    })

    render(<TaskExtractor />)
    
    const textArea = screen.getByLabelText(/paste text/i)
    fireEvent.change(textArea, {
      target: { value: 'Need to complete quarterly report and schedule team meeting' }
    })
    
    fireEvent.click(screen.getByRole('button', { name: /extract tasks/i }))

    await waitFor(() => {
      expect(screen.getByText('Complete quarterly report')).toBeInTheDocument()
      expect(screen.getByText('Schedule team meeting')).toBeInTheDocument()
      expect(screen.getByText('HIGH')).toBeInTheDocument()
      expect(screen.getByText('4h')).toBeInTheDocument()
    })
  })

  it('should allow editing extracted tasks before saving', async () => {
    // FAILING TEST: No task editing interface
    render(<TaskExtractor />)
    
    // After extraction (mocked above)
    fireEvent.click(screen.getByRole('button', { name: /extract tasks/i }))
    
    await waitFor(() => {
      const editButton = screen.getByTestId('edit-task-0')
      fireEvent.click(editButton)
      
      const titleInput = screen.getByDisplayValue('Complete quarterly report')
      fireEvent.change(titleInput, {
        target: { value: 'Complete Q3 quarterly report' }
      })
      
      fireEvent.click(screen.getByRole('button', { name: /save/i }))
      
      expect(screen.getByText('Complete Q3 quarterly report')).toBeInTheDocument()
    })
  })

  it('should save selected tasks to database', async () => {
    // FAILING TEST: No save functionality
    render(<TaskExtractor />)
    
    // Extract and select tasks
    fireEvent.click(screen.getByRole('button', { name: /extract tasks/i }))
    
    await waitFor(() => {
      // Select specific tasks
      fireEvent.click(screen.getByTestId('select-task-0'))
      fireEvent.click(screen.getByTestId('select-task-1'))
      
      // Save selected
      fireEvent.click(screen.getByRole('button', { name: /save selected/i }))
      
      expect(screen.getByText(/2 tasks saved/i)).toBeInTheDocument()
    })
  })
})
```

### 3. Projects Module Tests

**File: `__tests__/modules/projects/project-management.test.ts`**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { ProjectsGrid } from '@/components/projects/ProjectsGrid'

describe('Project Management', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
  })

  it('should create new project with metadata', async () => {
    // FAILING TEST: No ProjectForm component
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectForm />
      </QueryClientProvider>
    )

    fireEvent.change(screen.getByLabelText(/project name/i), {
      target: { value: 'Website Redesign' }
    })
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Complete redesign of company website' }
    })
    fireEvent.change(screen.getByLabelText(/budget/i), {
      target: { value: '15000' }
    })
    
    // Set due date
    fireEvent.click(screen.getByLabelText(/due date/i))
    fireEvent.click(screen.getByText('Dec 31, 2025'))

    // Select color
    fireEvent.click(screen.getByLabelText(/project color/i))
    fireEvent.click(screen.getByTestId('color-blue'))

    fireEvent.click(screen.getByRole('button', { name: /create project/i }))

    await waitFor(() => {
      expect(screen.getByText(/project created/i)).toBeInTheDocument()
    })
  })

  it('should display project card with progress', () => {
    // FAILING TEST: No ProjectCard component
    const mockProject = {
      id: '1',
      name: 'Mobile App Development',
      description: 'Build iOS and Android app',
      progress: 65,
      taskCount: 12,
      completedTasks: 8,
      dueDate: '2025-12-15',
      budget: 50000,
      color: '#3b82f6',
      status: 'ACTIVE'
    }

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectCard project={mockProject} />
      </QueryClientProvider>
    )

    expect(screen.getByText('Mobile App Development')).toBeInTheDocument()
    expect(screen.getByText('Build iOS and Android app')).toBeInTheDocument()
    expect(screen.getByText('65%')).toBeInTheDocument()
    expect(screen.getByText('8 of 12 tasks completed')).toBeInTheDocument()
  })

  it('should calculate project progress correctly', () => {
    // FAILING TEST: No progress calculation logic
    const mockProject = {
      id: '1',
      name: 'Test Project',
      tasks: [
        { id: '1', status: 'DONE', weight: 1 },
        { id: '2', status: 'DONE', weight: 2 },
        { id: '3', status: 'IN_PROGRESS', weight: 1 },
        { id: '4', status: 'TODO', weight: 2 }
      ]
    }

    render(<ProjectCard project={mockProject} />)

    // Progress should be (1+2)/(1+2+1+2) = 50%
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('should link tasks to projects', async () => {
    // FAILING TEST: No task-project association
    const mockProject = {
      id: '1',
      name: 'Development Project'
    }

    render(<ProjectCard project={mockProject} />)
    
    fireEvent.click(screen.getByRole('button', { name: /view tasks/i }))

    await waitFor(() => {
      // Should show tasks filtered by project
      expect(screen.getByTestId('project-task-list')).toBeInTheDocument()
      expect(screen.getByText('Showing tasks for: Development Project')).toBeInTheDocument()
    })
  })

  it('should display projects in grid layout', () => {
    // FAILING TEST: No ProjectsGrid component
    const mockProjects = [
      { id: '1', name: 'Project A', progress: 25 },
      { id: '2', name: 'Project B', progress: 75 },
      { id: '3', name: 'Project C', progress: 100 }
    ]

    render(<ProjectsGrid projects={mockProjects} />)

    expect(screen.getByText('Project A')).toBeInTheDocument()
    expect(screen.getByText('Project B')).toBeInTheDocument()
    expect(screen.getByText('Project C')).toBeInTheDocument()
    
    // Should be in grid layout
    const grid = screen.getByTestId('projects-grid')
    expect(grid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
  })
})
```

### 4. Focus Mode Tests

**File: `__tests__/modules/focus/timer.test.ts`**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'
import { FocusTimer } from '@/components/focus/FocusTimer'
import { useFocusSession } from '@/hooks/useFocusSession'

// Mock the focus session hook
jest.mock('@/hooks/useFocusSession')

describe('Focus Timer', () => {
  const mockUseFocusSession = useFocusSession as jest.MockedFunction<typeof useFocusSession>

  beforeEach(() => {
    jest.useFakeTimers()
    mockUseFocusSession.mockReturnValue({
      isActive: false,
      timeRemaining: 25 * 60, // 25 minutes
      startSession: jest.fn(),
      pauseSession: jest.fn(),
      endSession: jest.fn(),
      currentTask: null
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should display timer in MM:SS format', () => {
    // FAILING TEST: No FocusTimer component
    render(<FocusTimer />)

    expect(screen.getByText('25:00')).toBeInTheDocument()
  })

  it('should start focus session', () => {
    // FAILING TEST: No start functionality
    const mockStartSession = jest.fn()
    mockUseFocusSession.mockReturnValue({
      isActive: false,
      timeRemaining: 25 * 60,
      startSession: mockStartSession,
      pauseSession: jest.fn(),
      endSession: jest.fn(),
      currentTask: null
    })

    render(<FocusTimer />)
    
    fireEvent.click(screen.getByRole('button', { name: /start focus/i }))
    expect(mockStartSession).toHaveBeenCalled()
  })

  it('should countdown timer when active', () => {
    // FAILING TEST: No countdown logic
    mockUseFocusSession.mockReturnValue({
      isActive: true,
      timeRemaining: 25 * 60,
      startSession: jest.fn(),
      pauseSession: jest.fn(),
      endSession: jest.fn(),
      currentTask: { id: '1', title: 'Focus task' }
    })

    render(<FocusTimer />)
    
    // Should show pause button when active
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
    expect(screen.getByText('Focus task')).toBeInTheDocument()

    // Fast-forward 1 minute
    act(() => {
      jest.advanceTimersByTime(60000)
    })

    expect(screen.getByText('24:00')).toBeInTheDocument()
  })

  it('should allow task selection for focus', () => {
    // FAILING TEST: No task selection
    render(<FocusTimer />)

    fireEvent.click(screen.getByRole('button', { name: /select task/i }))
    
    expect(screen.getByText('Choose a task to focus on')).toBeInTheDocument()
    expect(screen.getByText('Complete project proposal')).toBeInTheDocument()
    
    fireEvent.click(screen.getByText('Complete project proposal'))
    expect(screen.getByText('Selected: Complete project proposal')).toBeInTheDocument()
  })

  it('should show completion notification', async () => {
    // FAILING TEST: No completion handling
    mockUseFocusSession.mockReturnValue({
      isActive: true,
      timeRemaining: 0,
      startSession: jest.fn(),
      pauseSession: jest.fn(),
      endSession: jest.fn(),
      currentTask: { id: '1', title: 'Focus task' }
    })

    render(<FocusTimer />)
    
    await waitFor(() => {
      expect(screen.getByText(/focus session completed/i)).toBeInTheDocument()
      expect(screen.getByText(/great work on: focus task/i)).toBeInTheDocument()
    })
  })

  it('should track focus statistics', async () => {
    // FAILING TEST: No statistics tracking
    const mockEndSession = jest.fn()
    mockUseFocusSession.mockReturnValue({
      isActive: true,
      timeRemaining: 0,
      startSession: jest.fn(),
      pauseSession: jest.fn(),
      endSession: mockEndSession,
      currentTask: { id: '1', title: 'Focus task' }
    })

    render(<FocusTimer />)

    // Timer completes
    await waitFor(() => {
      expect(mockEndSession).toHaveBeenCalledWith({
        taskId: '1',
        duration: 25 * 60,
        completedAt: expect.any(Date)
      })
    })
  })
})
```

### 5. State Management Integration Tests

**File: `__tests__/integration/state-management.test.ts`**

```typescript
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTaskStore } from '@/stores/taskStore'
import { useProjectStore } from '@/stores/projectStore'
import { useTasks } from '@/hooks/useTasks'

describe('State Management Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
  })

  it('should sync Zustand store with TanStack Query', async () => {
    // FAILING TEST: No state stores exist
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result: taskStore } = renderHook(() => useTaskStore(), { wrapper })
    const { result: tasksQuery } = renderHook(() => useTasks(), { wrapper })

    // Create task via store
    act(() => {
      taskStore.current.addTask({
        id: '1',
        title: 'New task',
        status: 'TODO'
      })
    })

    // Should trigger query invalidation
    expect(tasksQuery.current.refetch).toHaveBeenCalled()
  })

  it('should handle optimistic updates', async () => {
    // FAILING TEST: No optimistic update logic
    const { result } = renderHook(() => useTaskStore())

    act(() => {
      result.current.updateTaskOptimistic('1', { status: 'DONE' })
    })

    // Should immediately reflect change
    expect(result.current.tasks[0].status).toBe('DONE')
    expect(result.current.isOptimistic('1')).toBe(true)
  })

  it('should handle offline queue', () => {
    // FAILING TEST: No offline support
    const { result } = renderHook(() => useTaskStore())

    // Simulate offline
    act(() => {
      result.current.setOnline(false)
      result.current.addTask({ title: 'Offline task', status: 'TODO' })
    })

    expect(result.current.offlineQueue).toHaveLength(1)
    expect(result.current.offlineQueue[0].action).toBe('CREATE_TASK')
  })

  it('should sync offline changes when back online', async () => {
    // FAILING TEST: No sync functionality
    const { result } = renderHook(() => useTaskStore())

    // Add offline changes
    act(() => {
      result.current.setOnline(false)
      result.current.addTask({ title: 'Task 1', status: 'TODO' })
      result.current.addTask({ title: 'Task 2', status: 'TODO' })
    })

    // Go back online
    act(() => {
      result.current.setOnline(true)
    })

    await act(async () => {
      await result.current.syncOfflineChanges()
    })

    expect(result.current.offlineQueue).toHaveLength(0)
  })
})
```

## Exit Criteria for Phase 2

All tests must pass before Phase 3:

- [ ] Task CRUD operations (5/5 tests passing)
- [ ] Kanban board functionality (4/4 tests passing)
- [ ] AI task extraction (5/5 tests passing)
- [ ] Project management (5/5 tests passing)
- [ ] Notes editor and search (tests from Phase 3)
- [ ] Focus timer and tracking (6/6 tests passing)
- [ ] State management integration (4/4 tests passing)

**Total Phase 2: 29 additional tests must pass**

## Implementation Notes

1. **Test-First Approach**: Every feature starts with failing tests
2. **AI Integration**: Mock LLM calls for predictable testing
3. **State Management**: Test both client and server state synchronization
4. **Real-time Features**: Test WebSocket connections and live updates
5. **Performance**: Include load testing for large datasets

This comprehensive test suite ensures Phase 2 delivers robust, AI-enhanced productivity modules.