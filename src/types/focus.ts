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

export interface InterruptionSummary {
  averagePerSession: number
  mostCommonType: 'INTERNAL' | 'EXTERNAL' | 'URGENT'
  peakHours: string[]
  totalImpactMinutes: number
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

// Timer state management
export interface TimerState {
  isRunning: boolean
  isPaused: boolean
  timeRemaining: number // In seconds
  currentPhase: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'
  sessionCount: number
  totalElapsed: number
}

export interface CreateFocusSessionData {
  type: FocusType
  duration: number
  taskId?: string
  projectId?: string
  goals?: string[]
}

export interface UpdateFocusSessionData {
  endTime?: Date
  status?: FocusStatus
  actualFocusTime?: number
  breakTime?: number
  productivity?: number
  mood?: string
  notes?: string
  achievements?: string[]
}

// Pomodoro specific types
export interface PomodoroSettings {
  focusDuration: number // 25 minutes
  shortBreakDuration: number // 5 minutes
  longBreakDuration: number // 15 minutes
  sessionsUntilLongBreak: number // 4
  autoStartBreaks: boolean
  autoStartFocus: boolean
}

// Web Worker message types for timers
export interface TimerWorkerMessage {
  type: 'START' | 'PAUSE' | 'RESUME' | 'STOP' | 'TICK' | 'COMPLETE'
  payload?: {
    duration?: number
    remaining?: number
    elapsed?: number
  }
}

export interface FocusNotification {
  type: 'SESSION_START' | 'BREAK_START' | 'SESSION_COMPLETE' | 'INTERRUPTION'
  title: string
  message: string
  duration?: number
  actions?: NotificationAction[]
}

export interface NotificationAction {
  label: string
  action: string
}