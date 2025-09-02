import { 
  Habit, 
  HabitEntry, 
  ProductivityMetrics, 
  HabitProductivityCorrelation,
  WeeklyInsights,
  StreakMomentum,
  HabitPattern,
  HabitChartData,
  ProductivityChartData,
  TimeProductivityData,
  StreakData
} from '@/types/habit'
import { StreakCalculator } from './streak-calculator'

export interface AnalyticsTimeframe {
  start: Date
  end: Date
  granularity: 'day' | 'week' | 'month'
}

export interface HabitAnalyticsInput {
  habit: Habit
  entries: HabitEntry[]
  timeframe?: AnalyticsTimeframe
}

export class HabitAnalytics {
  /**
   * Generate comprehensive habit chart data for visualization
   */
  static generateChartData(
    habits: Habit[],
    habitEntries: Map<string, HabitEntry[]>,
    timeframe: AnalyticsTimeframe = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date(),
      granularity: 'day'
    }
  ): HabitChartData[] {
    const results: HabitChartData[] = []
    
    habits.forEach(habit => {
      const entries = habitEntries.get(habit.id) || []
      const current = new Date(timeframe.start)

      while (current <= timeframe.end) {
        const dateString = current.toISOString().split('T')[0]
        const entry = entries.find(e => e.date === dateString)
        
        results.push({
          date: dateString,
          completed: entry?.completed || false,
          value: entry?.value,
          streak: habit.currentStreak,
          formattedDate: current.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          dayOfWeek: current.toLocaleDateString('en-US', { weekday: 'short' })
        })

        // Increment date based on granularity
        switch (timeframe.granularity) {
          case 'day':
            current.setDate(current.getDate() + 1)
            break
          case 'week':
            current.setDate(current.getDate() + 7)
            break
          case 'month':
            current.setMonth(current.getMonth() + 1)
            break
        }
      }
    })

    return results
  }

  /**
   * Calculate habit completion rate within timeframe
   */
  private static calculateCompletionRate(
    entries: HabitEntry[], 
    timeframe: AnalyticsTimeframe
  ): number {
    const relevantEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date)
      return entryDate >= timeframe.start && entryDate <= timeframe.end
    })
    
    if (relevantEntries.length === 0) return 0
    
    const completedCount = relevantEntries.filter(entry => entry.completed).length
    return Math.round((completedCount / relevantEntries.length) * 100) / 100
  }

  /**
   * Map habit entries to the specified timeframe for chart visualization
   */
  private static mapEntriesToTimeframe(
    entries: HabitEntry[], 
    timeframe: AnalyticsTimeframe
  ): Array<{ date: string; completed: boolean; value?: number }> {
    const entryMap = new Map(entries.map(entry => [entry.date, entry]))
    const result: Array<{ date: string; completed: boolean; value?: number }> = []
    
    const current = new Date(timeframe.start)
    while (current <= timeframe.end) {
      const dateString = current.toISOString().split('T')[0]
      const entry = entryMap.get(dateString)
      
      result.push({
        date: dateString,
        completed: entry?.completed || false,
        value: entry?.value
      })
      
      current.setDate(current.getDate() + 1)
    }
    
    return result
  }

  /**
   * Calculate streak data for motivation insights
   */
  private static calculateStreakData(
    entries: HabitEntry[],
    habit: Habit
  ): StreakData {
    const streakData = StreakCalculator.calculateStreaks({
      entries,
      config: {
        frequency: habit.frequency,
        gracePeriod: habit.gracePeriod,
        createdAt: habit.createdAt
      }
    })

    // Simple momentum calculation based on recent performance
    const recentEntries = entries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7) // Last 7 entries

    const recentCompletionRate = recentEntries.length > 0
      ? recentEntries.filter(e => e.completed).length / recentEntries.length
      : 0

    let momentum: 'BUILDING' | 'STABLE' | 'DECLINING'
    if (recentCompletionRate >= 0.8) momentum = 'BUILDING'
    else if (recentCompletionRate >= 0.5) momentum = 'STABLE'
    else momentum = 'DECLINING'

    return {
      current: streakData.currentStreak || habit.currentStreak,
      best: streakData.longestStreak || habit.bestStreak,
      momentum
    }
  }

  /**
   * Generate weekly insights for habit performance
   */
  static generateWeeklyInsights(
    habits: Habit[],
    habitEntries: Map<string, HabitEntry[]>,
    productivityData: ProductivityMetrics[]
  ): WeeklyInsights {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    // Calculate overall habit performance
    const habitPerformances = habits.map(habit => {
      const entries = habitEntries.get(habit.id) || []
      const weekEntries = entries.filter(e => 
        new Date(e.date) >= weekAgo && new Date(e.date) <= now
      )
      const completionRate = weekEntries.length > 0 
        ? weekEntries.filter(e => e.completed).length / weekEntries.length
        : 0
      
      return { habit, completionRate, entries: weekEntries }
    })

    const overallCompletion = habitPerformances.reduce((sum, hp) => sum + hp.completionRate, 0) / habits.length
    const trend = overallCompletion > 0.7 ? 'IMPROVING' : overallCompletion > 0.4 ? 'STABLE' : 'DECLINING'

    // Simple time analysis
    const peakHour = 10 // Default peak hour
    const lowEnergyPeriod = '14:00-15:00' // Default low energy period

    const keyInsights: string[] = []
    const recommendations: string[] = []

    // Basic insights
    const topHabit = habitPerformances.reduce((top, current) => 
      current.completionRate > top.completionRate ? current : top
    )
    
    if (topHabit.completionRate > 0.8) {
      keyInsights.push(`${topHabit.habit.name} shows excellent consistency at ${Math.round(topHabit.completionRate * 100)}%`)
    }

    const strugglingHabits = habitPerformances.filter(hp => hp.completionRate < 0.3)
    if (strugglingHabits.length > 0) {
      keyInsights.push(`${strugglingHabits.length} habit${strugglingHabits.length === 1 ? '' : 's'} need attention this week`)
    }

    // Basic recommendations
    strugglingHabits.forEach(hp => {
      recommendations.push(`Reduce ${hp.habit.name} target by 25% to rebuild momentum`)
    })

    if (overallCompletion < 0.6) {
      recommendations.push('Focus on consistency over perfection - complete 3 habits well rather than 5 poorly')
    }

    return {
      peakHour,
      lowEnergyPeriod,
      recommendedFocusTime: `${peakHour}:00-${peakHour + 2}:00`,
      averageFocusSession: 25, // Default 25 minutes
      productivityTrend: trend,
      keyInsights,
      actionableRecommendations: recommendations,
      confidence: Math.min(habitPerformances.length / habits.length, 0.9)
    }
  }

  /**
   * Calculate habit-specific productivity correlations
   */
  static calculateProductivityCorrelations(
    habits: Habit[],
    habitEntries: Map<string, HabitEntry[]>,
    productivityData: ProductivityMetrics[]
  ): HabitProductivityCorrelation[] {
    const correlations: HabitProductivityCorrelation[] = []

    habits.forEach(habit => {
      const entries = habitEntries.get(habit.id) || []
      const completedDates = new Set(entries.filter(e => e.completed).map(e => e.date))
      
      let completedProductivity = 0
      let missedProductivity = 0
      let completedCount = 0
      let missedCount = 0

      productivityData.forEach(metric => {
        const wasCompleted = completedDates.has(metric.date)
        if (wasCompleted) {
          completedProductivity += metric.productivityScore
          completedCount++
        } else {
          missedProductivity += metric.productivityScore
          missedCount++
        }
      })

      if (completedCount >= 3 && missedCount >= 3) {
        const completedAvg = completedProductivity / completedCount
        const missedAvg = missedProductivity / missedCount
        const correlation = (completedAvg - missedAvg) / Math.max(completedAvg, missedAvg, 1)
        
        let impact: 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGATIVE'
        if (correlation > 0.3) impact = 'HIGH'
        else if (correlation > 0.15) impact = 'MEDIUM'
        else if (correlation > 0) impact = 'LOW'
        else impact = 'NEGATIVE'

        correlations.push({
          habitId: habit.id,
          habitName: habit.name,
          correlation,
          impact,
          sampleSize: completedCount + missedCount,
          confidence: Math.min(Math.abs(correlation) * 2, 0.9),
          trend: 'STABLE' // Simplified for now
        })
      }
    })

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
  }
}