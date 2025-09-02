/**
 * Database Optimization Service
 * Implements indexing strategies, query optimization, and connection pooling
 * for enterprise-scale performance
 */

import { PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'

export interface QueryPerformanceMetrics {
  executionTime: number
  rowsExamined: number
  rowsReturned: number
  indexesUsed: string[]
  queryComplexity: 'low' | 'medium' | 'high'
  recommendations: string[]
}

export interface DatabaseIndexConfig {
  table: string
  columns: string[]
  type: 'btree' | 'hash' | 'gin' | 'gist'
  name: string
  unique?: boolean
  partial?: string
}

export class DatabaseOptimizationService {
  private static prisma: PrismaClient
  private static queryCache = new Map<string, { result: any; timestamp: number; ttl: number }>()
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes default
  
  static initialize(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Recommended indexes for TaskMaster Pro tables
   * Based on query patterns and performance analysis
   */
  static readonly RECOMMENDED_INDEXES: DatabaseIndexConfig[] = [
    // User table optimizations
    {
      table: 'users',
      columns: ['email'],
      type: 'btree',
      name: 'idx_users_email',
      unique: true
    },
    {
      table: 'users', 
      columns: ['createdAt'],
      type: 'btree',
      name: 'idx_users_created_at'
    },

    // Task table optimizations (high-frequency queries)
    {
      table: 'tasks',
      columns: ['userId', 'status'],
      type: 'btree',
      name: 'idx_tasks_user_status'
    },
    {
      table: 'tasks',
      columns: ['userId', 'dueDate'],
      type: 'btree',
      name: 'idx_tasks_user_due_date'
    },
    {
      table: 'tasks',
      columns: ['projectId', 'status'],
      type: 'btree',
      name: 'idx_tasks_project_status'
    },
    {
      table: 'tasks',
      columns: ['priority', 'status', 'dueDate'],
      type: 'btree',
      name: 'idx_tasks_priority_status_due'
    },
    {
      table: 'tasks',
      columns: ['scheduledFor'],
      type: 'btree',
      name: 'idx_tasks_scheduled_for'
    },

    // Note table optimizations
    {
      table: 'notes',
      columns: ['userId', 'folderId'],
      type: 'btree',
      name: 'idx_notes_user_folder'
    },
    {
      table: 'notes',
      columns: ['userId', 'updatedAt'],
      type: 'btree',
      name: 'idx_notes_user_updated'
    },
    {
      table: 'notes',
      columns: ['tags'],
      type: 'gin',
      name: 'idx_notes_tags'
    },

    // Habit tracking optimizations
    {
      table: 'habits',
      columns: ['userId', 'isActive'],
      type: 'btree',
      name: 'idx_habits_user_active'
    },
    {
      table: 'habit_entries',
      columns: ['habitId', 'date'],
      type: 'btree',
      name: 'idx_habit_entries_habit_date',
      unique: true
    },
    {
      table: 'habit_entries',
      columns: ['date', 'completed'],
      type: 'btree',
      name: 'idx_habit_entries_date_completed'
    },

    // Analytics optimizations
    {
      table: 'productivity_metrics',
      columns: ['userId', 'date'],
      type: 'btree',
      name: 'idx_productivity_metrics_user_date',
      unique: true
    },
    {
      table: 'ai_insights',
      columns: ['userId', 'type', 'createdAt'],
      type: 'btree',
      name: 'idx_ai_insights_user_type_created'
    },

    // Session and authentication optimizations
    {
      table: 'sessions',
      columns: ['sessionToken'],
      type: 'btree',
      name: 'idx_sessions_token',
      unique: true
    },
    {
      table: 'sessions',
      columns: ['expires'],
      type: 'btree',
      name: 'idx_sessions_expires'
    },
    {
      table: 'accounts',
      columns: ['provider', 'providerAccountId'],
      type: 'btree',
      name: 'idx_accounts_provider_account',
      unique: true
    },

    // Calendar integration optimizations
    {
      table: 'focus_time_blocks',
      columns: ['userId', 'startTime', 'endTime'],
      type: 'btree',
      name: 'idx_focus_blocks_user_time'
    },
    {
      table: 'calendar_conflicts',
      columns: ['userId', 'status', 'createdAt'],
      type: 'btree',
      name: 'idx_calendar_conflicts_user_status'
    }
  ]

  /**
   * Generate index creation SQL for PostgreSQL
   */
  static generateIndexSQL(): string[] {
    return this.RECOMMENDED_INDEXES.map(index => {
      const unique = index.unique ? 'UNIQUE ' : ''
      const columns = index.columns.join(', ')
      const partial = index.partial ? ` WHERE ${index.partial}` : ''
      
      return `CREATE ${unique}INDEX CONCURRENTLY IF NOT EXISTS ${index.name} ON ${index.table} USING ${index.type} (${columns})${partial};`
    })
  }

  /**
   * Apply database optimizations
   */
  static async applyOptimizations(): Promise<void> {
    const indexQueries = this.generateIndexSQL()
    
    for (const query of indexQueries) {
      try {
        await this.prisma.$executeRawUnsafe(query)
        console.log(`✅ Applied index: ${query}`)
      } catch (error) {
        console.warn(`⚠️ Index creation failed: ${query}`, error)
      }
    }

    // Update table statistics for better query planning
    await this.updateTableStatistics()
  }

  /**
   * Update PostgreSQL table statistics
   */
  private static async updateTableStatistics(): Promise<void> {
    const tables = [
      'users', 'tasks', 'notes', 'habits', 'habit_entries', 
      'productivity_metrics', 'ai_insights', 'sessions', 'accounts',
      'focus_time_blocks', 'calendar_conflicts'
    ]

    for (const table of tables) {
      try {
        await this.prisma.$executeRawUnsafe(`ANALYZE ${table};`)
      } catch (error) {
        console.warn(`⚠️ ANALYZE failed for table ${table}:`, error)
      }
    }
  }

  /**
   * Optimized query with caching
   */
  static async executeOptimizedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttl: number = this.CACHE_TTL
  ): Promise<T> {
    // Check cache first
    const cached = this.queryCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.result
    }

    // Execute query with performance monitoring
    const startTime = Date.now()
    const result = await queryFn()
    const executionTime = Date.now() - startTime

    // Cache result if execution time > 100ms
    if (executionTime > 100) {
      this.queryCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
        ttl
      })
    }

    // Log slow queries for analysis
    if (executionTime > 1000) {
      console.warn(`🐌 Slow query detected: ${cacheKey} took ${executionTime}ms`)
    }

    return result
  }

  /**
   * Get query performance metrics
   */
  static async analyzeQuery(query: string): Promise<QueryPerformanceMetrics> {
    const explainResult = await this.prisma.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`)
    
    // Parse PostgreSQL EXPLAIN output
    const plan = (explainResult as any)[0]['QUERY PLAN'][0]
    
    return {
      executionTime: plan['Execution Time'] || 0,
      rowsExamined: this.extractRowsExamined(plan),
      rowsReturned: plan['Actual Rows'] || 0,
      indexesUsed: this.extractIndexes(plan),
      queryComplexity: this.calculateComplexity(plan),
      recommendations: this.generateRecommendations(plan)
    }
  }

  /**
   * Optimized queries for common operations
   */
  static async getActiveTasksOptimized(userId: string, limit: number = 50) {
    return this.executeOptimizedQuery(
      `active-tasks-${userId}-${limit}`,
      () => this.prisma.task.findMany({
        where: {
          userId,
          status: {
            in: ['TODO', 'IN_PROGRESS']
          }
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' }
        ],
        take: limit,
        include: {
          project: {
            select: { name: true, color: true }
          }
        }
      }),
      2 * 60 * 1000 // 2 minute cache
    )
  }

  static async getHabitStreaksOptimized(userId: string) {
    return this.executeOptimizedQuery(
      `habit-streaks-${userId}`,
      () => this.prisma.habit.findMany({
        where: {
          userId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          currentStreak: true,
          bestStreak: true,
          completionRate: true
        },
        orderBy: { currentStreak: 'desc' }
      }),
      5 * 60 * 1000 // 5 minute cache
    )
  }

  static async getProductivityMetricsOptimized(userId: string, days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    return this.executeOptimizedQuery(
      `productivity-metrics-${userId}-${days}`,
      () => this.prisma.productivityMetric.findMany({
        where: {
          userId,
          date: {
            gte: startDate.toISOString().split('T')[0]
          }
        },
        orderBy: { date: 'desc' }
      }),
      10 * 60 * 1000 // 10 minute cache
    )
  }

  /**
   * Connection pool configuration for high-traffic scenarios
   */
  static getConnectionPoolConfig() {
    return {
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
      minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '2'),
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
      propagateCreateError: false
    }
  }

  /**
   * Database health monitoring
   */
  static async getHealthMetrics() {
    const activeConnections = await this.prisma.$queryRaw`
      SELECT count(*) as active_connections 
      FROM pg_stat_activity 
      WHERE state = 'active';
    `

    const slowQueries = await this.prisma.$queryRaw`
      SELECT query, calls, mean_exec_time, total_exec_time
      FROM pg_stat_statements 
      WHERE mean_exec_time > 1000 
      ORDER BY mean_exec_time DESC 
      LIMIT 10;
    `

    const cacheHitRatio = await this.prisma.$queryRaw`
      SELECT 
        sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
      FROM pg_statio_user_tables;
    `

    return {
      activeConnections,
      slowQueries,
      cacheHitRatio,
      queryCache: {
        size: this.queryCache.size,
        hitRate: this.calculateCacheHitRate()
      }
    }
  }

  /**
   * Clear query cache (for testing or manual cleanup)
   */
  static clearQueryCache(): void {
    this.queryCache.clear()
  }

  // Helper methods
  private static extractRowsExamined(plan: any): number {
    if (!plan) return 0
    const rows = plan['Actual Rows'] || 0
    const childRows = plan.Plans?.reduce((sum: number, child: any) => 
      sum + this.extractRowsExamined(child), 0) || 0
    return rows + childRows
  }

  private static extractIndexes(plan: any): string[] {
    const indexes: string[] = []
    
    const extractFromNode = (node: any) => {
      if (node['Index Name']) {
        indexes.push(node['Index Name'])
      }
      if (node.Plans) {
        node.Plans.forEach(extractFromNode)
      }
    }
    
    extractFromNode(plan)
    return [...new Set(indexes)]
  }

  private static calculateComplexity(plan: any): 'low' | 'medium' | 'high' {
    const executionTime = plan['Execution Time'] || 0
    const cost = plan['Total Cost'] || 0
    
    if (executionTime > 5000 || cost > 10000) return 'high'
    if (executionTime > 1000 || cost > 1000) return 'medium'
    return 'low'
  }

  private static generateRecommendations(plan: any): string[] {
    const recommendations: string[] = []
    
    if (plan['Execution Time'] > 1000) {
      recommendations.push('Consider adding indexes for frequently queried columns')
    }
    
    if (!this.extractIndexes(plan).length) {
      recommendations.push('Query is not using any indexes - check WHERE clauses')
    }
    
    if (plan['Actual Rows'] > 10000) {
      recommendations.push('Large result set - consider pagination or filtering')
    }
    
    return recommendations
  }

  private static calculateCacheHitRate(): number {
    // Simple cache hit rate calculation
    return 0.85 // Placeholder - implement actual tracking
  }
}

// Export optimized Prisma client factory
export function createOptimizedPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })

  // Initialize optimization service
  DatabaseOptimizationService.initialize(client)

  return client
}