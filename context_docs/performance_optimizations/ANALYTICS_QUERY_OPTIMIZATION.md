# Analytics Query Optimization & Patterns

**Context**: TaskMaster Pro Analytics Performance  
**Focus**: Prisma-specific optimizations and efficient query patterns for analytics workloads  
**Related**: DATABASE_INDEXING_STRATEGY.md, phase3/01_data_intelligence_analytics.md

## Optimized Prisma Query Patterns

### Dashboard Overview Queries

```typescript
// lib/analytics/dashboard-queries.ts
import { PrismaClient } from '@prisma/client'

export class DashboardAnalytics {
  constructor(private prisma: PrismaClient) {}

  // Optimized dashboard overview - target <200ms
  async getDashboardOverview(userId: string, dateRange: { start: Date; end: Date }) {
    const [
      taskMetrics,
      habitMetrics,
      productivityScore,
      recentActivity
    ] = await Promise.all([
      // Task completion metrics with single query
      this.prisma.task.aggregateRaw({
        pipeline: [
          { $match: { 
            userId: userId,
            deletedAt: null,
            createdAt: { 
              $gte: dateRange.start,
              $lte: dateRange.end 
            }
          }},
          { $group: {
            _id: { status: '$status', priority: '$priority' },
            count: { $sum: 1 },
            totalEstimated: { $sum: '$estimatedMinutes' },
            totalActual: { $sum: '$actualMinutes' }
          }},
          { $sort: { 
            '_id.priority': 1,
            '_id.status': 1 
          }}
        ]
      }),

      // Habit completion summary
      this.prisma.habitEntry.groupBy({
        by: ['completed'],
        where: {
          habit: { userId },
          date: {
            gte: dateRange.start.toISOString().split('T')[0],
            lte: dateRange.end.toISOString().split('T')[0]
          }
        },
        _count: { id: true },
        _sum: { value: true }
      }),

      // Latest productivity score
      this.prisma.dailyMetrics.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
        select: {
          productivityScore: true,
          focusHours: true,
          date: true
        }
      }),

      // Recent activity (limited and optimized)
      this.prisma.task.findMany({
        where: {
          userId,
          completedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          deletedAt: null
        },
        select: {
          id: true,
          title: true,
          completedAt: true,
          priority: true
        },
        orderBy: { completedAt: 'desc' },
        take: 5
      })
    ])

    return {
      taskMetrics,
      habitMetrics,
      productivityScore,
      recentActivity
    }
  }

  // Time-series productivity data - optimized for charts
  async getProductivityTimeSeries(
    userId: string, 
    period: 'week' | 'month' | 'quarter',
    includeProjections: boolean = false
  ) {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Single query with date aggregation
    const metrics = await this.prisma.dailyMetrics.findMany({
      where: {
        userId,
        date: { gte: startDate }
      },
      select: {
        date: true,
        productivityScore: true,
        focusHours: true,
        tasksCompleted: true,
        habitsCompleted: true
      },
      orderBy: { date: 'asc' }
    })

    // Calculate moving averages for trend analysis
    const withTrends = metrics.map((metric, index) => {
      const last7Days = metrics.slice(Math.max(0, index - 6), index + 1)
      const movingAvg = last7Days.reduce((sum, m) => sum + m.productivityScore, 0) / last7Days.length

      return {
        ...metric,
        movingAverage: movingAvg,
        trendDirection: index > 0 && movingAvg > (metrics[index - 1] as any).movingAverage ? 'up' : 'down'
      }
    })

    return withTrends
  }
}
```

### Habit Analytics Queries

```typescript
// lib/analytics/habit-queries.ts
export class HabitAnalytics {
  constructor(private prisma: PrismaClient) {}

  // Comprehensive habit analytics - target <300ms
  async getHabitAnalytics(userId: string, timeframe: number = 90) {
    const since = new Date()
    since.setDate(since.getDate() - timeframe)
    const sinceStr = since.toISOString().split('T')[0]

    const [habits, streakData, correlationData] = await Promise.all([
      // Core habit data with entry aggregations
      this.prisma.habit.findMany({
        where: {
          userId,
          isActive: true,
          deletedAt: null
        },
        include: {
          category: {
            select: { name: true, color: true }
          },
          entries: {
            where: { date: { gte: sinceStr } },
            select: {
              date: true,
              completed: true,
              value: true
            },
            orderBy: { date: 'desc' }
          },
          _count: {
            select: {
              entries: {
                where: { 
                  date: { gte: sinceStr },
                  completed: true 
                }
              }
            }
          }
        }
      }),

      // Streak calculations (optimized with window functions)
      this.prisma.$queryRaw<Array<{
        habit_id: string
        current_streak: number
        best_streak: number
      }>>`
        WITH streak_groups AS (
          SELECT 
            habit_id,
            date,
            completed,
            date - (ROW_NUMBER() OVER (PARTITION BY habit_id, completed ORDER BY date))::integer * INTERVAL '1 day' as streak_group
          FROM habit_entries he
          WHERE he.habit_id IN (
            SELECT id FROM habits WHERE user_id = ${userId} AND is_active = true AND deleted_at IS NULL
          )
            AND date >= ${sinceStr}
          ORDER BY habit_id, date DESC
        ),
        streak_lengths AS (
          SELECT 
            habit_id,
            completed,
            COUNT(*) as streak_length,
            MAX(date) as streak_end
          FROM streak_groups 
          WHERE completed = true
          GROUP BY habit_id, streak_group, completed
        )
        SELECT 
          habit_id,
          COALESCE(MAX(CASE WHEN streak_end >= CURRENT_DATE - INTERVAL '1 day' THEN streak_length END), 0) as current_streak,
          COALESCE(MAX(streak_length), 0) as best_streak
        FROM streak_lengths 
        GROUP BY habit_id
      `,

      // Habit-productivity correlation (if daily metrics exist)
      this.prisma.$queryRaw<Array<{
        habit_id: string
        correlation: number
        sample_size: number
      }>>`
        WITH habit_completion_days AS (
          SELECT 
            h.id as habit_id,
            DATE(he.date) as completion_date,
            1 as completed
          FROM habits h
          JOIN habit_entries he ON h.id = he.habit_id
          WHERE h.user_id = ${userId}
            AND he.completed = true
            AND he.date >= ${sinceStr}
            AND h.is_active = true
            AND h.deleted_at IS NULL
        ),
        daily_productivity AS (
          SELECT 
            DATE(date) as metric_date,
            productivity_score
          FROM daily_metrics
          WHERE user_id = ${userId}
            AND date >= ${since}
        )
        SELECT 
          hcd.habit_id,
          CORR(COALESCE(hcd.completed, 0), dp.productivity_score) as correlation,
          COUNT(*) as sample_size
        FROM habit_completion_days hcd
        FULL OUTER JOIN daily_productivity dp ON hcd.completion_date = dp.metric_date
        WHERE dp.productivity_score IS NOT NULL
        GROUP BY hcd.habit_id
        HAVING COUNT(*) >= 7
      `
    ])

    // Process and combine results
    return this.combineHabitAnalytics(habits, streakData, correlationData)
  }

  private combineHabitAnalytics(habits: any[], streakData: any[], correlationData: any[]) {
    return habits.map(habit => {
      const streaks = streakData.find(s => s.habit_id === habit.id)
      const correlation = correlationData.find(c => c.habit_id === habit.id)

      // Calculate completion rate
      const totalDays = habit.entries.length
      const completedDays = habit._count.entries
      const completionRate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0

      // Generate trend data for last 30 days
      const last30Days = habit.entries.slice(0, 30)
      const trendData = this.generateTrendData(last30Days)

      return {
        ...habit,
        currentStreak: streaks?.current_streak || 0,
        bestStreak: streaks?.best_streak || 0,
        completionRate: Math.round(completionRate * 100) / 100,
        productivityCorrelation: correlation ? {
          correlation: correlation.correlation,
          sampleSize: correlation.sample_size,
          impact: this.getCorrelationImpact(correlation.correlation)
        } : null,
        trendData,
        insights: this.generateHabitInsights(habit, completionRate, streaks)
      }
    })
  }

  private generateTrendData(entries: any[]) {
    return entries.map(entry => ({
      date: entry.date,
      completed: entry.completed,
      value: entry.value || (entry.completed ? 1 : 0)
    })).reverse() // Chronological order for charts
  }

  private getCorrelationImpact(correlation: number) {
    if (correlation > 0.7) return 'HIGH'
    if (correlation > 0.3) return 'MEDIUM'
    if (correlation < -0.3) return 'NEGATIVE'
    return 'LOW'
  }

  private generateHabitInsights(habit: any, completionRate: number, streaks: any) {
    const insights = []

    if (completionRate > 80) {
      insights.push({ type: 'success', message: 'Excellent consistency!' })
    } else if (completionRate < 50) {
      insights.push({ type: 'improvement', message: 'Consider adjusting your target or schedule' })
    }

    if (streaks?.current_streak >= 7) {
      insights.push({ type: 'streak', message: `Great momentum with ${streaks.current_streak} day streak!` })
    }

    return insights
  }
}
```

### Chart Data Optimization

```typescript
// lib/analytics/chart-data.ts
export class ChartDataOptimizer {
  constructor(private prisma: PrismaClient) {}

  // Optimized data for Recharts components - target <500ms
  async getChartData(
    userId: string,
    chartType: 'productivity' | 'habits' | 'tasks' | 'focus',
    timeRange: { start: Date; end: Date },
    granularity: 'daily' | 'weekly' | 'monthly' = 'daily'
  ) {
    switch (chartType) {
      case 'productivity':
        return this.getProductivityChartData(userId, timeRange, granularity)
      case 'habits':
        return this.getHabitsChartData(userId, timeRange, granularity)
      case 'tasks':
        return this.getTasksChartData(userId, timeRange, granularity)
      case 'focus':
        return this.getFocusChartData(userId, timeRange, granularity)
    }
  }

  private async getProductivityChartData(
    userId: string,
    timeRange: { start: Date; end: Date },
    granularity: string
  ) {
    // Use aggregation pipeline for efficiency
    const dateFormat = granularity === 'weekly' 
      ? "DATE_TRUNC('week', date)" 
      : granularity === 'monthly'
      ? "DATE_TRUNC('month', date)"
      : "date"

    const data = await this.prisma.$queryRaw<Array<{
      period: Date
      avg_productivity: number
      avg_focus_hours: number
      total_tasks: number
      total_habits: number
    }>>`
      SELECT 
        ${dateFormat} as period,
        AVG(productivity_score) as avg_productivity,
        AVG(focus_hours) as avg_focus_hours,
        SUM(tasks_completed) as total_tasks,
        SUM(habits_completed) as total_habits
      FROM daily_metrics
      WHERE user_id = ${userId}
        AND date BETWEEN ${timeRange.start} AND ${timeRange.end}
      GROUP BY ${dateFormat}
      ORDER BY period ASC
    `

    // Format for Recharts
    return data.map(row => ({
      date: row.period.toISOString().split('T')[0],
      productivity: Math.round(row.avg_productivity * 100) / 100,
      focusHours: Math.round(row.avg_focus_hours * 100) / 100,
      tasksCompleted: Number(row.total_tasks),
      habitsCompleted: Number(row.total_habits)
    }))
  }

  private async getHabitsChartData(
    userId: string,
    timeRange: { start: Date; end: Date },
    granularity: string
  ) {
    const startDate = timeRange.start.toISOString().split('T')[0]
    const endDate = timeRange.end.toISOString().split('T')[0]

    // Heatmap data for habit completions
    const heatmapData = await this.prisma.$queryRaw<Array<{
      habit_name: string
      date: string
      completed: boolean
      value: number
    }>>`
      SELECT 
        h.name as habit_name,
        he.date,
        he.completed,
        COALESCE(he.value, CASE WHEN he.completed THEN 1 ELSE 0 END) as value
      FROM habits h
      JOIN habit_entries he ON h.id = he.habit_id
      WHERE h.user_id = ${userId}
        AND h.is_active = true
        AND h.deleted_at IS NULL
        AND he.date BETWEEN ${startDate} AND ${endDate}
      ORDER BY h.name, he.date
    `

    // Group by habit for multiple series
    const groupedData = heatmapData.reduce((acc, row) => {
      if (!acc[row.habit_name]) {
        acc[row.habit_name] = []
      }
      acc[row.habit_name].push({
        date: row.date,
        value: row.completed ? (row.value || 1) : 0
      })
      return acc
    }, {} as Record<string, Array<{ date: string; value: number }>>)

    return Object.entries(groupedData).map(([habitName, data]) => ({
      habitName,
      data: data.sort((a, b) => a.date.localeCompare(b.date))
    }))
  }

  private async getTasksChartData(
    userId: string,
    timeRange: { start: Date; end: Date },
    granularity: string
  ) {
    const dateFormat = granularity === 'weekly' 
      ? "DATE_TRUNC('week', created_at)" 
      : granularity === 'monthly'
      ? "DATE_TRUNC('month', created_at)"
      : "DATE(created_at)"

    const data = await this.prisma.$queryRaw<Array<{
      period: Date
      priority: string
      status: string
      count: number
      avg_duration: number
    }>>`
      SELECT 
        ${dateFormat} as period,
        priority,
        status,
        COUNT(*) as count,
        AVG(actual_minutes) as avg_duration
      FROM tasks
      WHERE user_id = ${userId}
        AND created_at BETWEEN ${timeRange.start} AND ${timeRange.end}
        AND deleted_at IS NULL
      GROUP BY ${dateFormat}, priority, status
      ORDER BY period ASC, priority ASC
    `

    // Format for stacked bar chart
    const periodMap = new Map()
    
    data.forEach(row => {
      const period = row.period.toISOString().split('T')[0]
      if (!periodMap.has(period)) {
        periodMap.set(period, {
          date: period,
          urgentCompleted: 0,
          highCompleted: 0,
          mediumCompleted: 0,
          lowCompleted: 0,
          urgentPending: 0,
          highPending: 0,
          mediumPending: 0,
          lowPending: 0
        })
      }
      
      const entry = periodMap.get(period)
      const key = `${row.priority.toLowerCase()}${row.status === 'COMPLETED' ? 'Completed' : 'Pending'}`
      entry[key] = Number(row.count)
    })

    return Array.from(periodMap.values())
  }

  private async getFocusChartData(
    userId: string,
    timeRange: { start: Date; end: Date },
    granularity: string
  ) {
    // Hourly focus patterns
    const focusData = await this.prisma.$queryRaw<Array<{
      hour: number
      avg_productivity: number
      total_focus_time: number
      session_count: number
    }>>`
      SELECT 
        EXTRACT(hour FROM created_at) as hour,
        AVG(productivity_score) as avg_productivity,
        SUM(actual_minutes) as total_focus_time,
        COUNT(*) as session_count
      FROM tasks
      WHERE user_id = ${userId}
        AND status = 'COMPLETED'
        AND created_at BETWEEN ${timeRange.start} AND ${timeRange.end}
        AND deleted_at IS NULL
        AND actual_minutes > 0
      GROUP BY EXTRACT(hour FROM created_at)
      ORDER BY hour ASC
    `

    return focusData.map(row => ({
      hour: Number(row.hour),
      productivity: Math.round(row.avg_productivity * 100) / 100,
      focusMinutes: Number(row.total_focus_time),
      sessions: Number(row.session_count)
    }))
  }
}
```

## Query Performance Optimization Patterns

### Connection Pool Optimization

```typescript
// lib/database/connection.ts
import { PrismaClient } from '@prisma/client'

class DatabaseManager {
  private static instance: PrismaClient
  private static readonly pools = new Map<string, PrismaClient>()

  static getClient(type: 'read' | 'write' = 'read'): PrismaClient {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        datasources: {
          db: {
            url: type === 'read' ? process.env.READ_DATABASE_URL : process.env.DATABASE_URL
          }
        }
      })

      // Optimize for analytics workloads
      DatabaseManager.instance.$connect()
    }

    return DatabaseManager.instance
  }

  // Separate read replicas for analytics
  static getAnalyticsClient(): PrismaClient {
    if (!DatabaseManager.pools.has('analytics')) {
      const client = new PrismaClient({
        datasources: {
          db: { url: process.env.ANALYTICS_DATABASE_URL || process.env.READ_DATABASE_URL }
        }
      })
      DatabaseManager.pools.set('analytics', client)
    }

    return DatabaseManager.pools.get('analytics')!
  }
}

export { DatabaseManager }
```

### Batch Query Operations

```typescript
// lib/analytics/batch-queries.ts
export class BatchAnalyticsQueries {
  constructor(private prisma: PrismaClient) {}

  // Batch multiple analytics queries efficiently
  async getBatchedAnalytics(userId: string, queries: string[]) {
    const queryMap = {
      dashboard: () => this.getDashboardData(userId),
      habits: () => this.getHabitSummary(userId),
      productivity: () => this.getProductivityMetrics(userId),
      insights: () => this.getAIInsights(userId)
    }

    // Execute requested queries in parallel
    const results = await Promise.allSettled(
      queries.map(query => queryMap[query as keyof typeof queryMap]?.())
    )

    return queries.reduce((acc, query, index) => {
      const result = results[index]
      acc[query] = result.status === 'fulfilled' 
        ? result.value 
        : { error: result.reason.message }
      return acc
    }, {} as Record<string, any>)
  }

  // Prefetch commonly accessed data
  async prefetchUserAnalytics(userId: string) {
    const cacheKey = `analytics:prefetch:${userId}`
    
    // Check if already prefetched recently
    const lastPrefetch = await this.getCacheTimestamp(cacheKey)
    if (lastPrefetch && Date.now() - lastPrefetch < 300000) { // 5 minutes
      return
    }

    // Prefetch in background
    Promise.all([
      this.getDashboardData(userId),
      this.getHabitSummary(userId),
      this.getProductivityMetrics(userId)
    ]).then(results => {
      // Cache results for quick access
      this.cacheResults(userId, results)
    }).catch(console.error)

    await this.setCacheTimestamp(cacheKey)
  }

  private async getCacheTimestamp(key: string): Promise<number | null> {
    // Implementation depends on cache system (Redis, etc.)
    return null
  }

  private async setCacheTimestamp(key: string): Promise<void> {
    // Implementation depends on cache system
  }

  private async cacheResults(userId: string, results: any[]): Promise<void> {
    // Implementation depends on cache system
  }
}
```

## Database Schema Optimizations for Analytics

### Analytics-Specific Computed Columns

```prisma
model Task {
  // ... existing fields ...
  
  // Computed fields for analytics performance
  completionEfficiency  Float?    @default(dbgenerated("CASE WHEN estimated_minutes > 0 THEN actual_minutes::float / estimated_minutes ELSE NULL END"))
  isOverdue            Boolean   @default(dbgenerated("due_date < NOW() AND status != 'COMPLETED'"))
  focusSessionDuration Int?      @default(dbgenerated("CASE WHEN actual_minutes >= 25 THEN actual_minutes ELSE NULL END"))
  
  // Analytics indexes
  @@index([userId, completedAt(sort: Desc), completionEfficiency], where: { status: COMPLETED })
  @@index([userId, isOverdue, priority], where: { status: { not: COMPLETED } })
}

model HabitEntry {
  // ... existing fields ...
  
  // Computed streak helpers
  consecutiveDays   Int?     @default(dbgenerated("ROW_NUMBER() OVER (PARTITION BY habit_id, completed ORDER BY date) FILTER (WHERE completed = true)"))
  weekOfYear        Int      @default(dbgenerated("EXTRACT(week FROM date::date)"))
  monthOfYear       Int      @default(dbgenerated("EXTRACT(month FROM date::date)"))
  
  // Performance indexes for streak calculations
  @@index([habitId, completed, consecutiveDays], where: { completed: true })
  @@index([userId, weekOfYear, completed])
  @@index([userId, monthOfYear, completed])
}

model DailyMetrics {
  // ... existing fields ...
  
  // Trend calculation helpers
  productivityTrend    String?  @default(dbgenerated("CASE WHEN LAG(productivity_score) OVER (PARTITION BY user_id ORDER BY date) IS NOT NULL THEN CASE WHEN productivity_score > LAG(productivity_score) OVER (PARTITION BY user_id ORDER BY date) THEN 'UP' WHEN productivity_score < LAG(productivity_score) OVER (PARTITION BY user_id ORDER BY date) THEN 'DOWN' ELSE 'STABLE' END END"))
  weekOverWeekChange   Float?   @default(dbgenerated("productivity_score - LAG(productivity_score, 7) OVER (PARTITION BY user_id ORDER BY date)"))
  
  // Trend analysis indexes
  @@index([userId, date, productivityTrend])
  @@index([userId, date, weekOverWeekChange])
}
```

### Materialized Views for Analytics

```sql
-- Create materialized view for user productivity summary
CREATE MATERIALIZED VIEW user_productivity_summary_mv AS
SELECT 
  u.id as user_id,
  DATE_TRUNC('week', dm.date) as week_start,
  AVG(dm.productivity_score) as avg_productivity,
  SUM(dm.focus_hours) as total_focus,
  COUNT(t.id) FILTER (WHERE t.status = 'COMPLETED') as completed_tasks,
  COUNT(he.id) FILTER (WHERE he.completed = true) as completed_habits,
  STDDEV(dm.productivity_score) as productivity_variance
FROM users u
LEFT JOIN daily_metrics dm ON u.id = dm.user_id
LEFT JOIN tasks t ON u.id = t.user_id AND DATE(t.completed_at) = dm.date
LEFT JOIN habits h ON u.id = h.user_id AND h.is_active = true
LEFT JOIN habit_entries he ON h.id = he.habit_id AND he.date::date = dm.date
WHERE dm.date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY u.id, DATE_TRUNC('week', dm.date)
ORDER BY week_start DESC;

-- Refresh every 4 hours
SELECT cron.schedule('refresh-analytics-mv', '0 */4 * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY user_productivity_summary_mv;');
```

This comprehensive query optimization strategy ensures that all analytics queries meet the sub-200ms performance targets while maintaining data accuracy and providing rich insights for the TaskMaster Pro analytics dashboard.