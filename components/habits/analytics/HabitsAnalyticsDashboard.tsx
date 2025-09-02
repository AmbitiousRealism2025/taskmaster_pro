'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Habit, 
  HabitEntry, 
  ProductivityMetrics, 
  HabitProductivityCorrelation,
  WeeklyInsights,
  TimeProductivityData,
  HabitChartData 
} from '@/types/habit'
import { HabitStreakChart } from './HabitStreakChart'
import { ProductivityCorrelationChart } from './ProductivityCorrelationChart'
import { HeatmapCalendar } from './HeatmapCalendar'
import { WeeklyInsightsCard } from './WeeklyInsightsCard'
import { HabitAnalytics } from '@/lib/habits/analytics'

interface HabitsAnalyticsDashboardProps {
  habits: Habit[]
  habitEntries: Map<string, HabitEntry[]>
  productivityData: ProductivityMetrics[]
  className?: string
}

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all'
type ViewMode = 'overview' | 'individual' | 'correlations' | 'insights'

export function HabitsAnalyticsDashboard({
  habits,
  habitEntries,
  productivityData,
  className = ''
}: HabitsAnalyticsDashboardProps) {
  const [selectedHabit, setSelectedHabit] = useState<string>(habits[0]?.id || '')
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [viewMode, setViewMode] = useState<ViewMode>('overview')

  // Calculate time range dates
  const timeRangeData = useMemo(() => {
    const now = new Date()
    const ranges = {
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      '1y': new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      'all': new Date('2020-01-01')
    }
    
    return {
      start: ranges[timeRange],
      end: now,
      granularity: timeRange === '7d' ? 'day' as const : 
                  timeRange === '30d' ? 'day' as const :
                  timeRange === '90d' ? 'week' as const : 'month' as const
    }
  }, [timeRange])

  // Filter entries based on time range
  const filteredEntries = useMemo(() => {
    const filtered = new Map<string, HabitEntry[]>()
    
    habitEntries.forEach((entries, habitId) => {
      const filteredHabitEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date)
        return entryDate >= timeRangeData.start && entryDate <= timeRangeData.end
      })
      filtered.set(habitId, filteredHabitEntries)
    })
    
    return filtered
  }, [habitEntries, timeRangeData])

  // Calculate productivity correlations
  const productivityCorrelations = useMemo(() => {
    return HabitAnalytics.calculateProductivityCorrelations(
      habits,
      filteredEntries,
      productivityData.filter(pd => {
        const date = new Date(pd.date)
        return date >= timeRangeData.start && date <= timeRangeData.end
      })
    )
  }, [habits, filteredEntries, productivityData, timeRangeData])

  // Generate weekly insights
  const weeklyInsights = useMemo(() => {
    return HabitAnalytics.generateWeeklyInsights(
      habits,
      filteredEntries,
      productivityData.filter(pd => {
        const date = new Date(pd.date)
        return date >= timeRangeData.start && date <= timeRangeData.end
      })
    )
  }, [habits, filteredEntries, productivityData, timeRangeData])

  // Generate chart data for selected habit
  const selectedHabitData = useMemo(() => {
    if (!selectedHabit) return { chartData: [], entries: [] }
    
    const habit = habits.find(h => h.id === selectedHabit)
    const entries = filteredEntries.get(selectedHabit) || []
    
    if (!habit) return { chartData: [], entries }
    
    const chartData = HabitAnalytics.generateChartData(habit, entries, timeRangeData)
    
    return { chartData, entries, habit }
  }, [selectedHabit, habits, filteredEntries, timeRangeData])

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const totalHabits = habits.length
    const activeHabits = habits.filter(h => h.isActive).length
    
    let totalCompletions = 0
    let totalPossible = 0
    let totalCurrentStreak = 0
    let maxBestStreak = 0
    
    habits.forEach(habit => {
      const entries = filteredEntries.get(habit.id) || []
      const completions = entries.filter(e => e.completed).length
      totalCompletions += completions
      totalPossible += entries.length
      totalCurrentStreak += habit.currentStreak
      maxBestStreak = Math.max(maxBestStreak, habit.bestStreak)
    })
    
    const overallCompletionRate = totalPossible > 0 ? (totalCompletions / totalPossible) * 100 : 0
    const avgCurrentStreak = totalHabits > 0 ? totalCurrentStreak / totalHabits : 0
    
    return {
      totalHabits,
      activeHabits,
      overallCompletionRate,
      avgCurrentStreak,
      maxBestStreak,
      totalCompletions
    }
  }, [habits, filteredEntries])

  // Mock time productivity data (in real app, this would come from actual data)
  const mockTimeProductivity: TimeProductivityData[] = useMemo(() => {
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      productivity: Math.max(0.1, Math.sin((hour - 6) / 24 * Math.PI * 2) * 0.4 + 0.6),
      focusMinutes: Math.round(Math.random() * 120 + 30),
      taskCount: Math.round(Math.random() * 10 + 2),
      habitCompletions: Math.round(Math.random() * 5 + 1),
      averageRating: Math.random() * 5 + 3
    }))
  }, [])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Habits Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your progress and discover insights
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
              <SelectItem value="1y">1 year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Selector */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'individual', label: 'Individual' },
              { key: 'correlations', label: 'Correlations' },
              { key: 'insights', label: 'Insights' }
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={viewMode === key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(key as ViewMode)}
                className="text-xs"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {overallStats.totalHabits}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Habits</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {overallStats.activeHabits}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {overallStats.overallCompletionRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {Math.round(overallStats.avgCurrentStreak)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Streak</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {overallStats.maxBestStreak}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Best Streak</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Based on View Mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Habits by Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Habits</CardTitle>
              <CardDescription>Habits with highest completion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {habits
                  .map(habit => {
                    const entries = filteredEntries.get(habit.id) || []
                    const completionRate = entries.length > 0 
                      ? (entries.filter(e => e.completed).length / entries.length) * 100
                      : 0
                    return { habit, completionRate }
                  })
                  .sort((a, b) => b.completionRate - a.completionRate)
                  .slice(0, 5)
                  .map(({ habit, completionRate }) => (
                    <div key={habit.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {habit.name}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(completionRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[3rem]">
                          {completionRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Overall habit completion pattern</CardDescription>
            </CardHeader>
            <CardContent>
              {habits.length > 0 && (
                <HeatmapCalendar
                  entries={Array.from(filteredEntries.values()).flat()}
                  year={new Date().getFullYear()}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'individual' && (
        <div className="space-y-6">
          {/* Habit Selector */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Habit:
                </label>
                <Select value={selectedHabit} onValueChange={setSelectedHabit}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Choose a habit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {habits.map(habit => (
                      <SelectItem key={habit.id} value={habit.id}>
                        {habit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Individual Habit Analysis */}
          {selectedHabitData.habit && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{selectedHabitData.habit.name} - Streak Analysis</CardTitle>
                  <CardDescription>Track your consistency over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <HabitStreakChart data={selectedHabitData.chartData} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Activity Calendar</CardTitle>
                  <CardDescription>Visual representation of your habit completion</CardDescription>
                </CardHeader>
                <CardContent>
                  <HeatmapCalendar
                    entries={selectedHabitData.entries}
                    year={new Date().getFullYear()}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {viewMode === 'correlations' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Productivity Correlations</CardTitle>
              <CardDescription>How your habits affect overall productivity</CardDescription>
            </CardHeader>
            <CardContent>
              <ProductivityCorrelationChart data={productivityCorrelations} />
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'insights' && (
        <div className="space-y-6">
          <WeeklyInsightsCard 
            insights={weeklyInsights}
            timeProductivity={mockTimeProductivity}
          />
        </div>
      )}
    </div>
  )
}