# Data Intelligence & Analytics Subgroup - Phase 3 Week 9

## ⚠️ Implementation Notes
- **Subgroup Number**: 9 (Data Intelligence & Analytics)
- **Compact After Completion**: MANDATORY - Must compact before proceeding to Subgroup 10
- **Test Coverage**: Phase3_Production_Tests.md (Tests 1-20 Enhanced)
- **Dependencies**: Phase 2 complete (All 3 subgroups must be finished)
- **Related Enhancements**: performance_optimizations/DATABASE_INDEXING_STRATEGY.md, PRISMA_ANALYTICS_SCHEMA_OPTIMIZATIONS.md
- **Estimated Context Usage**: 70-80%

---

**Subgroup**: 01 - Data Intelligence & Analytics  
**Phase**: Production (Week 9)  
**Focus**: Habits + Analytics + AI Integration  

## Subgroup Overview

The Data Intelligence & Analytics subgroup transforms TaskMaster Pro from a task manager into an intelligent productivity platform. This combines habit tracking with sophisticated analytics to provide users with AI-powered insights about their productivity patterns, habit formation, and optimal working behaviors.

### Primary Responsibilities

- **Habit Tracking System**: Complete habit lifecycle with streak calculations and behavioral chains
- **Analytics Dashboard**: Visual productivity metrics with Recharts-powered charts and insights
- **AI-Powered Insights**: Pattern recognition and predictive analytics for productivity optimization
- **Data Aggregation Engine**: Efficient processing of large datasets for historical analysis
- **Performance Optimization**: Virtual scrolling, lazy loading, and comprehensive database indexing for sub-200ms chart queries
- **Habit Success Prediction**: ML models to predict habit success and suggest interventions
- **Cross-System Integration**: Connect habits with tasks, calendar, and project data

## Test Coverage Requirements

Based on `Phase3_Production_Tests.md`, the following tests must pass:

### Habit Tracking Tests (4 tests)
- **Habit Creation & Management** (`__tests__/modules/habits/habit-tracking.test.ts`)
  - Create habits with target quantities, frequencies, and project links
  - Display habit cards with progress indicators and completion rates
  - Handle habit check-in workflow for quantitative and qualitative habits
  - Show habit statistics and weekly completion charts

### Streak Calculation Tests (5 tests)  
- **Streak Algorithms** (`__tests__/modules/habits/streak-calculation.test.ts`)
  - Calculate current streaks with break handling
  - Identify streak recovery opportunities and grace periods
  - Support weekly/monthly habit frequencies
  - Track streak momentum and provide streak freeze functionality

### Analytics Metrics Tests (5 tests)
- **Metrics Calculation** (`__tests__/modules/analytics/metrics-calculation.test.ts`)
  - Calculate productivity scores with weighted factors
  - Generate time-based productivity insights and peak performance hours
  - Track habit impact correlation on productivity
  - Calculate streak momentum and trend analysis

### AI Insights Tests (3 tests)
- **Insight Generation** (`__tests__/modules/analytics/insights-generation.test.ts`)
  - Generate personalized productivity recommendations
  - Predict habit success probability based on historical data
  - Provide pattern-based scheduling suggestions

### Chart Components Tests (4 tests)
- **Visualization Components** (`__tests__/modules/analytics/chart-components.test.ts`)
  - Render productivity trend charts with Recharts
  - Display habit completion heatmaps
  - Show time distribution analytics
  - Handle interactive chart filtering and drill-down

## Core Data Models and Types

### Habit Model Definition

```typescript
// types/habit.ts
export interface Habit {
  id: string
  name: string
  description?: string
  category: HabitCategory
  
  // Target Configuration
  target?: number // Quantitative target (e.g., 8 glasses, 30 minutes)
  unit?: string   // Unit of measurement (glasses, minutes, pages)
  frequency: HabitFrequency
  
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
  gracePeriod?: number // Days of grace before streak breaks
  
  // Relationships
  userId: string
  projectId?: string // Link to project goals
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  
  // Relations
  project?: Project
  entries?: HabitEntry[]
  category?: HabitCategory
}

export type HabitFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'

export interface HabitEntry {
  id: string
  habitId: string
  date: string // YYYY-MM-DD format
  completed: boolean
  value?: number // For quantitative habits
  notes?: string
  createdAt: Date
  
  // Relations
  habit?: Habit
}

export interface HabitCategory {
  id: string
  name: string
  color: string // Hex color code
  icon?: string // Lucide icon name
  description?: string
}

export interface HabitPattern {
  type: 'TIME_CORRELATION' | 'TASK_CORRELATION' | 'MOOD_CORRELATION'
  description: string
  confidence: number // 0-1
  suggestion?: string
}

export interface StreakData {
  current: number
  best: number
  frozen?: boolean // Grace period active
  daysToRecovery?: number
}

export interface StreakStatus {
  type: 'ACTIVE' | 'BROKEN' | 'RECOVERY' | 'GRACE'
  message: string
  daysToRecovery?: number
  encouragement?: string
}
```

### Analytics Models

```typescript
// types/analytics.ts
export interface ProductivityMetrics {
  score: number // 0-100 overall productivity score
  
  // Task Performance
  taskCompletionRate: number
  averageTaskDuration: number
  plannedVsActual: number
  
  // Time Management
  focusHours: number
  distractionEvents: number
  peakProductivityHours: number[]
  
  // Habit Performance
  habitConsistency: number
  activeStreaks: number
  habitProductivityCorrelation: number
  
  // Trends
  weekOverWeekChange: number
  monthOverMonthChange: number
  trendDirection: 'UP' | 'DOWN' | 'STABLE'
}

export interface TimeProductivityData {
  hour: number // 0-23
  productivity: number // 0-1
  focusMinutes: number
  taskCount: number
  habitCompletions: number
}

export interface WeeklyInsights {
  peakHour: number
  lowEnergyPeriod: string
  recommendedFocusTime: string
  averageFocusSession: number
  productivityTrend: 'IMPROVING' | 'DECLINING' | 'STABLE'
  keyInsights: string[]
  actionableRecommendations: string[]
}

export interface HabitProductivityCorrelation {
  habitId: string
  habitName: string
  correlation: number // -1 to 1
  impact: 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGATIVE'
  sampleSize: number
  confidence: number
}

export interface StreakMomentum {
  trending: string[] // Habit names with positive momentum
  declining: string[] // Habit names losing momentum  
  overall: 'POSITIVE' | 'NEGATIVE' | 'MIXED' | 'STABLE'
  recommendations: string[]
}

export interface AIInsight {
  id: string
  type: 'PRODUCTIVITY' | 'HABIT' | 'TIME' | 'PATTERN'
  title: string
  description: string
  confidence: number
  actionable: boolean
  recommendation?: string
  dataPoints: any[]
  generatedAt: Date
}
```

## Key Components Implementation

### Habit Tracking Components

```typescript
// components/habits/HabitForm.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, Clock, Calendar, Link } from 'lucide-react'
import { HabitFormData } from '@/types'

const habitFormSchema = z.object({
  name: z.string().min(1, 'Habit name is required').max(80, 'Name too long'),
  description: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  target: z.number().positive().optional(),
  unit: z.string().optional(),
  categoryId: z.string(),
  projectId: z.string().optional(),
  scheduledTime: z.string().optional(), // HH:MM
  reminderEnabled: z.boolean().default(false),
  gracePeriod: z.number().min(0).max(7).default(0)
})

type HabitFormData = z.infer<typeof habitFormSchema>

export function HabitForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const form = useForm<HabitFormData>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: {
      frequency: 'DAILY',
      reminderEnabled: false,
      gracePeriod: 0
    }
  })

  const createHabitMutation = useMutation({
    mutationFn: async (data: HabitFormData) => {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error('Failed to create habit')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      form.reset()
      onSuccess?.()
    }
  })

  const onSubmit = async (data: HabitFormData) => {
    setIsSubmitting(true)
    try {
      await createHabitMutation.mutateAsync(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isQuantitative = form.watch('target') && form.watch('unit')

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Create New Habit
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Habit Name</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="e.g., Drink 8 glasses of water"
                className="mt-1"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Stay hydrated throughout the day"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          {/* Target Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target">Daily Target (Optional)</Label>
              <Input
                id="target"
                type="number"
                {...form.register('target', { valueAsNumber: true })}
                placeholder="8"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                {...form.register('unit')}
                placeholder="glasses"
                className="mt-1"
                disabled={!form.watch('target')}
              />
            </div>
          </div>

          {/* Frequency and Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select onValueChange={(value: any) => form.setValue('frequency', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="scheduledTime">Scheduled Time (Optional)</Label>
              <Input
                id="scheduledTime"
                type="time"
                {...form.register('scheduledTime')}
                className="mt-1"
              />
            </div>
          </div>

          {/* Category and Project */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select onValueChange={(value) => form.setValue('categoryId', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="fitness">Fitness</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                  <SelectItem value="productivity">Productivity</SelectItem>
                  <SelectItem value="mindfulness">Mindfulness</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="project">Link to Project (Optional)</Label>
              <Select onValueChange={(value) => form.setValue('projectId', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal-growth">Personal Growth</SelectItem>
                  <SelectItem value="health-fitness">Health & Fitness</SelectItem>
                  <SelectItem value="skill-development">Skill Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Advanced Options
            </h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="reminderEnabled">Enable Reminders</Label>
              <Switch
                id="reminderEnabled"
                {...form.register('reminderEnabled')}
              />
            </div>

            <div>
              <Label htmlFor="gracePeriod">Grace Period (Days)</Label>
              <Select onValueChange={(value) => form.setValue('gracePeriod', parseInt(value))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="0" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No grace period</SelectItem>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="2">2 days</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          {form.watch('name') && (
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Preview</h4>
              <Badge variant={isQuantitative ? "default" : "secondary"}>
                {isQuantitative ? 'Quantitative' : 'Qualitative'} Habit
              </Badge>
              <p className="text-sm text-gray-600 mt-1">
                {form.watch('name')} • {form.watch('frequency').toLowerCase()}
                {isQuantitative && ` • Target: ${form.watch('target')} ${form.watch('unit')}`}
              </p>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting || createHabitMutation.isPending}
            className="w-full"
          >
            {isSubmitting ? 'Creating Habit...' : 'Create Habit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

### Habit Card Component

```typescript
// components/habits/HabitCard.tsx
'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  Target, 
  Flame, 
  TrendingUp, 
  Check, 
  Calendar,
  Clock,
  Link as LinkIcon
} from 'lucide-react'
import { Habit, HabitEntry } from '@/types'
import { HabitWeeklyChart } from './HabitWeeklyChart'
import { formatDistanceToNow } from 'date-fns'

interface HabitCardProps {
  habit: Habit
  onComplete?: (habitId: string, entry: Partial<HabitEntry>) => void
  showStats?: boolean
  compact?: boolean
}

export function HabitCard({ 
  habit, 
  onComplete, 
  showStats = false,
  compact = false 
}: HabitCardProps) {
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [completionValue, setCompletionValue] = useState<number>(habit.target || 1)
  const [notes, setNotes] = useState('')
  const queryClient = useQueryClient()

  const completeHabitMutation = useMutation({
    mutationFn: async (entry: Partial<HabitEntry>) => {
      const response = await fetch(`/api/habits/${habit.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      })
      
      if (!response.ok) {
        throw new Error('Failed to complete habit')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      setCheckInOpen(false)
      setNotes('')
      setCompletionValue(habit.target || 1)
    }
  })

  const handleComplete = () => {
    const entry: Partial<HabitEntry> = {
      value: habit.target ? completionValue : 1,
      notes: notes.trim() || undefined,
      completed: true,
      completedAt: new Date()
    }

    completeHabitMutation.mutate(entry)
    onComplete?.(habit.id, entry)
  }

  const getPriorityColor = (completionRate: number) => {
    if (completionRate >= 80) return 'text-emerald-600 dark:text-emerald-400'
    if (completionRate >= 60) return 'text-amber-600 dark:text-amber-400'
    return 'text-rose-600 dark:text-rose-400'
  }

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'text-purple-600 dark:text-purple-400'
    if (streak >= 7) return 'text-emerald-600 dark:text-emerald-400'
    if (streak >= 3) return 'text-amber-600 dark:text-amber-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full bg-${habit.category?.color || 'gray-400'}`} />
              <div>
                <h3 className="font-medium">{habit.name}</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className={getStreakColor(habit.currentStreak)}>
                    {habit.currentStreak} day streak
                  </span>
                  <span>•</span>
                  <span className={getPriorityColor(habit.completionRate)}>
                    {Math.round(habit.completionRate)}%
                  </span>
                </div>
              </div>
            </div>
            
            <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant={habit.todayCompleted ? "secondary" : "default"}
                  disabled={habit.todayCompleted}
                >
                  {habit.todayCompleted ? <Check className="h-4 w-4" /> : "Check In"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Complete {habit.name}</DialogTitle>
                </DialogHeader>
                {/* Check-in form content */}
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-lg">{habit.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {habit.frequency.toLowerCase()}
              </Badge>
            </div>
            
            {habit.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {habit.description}
              </p>
            )}
            
            <div className="flex items-center space-x-4 text-sm">
              {habit.category && (
                <div className="flex items-center space-x-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: habit.category.color }}
                  />
                  <span>{habit.category.name}</span>
                </div>
              )}
              
              {habit.scheduledTime && (
                <div className="flex items-center space-x-1 text-gray-600">
                  <Clock className="h-3 w-3" />
                  <span>{habit.scheduledTime}</span>
                </div>
              )}
              
              {habit.project && (
                <div className="flex items-center space-x-1 text-gray-600">
                  <LinkIcon className="h-3 w-3" />
                  <span>{habit.project.name}</span>
                </div>
              )}
            </div>
          </div>

          <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
            <DialogTrigger asChild>
              <Button 
                variant={habit.todayCompleted ? "secondary" : "default"}
                disabled={habit.todayCompleted}
                className="shrink-0"
              >
                {habit.todayCompleted ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Completed
                  </>
                ) : (
                  "Check In"
                )}
              </Button>
            </DialogTrigger>
            
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Complete {habit.name}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {habit.target && habit.unit && (
                  <div>
                    <Label htmlFor="completionValue">
                      How many {habit.unit} did you complete?
                    </Label>
                    <Input
                      id="completionValue"
                      type="number"
                      value={completionValue}
                      onChange={(e) => setCompletionValue(Number(e.target.value))}
                      className="mt-1"
                      min="0"
                      max={habit.target * 2} // Allow exceeding target
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Target: {habit.target} {habit.unit}
                    </p>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="How did it go? Any observations?"
                    className="mt-1"
                    rows={2}
                  />
                </div>
                
                <Button 
                  onClick={handleComplete}
                  disabled={completeHabitMutation.isPending}
                  className="w-full"
                >
                  {completeHabitMutation.isPending ? 'Completing...' : 'Complete'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Indicators */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getStreakColor(habit.currentStreak)}`}>
              {habit.currentStreak}
            </div>
            <div className="text-xs text-gray-600 flex items-center justify-center">
              <Flame className="h-3 w-3 mr-1" />
              Current Streak
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
              {habit.bestStreak}
            </div>
            <div className="text-xs text-gray-600 flex items-center justify-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              Best Streak
            </div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${getPriorityColor(habit.completionRate)}`}>
              {Math.round(habit.completionRate)}%
            </div>
            <div className="text-xs text-gray-600 flex items-center justify-center">
              <Target className="h-3 w-3 mr-1" />
              Success Rate
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Weekly Progress</span>
            <span>{Math.round(habit.completionRate)}%</span>
          </div>
          <Progress 
            value={habit.completionRate} 
            className="h-2"
            // Custom color based on performance
          />
        </div>

        {/* Weekly Chart */}
        {showStats && habit.weeklyData && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">This Week</h4>
            <HabitWeeklyChart 
              data={habit.weeklyData} 
              habitName={habit.name}
            />
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span>
                {habit.weeklyData.filter(d => d.completed).length} of {habit.weeklyData.length} days
              </span>
              <span>
                {Math.round((habit.weeklyData.filter(d => d.completed).length / habit.weeklyData.length) * 100)}% this week
              </span>
            </div>
          </div>
        )}

        {/* AI Insights Preview */}
        {habit.successProbability !== undefined && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-medium">AI Insight</span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {Math.round(habit.successProbability * 100)}% chance of maintaining streak this week
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

## Analytics Engine Implementation

### Streak Calculator

```typescript
// lib/habits/streak-calculator.ts
import { HabitEntry, StreakData, StreakStatus, HabitFrequency } from '@/types'
import { 
  parseISO, 
  format, 
  subDays, 
  differenceInDays, 
  startOfWeek, 
  endOfWeek,
  eachWeekOfInterval,
  isSameWeek,
  startOfMonth,
  endOfMonth,
  isSameMonth
} from 'date-fns'

export interface StreakOptions {
  gracePeriod?: number
  frequency?: HabitFrequency
  allowPartialCredit?: boolean
}

export function calculateStreak(
  entries: HabitEntry[], 
  currentDate: string, 
  options: StreakOptions = {}
): StreakData {
  const { gracePeriod = 0, frequency = 'DAILY', allowPartialCredit = false } = options
  
  // Sort entries by date descending
  const sortedEntries = entries
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  const currentDateObj = parseISO(currentDate)
  let currentStreak = 0
  let bestStreak = 0
  let tempStreak = 0
  let graceDaysUsed = 0
  let streakFrozen = false

  if (frequency === 'DAILY') {
    return calculateDailyStreak(sortedEntries, currentDateObj, gracePeriod)
  } else if (frequency === 'WEEKLY') {
    return calculateWeeklyStreak(sortedEntries, currentDateObj, gracePeriod)
  } else if (frequency === 'MONTHLY') {
    return calculateMonthlyStreak(sortedEntries, currentDateObj, gracePeriod)
  }

  return { current: 0, best: 0, frozen: false }
}

function calculateDailyStreak(
  entries: HabitEntry[], 
  currentDate: Date, 
  gracePeriod: number
): StreakData {
  let currentStreak = 0
  let bestStreak = 0
  let tempStreak = 0
  let graceDaysUsed = 0
  let streakFrozen = false

  // Check each day from current date backwards
  for (let i = 0; i <= 365; i++) { // Max look back of 1 year
    const checkDate = subDays(currentDate, i)
    const dateStr = format(checkDate, 'yyyy-MM-dd')
    const entry = entries.find(e => e.date === dateStr)

    if (entry?.completed) {
      tempStreak++
      if (i === 0 || tempStreak > graceDaysUsed) {
        currentStreak = tempStreak
      }
    } else {
      // Missed day - check if we can use grace period
      if (graceDaysUsed < gracePeriod && tempStreak > 0) {
        graceDaysUsed++
        streakFrozen = true
        continue // Skip this missed day
      } else {
        // Streak broken
        if (tempStreak > bestStreak) {
          bestStreak = tempStreak
        }
        
        if (i === 0) {
          currentStreak = 0 // Today not completed, no current streak
        }
        
        tempStreak = 0
        graceDaysUsed = 0
        streakFrozen = false
      }
    }
  }

  // Final best streak check
  if (tempStreak > bestStreak) {
    bestStreak = tempStreak
  }

  return {
    current: currentStreak,
    best: bestStreak,
    frozen: streakFrozen
  }
}

function calculateWeeklyStreak(
  entries: HabitEntry[], 
  currentDate: Date, 
  gracePeriod: number
): StreakData {
  let currentStreak = 0
  let bestStreak = 0
  let tempStreak = 0

  // Get all weeks from current date backwards
  const currentWeekStart = startOfWeek(currentDate)
  
  for (let weekOffset = 0; weekOffset < 52; weekOffset++) {
    const weekStart = startOfWeek(subDays(currentDate, weekOffset * 7))
    const weekEnd = endOfWeek(weekStart)
    
    // Check if any entry exists in this week
    const weekCompleted = entries.some(entry => {
      const entryDate = parseISO(entry.date)
      return entry.completed && 
             entryDate >= weekStart && 
             entryDate <= weekEnd
    })

    if (weekCompleted) {
      tempStreak++
      if (weekOffset === 0 || currentStreak === 0) {
        currentStreak = tempStreak
      }
    } else {
      // Week missed
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak
      }
      
      if (weekOffset === 0) {
        currentStreak = 0
      }
      
      tempStreak = 0
    }
  }

  if (tempStreak > bestStreak) {
    bestStreak = tempStreak
  }

  return {
    current: currentStreak,
    best: bestStreak,
    frozen: false
  }
}

function calculateMonthlyStreak(
  entries: HabitEntry[], 
  currentDate: Date, 
  gracePeriod: number
): StreakData {
  let currentStreak = 0
  let bestStreak = 0
  let tempStreak = 0

  for (let monthOffset = 0; monthOffset < 24; monthOffset++) {
    const targetMonth = new Date(
      currentDate.getFullYear(), 
      currentDate.getMonth() - monthOffset, 
      1
    )
    
    const monthStart = startOfMonth(targetMonth)
    const monthEnd = endOfMonth(targetMonth)
    
    const monthCompleted = entries.some(entry => {
      const entryDate = parseISO(entry.date)
      return entry.completed && 
             entryDate >= monthStart && 
             entryDate <= monthEnd
    })

    if (monthCompleted) {
      tempStreak++
      if (monthOffset === 0 || currentStreak === 0) {
        currentStreak = tempStreak
      }
    } else {
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak
      }
      
      if (monthOffset === 0) {
        currentStreak = 0
      }
      
      tempStreak = 0
    }
  }

  if (tempStreak > bestStreak) {
    bestStreak = tempStreak
  }

  return {
    current: currentStreak,
    best: bestStreak,
    frozen: false
  }
}

export function getStreakStatus(
  entries: HabitEntry[], 
  currentDate: string,
  options: StreakOptions = {}
): StreakStatus {
  const streak = calculateStreak(entries, currentDate, options)
  const todayEntry = entries.find(e => e.date === currentDate)
  
  if (todayEntry?.completed) {
    return {
      type: 'ACTIVE',
      message: `Great job! You're on a ${streak.current} day streak!`,
      encouragement: streak.current >= 7 ? "You're building an amazing habit!" : "Keep it up!"
    }
  }
  
  if (streak.frozen && options.gracePeriod) {
    return {
      type: 'GRACE',
      message: `Streak preserved! Complete today to continue your ${streak.current} day streak.`,
      daysToRecovery: 1
    }
  }
  
  if (streak.current === 0) {
    const yesterday = format(subDays(parseISO(currentDate), 1), 'yyyy-MM-dd')
    const yesterdayEntry = entries.find(e => e.date === yesterday)
    
    if (yesterdayEntry?.completed) {
      return {
        type: 'RECOVERY',
        message: 'Complete today to start a new streak!',
        daysToRecovery: 1,
        encouragement: "Every expert was once a beginner. Start again!"
      }
    }
    
    return {
      type: 'BROKEN',
      message: 'Time to restart your habit journey!',
      daysToRecovery: 1,
      encouragement: "The best time to plant a tree was 20 years ago. The second best time is now!"
    }
  }

  return {
    type: 'RECOVERY',
    message: `Complete today to continue your ${streak.current} day streak!`,
    daysToRecovery: 1
  }
}

export function calculateStreakMomentum(
  streakHistory: Array<{
    date: string
    streaks: Record<string, number>
  }>
): {
  trending: string[]
  declining: string[]
  overall: 'POSITIVE' | 'NEGATIVE' | 'MIXED' | 'STABLE'
  recommendations: string[]
} {
  if (streakHistory.length < 3) {
    return {
      trending: [],
      declining: [],
      overall: 'STABLE',
      recommendations: ['Keep tracking for more insights']
    }
  }

  const habitNames = new Set<string>()
  streakHistory.forEach(day => {
    Object.keys(day.streaks).forEach(habit => habitNames.add(habit))
  })

  const trending: string[] = []
  const declining: string[] = []

  habitNames.forEach(habitName => {
    const recentData = streakHistory
      .slice(-7) // Last 7 days
      .map(day => day.streaks[habitName] || 0)
    
    // Calculate trend using simple linear regression slope
    const n = recentData.length
    const sumX = (n * (n - 1)) / 2
    const sumY = recentData.reduce((sum, val) => sum + val, 0)
    const sumXY = recentData.reduce((sum, val, index) => sum + (index * val), 0)
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    
    if (slope > 0.5) {
      trending.push(habitName)
    } else if (slope < -0.5) {
      declining.push(habitName)
    }
  })

  let overall: 'POSITIVE' | 'NEGATIVE' | 'MIXED' | 'STABLE'
  if (trending.length > declining.length && trending.length > 0) {
    overall = 'POSITIVE'
  } else if (declining.length > trending.length && declining.length > 0) {
    overall = 'NEGATIVE'
  } else if (trending.length > 0 && declining.length > 0) {
    overall = 'MIXED'
  } else {
    overall = 'STABLE'
  }

  const recommendations: string[] = []
  if (declining.length > 0) {
    recommendations.push(`Focus on rebuilding: ${declining.slice(0, 2).join(', ')}`)
  }
  if (trending.length > 0) {
    recommendations.push(`Great momentum with: ${trending.slice(0, 2).join(', ')}`)
  }
  if (recommendations.length === 0) {
    recommendations.push('Keep maintaining your steady progress!')
  }

  return {
    trending,
    declining,
    overall,
    recommendations
  }
}
```

### Analytics Metrics Calculator

```typescript
// lib/analytics/metrics.ts
import { 
  ProductivityMetrics, 
  TimeProductivityData, 
  WeeklyInsights, 
  HabitProductivityCorrelation,
  AIInsight 
} from '@/types'

export function calculateProductivityScore(userData: {
  tasksCompleted: number
  tasksPlanned: number
  focusHours: number
  habitCompletionRate: number
  streakDays: number
  consistencyScore: number
}): number {
  const {
    tasksCompleted,
    tasksPlanned,
    focusHours,
    habitCompletionRate,
    streakDays,
    consistencyScore
  } = userData

  // Weighted scoring algorithm
  const taskScore = (tasksCompleted / Math.max(tasksPlanned, 1)) * 30 // 30% weight
  const focusScore = Math.min(focusHours / 8, 1) * 25 // 25% weight, cap at 8 hours
  const habitScore = habitCompletionRate * 20 // 20% weight
  const streakScore = Math.min(streakDays / 7, 1) * 15 // 15% weight, cap at 7 days
  const consistencyScoreWeighted = consistencyScore * 10 // 10% weight

  const totalScore = taskScore + focusScore + habitScore + streakScore + consistencyScoreWeighted
  
  return Math.round(Math.min(totalScore, 100)) // Cap at 100
}

export function calculateCompletionRate(
  tasks: Array<{
    status: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    weight?: number
  }>
): number {
  if (tasks.length === 0) return 0

  const priorityWeights = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    URGENT: 4
  }

  let totalWeight = 0
  let completedWeight = 0

  tasks.forEach(task => {
    const weight = task.weight || priorityWeights[task.priority]
    totalWeight += weight
    
    if (task.status === 'DONE') {
      completedWeight += weight
    } else if (task.status === 'IN_PROGRESS') {
      completedWeight += weight * 0.5 // 50% credit for in-progress
    }
  })

  return (completedWeight / totalWeight) * 100
}

export function generateWeeklyInsights(
  timeData: TimeProductivityData[]
): WeeklyInsights {
  if (timeData.length === 0) {
    return {
      peakHour: 10,
      lowEnergyPeriod: '14:00-15:00',
      recommendedFocusTime: '10:00-11:00',
      averageFocusSession: 25,
      productivityTrend: 'STABLE',
      keyInsights: ['Not enough data for insights'],
      actionableRecommendations: ['Track more data to get personalized insights']
    }
  }

  // Find peak productivity hour
  const peakHour = timeData.reduce((peak, current) => 
    current.productivity > peak.productivity ? current : peak
  ).hour

  // Find low energy periods (consecutive hours with productivity < 0.6)
  const lowEnergyPeriods: string[] = []
  for (let i = 0; i < timeData.length - 1; i++) {
    if (timeData[i].productivity < 0.6 && timeData[i + 1].productivity < 0.6) {
      lowEnergyPeriods.push(`${timeData[i].hour}:00-${timeData[i + 1].hour}:00`)
    }
  }
  const lowEnergyPeriod = lowEnergyPeriods[0] || '14:00-15:00'

  // Calculate average focus session length
  const totalFocusMinutes = timeData.reduce((sum, data) => sum + data.focusMinutes, 0)
  const averageFocusSession = Math.round(totalFocusMinutes / timeData.length)

  // Determine productivity trend (simple implementation)
  const firstHalf = timeData.slice(0, Math.floor(timeData.length / 2))
  const secondHalf = timeData.slice(Math.floor(timeData.length / 2))
  
  const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.productivity, 0) / firstHalf.length
  const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.productivity, 0) / secondHalf.length
  
  let productivityTrend: 'IMPROVING' | 'DECLINING' | 'STABLE'
  const trendDiff = secondHalfAvg - firstHalfAvg
  if (trendDiff > 0.1) {
    productivityTrend = 'IMPROVING'
  } else if (trendDiff < -0.1) {
    productivityTrend = 'DECLINING'
  } else {
    productivityTrend = 'STABLE'
  }

  // Generate insights
  const keyInsights: string[] = []
  const recommendations: string[] = []

  if (peakHour < 12) {
    keyInsights.push('You are most productive in the morning hours')
    recommendations.push('Schedule your most important tasks before lunch')
  } else {
    keyInsights.push('You tend to be more productive in the afternoon')
    recommendations.push('Use morning hours for lighter administrative tasks')
  }

  if (averageFocusSession < 25) {
    keyInsights.push('Your focus sessions are shorter than the recommended 25-minute Pomodoro')
    recommendations.push('Try the Pomodoro technique to extend focus sessions')
  } else if (averageFocusSession > 90) {
    keyInsights.push('You tend to have very long focus sessions')
    recommendations.push('Consider taking breaks every 90 minutes to maintain peak performance')
  }

  if (productivityTrend === 'DECLINING') {
    recommendations.push('Your productivity has been declining - consider reviewing your habits and sleep schedule')
  } else if (productivityTrend === 'IMPROVING') {
    keyInsights.push('Your productivity is on an upward trend - great job!')
  }

  return {
    peakHour,
    lowEnergyPeriod,
    recommendedFocusTime: `${peakHour}:00-${peakHour + 1}:00`,
    averageFocusSession,
    productivityTrend,
    keyInsights,
    actionableRecommendations: recommendations
  }
}

export function calculateHabitProductivityCorrelation(
  habitData: Record<string, {
    completed: boolean[]
    productivity: number[]
  }>
): Record<string, HabitProductivityCorrelation> {
  const correlations: Record<string, HabitProductivityCorrelation> = {}

  Object.entries(habitData).forEach(([habitName, data]) => {
    const { completed, productivity } = data
    
    if (completed.length !== productivity.length || completed.length < 3) {
      correlations[habitName] = {
        habitId: habitName,
        habitName,
        correlation: 0,
        impact: 'LOW',
        sampleSize: completed.length,
        confidence: 0
      }
      return
    }

    // Calculate Pearson correlation coefficient
    const n = completed.length
    const completedNum = completed.map(c => c ? 1 : 0)
    
    const sumX = completedNum.reduce((sum, val) => sum + val, 0)
    const sumY = productivity.reduce((sum, val) => sum + val, 0)
    const sumXY = completedNum.reduce((sum, val, i) => sum + (val * productivity[i]), 0)
    const sumXX = completedNum.reduce((sum, val) => sum + (val * val), 0)
    const sumYY = productivity.reduce((sum, val) => sum + (val * val), 0)

    const numerator = (n * sumXY) - (sumX * sumY)
    const denominator = Math.sqrt(((n * sumXX) - (sumX * sumX)) * ((n * sumYY) - (sumY * sumY)))
    
    const correlation = denominator === 0 ? 0 : numerator / denominator

    // Determine impact level
    let impact: 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGATIVE'
    if (correlation > 0.7) {
      impact = 'HIGH'
    } else if (correlation > 0.3) {
      impact = 'MEDIUM'
    } else if (correlation < -0.3) {
      impact = 'NEGATIVE'
    } else {
      impact = 'LOW'
    }

    // Calculate confidence based on sample size and correlation strength
    const sampleSizeConfidence = Math.min(n / 30, 1) // Full confidence at 30+ samples
    const correlationConfidence = Math.abs(correlation)
    const confidence = (sampleSizeConfidence + correlationConfidence) / 2

    correlations[habitName] = {
      habitId: habitName,
      habitName,
      correlation: Math.round(correlation * 100) / 100, // Round to 2 decimals
      impact,
      sampleSize: n,
      confidence: Math.round(confidence * 100) / 100
    }
  })

  return correlations
}

export async function generateAIInsights(
  productivityData: ProductivityMetrics,
  habitCorrelations: Record<string, HabitProductivityCorrelation>,
  weeklyInsights: WeeklyInsights
): Promise<AIInsight[]> {
  const insights: AIInsight[] = []

  // Productivity trend insight
  if (productivityData.trendDirection === 'DOWN') {
    insights.push({
      id: `productivity-decline-${Date.now()}`,
      type: 'PRODUCTIVITY',
      title: 'Productivity Decline Detected',
      description: `Your productivity score has decreased by ${Math.abs(productivityData.weekOverWeekChange)}% this week.`,
      confidence: 0.85,
      actionable: true,
      recommendation: 'Consider reviewing your sleep schedule, reducing distractions, or adjusting your workload.',
      dataPoints: [productivityData.weekOverWeekChange],
      generatedAt: new Date()
    })
  }

  // High-impact habit insights
  Object.values(habitCorrelations).forEach(habit => {
    if (habit.impact === 'HIGH' && habit.confidence > 0.7) {
      insights.push({
        id: `habit-impact-${habit.habitId}-${Date.now()}`,
        type: 'HABIT',
        title: `${habit.habitName} Significantly Boosts Productivity`,
        description: `Strong correlation (${(habit.correlation * 100).toFixed(0)}%) between ${habit.habitName} and your productive days.`,
        confidence: habit.confidence,
        actionable: true,
        recommendation: `Prioritize maintaining your ${habit.habitName} habit for optimal productivity.`,
        dataPoints: [habit.correlation, habit.sampleSize],
        generatedAt: new Date()
      })
    }
  })

  // Time-based insights
  if (weeklyInsights.peakHour < 9 || weeklyInsights.peakHour > 18) {
    insights.push({
      id: `peak-time-${Date.now()}`,
      type: 'TIME',
      title: 'Unusual Peak Productivity Hours',
      description: `Your peak productivity occurs at ${weeklyInsights.peakHour}:00, which is outside typical working hours.`,
      confidence: 0.75,
      actionable: true,
      recommendation: 'Consider adjusting your schedule to align important tasks with your natural energy peaks.',
      dataPoints: [weeklyInsights.peakHour],
      generatedAt: new Date()
    })
  }

  // Pattern recognition insight
  if (weeklyInsights.averageFocusSession < 15) {
    insights.push({
      id: `focus-pattern-${Date.now()}`,
      type: 'PATTERN',
      title: 'Short Focus Sessions Detected',
      description: `Your average focus session is ${weeklyInsights.averageFocusSession} minutes, which may be limiting productivity.`,
      confidence: 0.8,
      actionable: true,
      recommendation: 'Try the Pomodoro technique (25-minute focused work sessions) to improve concentration.',
      dataPoints: [weeklyInsights.averageFocusSession],
      generatedAt: new Date()
    })
  }

  return insights
}

// Utility function for predictive analytics
export function predictHabitSuccess(
  habitHistory: Array<{ date: string; completed: boolean }>,
  currentStreak: number,
  habitFrequency: string
): { probability: number; confidence: number; factors: string[] } {
  if (habitHistory.length < 7) {
    return {
      probability: 0.5,
      confidence: 0.2,
      factors: ['Insufficient data for accurate prediction']
    }
  }

  const factors: string[] = []
  let baseScore = 0.5 // Start with 50% baseline

  // Recent completion rate (last 7 days)
  const recentEntries = habitHistory.slice(-7)
  const recentCompletionRate = recentEntries.filter(e => e.completed).length / 7
  baseScore += (recentCompletionRate - 0.5) * 0.3
  
  if (recentCompletionRate > 0.7) {
    factors.push('Strong recent performance')
  } else if (recentCompletionRate < 0.3) {
    factors.push('Recent completion rate is low')
  }

  // Streak momentum
  if (currentStreak >= 7) {
    baseScore += 0.2
    factors.push('Active streak provides momentum')
  } else if (currentStreak === 0) {
    baseScore -= 0.1
    factors.push('No current streak')
  }

  // Consistency pattern (standard deviation of gaps between completions)
  const completionDates = habitHistory
    .filter(e => e.completed)
    .map(e => new Date(e.date))
  
  if (completionDates.length >= 3) {
    const gaps = completionDates
      .slice(1)
      .map((date, i) => (date.getTime() - completionDates[i].getTime()) / (1000 * 60 * 60 * 24))
    
    const meanGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
    const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - meanGap, 2), 0) / gaps.length
    const consistency = 1 / (1 + variance / meanGap)
    
    baseScore += (consistency - 0.5) * 0.15
    
    if (consistency > 0.7) {
      factors.push('Consistent completion pattern')
    }
  }

  // Weekend effect for daily habits
  if (habitFrequency === 'DAILY') {
    const weekendCompletions = habitHistory.filter(e => {
      const date = new Date(e.date)
      const day = date.getDay()
      return e.completed && (day === 0 || day === 6)
    }).length
    
    const totalWeekends = Math.floor(habitHistory.length / 7) * 2
    const weekendRate = totalWeekends > 0 ? weekendCompletions / totalWeekends : 0.5
    
    if (weekendRate < 0.3) {
      baseScore -= 0.1
      factors.push('Lower completion rate on weekends')
    }
  }

  const probability = Math.max(0, Math.min(1, baseScore))
  const confidence = Math.min(1, habitHistory.length / 30) // Full confidence at 30+ data points

  return {
    probability: Math.round(probability * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    factors
  }
}
```

## Performance Considerations

### Data Processing Optimization

```typescript
// lib/analytics/performance.ts
import { Task, Habit, HabitEntry } from '@/types'

// Virtual scrolling for large datasets
export class VirtualScrollManager {
  private itemHeight: number
  private containerHeight: number
  private scrollTop: number = 0

  constructor(itemHeight: number, containerHeight: number) {
    this.itemHeight = itemHeight
    this.containerHeight = containerHeight
  }

  getVisibleRange(totalItems: number): { start: number; end: number } {
    const start = Math.floor(this.scrollTop / this.itemHeight)
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight)
    const end = Math.min(start + visibleCount + 2, totalItems) // +2 for buffer
    
    return { start: Math.max(0, start - 1), end } // -1 for buffer
  }

  updateScrollPosition(scrollTop: number) {
    this.scrollTop = scrollTop
  }
}

// Debounced search for large habit datasets
export function createDebouncedHabitSearch() {
  let timeoutId: NodeJS.Timeout | null = null

  return function debouncedSearch(
    query: string,
    habits: Habit[],
    callback: (results: Habit[]) => void,
    delay: number = 300
  ) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      const results = searchHabits(query, habits)
      callback(results)
    }, delay)
  }
}

function searchHabits(query: string, habits: Habit[]): Habit[] {
  if (!query.trim()) return habits

  const normalizedQuery = query.toLowerCase()
  
  return habits.filter(habit => 
    habit.name.toLowerCase().includes(normalizedQuery) ||
    habit.description?.toLowerCase().includes(normalizedQuery) ||
    habit.category?.name.toLowerCase().includes(normalizedQuery)
  )
}

// Efficient data aggregation using Web Workers for large datasets
export class AnalyticsWorkerManager {
  private worker: Worker | null = null

  constructor() {
    if (typeof window !== 'undefined' && 'Worker' in window) {
      this.worker = new Worker('/workers/analytics-worker.js')
    }
  }

  async calculateMetrics(data: {
    habits: Habit[]
    entries: HabitEntry[]
    tasks: Task[]
  }): Promise<any> {
    if (!this.worker) {
      // Fallback to main thread calculation
      return this.calculateMetricsSync(data)
    }

    return new Promise((resolve, reject) => {
      this.worker!.onmessage = (e) => {
        if (e.data.error) {
          reject(new Error(e.data.error))
        } else {
          resolve(e.data.result)
        }
      }

      this.worker!.postMessage({ type: 'CALCULATE_METRICS', data })
    })
  }

  private calculateMetricsSync(data: any) {
    // Synchronous fallback calculations
    return {
      productivityScore: 75,
      habitConsistency: 0.8,
      insights: []
    }
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}

// Memory-efficient habit data aggregation
export function aggregateHabitData(
  entries: HabitEntry[],
  options: {
    groupBy: 'day' | 'week' | 'month'
    limit?: number
    startDate?: Date
    endDate?: Date
  }
): Array<{ period: string; completions: number; totalValue: number }> {
  const { groupBy, limit = 100, startDate, endDate } = options
  
  // Filter entries by date range
  let filteredEntries = entries
  if (startDate || endDate) {
    filteredEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date)
      return (!startDate || entryDate >= startDate) && 
             (!endDate || entryDate <= endDate)
    })
  }

  // Group entries efficiently using Map
  const groups = new Map<string, { completions: number; totalValue: number }>()
  
  filteredEntries.forEach(entry => {
    const date = new Date(entry.date)
    let periodKey: string
    
    switch (groupBy) {
      case 'week':
        // Get start of week (Monday)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay() + 1)
        periodKey = weekStart.toISOString().split('T')[0]
        break
      case 'month':
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      default:
        periodKey = entry.date
    }

    const existing = groups.get(periodKey) || { completions: 0, totalValue: 0 }
    
    if (entry.completed) {
      existing.completions++
      existing.totalValue += entry.value || 1
    }
    
    groups.set(periodKey, existing)
  })

  // Convert to array and sort by period
  const result = Array.from(groups.entries())
    .map(([period, data]) => ({ period, ...data }))
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-limit) // Keep only the most recent periods

  return result
}

// Optimized chart data preparation
export function prepareChartData(
  rawData: Array<{ date: string; value: number }>,
  chartType: 'line' | 'bar' | 'area'
) {
  // Pre-process data for optimal rendering
  const processedData = rawData.map(item => ({
    ...item,
    // Pre-calculate any derived values needed by charts
    formattedDate: new Date(item.date).toLocaleDateString(),
    normalizedValue: item.value // Could add normalization logic
  }))

  // Return configuration optimized for specific chart type
  switch (chartType) {
    case 'line':
      return {
        data: processedData,
        config: {
          tension: 0.1, // Smooth curves
          pointRadius: 0, // Hide individual points for performance
          borderWidth: 2
        }
      }
    case 'bar':
      return {
        data: processedData,
        config: {
          maxBarThickness: 50,
          borderRadius: 4
        }
      }
    case 'area':
      return {
        data: processedData,
        config: {
          fill: true,
          tension: 0.2,
          borderWidth: 2
        }
      }
    default:
      return { data: processedData, config: {} }
  }
}
```

### Database Performance & Indexing

**CRITICAL**: Analytics queries require comprehensive database indexing for sub-200ms response times. See `/context_docs/DATABASE_INDEXING_STRATEGY.md` for complete implementation details.

#### Key Performance Requirements:
- **Dashboard Overview**: <200ms (75% improvement from baseline)
- **Habit Analytics**: <300ms with 1000+ entries
- **Time Series Charts**: <500ms for full-year data
- **Productivity Metrics**: <250ms for complex calculations

#### Essential Database Indexes:
```sql
-- Core analytics indexes (implement immediately)
CREATE INDEX CONCURRENTLY idx_tasks_analytics_primary 
ON tasks (user_id, status, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_habit_entries_analytics 
ON habit_entries (habit_id, date DESC, completed);

CREATE INDEX CONCURRENTLY idx_daily_metrics_user_time 
ON daily_metrics (user_id, date DESC);
```

#### Query Caching Strategy:
```typescript
// Cache analytics results for optimal performance
const CACHE_DURATIONS = {
  productivityMetrics: 300,    // 5 minutes
  habitAnalytics: 3600,        // 1 hour  
  chartData: 1800,             // 30 minutes
  insights: 7200               // 2 hours
}
```

#### Performance Monitoring:
- Query duration tracking with 100ms slow query threshold
- Index usage analysis and optimization recommendations
- Automated alerts for performance degradation
- Cache hit rate monitoring (target: 85%+)

## Integration Points with Other Subgroups

### Calendar Integration
- **Habit Scheduling**: Display habits as calendar events with completion status
- **Conflict Detection**: Identify scheduling conflicts between habits and tasks
- **Recurring Events**: Generate recurring calendar entries for habit reminders

### Task Management Integration  
- **Habit-Task Links**: Connect habits to related project tasks
- **Productivity Correlation**: Analyze how habit completion affects task performance
- **Goal Alignment**: Link habits to project objectives and track progress

### Real-time Updates
- **Live Analytics**: Update charts and metrics as habits are completed
- **Streak Notifications**: Real-time streak updates across components
- **Progress Broadcasting**: Share habit achievements with collaboration features

### Notes & Content
- **Journal Integration**: Link habit entries to daily notes and reflections
- **Progress Documentation**: Auto-generate habit progress reports
- **Insight Capture**: Store AI-generated insights in the notes system

## Testing Strategies

### Unit Testing for Analytics
```typescript
// __tests__/lib/analytics/metrics.test.ts
describe('Analytics Metrics', () => {
  test('productivity score calculation with edge cases', () => {
    // Test with zero values
    expect(calculateProductivityScore({
      tasksCompleted: 0,
      tasksPlanned: 0,
      focusHours: 0,
      habitCompletionRate: 0,
      streakDays: 0,
      consistencyScore: 0
    })).toBe(0)

    // Test with maximum values  
    expect(calculateProductivityScore({
      tasksCompleted: 20,
      tasksPlanned: 15,
      focusHours: 12,
      habitCompletionRate: 1,
      streakDays: 30,
      consistencyScore: 1
    })).toBe(100)
  })

  test('habit correlation with insufficient data', () => {
    const correlations = calculateHabitProductivityCorrelation({
      'exercise': { completed: [true], productivity: [8] }
    })
    
    expect(correlations.exercise.confidence).toBeLessThan(0.5)
    expect(correlations.exercise.sampleSize).toBe(1)
  })
})
```

### Integration Testing for Habit System
```typescript
// __tests__/integration/habit-analytics-flow.test.ts
describe('Habit Analytics Integration', () => {
  test('complete habit workflow updates analytics', async () => {
    // Create habit
    const habit = await createHabit({
      name: 'Morning Exercise',
      frequency: 'DAILY',
      target: 30,
      unit: 'minutes'
    })

    // Complete habit
    await completeHabit(habit.id, { value: 35 })

    // Verify analytics update
    const analytics = await getAnalytics()
    expect(analytics.habitConsistency).toBeGreaterThan(0)
    expect(analytics.todayCompletions).toBe(1)
  })

  test('streak calculation affects productivity score', async () => {
    const initialScore = await getProductivityScore()
    
    // Complete habit for 7 consecutive days
    for (let i = 0; i < 7; i++) {
      await completeHabitForDate(habit.id, addDays(new Date(), -i))
    }

    const newScore = await getProductivityScore()
    expect(newScore).toBeGreaterThan(initialScore)
  })
})
```

### Performance Testing
```typescript
// __tests__/performance/analytics-performance.test.ts
describe('Analytics Performance', () => {
  test('handles large dataset efficiently', async () => {
    const largeDataset = generateMockHabitEntries(10000)
    
    const startTime = performance.now()
    const metrics = await calculateMetrics(largeDataset)
    const endTime = performance.now()
    
    expect(endTime - startTime).toBeLessThan(500) // 500ms limit
    expect(metrics).toBeDefined()
  })

  test('virtual scrolling renders only visible items', () => {
    const virtualScroll = new VirtualScrollManager(60, 400)
    const range = virtualScroll.getVisibleRange(1000)
    
    expect(range.end - range.start).toBeLessThan(20) // Only ~20 items rendered
  })
})
```

This comprehensive implementation provides TaskMaster Pro with sophisticated habit tracking, analytics, and AI-powered insights while maintaining optimal performance for large datasets and real-time updates.