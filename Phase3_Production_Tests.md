# Phase 3 Production Tests - TDD Framework

## Overview
Phase 3 completes TaskMaster Pro with advanced features: Habits, Calendar, Analytics, PWA capabilities, and production polish. All tests must FAIL initially to drive true TDD development.

## Test Structure for Phase 3

```
__tests__/
├── modules/
│   ├── habits/
│   │   ├── habit-tracking.test.ts     # Habit creation and tracking
│   │   ├── streak-calculation.test.ts # Streak algorithms
│   │   ├── habit-project-link.test.ts # Project integration
│   │   └── habit-reminders.test.ts    # Notification system
│   ├── calendar/
│   │   ├── calendar-view.test.ts      # FullCalendar integration
│   │   ├── task-scheduling.test.ts    # Drag-drop scheduling
│   │   ├── external-sync.test.ts      # Google/Outlook sync
│   │   └── conflict-detection.test.ts # Scheduling conflicts
│   ├── analytics/
│   │   ├── metrics-calculation.test.ts # Productivity scores
│   │   ├── chart-components.test.ts    # Recharts visualizations
│   │   ├── insights-generation.test.ts # AI insights
│   │   └── export-functionality.test.ts # Data export
│   └── notes/
│       ├── tiptap-editor.test.ts      # Rich text editor
│       ├── markdown-support.test.ts   # Markdown functionality
│       ├── note-search.test.ts        # Full-text search
│       └── note-organization.test.ts  # Tags and categories
├── pwa/
│   ├── service-worker.test.ts         # Offline functionality
│   ├── installation.test.ts           # App installation
│   ├── background-sync.test.ts        # Offline sync
│   └── push-notifications.test.ts     # Push messaging
├── performance/
│   ├── load-testing.test.ts           # Performance benchmarks
│   ├── memory-leaks.test.ts           # Memory management
│   └── bundle-optimization.test.ts    # Bundle size limits
└── security/
    ├── authentication-security.test.ts # Auth security
    ├── data-protection.test.ts         # Data encryption
    └── api-security.test.ts            # API security
```

## Critical Failing Tests

### 1. Habits Module Tests

**File: `__tests__/modules/habits/habit-tracking.test.ts`**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HabitCard } from '@/components/habits/HabitCard'
import { HabitForm } from '@/components/habits/HabitForm'
import { HabitsGrid } from '@/components/habits/HabitsGrid'

describe('Habit Tracking', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
  })

  it('should create habit with target and frequency', async () => {
    // FAILING TEST: No HabitForm component
    render(
      <QueryClientProvider client={queryClient}>
        <HabitForm />
      </QueryClientProvider>
    )

    fireEvent.change(screen.getByLabelText(/habit name/i), {
      target: { value: 'Drink 8 glasses of water' }
    })
    
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Stay hydrated throughout the day' }
    })

    // Set target
    fireEvent.change(screen.getByLabelText(/daily target/i), {
      target: { value: '8' }
    })

    fireEvent.change(screen.getByLabelText(/unit/i), {
      target: { value: 'glasses' }
    })

    // Set frequency
    fireEvent.click(screen.getByLabelText(/frequency/i))
    fireEvent.click(screen.getByText('Daily'))

    // Set category
    fireEvent.click(screen.getByLabelText(/category/i))
    fireEvent.click(screen.getByText('Health'))

    // Link to project
    fireEvent.click(screen.getByLabelText(/link to project/i))
    fireEvent.click(screen.getByText('Personal Growth'))

    fireEvent.click(screen.getByRole('button', { name: /create habit/i }))

    await waitFor(() => {
      expect(screen.getByText(/habit created successfully/i)).toBeInTheDocument()
    })
  })

  it('should display habit with progress indicators', () => {
    // FAILING TEST: No HabitCard component
    const mockHabit = {
      id: '1',
      name: 'Morning Exercise',
      description: '30 minutes of cardio',
      target: 1,
      unit: 'session',
      frequency: 'DAILY',
      currentStreak: 12,
      bestStreak: 25,
      completionRate: 85,
      todayCompleted: false,
      category: { name: 'Fitness', color: '#10b981' }
    }

    render(
      <QueryClientProvider client={queryClient}>
        <HabitCard habit={mockHabit} />
      </QueryClientProvider>
    )

    expect(screen.getByText('Morning Exercise')).toBeInTheDocument()
    expect(screen.getByText('30 minutes of cardio')).toBeInTheDocument()
    expect(screen.getByText('12 days')).toBeInTheDocument() // Current streak
    expect(screen.getByText('25 days')).toBeInTheDocument() // Best streak
    expect(screen.getByText('85%')).toBeInTheDocument() // Completion rate
  })

  it('should allow habit completion check-in', async () => {
    // FAILING TEST: No check-in functionality
    const mockHabit = {
      id: '1',
      name: 'Read for 30 minutes',
      todayCompleted: false,
      target: 30,
      unit: 'minutes'
    }

    const mockOnComplete = jest.fn()

    render(
      <HabitCard 
        habit={mockHabit} 
        onComplete={mockOnComplete}
      />
    )

    const checkInButton = screen.getByRole('button', { name: /check in/i })
    expect(checkInButton).toBeInTheDocument()

    fireEvent.click(checkInButton)

    // Should show completion form for quantitative habits
    expect(screen.getByText(/how many minutes/i)).toBeInTheDocument()
    
    fireEvent.change(screen.getByLabelText(/minutes completed/i), {
      target: { value: '35' }
    })

    fireEvent.click(screen.getByRole('button', { name: /complete/i }))

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith('1', { value: 35, completedAt: expect.any(Date) })
    })
  })

  it('should show habit statistics over time', () => {
    // FAILING TEST: No statistics display
    const mockHabitStats = {
      id: '1',
      name: 'Meditation',
      weeklyData: [
        { date: '2025-08-24', completed: true, value: 20 },
        { date: '2025-08-25', completed: false, value: 0 },
        { date: '2025-08-26', completed: true, value: 15 },
        { date: '2025-08-27', completed: true, value: 25 },
        { date: '2025-08-28', completed: true, value: 30 },
        { date: '2025-08-29', completed: false, value: 0 },
        { date: '2025-08-30', completed: true, value: 20 }
      ]
    }

    render(<HabitCard habit={mockHabitStats} showStats={true} />)

    // Should show weekly completion chart
    expect(screen.getByTestId('habit-weekly-chart')).toBeInTheDocument()
    expect(screen.getByText('5 of 7 days')).toBeInTheDocument() // Completion this week
    expect(screen.getByText('71%')).toBeInTheDocument() // Weekly completion rate
  })
})
```

**File: `__tests__/modules/habits/streak-calculation.test.ts`**

```typescript
import { calculateStreak, getStreakStatus } from '@/lib/habits/streak-calculator'
import { HabitEntry } from '@/types'

describe('Streak Calculation', () => {
  it('should calculate current streak correctly', () => {
    // FAILING TEST: No streak calculation function
    const habitEntries: HabitEntry[] = [
      { date: '2025-08-30', completed: true },
      { date: '2025-08-29', completed: true },
      { date: '2025-08-28', completed: true },
      { date: '2025-08-27', completed: false },
      { date: '2025-08-26', completed: true },
      { date: '2025-08-25', completed: true }
    ]

    const streak = calculateStreak(habitEntries, '2025-08-30')
    expect(streak.current).toBe(3) // Aug 28, 29, 30
    expect(streak.best).toBe(3)
  })

  it('should handle streak breaks correctly', () => {
    // FAILING TEST: No streak break logic
    const habitEntries: HabitEntry[] = [
      { date: '2025-08-30', completed: true },
      { date: '2025-08-29', completed: false }, // Break
      { date: '2025-08-28', completed: true },
      { date: '2025-08-27', completed: true }
    ]

    const streak = calculateStreak(habitEntries, '2025-08-30')
    expect(streak.current).toBe(1) // Only today
    expect(streak.best).toBe(2) // Aug 27-28
  })

  it('should identify streak recovery opportunities', () => {
    // FAILING TEST: No streak recovery logic
    const habitEntries: HabitEntry[] = [
      { date: '2025-08-29', completed: false },
      { date: '2025-08-28', completed: true },
      { date: '2025-08-27', completed: true }
    ]

    const status = getStreakStatus(habitEntries, '2025-08-30')
    expect(status.type).toBe('RECOVERY')
    expect(status.message).toBe('Complete today to start a new streak!')
    expect(status.daysToRecovery).toBe(1)
  })

  it('should calculate streak freeze for grace periods', () => {
    // FAILING TEST: No grace period functionality
    const habitWithGrace = {
      id: '1',
      name: 'Exercise',
      gracePeriod: 1, // 1 day grace
      entries: [
        { date: '2025-08-30', completed: false },
        { date: '2025-08-29', completed: true },
        { date: '2025-08-28', completed: true }
      ]
    }

    const streak = calculateStreak(habitWithGrace.entries, '2025-08-30', { gracePeriod: 1 })
    expect(streak.current).toBe(2) // Grace period preserves streak
    expect(streak.frozen).toBe(true)
  })

  it('should handle weekly and monthly habit frequencies', () => {
    // FAILING TEST: No frequency-based streak calculation
    const weeklyHabitEntries = [
      { date: '2025-08-30', completed: true, frequency: 'WEEKLY' },
      { date: '2025-08-23', completed: true, frequency: 'WEEKLY' },
      { date: '2025-08-16', completed: false, frequency: 'WEEKLY' },
      { date: '2025-08-09', completed: true, frequency: 'WEEKLY' }
    ]

    const weeklyStreak = calculateStreak(weeklyHabitEntries, '2025-08-30', { frequency: 'WEEKLY' })
    expect(weeklyStreak.current).toBe(2) // This week and last week
  })
})
```

### 2. Calendar Integration Tests

**File: `__tests__/modules/calendar/calendar-view.test.ts`**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CalendarView } from '@/components/calendar/CalendarView'
import { TaskScheduler } from '@/components/calendar/TaskScheduler'

// Mock FullCalendar
jest.mock('@fullcalendar/react', () => {
  return function MockFullCalendar(props: any) {
    return (
      <div data-testid="fullcalendar">
        <button onClick={() => props.eventDrop?.({ event: { id: '1' } })}>
          Simulate Drop
        </button>
        {props.events?.map((event: any) => (
          <div key={event.id} data-testid={`event-${event.id}`}>
            {event.title}
          </div>
        ))}
      </div>
    )
  }
})

describe('Calendar View', () => {
  it('should render calendar with tasks and events', () => {
    // FAILING TEST: No CalendarView component
    const mockEvents = [
      {
        id: '1',
        title: 'Team Meeting',
        start: '2025-08-30T10:00:00',
        type: 'event',
        color: '#3b82f6'
      },
      {
        id: '2',
        title: 'Complete Report',
        start: '2025-08-30T14:00:00',
        type: 'task',
        color: '#ef4444'
      }
    ]

    render(<CalendarView events={mockEvents} />)

    expect(screen.getByTestId('fullcalendar')).toBeInTheDocument()
    expect(screen.getByText('Team Meeting')).toBeInTheDocument()
    expect(screen.getByText('Complete Report')).toBeInTheDocument()
  })

  it('should support different view modes', () => {
    // FAILING TEST: No view switching logic
    render(<CalendarView />)

    expect(screen.getByRole('button', { name: /day/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /week/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /month/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /week/i }))
    expect(screen.getByTestId('calendar-week-view')).toBeInTheDocument()
  })

  it('should show upcoming deadlines sidebar', () => {
    // FAILING TEST: No deadlines sidebar
    const mockUpcomingTasks = [
      {
        id: '1',
        title: 'Project Proposal',
        dueDate: '2025-09-01',
        priority: 'HIGH',
        daysUntilDue: 2
      },
      {
        id: '2',
        title: 'Client Meeting Prep',
        dueDate: '2025-09-05',
        priority: 'MEDIUM',
        daysUntilDue: 6
      }
    ]

    render(<CalendarView upcomingTasks={mockUpcomingTasks} />)

    expect(screen.getByText('Upcoming Deadlines')).toBeInTheDocument()
    expect(screen.getByText('Project Proposal')).toBeInTheDocument()
    expect(screen.getByText('2 days left')).toBeInTheDocument()
    expect(screen.getByText('HIGH')).toBeInTheDocument()
  })

  it('should integrate with habit tracking', () => {
    // FAILING TEST: No habit-calendar integration
    const mockHabits = [
      {
        id: '1',
        name: 'Morning Exercise',
        scheduledTime: '07:00',
        frequency: 'DAILY',
        completed: false
      }
    ]

    render(<CalendarView habits={mockHabits} />)

    expect(screen.getByText('Habit Tracker')).toBeInTheDocument()
    expect(screen.getByText('Morning Exercise')).toBeInTheDocument()
    
    // Should show on calendar
    expect(screen.getByTestId('habit-1-calendar-event')).toBeInTheDocument()
  })
})
```

**File: `__tests__/modules/calendar/task-scheduling.test.ts`**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TaskScheduler } from '@/components/calendar/TaskScheduler'
import { scheduleTasks, detectConflicts } from '@/lib/calendar/scheduler'

describe('Task Scheduling', () => {
  it('should allow drag-and-drop task scheduling', async () => {
    // FAILING TEST: No drag-drop scheduling
    const mockTasks = [
      {
        id: '1',
        title: 'Review Code',
        estimatedHours: 2,
        priority: 'HIGH',
        scheduled: false
      }
    ]

    const mockOnSchedule = jest.fn()

    render(<TaskScheduler tasks={mockTasks} onSchedule={mockOnSchedule} />)

    // Drag task to calendar slot
    const task = screen.getByText('Review Code')
    const timeSlot = screen.getByTestId('time-slot-2025-08-30-14:00')

    fireEvent.dragStart(task)
    fireEvent.dragEnter(timeSlot)
    fireEvent.dragOver(timeSlot)
    fireEvent.drop(timeSlot)

    await waitFor(() => {
      expect(mockOnSchedule).toHaveBeenCalledWith('1', {
        date: '2025-08-30',
        startTime: '14:00',
        endTime: '16:00' // +2 hours
      })
    })
  })

  it('should detect scheduling conflicts', () => {
    // FAILING TEST: No conflict detection
    const existingEvents = [
      {
        id: 'meeting-1',
        start: '2025-08-30T14:00:00',
        end: '2025-08-30T15:00:00',
        title: 'Team Meeting'
      }
    ]

    const taskToSchedule = {
      id: '1',
      estimatedHours: 2,
      proposedStart: '2025-08-30T14:30:00'
    }

    const conflicts = detectConflicts(taskToSchedule, existingEvents)
    
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].type).toBe('OVERLAP')
    expect(conflicts[0].conflictsWith).toBe('meeting-1')
  })

  it('should suggest optimal scheduling times', () => {
    // FAILING TEST: No smart scheduling
    const userPreferences = {
      workingHours: { start: '09:00', end: '17:00' },
      focusTimePreference: 'morning',
      breakDuration: 15
    }

    const tasks = [
      { id: '1', estimatedHours: 3, priority: 'HIGH', type: 'FOCUS' },
      { id: '2', estimatedHours: 1, priority: 'LOW', type: 'ADMIN' }
    ]

    const schedule = scheduleTasks(tasks, userPreferences, '2025-08-30')

    expect(schedule[0].taskId).toBe('1') // High priority first
    expect(schedule[0].startTime).toBe('09:00') // Morning focus time
    expect(schedule[1].startTime).toBe('13:00') // After lunch for admin
  })

  it('should handle recurring task scheduling', () => {
    // FAILING TEST: No recurring scheduling
    const recurringTask = {
      id: '1',
      title: 'Daily Standup',
      estimatedHours: 0.5,
      recurrence: {
        type: 'DAILY',
        daysOfWeek: [1, 2, 3, 4, 5], // Weekdays
        time: '09:00'
      }
    }

    const schedule = scheduleTasks([recurringTask], {}, '2025-08-30', { weeks: 2 })

    expect(schedule).toHaveLength(10) // 10 weekdays in 2 weeks
    expect(schedule[0].startTime).toBe('09:00')
    expect(schedule[0].recurring).toBe(true)
  })
})
```

### 3. Analytics Dashboard Tests

**File: `__tests__/modules/analytics/metrics-calculation.test.ts`**

```typescript
import {
  calculateProductivityScore,
  calculateCompletionRate,
  generateWeeklyInsights
} from '@/lib/analytics/metrics'

describe('Metrics Calculation', () => {
  it('should calculate productivity score correctly', () => {
    // FAILING TEST: No productivity scoring algorithm
    const userData = {
      tasksCompleted: 12,
      tasksPlanned: 15,
      focusHours: 6.5,
      habitCompletionRate: 0.85,
      streakDays: 7,
      consistencyScore: 0.9
    }

    const score = calculateProductivityScore(userData)
    
    // Expected: (12/15) * 0.3 + (6.5/8) * 0.25 + 0.85 * 0.2 + (7/7) * 0.15 + 0.9 * 0.1
    expect(score).toBe(87) // Rounded to nearest integer
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('should calculate completion rate with weighted priorities', () => {
    // FAILING TEST: No weighted completion calculation
    const tasks = [
      { status: 'DONE', priority: 'HIGH', weight: 3 },
      { status: 'DONE', priority: 'MEDIUM', weight: 2 },
      { status: 'TODO', priority: 'HIGH', weight: 3 },
      { status: 'IN_PROGRESS', priority: 'LOW', weight: 1 }
    ]

    const completionRate = calculateCompletionRate(tasks)
    
    // (3 + 2) / (3 + 2 + 3 + 1) = 5/9 ≈ 55.6%
    expect(completionRate).toBeCloseTo(55.6, 1)
  })

  it('should generate time-based productivity insights', () => {
    // FAILING TEST: No time analysis
    const timeData = [
      { hour: 9, productivity: 0.8, focusMinutes: 45 },
      { hour: 10, productivity: 0.9, focusMinutes: 50 },
      { hour: 11, productivity: 0.7, focusMinutes: 40 },
      { hour: 14, productivity: 0.6, focusMinutes: 30 },
      { hour: 15, productivity: 0.8, focusMinutes: 45 }
    ]

    const insights = generateWeeklyInsights(timeData)

    expect(insights.peakHour).toBe(10)
    expect(insights.lowEnergyPeriod).toBe('14:00-15:00')
    expect(insights.recommendedFocusTime).toBe('10:00-11:00')
    expect(insights.averageFocusSession).toBe(42) // minutes
  })

  it('should track habit impact on productivity', () => {
    // FAILING TEST: No habit correlation analysis
    const habitData = {
      exercise: { completed: [true, true, false, true], productivity: [8, 9, 6, 8] },
      meditation: { completed: [true, false, true, true], productivity: [8, 6, 7, 9] },
      sleep: { completed: [true, true, true, false], productivity: [8, 9, 7, 5] }
    }

    const correlations = calculateHabitProductivityCorrelation(habitData)

    expect(correlations.exercise.correlation).toBeCloseTo(0.5, 1)
    expect(correlations.sleep.correlation).toBeCloseTo(0.8, 1)
    expect(correlations.sleep.impact).toBe('HIGH')
  })

  it('should calculate streak momentum', () => {
    // FAILING TEST: No momentum calculation
    const streakHistory = [
      { date: '2025-08-24', streaks: { exercise: 1, reading: 5 } },
      { date: '2025-08-25', streaks: { exercise: 2, reading: 6 } },
      { date: '2025-08-26', streaks: { exercise: 3, reading: 7 } },
      { date: '2025-08-27', streaks: { exercise: 0, reading: 8 } }, // Broken
      { date: '2025-08-28', streaks: { exercise: 1, reading: 9 } }
    ]

    const momentum = calculateStreakMomentum(streakHistory)

    expect(momentum.trending).toEqual(['reading'])
    expect(momentum.declining).toEqual(['exercise'])
    expect(momentum.overall).toBe('MIXED')
  })
})
```

### 4. PWA and Offline Tests

**File: `__tests__/pwa/service-worker.test.ts`**

```typescript
/**
 * @jest-environment jsdom
 */
import 'jest-location-mock'

describe('Service Worker', () => {
  beforeEach(() => {
    // Mock service worker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: jest.fn(() => Promise.resolve({ scope: '/' })),
        ready: Promise.resolve({
          showNotification: jest.fn()
        })
      }
    })
  })

  it('should register service worker', async () => {
    // FAILING TEST: No service worker file
    const registration = await navigator.serviceWorker.register('/sw.js')
    
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js')
    expect(registration.scope).toBe('/')
  })

  it('should cache essential resources', async () => {
    // FAILING TEST: No caching strategy
    const mockCache = {
      addAll: jest.fn(() => Promise.resolve()),
      match: jest.fn(() => Promise.resolve(new Response('cached content')))
    }

    global.caches = {
      open: jest.fn(() => Promise.resolve(mockCache))
    } as any

    // Simulate service worker install event
    const sw = new Worker('/sw.js')
    const installEvent = new Event('install')
    
    sw.dispatchEvent(installEvent)

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(global.caches.open).toHaveBeenCalledWith('taskmaster-v1')
    expect(mockCache.addAll).toHaveBeenCalledWith([
      '/',
      '/dashboard',
      '/offline.html',
      '/_next/static/css/app.css',
      '/_next/static/js/app.js'
    ])
  })

  it('should serve cached content when offline', async () => {
    // FAILING TEST: No offline serving strategy
    const mockCache = {
      match: jest.fn(() => Promise.resolve(new Response('<!DOCTYPE html><html><body>Offline Page</body></html>')))
    }

    global.caches = {
      match: jest.fn(() => Promise.resolve(new Response('cached content')))
    } as any

    // Simulate fetch event when offline
    const fetchEvent = new Event('fetch') as any
    fetchEvent.request = new Request('/dashboard')
    
    const sw = new Worker('/sw.js')
    sw.dispatchEvent(fetchEvent)

    expect(global.caches.match).toHaveBeenCalledWith('/dashboard')
  })

  it('should queue failed requests for background sync', () => {
    // FAILING TEST: No background sync implementation
    const mockIndexedDB = {
      open: jest.fn(() => ({
        result: {
          transaction: jest.fn(() => ({
            objectStore: jest.fn(() => ({
              add: jest.fn()
            }))
          }))
        }
      }))
    }

    global.indexedDB = mockIndexedDB

    const failedRequest = {
      url: '/api/tasks',
      method: 'POST',
      body: JSON.stringify({ title: 'New task' }),
      timestamp: Date.now()
    }

    // This should be handled by service worker
    const syncEvent = new Event('sync') as any
    syncEvent.tag = 'background-sync'
    
    const sw = new Worker('/sw.js')
    sw.dispatchEvent(syncEvent)

    expect(mockIndexedDB.open).toHaveBeenCalledWith('pending-requests', 1)
  })
})
```

**File: `__tests__/pwa/installation.test.ts`**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { usePWA } from '@/hooks/usePWA'

// Mock PWA hook
jest.mock('@/hooks/usePWA')

describe('PWA Installation', () => {
  const mockUsePWA = usePWA as jest.MockedFunction<typeof usePWA>

  it('should show install prompt when available', () => {
    // FAILING TEST: No InstallPrompt component
    mockUsePWA.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      install: jest.fn()
    })

    render(<InstallPrompt />)

    expect(screen.getByText(/install taskmaster pro/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /install/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /not now/i })).toBeInTheDocument()
  })

  it('should trigger installation when clicked', async () => {
    // FAILING TEST: No installation logic
    const mockInstall = jest.fn(() => Promise.resolve())
    
    mockUsePWA.mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      install: mockInstall
    })

    render(<InstallPrompt />)

    fireEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(mockInstall).toHaveBeenCalled()
    })
  })

  it('should hide prompt when already installed', () => {
    // FAILING TEST: No installation state detection
    mockUsePWA.mockReturnValue({
      isInstallable: false,
      isInstalled: true,
      install: jest.fn()
    })

    render(<InstallPrompt />)

    expect(screen.queryByText(/install taskmaster pro/i)).not.toBeInTheDocument()
  })

  it('should have valid web app manifest', async () => {
    // FAILING TEST: No manifest.json file
    const response = await fetch('/manifest.json')
    const manifest = await response.json()

    expect(manifest.name).toBe('TaskMaster Pro')
    expect(manifest.short_name).toBe('TaskMaster')
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toBe('#6366f1')
    expect(manifest.background_color).toBe('#ffffff')
    expect(manifest.icons).toHaveLength(2) // 192x192 and 512x512
  })

  it('should show app update notification', () => {
    // FAILING TEST: No update notification
    mockUsePWA.mockReturnValue({
      isInstallable: false,
      isInstalled: true,
      hasUpdate: true,
      updateApp: jest.fn()
    })

    render(<InstallPrompt />)

    expect(screen.getByText(/new version available/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument()
  })
})
```

### 5. Performance and Security Tests

**File: `__tests__/performance/load-testing.test.ts`**

```typescript
import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage } from '@/app/dashboard/page'

describe('Performance Testing', () => {
  it('should load dashboard within performance budget', async () => {
    // FAILING TEST: No performance monitoring
    const startTime = performance.now()
    
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    )

    await waitFor(() => {
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      // Should load within 2.5 seconds (Largest Contentful Paint target)
      expect(loadTime).toBeLessThan(2500)
    })
  })

  it('should handle 1000+ tasks without performance degradation', async () => {
    // FAILING TEST: No large dataset handling
    const largeTasks = Array.from({ length: 1000 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      status: 'TODO',
      createdAt: new Date()
    }))

    const TaskList = (await import('@/components/tasks/TaskList')).TaskList
    
    const startRender = performance.now()
    render(<TaskList tasks={largeTasks} />)
    const endRender = performance.now()

    // Rendering should complete within 100ms
    expect(endRender - startRender).toBeLessThan(100)
    
    // Memory usage should be reasonable
    const memoryInfo = (performance as any).memory
    if (memoryInfo) {
      expect(memoryInfo.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024) // 50MB
    }
  })

  it('should implement virtual scrolling for large lists', () => {
    // FAILING TEST: No virtualization
    const TaskList = require('@/components/tasks/TaskList').TaskList
    const { container } = render(<TaskList tasks={Array(10000).fill({})} />)

    // Should only render visible items
    const renderedItems = container.querySelectorAll('[data-testid*="task-item"]')
    expect(renderedItems.length).toBeLessThan(20) // Only visible items
  })

  it('should lazy load heavy components', async () => {
    // FAILING TEST: No code splitting
    const { Analytics } = await import('@/components/analytics/Analytics')
    
    expect(Analytics).toBeDefined()
    
    // Should be loaded as separate chunk
    const scripts = document.querySelectorAll('script[src*="analytics"]')
    expect(scripts.length).toBeGreaterThan(0)
  })
})
```

## Exit Criteria for Phase 3

All tests must pass for production readiness:

- [ ] Habits module (15/15 tests passing)
- [ ] Calendar integration (12/12 tests passing)
- [ ] Analytics dashboard (10/10 tests passing)
- [ ] Notes module (8/8 tests passing)
- [ ] PWA functionality (8/8 tests passing)
- [ ] Performance benchmarks (4/4 tests passing)
- [ ] Security validation (6/6 tests passing)

**Total Phase 3: 63 additional tests must pass**

## Production Readiness Checklist

Before launch, all systems must demonstrate:

1. **Performance**: LCP < 2.5s, FID < 100ms, CLS < 0.1
2. **Accessibility**: WCAG 2.1 AA compliance (95%+ Lighthouse score)
3. **Security**: Authentication hardened, data encrypted, API secured
4. **Offline**: Full PWA functionality with background sync
5. **Analytics**: Meaningful insights with AI-powered recommendations
6. **Testing**: 100% critical path coverage, E2E scenarios passing

This comprehensive test framework ensures TaskMaster Pro launches as a robust, production-ready productivity suite.