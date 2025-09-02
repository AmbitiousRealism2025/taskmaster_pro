// Habit tracking and analytics types for Phase 3.1

export type HabitFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'

export interface HabitCategory {
  id: string
  name: string
  color: string
  icon?: string
  description?: string
  userId: string
  habits?: Habit[]
  createdAt: Date
  updatedAt: Date
}

export interface Habit {
  id: string
  name: string
  description?: string
  frequency: HabitFrequency
  
  // Target Configuration
  target?: number // Quantitative target (e.g., 8 glasses, 30 minutes)
  unit?: string   // Unit of measurement (glasses, minutes, pages)
  
  // Tracking Data
  currentStreak: number
  bestStreak: number
  completionRate: number // Percentage over lifetime
  totalCompletions: number
  
  // AI Features
  successProbability?: number // ML prediction 0-1
  aiRecommendations?: string[]
  patternInsights?: HabitPattern[]
  
  // Scheduling
  scheduledTime?: string // HH:MM format
  reminderEnabled: boolean
  gracePeriod: number // Days of grace before streak breaks
  
  // Relationships
  userId: string
  projectId?: string // Link to project goals
  categoryId?: string
  
  // Relations (populated when included)
  project?: {
    id: string
    name: string
    color: string
  }
  category?: HabitCategory
  entries?: HabitEntry[]
  
  // Metadata
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface HabitEntry {
  id: string
  habitId: string
  date: string // YYYY-MM-DD format
  completed: boolean
  value?: number // For quantitative habits
  notes?: string
  completedAt?: Date
  createdAt: Date
  
  // Relations
  habit?: Habit
}

export interface HabitPattern {
  type: 'TIME_CORRELATION' | 'TASK_CORRELATION' | 'MOOD_CORRELATION' | 'WEATHER_CORRELATION'
  description: string
  confidence: number // 0-1
  suggestion?: string
  dataPoints?: any[]
}

export interface StreakData {
  current: number
  best: number
  frozen?: boolean // Grace period active
  daysToRecovery?: number
  momentum?: 'BUILDING' | 'STABLE' | 'DECLINING'
}

export interface StreakStatus {
  type: 'ACTIVE' | 'BROKEN' | 'RECOVERY' | 'GRACE' | 'NEW'
  message: string
  daysToRecovery?: number
  encouragement?: string
  actionable?: boolean
}

// Analytics Types
export interface ProductivityMetrics {
  id: string
  userId: string
  date: string // YYYY-MM-DD format
  
  // Task Performance
  taskCompletionRate: number
  averageTaskDuration: number
  plannedVsActual: number
  
  // Time Management
  focusHours: number
  distractionEvents: number
  peakProductivityHour?: number // 0-23
  
  // Habit Performance
  habitConsistency: number
  activeStreaks: number
  habitProductivityCorrelation: number
  
  // Overall Score
  productivityScore: number
  
  // Trends
  weekOverWeekChange: number
  monthOverMonthChange: number
  
  createdAt: Date
  updatedAt: Date
}

export interface TimeProductivityData {
  hour: number // 0-23
  productivity: number // 0-1
  focusMinutes: number
  taskCount: number
  habitCompletions: number
  averageRating?: number // User self-reported energy/focus
}

export interface WeeklyInsights {
  peakHour: number
  lowEnergyPeriod: string // e.g., "14:00-15:00"
  recommendedFocusTime: string
  averageFocusSession: number // minutes
  productivityTrend: 'IMPROVING' | 'DECLINING' | 'STABLE'
  keyInsights: string[]
  actionableRecommendations: string[]
  confidence: number // 0-1
}

export interface HabitProductivityCorrelation {
  habitId: string
  habitName: string
  correlation: number // -1 to 1
  impact: 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGATIVE'
  sampleSize: number
  confidence: number
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
}

export interface StreakMomentum {
  trending: string[] // Habit names with positive momentum
  declining: string[] // Habit names losing momentum  
  overall: 'POSITIVE' | 'NEGATIVE' | 'MIXED' | 'STABLE'
  recommendations: string[]
  confidence: number
}

export interface AIInsight {
  id: string
  userId: string
  type: 'PRODUCTIVITY' | 'HABIT' | 'TIME' | 'PATTERN' | 'RECOMMENDATION'
  title: string
  description: string
  confidence: number
  actionable: boolean
  recommendation?: string
  dataPoints?: any[]
  
  // Metadata
  isViewed: boolean
  isActionTaken: boolean
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  category?: string
  
  generatedAt: Date
  createdAt: Date
  updatedAt: Date
}

// Form and UI Types
export interface HabitFormData {
  name: string
  description?: string
  frequency: HabitFrequency
  target?: number
  unit?: string
  categoryId?: string
  projectId?: string
  scheduledTime?: string // HH:MM
  reminderEnabled: boolean
  gracePeriod: number
}

export interface HabitFilters {
  category?: string
  frequency?: HabitFrequency
  status?: 'active' | 'inactive' | 'all'
  project?: string
  search?: string
  dateRange?: {
    start: string
    end: string
  }
}

export interface HabitStats {
  totalHabits: number
  activeHabits: number
  completedToday: number
  averageStreakLength: number
  longestStreak: number
  completionRate: number
  consistency: number
  momentum: 'UP' | 'DOWN' | 'STABLE'
}

// Chart and Visualization Types
export interface HabitChartData {
  date: string
  completed: boolean
  value?: number
  streak: number
  formattedDate: string
  dayOfWeek: string
}

export interface ProductivityChartData {
  date: string
  score: number
  tasks: number
  habits: number
  focus: number
  formattedDate: string
  weekday: string
}

export interface StreakHistoryData {
  habitId: string
  habitName: string
  streaks: Array<{
    start: string
    end: string
    length: number
    isActive: boolean
  }>
  totalDays: number
  longestStreak: number
  currentStreak: number
}

// API Response Types
export interface HabitsResponse {
  habits: Habit[]
  totalCount: number
  hasMore: boolean
  nextCursor?: string
}

export interface HabitAnalyticsResponse {
  habit: Habit
  entries: HabitEntry[]
  stats: HabitStats
  chartData: HabitChartData[]
  insights: AIInsight[]
  correlations: HabitProductivityCorrelation[]
}

export interface ProductivityDashboardData {
  metrics: ProductivityMetrics
  weeklyInsights: WeeklyInsights
  topHabits: Habit[]
  recentInsights: AIInsight[]
  streakMomentum: StreakMomentum
  timeProductivity: TimeProductivityData[]
  chartData: ProductivityChartData[]
}

// Utility Types
export interface DateRange {
  start: Date
  end: Date
}

export interface PaginationParams {
  page: number
  limit: number
  cursor?: string
}

export interface SortParams {
  field: string
  direction: 'asc' | 'desc'
}

// Error Types
export interface HabitError {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'DUPLICATE_ENTRY' | 'STREAK_CALCULATION_ERROR'
  message: string
  field?: string
  details?: any
}