import { HabitFrequency, HabitEntry, StreakData, StreakStatus } from '@/types/habit'

export interface StreakConfig {
  frequency: HabitFrequency
  gracePeriod: number // Days before streak breaks
  createdAt: Date
}

export interface StreakCalculationInput {
  entries: HabitEntry[]
  config: StreakConfig
  currentDate?: Date
}

export class StreakCalculator {
  private static getExpectedDates(
    startDate: Date,
    endDate: Date,
    frequency: HabitFrequency
  ): string[] {
    const dates: string[] = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      dates.push(this.formatDate(current))
      
      switch (frequency) {
        case 'DAILY':
          current.setDate(current.getDate() + 1)
          break
        case 'WEEKLY':
          current.setDate(current.getDate() + 7)
          break
        case 'MONTHLY':
          current.setMonth(current.getMonth() + 1)
          break
        case 'CUSTOM':
          // For custom frequency, default to daily
          current.setDate(current.getDate() + 1)
          break
      }
    }
    
    return dates
  }

  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  private static parseDate(dateString: string): Date {
    return new Date(dateString + 'T00:00:00.000Z')
  }

  public static calculateStreaks({ entries, config, currentDate = new Date() }: StreakCalculationInput): StreakData {
    if (entries.length === 0) {
      return {
        current: 0,
        best: 0,
        frozen: false,
        momentum: 'NEW'
      }
    }

    // Sort entries by date
    const sortedEntries = entries
      .filter(entry => entry.completed)
      .sort((a, b) => a.date.localeCompare(b.date))

    if (sortedEntries.length === 0) {
      return {
        current: 0,
        best: 0,
        frozen: false,
        momentum: 'NEW'
      }
    }

    const currentDateStr = this.formatDate(currentDate)
    const habitStartDate = new Date(config.createdAt)
    
    // Generate all expected dates from habit start to current date
    const expectedDates = this.getExpectedDates(habitStartDate, currentDate, config.frequency)
    
    // Create map of completed dates for O(1) lookup
    const completedDates = new Set(sortedEntries.map(entry => entry.date))
    
    // Calculate all streaks
    const streaks = this.calculateAllStreaks(expectedDates, completedDates, config.gracePeriod)
    
    const bestStreak = Math.max(...streaks.map(s => s.length), 0)
    
    // Find current streak
    const currentStreak = this.calculateCurrentStreak(
      expectedDates,
      completedDates,
      config.gracePeriod,
      currentDateStr
    )

    // Determine if streak is frozen (in grace period)
    const frozen = this.isStreakFrozen(expectedDates, completedDates, config.gracePeriod, currentDateStr)
    
    // Calculate momentum
    const momentum = this.calculateMomentum(sortedEntries, config.frequency)

    return {
      current: currentStreak.streak,
      best: bestStreak,
      frozen,
      daysToRecovery: currentStreak.daysToRecovery,
      momentum
    }
  }

  private static calculateAllStreaks(
    expectedDates: string[],
    completedDates: Set<string>,
    gracePeriod: number
  ): Array<{ start: string; end: string; length: number }> {
    const streaks: Array<{ start: string; end: string; length: number }> = []
    let currentStreak: { start: string; end: string; length: number } | null = null
    let graceDaysUsed = 0

    for (const date of expectedDates) {
      const isCompleted = completedDates.has(date)

      if (isCompleted) {
        if (!currentStreak) {
          currentStreak = { start: date, end: date, length: 1 }
        } else {
          currentStreak.end = date
          currentStreak.length++
        }
        graceDaysUsed = 0 // Reset grace period
      } else {
        if (currentStreak) {
          if (graceDaysUsed < gracePeriod) {
            graceDaysUsed++
            // Continue streak during grace period
          } else {
            // End current streak
            streaks.push({ ...currentStreak })
            currentStreak = null
            graceDaysUsed = 0
          }
        }
      }
    }

    // Add final streak if exists
    if (currentStreak) {
      streaks.push(currentStreak)
    }

    return streaks
  }

  private static calculateCurrentStreak(
    expectedDates: string[],
    completedDates: Set<string>,
    gracePeriod: number,
    currentDateStr: string
  ): { streak: number; daysToRecovery?: number } {
    let streak = 0
    let graceDaysUsed = 0
    let daysToRecovery: number | undefined

    // Work backwards from current date
    for (let i = expectedDates.length - 1; i >= 0; i--) {
      const date = expectedDates[i]
      
      // Stop if we're looking at future dates
      if (date > currentDateStr) continue
      
      const isCompleted = completedDates.has(date)

      if (isCompleted) {
        streak++
        graceDaysUsed = 0
      } else {
        if (graceDaysUsed < gracePeriod) {
          graceDaysUsed++
          if (date === currentDateStr) {
            daysToRecovery = graceDaysUsed
          }
        } else {
          // Streak is broken
          break
        }
      }
    }

    return { streak, daysToRecovery }
  }

  private static isStreakFrozen(
    expectedDates: string[],
    completedDates: Set<string>,
    gracePeriod: number,
    currentDateStr: string
  ): boolean {
    if (gracePeriod === 0) return false
    
    // Check if today is missed but within grace period
    const todayCompleted = completedDates.has(currentDateStr)
    if (todayCompleted) return false

    // Count consecutive missed days from today backwards
    let missedDays = 0
    for (let i = expectedDates.length - 1; i >= 0; i--) {
      const date = expectedDates[i]
      if (date > currentDateStr) continue
      
      if (!completedDates.has(date)) {
        missedDays++
      } else {
        break
      }
    }

    return missedDays > 0 && missedDays <= gracePeriod
  }

  private static calculateMomentum(
    entries: HabitEntry[],
    frequency: HabitFrequency
  ): 'BUILDING' | 'STABLE' | 'DECLINING' {
    if (entries.length < 7) return 'BUILDING'

    // Look at completion rates over different periods
    const recent = entries.slice(-7) // Last 7 entries
    const previous = entries.slice(-14, -7) // Previous 7 entries

    if (previous.length === 0) return 'BUILDING'

    const recentRate = recent.filter(e => e.completed).length / recent.length
    const previousRate = previous.filter(e => e.completed).length / previous.length

    if (recentRate > previousRate + 0.1) return 'BUILDING'
    if (recentRate < previousRate - 0.1) return 'DECLINING'
    return 'STABLE'
  }

  public static getStreakStatus(
    streakData: StreakData,
    config: StreakConfig,
    currentDate = new Date()
  ): StreakStatus {
    const { current, frozen, daysToRecovery } = streakData

    if (current === 0 && !frozen) {
      return {
        type: 'NEW',
        message: 'Ready to start your streak!',
        encouragement: 'Every journey begins with a single step.',
        actionable: true
      }
    }

    if (frozen && daysToRecovery) {
      return {
        type: 'GRACE',
        message: `Streak protected for ${config.gracePeriod - daysToRecovery + 1} more days`,
        daysToRecovery,
        encouragement: 'Get back on track to maintain your progress!',
        actionable: true
      }
    }

    if (current > 0 && !frozen) {
      return {
        type: 'ACTIVE',
        message: `${current} day streak active!`,
        encouragement: current >= streakData.best 
          ? "You're on your best streak ever! 🔥" 
          : "Keep building towards your best!",
        actionable: true
      }
    }

    if (current === 0 && !frozen) {
      return {
        type: 'BROKEN',
        message: 'Streak ended, but you can restart anytime',
        encouragement: 'Every setback is a setup for a comeback.',
        actionable: true
      }
    }

    return {
      type: 'RECOVERY',
      message: 'Focus on rebuilding consistency',
      encouragement: 'Small steps lead to big changes.',
      actionable: true
    }
  }

  // Utility method for testing and analytics
  public static simulateStreakScenarios(
    entries: HabitEntry[],
    config: StreakConfig,
    futureCompletions: string[]
  ): StreakData {
    const simulatedEntries = [
      ...entries,
      ...futureCompletions.map((date, index) => ({
        id: `sim-${index}`,
        habitId: 'simulation',
        date,
        completed: true,
        createdAt: new Date()
      }))
    ]

    return this.calculateStreaks({
      entries: simulatedEntries,
      config
    })
  }
}

// Helper functions for common streak operations
export const streakHelpers = {
  /**
   * Check if a habit should be completed today based on frequency
   */
  shouldCompleteToday: (
    lastCompletionDate: string | null,
    frequency: HabitFrequency,
    currentDate = new Date()
  ): boolean => {
    if (!lastCompletionDate) return true
    
    const lastCompletion = new Date(lastCompletionDate)
    const daysSince = Math.floor((currentDate.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60 * 24))
    
    switch (frequency) {
      case 'DAILY': return daysSince >= 1
      case 'WEEKLY': return daysSince >= 7
      case 'MONTHLY': return daysSince >= 30
      case 'CUSTOM': return daysSince >= 1 // Default to daily
    }
  },

  /**
   * Get next expected completion date
   */
  getNextDueDate: (
    lastCompletionDate: string | null,
    frequency: HabitFrequency
  ): Date => {
    const base = lastCompletionDate ? new Date(lastCompletionDate) : new Date()
    
    switch (frequency) {
      case 'DAILY':
        base.setDate(base.getDate() + 1)
        break
      case 'WEEKLY':
        base.setDate(base.getDate() + 7)
        break
      case 'MONTHLY':
        base.setMonth(base.getMonth() + 1)
        break
      case 'CUSTOM':
        base.setDate(base.getDate() + 1)
        break
    }
    
    return base
  },

  /**
   * Format streak for display
   */
  formatStreak: (streak: number, frequency: HabitFrequency): string => {
    if (streak === 0) return 'No streak'
    
    const unit = frequency === 'DAILY' ? 'day' : 
                 frequency === 'WEEKLY' ? 'week' : 
                 frequency === 'MONTHLY' ? 'month' : 'day'
    
    return `${streak} ${unit}${streak === 1 ? '' : 's'}`
  }
}