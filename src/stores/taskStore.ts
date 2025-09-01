import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { Task, TaskStatus, Priority } from '@/types/task'

interface TaskFilter {
  status?: TaskStatus[]
  priority?: Priority[]
  projectId?: string
  tags?: string[]
  search?: string
}

interface TaskStats {
  total: number
  completed: number
  inProgress: number
  overdue: number
  highPriority: number
}

interface TaskState {
  // State
  tasks: Task[]
  filter: TaskFilter
  selectedTasks: Set<string>
  isLoading: boolean
  error: string | null
  
  // Optimistic updates
  optimisticTasks: Map<string, Task>
  isOptimistic: (taskId: string) => boolean
  
  // Offline support
  isOnline: boolean
  
  // Actions
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (taskId: string, updates: Partial<Task>) => void
  deleteTask: (taskId: string) => void
  updateTaskOptimistic: (taskId: string, updates: Partial<Task>) => void
  commitOptimisticUpdate: (taskId: string) => void
  rollbackOptimisticUpdate: (taskId: string) => void
  
  // Filtering and selection
  setFilter: (filter: Partial<TaskFilter>) => void
  clearFilter: () => void
  selectTask: (taskId: string) => void
  deselectTask: (taskId: string) => void
  clearSelection: () => void
  
  // Offline support
  setOnline: (online: boolean) => void
  
  // Computed
  getFilteredTasks: () => Task[]
  getTasksByStatus: () => Record<TaskStatus, Task[]>
  getTaskStats: () => TaskStats
}

export const useTaskStore = create<TaskState>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        // Initial state
        tasks: [],
        filter: {},
        selectedTasks: new Set(),
        isLoading: false,
        error: null,
        optimisticTasks: new Map(),
        isOnline: true,

        // Optimistic update helpers
        isOptimistic: (taskId: string) => get().optimisticTasks.has(taskId),

        // Basic CRUD actions
        setTasks: (tasks) => 
          set({ tasks, error: null }, false, 'setTasks'),

        addTask: (task) =>
          set((state) => ({
            tasks: [task, ...state.tasks]
          }), false, 'addTask'),

        updateTask: (taskId, updates) =>
          set((state) => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? { ...task, ...updates, updatedAt: new Date() }
                : task
            )
          }), false, 'updateTask'),

        deleteTask: (taskId) =>
          set((state) => ({
            tasks: state.tasks.filter(task => task.id !== taskId),
            selectedTasks: new Set([...state.selectedTasks].filter(id => id !== taskId))
          }), false, 'deleteTask'),

        // Optimistic updates
        updateTaskOptimistic: (taskId, updates) =>
          set((state) => {
            const task = state.tasks.find(t => t.id === taskId)
            if (!task) return state

            const optimisticTask = { ...task, ...updates, updatedAt: new Date() }
            
            return {
              tasks: state.tasks.map(t => t.id === taskId ? optimisticTask : t),
              optimisticTasks: new Map(state.optimisticTasks).set(taskId, task) // Store original
            }
          }, false, 'updateTaskOptimistic'),

        commitOptimisticUpdate: (taskId) =>
          set((state) => {
            const newOptimisticTasks = new Map(state.optimisticTasks)
            newOptimisticTasks.delete(taskId)
            return { optimisticTasks: newOptimisticTasks }
          }, false, 'commitOptimisticUpdate'),

        rollbackOptimisticUpdate: (taskId) =>
          set((state) => {
            const originalTask = state.optimisticTasks.get(taskId)
            if (!originalTask) return state

            const newOptimisticTasks = new Map(state.optimisticTasks)
            newOptimisticTasks.delete(taskId)

            return {
              tasks: state.tasks.map(t => t.id === taskId ? originalTask : t),
              optimisticTasks: newOptimisticTasks
            }
          }, false, 'rollbackOptimisticUpdate'),

        // Filter and selection
        setFilter: (filter) =>
          set((state) => ({
            filter: { ...state.filter, ...filter }
          }), false, 'setFilter'),

        clearFilter: () =>
          set({ filter: {} }, false, 'clearFilter'),

        selectTask: (taskId) =>
          set((state) => ({
            selectedTasks: new Set([...state.selectedTasks, taskId])
          }), false, 'selectTask'),

        deselectTask: (taskId) =>
          set((state) => {
            const newSelection = new Set(state.selectedTasks)
            newSelection.delete(taskId)
            return { selectedTasks: newSelection }
          }, false, 'deselectTask'),

        clearSelection: () =>
          set({ selectedTasks: new Set() }, false, 'clearSelection'),

        // Offline support
        setOnline: (online) =>
          set({ isOnline: online }, false, 'setOnline'),

        // Computed getters
        getFilteredTasks: () => {
          const { tasks, filter } = get()
          
          return tasks.filter(task => {
            if (filter.status?.length && !filter.status.includes(task.status)) return false
            if (filter.priority?.length && !filter.priority.includes(task.priority)) return false
            if (filter.projectId && task.projectId !== filter.projectId) return false
            if (filter.search) {
              const search = filter.search.toLowerCase()
              if (!task.title.toLowerCase().includes(search) && 
                  !task.description?.toLowerCase().includes(search)) return false
            }
            if (filter.tags?.length) {
              if (!filter.tags.some(tag => task.tags.includes(tag))) return false
            }
            
            return true
          })
        },

        getTasksByStatus: () => {
          const tasks = get().getFilteredTasks()
          const grouped: Record<TaskStatus, Task[]> = {
            TODO: [],
            IN_PROGRESS: [],
            DONE: [],
            CANCELLED: []
          }
          
          tasks.forEach(task => {
            if (task.status in grouped) {
              grouped[task.status].push(task)
            }
          })
          
          return grouped
        },

        getTaskStats: () => {
          const tasks = get().tasks
          const now = new Date()
          
          return {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'DONE').length,
            inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
            overdue: tasks.filter(t => 
              t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE'
            ).length,
            highPriority: tasks.filter(t => 
              ['HIGH', 'URGENT'].includes(t.priority) && t.status !== 'DONE'
            ).length
          }
        }
      })
    ),
    { name: 'task-store' }
  )
)

// Utility hook for task statistics
export const useTaskStats = () => useTaskStore(state => state.getTaskStats())

// Utility hook for filtered tasks
export const useFilteredTasks = () => useTaskStore(state => state.getFilteredTasks())