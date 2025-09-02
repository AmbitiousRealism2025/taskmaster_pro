import { 
  Habit, 
  HabitEntry, 
  ProductivityMetrics, 
  AIInsight, 
  HabitPattern,
  HabitProductivityCorrelation,
  StreakMomentum,
  WeeklyInsights 
} from '@/types/habit'
import { HabitAnalytics } from './analytics'
import { StreakCalculator } from './streak-calculator'

export interface InsightGenerationInput {
  habits: Habit[]
  habitEntries: Map<string, HabitEntry[]>
  productivityData: ProductivityMetrics[]
  userId: string
}

export interface InsightContext {
  timeframe: 'daily' | 'weekly' | 'monthly'
  dataQuality: 'low' | 'medium' | 'high'
  userBehaviorProfile: 'beginner' | 'intermediate' | 'advanced'
  focusAreas: string[]
}

export class AIInsightsEngine {
  private static readonly INSIGHT_TEMPLATES = {
    PRODUCTIVITY: {
      HIGH_CORRELATION: "Your {habitName} habit shows a strong {correlation}% positive correlation with productivity. Maintaining this habit could boost your daily performance.",
      LOW_CORRELATION: "Your {habitName} habit has minimal impact on productivity ({correlation}%). Consider reassessing its priority or timing.",
      NEGATIVE_CORRELATION: "Your {habitName} habit appears to correlate negatively with productivity ({correlation}%). Review the habit's timing or approach.",
    },
    HABIT: {
      STREAK_BUILDING: "You're building momentum with {habitName} - {streakDays} day streak! Your consistency pattern suggests optimal completion at {optimalTime}.",
      STREAK_RECOVERY: "After a {breakDays}-day break, you typically recover {habitName} within {recoveryTime} attempts. Consider easier targets initially.",
      FREQUENCY_OPTIMIZATION: "Your {habitName} completion rate is {rate}% on {bestDay}s vs {worstRate}% on {worstDay}s. Consider adjusting your weekly planning.",
    },
    TIME: {
      OPTIMAL_WINDOW: "Your peak performance window is {startTime}-{endTime}. Scheduling {topHabits} during this period could improve consistency by {improvementPercent}%.",
      ENERGY_MISMATCH: "You're attempting {demandingHabits} during low-energy periods ({lowEnergyTime}). Consider rescheduling for better success rates.",
      CHRONOTYPE_ALIGNMENT: "Your activity pattern suggests {chronotype} tendencies. Aligning {habits} with natural energy cycles could improve completion rates.",
    },
    PATTERN: {
      BEHAVIORAL_CHAIN: "Completing {triggerHabit} increases your likelihood of completing {chainedHabit} by {increaseProbability}%. Consider pairing these habits.",
      ENVIRONMENTAL_TRIGGER: "Your {habitName} completion rate increases {increasePercent}% on {favorableCondition} days. Plan around these conditions when possible.",
      SEASONAL_VARIATION: "Your habit consistency shows {trendDirection} trend during {season}. Prepare adjustments for seasonal challenges ahead.",
    },
    RECOMMENDATION: {
      HABIT_STACKING: "Stack {newHabit} with your consistent {existingHabit} (current streak: {streakDays}) to build a powerful routine.",
      TARGET_ADJUSTMENT: "Consider reducing {habitName} target from {currentTarget} to {recommendedTarget} to rebuild consistency and momentum.",
      TIMING_OPTIMIZATION: "Shift {habitName} from {currentTime} to {optimalTime} based on your productivity patterns for {expectedImprovement}% better results.",
    }
  }

  /**
   * Generate comprehensive AI insights for a user's habit data
   */
  static async generateInsights({
    habits,
    habitEntries,
    productivityData,
    userId
  }: InsightGenerationInput): Promise<AIInsight[]> {
    const insights: AIInsight[] = []
    const context = this.analyzeUserContext(habits, habitEntries, productivityData)

    // Generate different types of insights
    insights.push(...this.generateProductivityInsights(habits, habitEntries, productivityData, userId, context))
    insights.push(...this.generateHabitInsights(habits, habitEntries, userId, context))
    insights.push(...this.generateTimeInsights(habits, habitEntries, productivityData, userId, context))
    insights.push(...this.generatePatternInsights(habits, habitEntries, productivityData, userId, context))
    insights.push(...this.generateRecommendations(habits, habitEntries, productivityData, userId, context))

    // Sort by priority and confidence
    return insights
      .sort((a, b) => {
        // Prioritize actionable insights
        if (a.actionable !== b.actionable) return a.actionable ? -1 : 1
        // Then by priority
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
        const aPriority = priorityOrder[a.priority] || 0
        const bPriority = priorityOrder[b.priority] || 0
        if (aPriority !== bPriority) return bPriority - aPriority
        // Finally by confidence
        return b.confidence - a.confidence
      })
      .slice(0, 15) // Limit to top 15 insights to avoid overwhelming the user
  }

  private static analyzeUserContext(
    habits: Habit[],
    habitEntries: Map<string, HabitEntry[]>,
    productivityData: ProductivityMetrics[]
  ): InsightContext {
    // Analyze data quality
    const totalEntries = Array.from(habitEntries.values()).flat().length
    const avgEntriesPerHabit = totalEntries / habits.length
    const dataQuality: InsightContext['dataQuality'] = 
      avgEntriesPerHabit > 50 ? 'high' :
      avgEntriesPerHabit > 20 ? 'medium' : 'low'

    // Determine user behavior profile
    const avgCompletionRate = this.calculateOverallCompletionRate(habits, habitEntries)
    const avgStreakLength = habits.reduce((sum, h) => sum + h.currentStreak, 0) / habits.length
    
    const userBehaviorProfile: InsightContext['userBehaviorProfile'] = 
      avgCompletionRate > 0.8 && avgStreakLength > 14 ? 'advanced' :
      avgCompletionRate > 0.6 && avgStreakLength > 7 ? 'intermediate' : 'beginner'

    // Identify focus areas based on current patterns
    const focusAreas = this.identifyFocusAreas(habits, habitEntries, productivityData)

    return {
      timeframe: 'weekly', // Default to weekly insights
      dataQuality,
      userBehaviorProfile,
      focusAreas
    }
  }

  private static generateProductivityInsights(
    habits: Habit[],
    habitEntries: Map<string, HabitEntry[]>,
    productivityData: ProductivityMetrics[],
    userId: string,
    context: InsightContext
  ): AIInsight[] {
    const insights: AIInsight[] = []
    
    if (productivityData.length < 10) return insights

    const correlations = HabitAnalytics.calculateProductivityCorrelations(
      habits, habitEntries, productivityData
    )

    correlations.forEach(correlation => {
      const habit = habits.find(h => h.id === correlation.habitId)
      if (!habit) return

      let template: string
      let priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
      
      if (Math.abs(correlation.correlation) > 0.3) {
        template = correlation.correlation > 0 
          ? this.INSIGHT_TEMPLATES.PRODUCTIVITY.HIGH_CORRELATION
          : this.INSIGHT_TEMPLATES.PRODUCTIVITY.NEGATIVE_CORRELATION
        priority = 'HIGH'
      } else {
        template = this.INSIGHT_TEMPLATES.PRODUCTIVITY.LOW_CORRELATION
        priority = 'LOW'
      }

      const description = template
        .replace('{habitName}', habit.name)
        .replace('{correlation}', Math.abs(correlation.correlation * 100).toFixed(1))

      insights.push({
        id: `productivity-${habit.id}-${Date.now()}`,
        userId,
        type: 'PRODUCTIVITY',
        title: `${habit.name} & Productivity Impact`,
        description,
        confidence: correlation.confidence,
        actionable: Math.abs(correlation.correlation) > 0.15,
        recommendation: this.generateProductivityRecommendation(correlation, habit),
        dataPoints: [correlation],
        isViewed: false,
        isActionTaken: false,
        priority,
        category: 'productivity-correlation',
        generatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
    })

    return insights
  }

  private static generateHabitInsights(
    habits: Habit[],
    habitEntries: Map<string, HabitEntry[]>,
    userId: string,
    context: InsightContext
  ): AIInsight[] {
    const insights: AIInsight[] = []

    habits.forEach(habit => {
      const entries = habitEntries.get(habit.id) || []
      if (entries.length < 7) return

      const streakData = StreakCalculator.calculateStreaks({
        entries,
        config: {
          frequency: habit.frequency,
          gracePeriod: habit.gracePeriod,
          createdAt: habit.createdAt
        }
      })

      // Streak building insight
      if (streakData.current > 0 && streakData.current >= habit.bestStreak * 0.8) {
        const patterns = HabitAnalytics.analyzePatterns(habit, entries)
        const optimalTime = this.extractOptimalTime(patterns)

        const description = this.INSIGHT_TEMPLATES.HABIT.STREAK_BUILDING
          .replace('{habitName}', habit.name)
          .replace('{streakDays}', streakData.current.toString())
          .replace('{optimalTime}', optimalTime)

        insights.push({
          id: `habit-streak-${habit.id}-${Date.now()}`,
          userId,
          type: 'HABIT',
          title: `${habit.name} Streak Building`,
          description,
          confidence: Math.min(streakData.current / 30, 0.9),
          actionable: true,
          recommendation: `Continue your momentum! Your ${streakData.current}-day streak is excellent progress.`,
          dataPoints: [{ streakData, patterns }],
          isViewed: false,
          isActionTaken: false,
          priority: 'HIGH',
          category: 'streak-building',
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }

      // Frequency optimization insight
      const weeklyPattern = this.analyzeWeeklyFrequency(entries)
      if (weeklyPattern.hasSignificantVariation) {
        const description = this.INSIGHT_TEMPLATES.HABIT.FREQUENCY_OPTIMIZATION
          .replace('{habitName}', habit.name)
          .replace('{rate}', Math.round(weeklyPattern.bestDayRate * 100).toString())
          .replace('{bestDay}', weeklyPattern.bestDay)
          .replace('{worstRate}', Math.round(weeklyPattern.worstDayRate * 100).toString())
          .replace('{worstDay}', weeklyPattern.worstDay)

        insights.push({
          id: `habit-frequency-${habit.id}-${Date.now()}`,
          userId,
          type: 'HABIT',
          title: `${habit.name} Weekly Pattern`,
          description,
          confidence: weeklyPattern.confidence,
          actionable: true,
          recommendation: `Focus extra attention on ${weeklyPattern.worstDay}s to improve consistency.`,
          dataPoints: [weeklyPattern],
          isViewed: false,
          isActionTaken: false,
          priority: 'MEDIUM',
          category: 'frequency-optimization',
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    })

    return insights
  }

  private static generateTimeInsights(
    habits: Habit[],
    habitEntries: Map<string, HabitEntry[]>,
    productivityData: ProductivityMetrics[],
    userId: string,
    context: InsightContext
  ): AIInsight[] {
    const insights: AIInsight[] = []

    if (productivityData.length < 7) return insights

    // Analyze optimal timing windows
    const timeAnalysis = this.analyzeOptimalTiming(habits, habitEntries, productivityData)
    
    if (timeAnalysis.hasOptimalWindow) {
      const description = this.INSIGHT_TEMPLATES.TIME.OPTIMAL_WINDOW
        .replace('{startTime}', this.formatHour(timeAnalysis.startHour))
        .replace('{endTime}', this.formatHour(timeAnalysis.endHour))
        .replace('{topHabits}', timeAnalysis.topHabits.join(', '))
        .replace('{improvementPercent}', Math.round(timeAnalysis.potentialImprovement * 100).toString())

      insights.push({
        id: `time-optimal-${Date.now()}`,
        userId,
        type: 'TIME',
        title: 'Optimal Performance Window Detected',
        description,
        confidence: timeAnalysis.confidence,
        actionable: true,
        recommendation: `Schedule your most important habits during ${this.formatHour(timeAnalysis.startHour)}-${this.formatHour(timeAnalysis.endHour)} for maximum success.`,
        dataPoints: [timeAnalysis],
        isViewed: false,
        isActionTaken: false,
        priority: 'HIGH',
        category: 'timing-optimization',
        generatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    return insights
  }

  private static generatePatternInsights(
    habits: Habit[],
    habitEntries: Map<string, HabitEntry[]>,
    productivityData: ProductivityMetrics[],
    userId: string,
    context: InsightContext
  ): AIInsight[] {
    const insights: AIInsight[] = []

    // Analyze behavioral chains
    const behavioralChains = this.analyzeBehavioralChains(habits, habitEntries)
    
    behavioralChains.forEach(chain => {
      if (chain.strength > 0.3) { // 30% threshold for significance
        const description = this.INSIGHT_TEMPLATES.PATTERN.BEHAVIORAL_CHAIN
          .replace('{triggerHabit}', chain.triggerHabit)
          .replace('{chainedHabit}', chain.chainedHabit)
          .replace('{increaseProbability}', Math.round(chain.strength * 100).toString())

        insights.push({
          id: `pattern-chain-${Date.now()}-${Math.random()}`,
          userId,
          type: 'PATTERN',
          title: 'Behavioral Chain Detected',
          description,
          confidence: Math.min(chain.strength * 1.5, 0.9),
          actionable: true,
          recommendation: `Consider formally pairing ${chain.triggerHabit} and ${chain.chainedHabit} as a habit stack.`,
          dataPoints: [chain],
          isViewed: false,
          isActionTaken: false,
          priority: 'MEDIUM',
          category: 'behavioral-chain',
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    })

    return insights
  }

  private static generateRecommendations(
    habits: Habit[],
    habitEntries: Map<string, HabitEntry[]>,
    productivityData: ProductivityMetrics[],
    userId: string,
    context: InsightContext
  ): AIInsight[] {
    const insights: AIInsight[] = []

    // Target adjustment recommendations
    habits.forEach(habit => {
      const entries = habitEntries.get(habit.id) || []
      if (entries.length < 14) return

      const recentEntries = entries.slice(-14) // Last 2 weeks
      const completionRate = recentEntries.filter(e => e.completed).length / recentEntries.length

      if (completionRate < 0.5 && habit.target) { // Low success rate with quantitative target
        const recommendedTarget = Math.max(1, Math.floor(habit.target * 0.75))
        
        const description = this.INSIGHT_TEMPLATES.RECOMMENDATION.TARGET_ADJUSTMENT
          .replace('{habitName}', habit.name)
          .replace('{currentTarget}', habit.target.toString())
          .replace('{recommendedTarget}', recommendedTarget.toString())

        insights.push({
          id: `recommendation-target-${habit.id}-${Date.now()}`,
          userId,
          type: 'RECOMMENDATION',
          title: `${habit.name} Target Adjustment`,
          description,
          confidence: 0.8,
          actionable: true,
          recommendation: `Lower your target temporarily to rebuild consistency and momentum.`,
          dataPoints: [{
            currentTarget: habit.target,
            recommendedTarget,
            currentCompletionRate: completionRate,
            entries: recentEntries.length
          }],
          isViewed: false,
          isActionTaken: false,
          priority: 'HIGH',
          category: 'target-adjustment',
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    })

    return insights
  }

  // Helper methods for analysis

  private static calculateOverallCompletionRate(
    habits: Habit[],
    habitEntries: Map<string, HabitEntry[]>
  ): number {
    let totalEntries = 0
    let totalCompleted = 0

    habitEntries.forEach(entries => {
      totalEntries += entries.length
      totalCompleted += entries.filter(e => e.completed).length
    })

    return totalEntries > 0 ? totalCompleted / totalEntries : 0
  }

  private static identifyFocusAreas(
    habits: Habit[],
    habitEntries: Map<string, HabitEntry[]>,
    productivityData: ProductivityMetrics[]
  ): string[] {
    const areas: string[] = []

    // Check if user needs consistency help
    const avgCompletionRate = this.calculateOverallCompletionRate(habits, habitEntries)
    if (avgCompletionRate < 0.6) areas.push('consistency')

    // Check if user needs productivity optimization
    if (productivityData.length > 0) {
      const avgProductivity = productivityData.reduce((sum, p) => sum + p.productivityScore, 0) / productivityData.length
      if (avgProductivity < 70) areas.push('productivity')
    }

    // Check if user needs habit stacking help
    const chainsAnalysis = this.analyzeBehavioralChains(habits, habitEntries)
    if (chainsAnalysis.length < habits.length * 0.3) areas.push('habit-stacking')

    return areas
  }

  private static extractOptimalTime(patterns: HabitPattern[]): string {
    const timePattern = patterns.find(p => p.type === 'TIME_CORRELATION')
    if (timePattern && timePattern.dataPoints) {
      // Extract peak hour from data points
      const peak = timePattern.dataPoints.find(dp => dp.hour !== undefined)
      if (peak) {
        return this.formatHour(peak.hour)
      }
    }
    return 'your peak hours'
  }

  private static analyzeWeeklyFrequency(entries: HabitEntry[]): {
    hasSignificantVariation: boolean
    bestDay: string
    worstDay: string
    bestDayRate: number
    worstDayRate: number
    confidence: number
  } {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayCounts = new Map<number, { total: number, completed: number }>()

    // Initialize counts
    for (let i = 0; i < 7; i++) {
      dayCounts.set(i, { total: 0, completed: 0 })
    }

    // Count entries by day of week
    entries.forEach(entry => {
      const dayOfWeek = new Date(entry.date).getDay()
      const dayData = dayCounts.get(dayOfWeek)!
      dayData.total++
      if (entry.completed) dayData.completed++
    })

    // Calculate completion rates
    const dayRates = Array.from(dayCounts.entries()).map(([day, data]) => ({
      day,
      rate: data.total > 0 ? data.completed / data.total : 0,
      count: data.total
    })).filter(d => d.count >= 2) // Only include days with at least 2 data points

    if (dayRates.length < 3) {
      return {
        hasSignificantVariation: false,
        bestDay: 'Monday',
        worstDay: 'Sunday',
        bestDayRate: 0,
        worstDayRate: 0,
        confidence: 0
      }
    }

    const sortedRates = dayRates.sort((a, b) => b.rate - a.rate)
    const bestDay = sortedRates[0]
    const worstDay = sortedRates[sortedRates.length - 1]
    
    const variation = bestDay.rate - worstDay.rate
    const hasSignificantVariation = variation > 0.2 // 20% difference threshold

    return {
      hasSignificantVariation,
      bestDay: dayNames[bestDay.day],
      worstDay: dayNames[worstDay.day],
      bestDayRate: bestDay.rate,
      worstDayRate: worstDay.rate,
      confidence: Math.min(dayRates.reduce((sum, d) => sum + d.count, 0) / 50, 0.9)
    }
  }

  private static analyzeOptimalTiming(
    habits: Habit[],
    habitEntries: Map<string, HabitEntry[]>,
    productivityData: ProductivityMetrics[]
  ): {
    hasOptimalWindow: boolean
    startHour: number
    endHour: number
    topHabits: string[]
    potentialImprovement: number
    confidence: number
  } {
    // Analyze productivity patterns to find optimal window
    const hourlyProductivity = new Map<number, number[]>()
    
    productivityData.forEach(data => {
      const peakHour = data.peakProductivityHour || 10
      // Simulate hourly distribution around peak
      for (let hour = 0; hour < 24; hour++) {
        if (!hourlyProductivity.has(hour)) hourlyProductivity.set(hour, [])
        const distance = Math.abs(hour - peakHour)
        const productivity = Math.max(0.1, data.productivityScore * Math.exp(-distance / 3))
        hourlyProductivity.get(hour)!.push(productivity)
      }
    })

    // Calculate average productivity per hour
    const avgProductivity = Array.from(hourlyProductivity.entries()).map(([hour, scores]) => ({
      hour,
      avgScore: scores.reduce((sum, s) => sum + s, 0) / scores.length
    })).sort((a, b) => b.avgScore - a.avgScore)

    if (avgProductivity.length === 0) {
      return {
        hasOptimalWindow: false,
        startHour: 9,
        endHour: 11,
        topHabits: [],
        potentialImprovement: 0,
        confidence: 0
      }
    }

    const peakHour = avgProductivity[0].hour
    const startHour = Math.max(0, peakHour - 1)
    const endHour = Math.min(23, peakHour + 2)

    // Find habits that could benefit from better timing
    const strugglingHabits = habits.filter(habit => {
      const entries = habitEntries.get(habit.id) || []
      const recentRate = entries.slice(-14).filter(e => e.completed).length / Math.min(14, entries.length)
      return recentRate < 0.7
    }).slice(0, 3)

    return {
      hasOptimalWindow: avgProductivity[0].avgScore > avgProductivity[avgProductivity.length - 1].avgScore * 1.3,
      startHour,
      endHour,
      topHabits: strugglingHabits.map(h => h.name),
      potentialImprovement: 0.25, // Conservative 25% improvement estimate
      confidence: Math.min(productivityData.length / 14, 0.8)
    }
  }

  private static analyzeBehavioralChains(
    habits: Habit[],
    habitEntries: Map<string, HabitEntry[]>
  ): Array<{
    triggerHabit: string
    chainedHabit: string
    strength: number
  }> {
    const chains: Array<{ triggerHabit: string, chainedHabit: string, strength: number }> = []

    for (let i = 0; i < habits.length; i++) {
      for (let j = i + 1; j < habits.length; j++) {
        const habit1 = habits[i]
        const habit2 = habits[j]
        const entries1 = habitEntries.get(habit1.id) || []
        const entries2 = habitEntries.get(habit2.id) || []

        // Find overlapping dates
        const dates1 = new Set(entries1.map(e => e.date))
        const dates2 = new Set(entries2.map(e => e.date))
        const commonDates = [...dates1].filter(date => dates2.has(date))

        if (commonDates.length < 10) continue

        // Calculate co-occurrence rates
        let bothCompleted = 0
        let habit1CompletedAlone = 0
        let habit2CompletedAlone = 0

        commonDates.forEach(date => {
          const entry1 = entries1.find(e => e.date === date)
          const entry2 = entries2.find(e => e.date === date)
          
          if (entry1?.completed && entry2?.completed) {
            bothCompleted++
          } else if (entry1?.completed) {
            habit1CompletedAlone++
          } else if (entry2?.completed) {
            habit2CompletedAlone++
          }
        })

        // Calculate correlation strength (simplified)
        const total1 = bothCompleted + habit1CompletedAlone
        const total2 = bothCompleted + habit2CompletedAlone
        
        if (total1 > 5 && total2 > 5) {
          const strength1to2 = total1 > 0 ? bothCompleted / total1 : 0
          const strength2to1 = total2 > 0 ? bothCompleted / total2 : 0

          if (strength1to2 > 0.3) {
            chains.push({
              triggerHabit: habit1.name,
              chainedHabit: habit2.name,
              strength: strength1to2
            })
          }

          if (strength2to1 > 0.3) {
            chains.push({
              triggerHabit: habit2.name,
              chainedHabit: habit1.name,
              strength: strength2to1
            })
          }
        }
      }
    }

    return chains
  }

  private static generateProductivityRecommendation(
    correlation: HabitProductivityCorrelation,
    habit: Habit
  ): string {
    if (correlation.correlation > 0.3) {
      return `This habit is a productivity booster! Prioritize maintaining consistency with ${habit.name}.`
    } else if (correlation.correlation < -0.15) {
      return `Consider reviewing the timing or approach for ${habit.name} as it may be affecting your productivity.`
    } else {
      return `${habit.name} has neutral productivity impact. Focus energy on your high-impact habits first.`
    }
  }

  private static formatHour(hour: number): string {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:00${period}`
  }

  /**
   * Generate real-time insights based on current context
   */
  static generateRealTimeInsight(
    habit: Habit,
    recentEntries: HabitEntry[],
    currentStreak: number,
    timeOfDay: number
  ): string {
    if (recentEntries.length === 0) {
      return `Ready to start your ${habit.name} journey! Every expert was once a beginner.`
    }

    const recentRate = recentEntries.filter(e => e.completed).length / recentEntries.length

    if (currentStreak > 0) {
      if (currentStreak >= habit.bestStreak) {
        return `🔥 NEW PERSONAL BEST! Your ${currentStreak}-day ${habit.name} streak is setting new records!`
      } else {
        return `💪 ${currentStreak} days strong! You're ${habit.bestStreak - currentStreak} days away from your personal best.`
      }
    }

    if (recentRate < 0.3) {
      return `🌱 Fresh start time! Consider adjusting your ${habit.name} approach or timing for better success.`
    }

    // Time-based insights
    if (timeOfDay >= 6 && timeOfDay <= 10) {
      return `🌅 Morning energy is perfect for ${habit.name}! Seize this productive window.`
    } else if (timeOfDay >= 18 && timeOfDay <= 22) {
      return `🌙 Evening completion of ${habit.name} can set you up for a great tomorrow.`
    }

    return `Ready for ${habit.name}? Your consistency is building something amazing.`
  }
}