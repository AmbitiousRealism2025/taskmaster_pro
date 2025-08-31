# Database Indexing Strategy for Analytics Performance

**Context**: TaskMaster Pro Analytics Performance Optimization  
**Focus**: High-performance database queries for real-time analytics and chart rendering  
**Priority**: CRITICAL - Dashboard loading times and analytics responsiveness

## Executive Summary

The analytics dashboard requires optimized database performance to handle complex aggregations, time-series queries, and multi-dimensional analytics. This strategy implements comprehensive indexing, query optimization, and performance monitoring for analytics workloads.

## Core Analytics Query Patterns

### 1. Time-Based Analytics Queries
```sql
-- Productivity metrics over time ranges
SELECT date_trunc('day', created_at) as date, 
       COUNT(*) as tasks_completed,
       AVG(actual_minutes) as avg_duration
FROM tasks 
WHERE user_id = ? 
  AND status = 'COMPLETED'
  AND created_at BETWEEN ? AND ?
GROUP BY date_trunc('day', created_at)
ORDER BY date;

-- Habit completion trends
SELECT date, 
       COUNT(*) as completions,
       SUM(value) as total_value
FROM habit_entries 
WHERE habit_id IN (?) 
  AND date BETWEEN ? AND ?
  AND completed = true
GROUP BY date
ORDER BY date;
```

### 2. Aggregation-Heavy Queries
```sql
-- Task priority distribution
SELECT priority, status, COUNT(*) as count
FROM tasks 
WHERE user_id = ?
  AND deleted_at IS NULL
GROUP BY priority, status;

-- Productivity correlation analysis
SELECT h.name as habit_name,
       AVG(t.productivity_score) as avg_productivity
FROM habits h
JOIN habit_entries he ON h.id = he.habit_id
JOIN daily_metrics dm ON DATE(he.date) = DATE(dm.date)
JOIN tasks t ON dm.user_id = t.user_id
WHERE h.user_id = ?
  AND he.completed = true
  AND dm.date BETWEEN ? AND ?
GROUP BY h.id, h.name;
```

### 3. Real-time Dashboard Queries
```sql
-- Current streak calculations
SELECT habit_id,
       MAX(streak_length) as current_streak
FROM streak_calculations 
WHERE user_id = ?
  AND calculation_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY habit_id;

-- Today's productivity snapshot
SELECT 
  (SELECT COUNT(*) FROM tasks WHERE user_id = ? AND status = 'COMPLETED' AND DATE(completed_at) = CURRENT_DATE) as completed_today,
  (SELECT COUNT(*) FROM habit_entries WHERE user_id IN (SELECT id FROM habits WHERE user_id = ?) AND date = CURRENT_DATE AND completed = true) as habits_completed,
  (SELECT AVG(productivity_score) FROM daily_metrics WHERE user_id = ? AND date = CURRENT_DATE) as productivity_score;
```

## Analytics-Specific Database Indexes

### Primary Performance Indexes

```sql
-- Core analytics indexes for tasks table
CREATE INDEX CONCURRENTLY idx_tasks_analytics_primary 
ON tasks (user_id, status, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_tasks_completion_analytics 
ON tasks (user_id, completed_at DESC, priority, actual_minutes) 
WHERE status = 'COMPLETED' AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_tasks_time_range_analytics 
ON tasks (user_id, created_at, status) 
WHERE deleted_at IS NULL;

-- Habit tracking analytics indexes
CREATE INDEX CONCURRENTLY idx_habit_entries_analytics_primary 
ON habit_entries (habit_id, date DESC, completed);

CREATE INDEX CONCURRENTLY idx_habit_entries_user_date 
ON habit_entries (user_id, date DESC, completed, value);

CREATE INDEX CONCURRENTLY idx_habits_user_active 
ON habits (user_id, is_active, frequency) 
WHERE deleted_at IS NULL;

-- Daily metrics for productivity calculations
CREATE INDEX CONCURRENTLY idx_daily_metrics_user_time 
ON daily_metrics (user_id, date DESC);

CREATE INDEX CONCURRENTLY idx_daily_metrics_analytics 
ON daily_metrics (user_id, date, productivity_score, focus_hours);
```

### Composite Indexes for Multi-Column Queries

```sql
-- Task priority and time analysis
CREATE INDEX CONCURRENTLY idx_tasks_priority_time_analytics 
ON tasks (user_id, priority, status, created_at DESC, actual_minutes) 
WHERE deleted_at IS NULL;

-- Project-based analytics
CREATE INDEX CONCURRENTLY idx_tasks_project_analytics 
ON tasks (user_id, project_id, status, created_at DESC) 
WHERE deleted_at IS NULL AND project_id IS NOT NULL;

-- Habit category and frequency analysis
CREATE INDEX CONCURRENTLY idx_habits_category_frequency 
ON habits (user_id, category_id, frequency, is_active) 
WHERE deleted_at IS NULL;

-- Streak calculation optimization
CREATE INDEX CONCURRENTLY idx_habit_entries_streak_calc 
ON habit_entries (habit_id, date ASC, completed);
```

### Covering Indexes for Read-Heavy Operations

```sql
-- Tasks dashboard covering index
CREATE INDEX CONCURRENTLY idx_tasks_dashboard_covering 
ON tasks (user_id, status, priority) 
INCLUDE (title, created_at, due_date, estimated_minutes, actual_minutes) 
WHERE deleted_at IS NULL;

-- Habit summary covering index
CREATE INDEX CONCURRENTLY idx_habits_summary_covering 
ON habits (user_id, is_active) 
INCLUDE (name, current_streak, best_streak, completion_rate, category_id) 
WHERE deleted_at IS NULL;

-- Daily productivity covering index
CREATE INDEX CONCURRENTLY idx_daily_metrics_covering 
ON daily_metrics (user_id, date) 
INCLUDE (productivity_score, focus_hours, tasks_completed, habits_completed);
```

## Time-Based Partitioning Strategy

### Table Partitioning Implementation

```sql
-- Partition habit_entries by month for historical data management
CREATE TABLE habit_entries_partitioned (
    LIKE habit_entries INCLUDING ALL
) PARTITION BY RANGE (date);

-- Create monthly partitions (automated via cron job)
CREATE TABLE habit_entries_y2024m01 PARTITION OF habit_entries_partitioned 
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE habit_entries_y2024m02 PARTITION OF habit_entries_partitioned 
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Partition daily_metrics for time-series analytics
CREATE TABLE daily_metrics_partitioned (
    LIKE daily_metrics INCLUDING ALL
) PARTITION BY RANGE (date);

-- Create quarterly partitions for metrics
CREATE TABLE daily_metrics_y2024q1 PARTITION OF daily_metrics_partitioned 
FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
```

### Automated Partition Management

```sql
-- Function to create new partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(
    table_name text,
    start_date date
) RETURNS void AS $$
DECLARE
    partition_name text;
    end_date date;
BEGIN
    partition_name := table_name || '_y' || EXTRACT(year FROM start_date) || 'm' || LPAD(EXTRACT(month FROM start_date)::text, 2, '0');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)', 
                   partition_name, table_name, start_date, end_date);
    
    -- Add indexes to new partition
    EXECUTE format('CREATE INDEX %I ON %I (user_id, date DESC)', 
                   partition_name || '_user_date_idx', partition_name);
END;
$$ LANGUAGE plpgsql;
```

## Materialized Views for Complex Analytics

### Productivity Summary View

```sql
CREATE MATERIALIZED VIEW mv_user_productivity_summary AS
SELECT 
    u.id as user_id,
    DATE_TRUNC('week', t.created_at) as week_start,
    COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) as tasks_completed,
    COUNT(CASE WHEN t.status IN ('TODO', 'IN_PROGRESS') THEN 1 END) as tasks_pending,
    AVG(t.actual_minutes) as avg_task_duration,
    SUM(t.actual_minutes) as total_focus_time,
    COUNT(DISTINCT DATE(t.created_at)) as active_days,
    AVG(dm.productivity_score) as avg_productivity_score
FROM users u
LEFT JOIN tasks t ON u.id = t.user_id AND t.deleted_at IS NULL
LEFT JOIN daily_metrics dm ON u.id = dm.user_id 
    AND DATE(dm.date) = DATE(t.created_at)
WHERE t.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY u.id, DATE_TRUNC('week', t.created_at);

-- Optimize materialized view with unique index
CREATE UNIQUE INDEX idx_mv_productivity_summary_unique 
ON mv_user_productivity_summary (user_id, week_start);

-- Refresh policy (every 6 hours)
CREATE OR REPLACE FUNCTION refresh_productivity_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_productivity_summary;
END;
$$ LANGUAGE plpgsql;
```

### Habit Analytics View

```sql
CREATE MATERIALIZED VIEW mv_habit_analytics AS
SELECT 
    h.id as habit_id,
    h.user_id,
    h.name as habit_name,
    h.frequency,
    COUNT(he.id) as total_entries,
    COUNT(CASE WHEN he.completed THEN 1 END) as completed_entries,
    ROUND(COUNT(CASE WHEN he.completed THEN 1 END) * 100.0 / NULLIF(COUNT(he.id), 0), 2) as completion_rate,
    MAX(he.date) as last_entry_date,
    calculate_current_streak(h.id) as current_streak,
    AVG(he.value) as avg_value
FROM habits h
LEFT JOIN habit_entries he ON h.id = he.habit_id
WHERE h.deleted_at IS NULL
    AND (he.date IS NULL OR he.date >= CURRENT_DATE - INTERVAL '90 days')
GROUP BY h.id, h.user_id, h.name, h.frequency;

CREATE UNIQUE INDEX idx_mv_habit_analytics_unique 
ON mv_habit_analytics (habit_id);

CREATE INDEX idx_mv_habit_analytics_user 
ON mv_habit_analytics (user_id, completion_rate DESC);
```

## Query Optimization Patterns

### Efficient Pagination for Analytics

```sql
-- Cursor-based pagination for time-series data
WITH time_series_data AS (
    SELECT 
        date,
        productivity_score,
        focus_hours,
        ROW_NUMBER() OVER (ORDER BY date DESC) as rn
    FROM daily_metrics 
    WHERE user_id = $1 
        AND date <= $2  -- cursor date
    ORDER BY date DESC
    LIMIT 25
)
SELECT * FROM time_series_data ORDER BY date ASC;
```

### Aggregation Optimization

```sql
-- Use window functions for efficient calculations
SELECT 
    date,
    productivity_score,
    AVG(productivity_score) OVER (
        ORDER BY date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as seven_day_avg,
    LAG(productivity_score, 7) OVER (ORDER BY date) as week_ago_score
FROM daily_metrics 
WHERE user_id = $1 
    AND date >= $2 
ORDER BY date;
```

### Habit Streak Calculation Optimization

```sql
-- Efficient streak calculation using window functions
WITH streak_groups AS (
    SELECT 
        habit_id,
        date,
        completed,
        date - (ROW_NUMBER() OVER (PARTITION BY habit_id, completed ORDER BY date))::integer * INTERVAL '1 day' as streak_group
    FROM habit_entries 
    WHERE habit_id = $1 
        AND date >= CURRENT_DATE - INTERVAL '365 days'
    ORDER BY date DESC
),
streak_lengths AS (
    SELECT 
        habit_id,
        streak_group,
        completed,
        COUNT(*) as streak_length,
        MAX(date) as streak_end_date
    FROM streak_groups 
    WHERE completed = true
    GROUP BY habit_id, streak_group, completed
)
SELECT 
    habit_id,
    MAX(streak_length) as current_streak
FROM streak_lengths 
WHERE streak_end_date >= CURRENT_DATE - INTERVAL '1 day'
GROUP BY habit_id;
```

## Prisma Schema Optimizations

### Index Definitions in Schema

```prisma
model Task {
  id              String    @id @default(cuid())
  userId          String
  projectId       String?
  title           String
  status          TaskStatus
  priority        Priority
  createdAt       DateTime  @default(now())
  completedAt     DateTime?
  dueDate         DateTime?
  estimatedMinutes Int?
  actualMinutes   Int?
  deletedAt       DateTime?
  
  // Analytics-optimized indexes
  @@index([userId, status, createdAt(sort: Desc)], map: "idx_tasks_analytics_primary", where: { deletedAt: null })
  @@index([userId, completedAt(sort: Desc), priority], map: "idx_tasks_completion", where: { status: COMPLETED, deletedAt: null })
  @@index([userId, priority, status, createdAt(sort: Desc)], map: "idx_tasks_priority_time")
  @@index([userId, projectId, status, createdAt(sort: Desc)], map: "idx_tasks_project_analytics", where: { projectId: { not: null }, deletedAt: null })
  
  @@map("tasks")
}

model Habit {
  id              String    @id @default(cuid())
  userId          String
  categoryId      String?
  name            String
  frequency       HabitFrequency
  currentStreak   Int       @default(0)
  bestStreak      Int       @default(0)
  completionRate  Float     @default(0)
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  deletedAt       DateTime?
  
  entries         HabitEntry[]
  category        HabitCategory? @relation(fields: [categoryId], references: [id])
  
  // Analytics-optimized indexes
  @@index([userId, isActive, frequency], map: "idx_habits_user_active", where: { deletedAt: null })
  @@index([userId, categoryId, frequency, isActive], map: "idx_habits_category_frequency", where: { deletedAt: null })
  
  @@map("habits")
}

model HabitEntry {
  id        String   @id @default(cuid())
  habitId   String
  userId    String   // Denormalized for faster queries
  date      String   // YYYY-MM-DD format for efficient range queries
  completed Boolean  @default(false)
  value     Int?
  createdAt DateTime @default(now())
  
  habit     Habit    @relation(fields: [habitId], references: [id], onDelete: Cascade)
  
  // Analytics-optimized indexes
  @@index([habitId, date(sort: Desc), completed], map: "idx_habit_entries_analytics")
  @@index([userId, date(sort: Desc), completed, value], map: "idx_habit_entries_user_date")
  @@index([habitId, date(sort: Asc), completed], map: "idx_habit_entries_streak_calc")
  
  @@unique([habitId, date])
  @@map("habit_entries")
}

model DailyMetrics {
  id               String   @id @default(cuid())
  userId           String
  date             DateTime @db.Date
  productivityScore Float
  focusHours       Float
  tasksCompleted   Int      @default(0)
  habitsCompleted  Int      @default(0)
  createdAt        DateTime @default(now())
  
  // Analytics-optimized indexes  
  @@index([userId, date(sort: Desc)], map: "idx_daily_metrics_user_time")
  @@index([userId, date, productivityScore, focusHours], map: "idx_daily_metrics_analytics")
  
  @@unique([userId, date])
  @@map("daily_metrics")
}
```

### Database Configuration Optimizations

```sql
-- PostgreSQL configuration for analytics workloads
-- Add to postgresql.conf

# Memory settings for analytics
shared_buffers = 256MB                    # 25% of RAM for small instances
effective_cache_size = 1GB               # Estimate of OS cache
work_mem = 16MB                          # Per-operation memory for sorting/hashing
maintenance_work_mem = 64MB              # Memory for maintenance operations

# Query planner settings
random_page_cost = 1.1                   # SSD-optimized
seq_page_cost = 1.0
effective_io_concurrency = 200           # SSD concurrency

# Analytics-specific settings
enable_hashagg = on                      # Enable hash aggregations
enable_sort = on                         # Enable sorting operations
enable_material = on                     # Enable materialized views
max_parallel_workers_per_gather = 2     # Parallel query execution

# Connection and performance
max_connections = 100
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 1000        # More detailed statistics for analytics
```

## Query Caching Strategy

### Application-Level Caching

```typescript
// lib/analytics/cache.ts
import { Redis } from 'ioredis'

export class AnalyticsCache {
  private redis: Redis
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!)
  }

  // Cache productivity metrics for 5 minutes
  async getProductivityMetrics(userId: string, dateRange: string) {
    const key = `analytics:productivity:${userId}:${dateRange}`
    const cached = await this.redis.get(key)
    
    if (cached) {
      return JSON.parse(cached)
    }
    
    const metrics = await this.calculateProductivityMetrics(userId, dateRange)
    await this.redis.setex(key, 300, JSON.stringify(metrics))
    return metrics
  }

  // Cache habit analytics for 1 hour
  async getHabitAnalytics(userId: string) {
    const key = `analytics:habits:${userId}`
    const cached = await this.redis.get(key)
    
    if (cached) {
      return JSON.parse(cached)
    }
    
    const analytics = await this.calculateHabitAnalytics(userId)
    await this.redis.setex(key, 3600, JSON.stringify(analytics))
    return analytics
  }

  // Invalidate cache on data changes
  async invalidateUserCache(userId: string) {
    const pattern = `analytics:*:${userId}*`
    const keys = await this.redis.keys(pattern)
    
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }
}
```

### Database Query Caching

```sql
-- Enable query result caching in PostgreSQL
-- Add to postgresql.conf
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all

-- Create extension for query performance tracking
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Monitor most expensive analytics queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%tasks%' 
   OR query LIKE '%habits%'
   OR query LIKE '%analytics%'
ORDER BY mean_time DESC
LIMIT 10;
```

## Performance Monitoring Implementation

### Query Performance Tracking

```typescript
// lib/analytics/monitoring.ts
export class QueryPerformanceMonitor {
  private static instance: QueryPerformanceMonitor
  private metrics: Map<string, QueryMetrics> = new Map()

  static getInstance(): QueryPerformanceMonitor {
    if (!QueryPerformanceMonitor.instance) {
      QueryPerformanceMonitor.instance = new QueryPerformanceMonitor()
    }
    return QueryPerformanceMonitor.instance
  }

  async trackQuery<T>(
    queryName: string, 
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()
    
    try {
      const result = await queryFn()
      const endTime = performance.now()
      const duration = endTime - startTime
      
      this.recordMetric(queryName, duration, true)
      
      // Log slow queries (>100ms)
      if (duration > 100) {
        console.warn(`Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      this.recordMetric(queryName, duration, false)
      throw error
    }
  }

  private recordMetric(queryName: string, duration: number, success: boolean) {
    const existing = this.metrics.get(queryName) || {
      totalCalls: 0,
      successfulCalls: 0,
      totalDuration: 0,
      avgDuration: 0,
      maxDuration: 0,
      minDuration: Infinity
    }

    existing.totalCalls++
    if (success) existing.successfulCalls++
    existing.totalDuration += duration
    existing.avgDuration = existing.totalDuration / existing.totalCalls
    existing.maxDuration = Math.max(existing.maxDuration, duration)
    existing.minDuration = Math.min(existing.minDuration, duration)

    this.metrics.set(queryName, existing)
  }

  getQueryStats(): Record<string, QueryMetrics> {
    return Object.fromEntries(this.metrics)
  }

  // Reset metrics (useful for testing)
  reset() {
    this.metrics.clear()
  }
}

interface QueryMetrics {
  totalCalls: number
  successfulCalls: number
  totalDuration: number
  avgDuration: number
  maxDuration: number
  minDuration: number
}
```

### Index Usage Statistics

```sql
-- Monitor index usage efficiency
CREATE OR REPLACE VIEW v_index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    seq_scan as table_scans,
    CASE 
        WHEN seq_scan + idx_scan > 0 
        THEN ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 2)
        ELSE 0
    END as index_usage_pct,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY index_usage_pct ASC;

-- Identify unused indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
    AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Automated Performance Alerts

```typescript
// lib/analytics/alerts.ts
export class PerformanceAlertSystem {
  private thresholds = {
    queryDuration: 500, // ms
    cacheHitRate: 0.8,  // 80%
    indexUsage: 0.7     // 70%
  }

  async checkQueryPerformance() {
    const stats = QueryPerformanceMonitor.getInstance().getQueryStats()
    
    for (const [queryName, metrics] of Object.entries(stats)) {
      if (metrics.avgDuration > this.thresholds.queryDuration) {
        await this.sendAlert({
          type: 'SLOW_QUERY',
          message: `Query ${queryName} averaging ${metrics.avgDuration.toFixed(2)}ms`,
          severity: 'WARNING',
          data: metrics
        })
      }
    }
  }

  async checkIndexUsage() {
    // Implementation would query pg_stat_user_indexes
    // and alert on low usage indexes
  }

  private async sendAlert(alert: PerformanceAlert) {
    // Send to monitoring system (e.g., DataDog, New Relic)
    console.warn('Performance Alert:', alert)
    
    // In production, send to alerting system
    // await alertingService.send(alert)
  }
}

interface PerformanceAlert {
  type: string
  message: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  data?: any
}
```

## Automatic Index Recommendations

### Advanced Index Analysis System

```sql
-- Enhanced function to analyze query patterns and suggest specific indexes
CREATE OR REPLACE FUNCTION suggest_missing_indexes()
RETURNS TABLE(
    table_name text,
    suggested_index text,
    estimated_benefit text,
    query_pattern text,
    impact_score integer
) AS $$
BEGIN
    RETURN QUERY
    WITH table_stats AS (
        SELECT 
            schemaname,
            relname,
            seq_scan,
            seq_tup_read,
            idx_scan,
            idx_tup_fetch,
            n_tup_ins + n_tup_upd + n_tup_del as write_activity,
            CASE 
                WHEN seq_scan + idx_scan > 0 
                THEN seq_scan::float / (seq_scan + idx_scan)
                ELSE 0 
            END as seq_scan_ratio
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
    ),
    slow_queries AS (
        SELECT 
            query,
            calls,
            mean_time,
            total_time,
            CASE 
                WHEN query LIKE '%WHERE user_id%' THEN 'user_filtering'
                WHEN query LIKE '%ORDER BY%created_at%' THEN 'time_ordering'
                WHEN query LIKE '%GROUP BY%' THEN 'aggregation'
                WHEN query LIKE '%JOIN%' THEN 'join_operation'
                ELSE 'other'
            END as pattern_type
        FROM pg_stat_statements 
        WHERE mean_time > 50 -- Queries taking more than 50ms on average
        ORDER BY mean_time DESC
        LIMIT 20
    )
    SELECT 
        ts.relname::text,
        CASE 
            WHEN ts.relname = 'tasks' AND ts.seq_scan_ratio > 0.3 THEN 
                'CREATE INDEX CONCURRENTLY idx_tasks_analytics_enhanced ON tasks (user_id, status, created_at DESC, priority) WHERE deleted_at IS NULL'
            WHEN ts.relname = 'habit_entries' AND ts.seq_scan_ratio > 0.3 THEN
                'CREATE INDEX CONCURRENTLY idx_habit_entries_analytics_enhanced ON habit_entries (user_id, date DESC, completed, value) INCLUDE (habit_id)'
            WHEN ts.relname = 'daily_metrics' AND ts.seq_scan_ratio > 0.3 THEN
                'CREATE INDEX CONCURRENTLY idx_daily_metrics_analytics_enhanced ON daily_metrics (user_id, date DESC) INCLUDE (productivity_score, focus_hours, tasks_completed, habits_completed)'
            ELSE 
                ('CREATE INDEX CONCURRENTLY idx_' || ts.relname || '_suggested ON ' || ts.relname || ' (user_id, created_at DESC)')
        END::text,
        CASE 
            WHEN ts.seq_scan_ratio > 0.7 THEN 'CRITICAL - Major performance impact'
            WHEN ts.seq_scan_ratio > 0.5 THEN 'HIGH - Significant improvement expected'
            WHEN ts.seq_scan_ratio > 0.3 THEN 'MEDIUM - Moderate improvement'
            ELSE 'LOW - Minor optimization'
        END::text,
        CASE 
            WHEN ts.seq_scan_ratio > 0.5 AND ts.write_activity < 1000 THEN 'Read-heavy analytics workload'
            WHEN ts.seq_scan_ratio > 0.5 AND ts.write_activity >= 1000 THEN 'Mixed workload - consider partial indexes'
            ELSE 'Balanced workload'
        END::text,
        CASE 
            WHEN ts.seq_scan_ratio > 0.7 THEN 95
            WHEN ts.seq_scan_ratio > 0.5 THEN 75
            WHEN ts.seq_scan_ratio > 0.3 THEN 50
            ELSE 25
        END::integer
    FROM table_stats ts
    WHERE ts.seq_scan_ratio > 0.25 -- Lower threshold for more comprehensive analysis
    ORDER BY 
        CASE 
            WHEN ts.seq_scan_ratio > 0.7 THEN 95
            WHEN ts.seq_scan_ratio > 0.5 THEN 75
            WHEN ts.seq_scan_ratio > 0.3 THEN 50
            ELSE 25
        END DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze specific analytics query patterns
CREATE OR REPLACE FUNCTION analyze_analytics_queries()
RETURNS TABLE(
    query_type text,
    avg_execution_time numeric,
    call_frequency bigint,
    optimization_suggestion text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN query LIKE '%tasks%status = %COMPLETED%' THEN 'task_completion_analytics'
            WHEN query LIKE '%habit_entries%completed = true%' THEN 'habit_analytics'
            WHEN query LIKE '%daily_metrics%productivity_score%' THEN 'productivity_analytics'
            WHEN query LIKE '%DATE_TRUNC%' THEN 'time_series_analytics'
            WHEN query LIKE '%COUNT(*)%GROUP BY%' THEN 'aggregation_analytics'
            ELSE 'other_analytics'
        END::text,
        ROUND(mean_time::numeric, 2),
        calls,
        CASE 
            WHEN mean_time > 200 AND query LIKE '%tasks%' THEN 'Consider adding covering index on tasks(user_id, status, completed_at) INCLUDE (priority, actual_minutes)'
            WHEN mean_time > 200 AND query LIKE '%habit_entries%' THEN 'Consider partitioning habit_entries by date range'
            WHEN mean_time > 200 AND query LIKE '%daily_metrics%' THEN 'Consider materialized view for aggregated metrics'
            WHEN mean_time > 100 THEN 'Moderate optimization needed - review indexes'
            ELSE 'Performance acceptable'
        END::text
    FROM pg_stat_statements 
    WHERE query LIKE '%tasks%' 
       OR query LIKE '%habits%' 
       OR query LIKE '%daily_metrics%'
       OR query LIKE '%habit_entries%'
    ORDER BY mean_time DESC;
END;
$$ LANGUAGE plpgsql;
```

### Automated Index Maintenance System

```sql
-- Function to automatically create recommended indexes during maintenance windows
CREATE OR REPLACE FUNCTION auto_create_analytics_indexes(
    dry_run boolean DEFAULT true
)
RETURNS TABLE(
    action_taken text,
    index_name text,
    execution_time interval
) AS $$
DECLARE
    rec RECORD;
    start_time timestamp;
    end_time timestamp;
    index_sql text;
BEGIN
    -- Get index recommendations with high impact scores
    FOR rec IN 
        SELECT * FROM suggest_missing_indexes() 
        WHERE impact_score >= 75 
        ORDER BY impact_score DESC 
        LIMIT 5
    LOOP
        start_time := clock_timestamp();
        index_sql := rec.suggested_index;
        
        IF NOT dry_run THEN
            BEGIN
                EXECUTE index_sql;
                end_time := clock_timestamp();
                
                RETURN QUERY SELECT 
                    ('CREATED: ' || rec.suggested_index)::text,
                    regexp_replace(rec.suggested_index, '.* (idx_\w+) .*', '\1')::text,
                    (end_time - start_time)::interval;
            EXCEPTION WHEN OTHERS THEN
                RETURN QUERY SELECT 
                    ('FAILED: ' || SQLERRM)::text,
                    regexp_replace(rec.suggested_index, '.* (idx_\w+) .*', '\1')::text,
                    (clock_timestamp() - start_time)::interval;
            END;
        ELSE
            RETURN QUERY SELECT 
                ('DRY RUN: Would execute - ' || rec.suggested_index)::text,
                regexp_replace(rec.suggested_index, '.* (idx_\w+) .*', '\1')::text,
                '00:00:00'::interval;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Automated maintenance scheduler
CREATE OR REPLACE FUNCTION schedule_index_maintenance()
RETURNS void AS $$
BEGIN
    -- Schedule index analysis every Sunday at 2 AM
    PERFORM cron.schedule(
        'analytics-index-analysis', 
        '0 2 * * 0',
        'SELECT * FROM suggest_missing_indexes();'
    );
    
    -- Schedule automatic index creation every first Sunday of the month at 3 AM
    PERFORM cron.schedule(
        'auto-create-indexes',
        '0 3 1-7 * 0',
        'SELECT * FROM auto_create_analytics_indexes(false);'
    );
    
    -- Schedule index usage analysis weekly
    PERFORM cron.schedule(
        'index-usage-analysis',
        '0 4 * * 0',
        'SELECT * FROM v_index_usage_stats WHERE index_usage_pct < 10;'
    );
END;
$$ LANGUAGE plpgsql;
```

## Implementation Roadmap

### Phase 1: Core Indexes (Week 1)
- [ ] Implement primary analytics indexes for tasks and habits
- [ ] Add composite indexes for multi-column queries
- [ ] Create covering indexes for dashboard queries
- [ ] Set up query performance monitoring

### Phase 2: Advanced Optimization (Week 2)
- [ ] Implement table partitioning for historical data
- [ ] Create materialized views for complex analytics
- [ ] Set up automated partition management
- [ ] Implement application-level caching

### Phase 3: Monitoring & Maintenance (Week 3)
- [ ] Deploy performance monitoring system
- [ ] Set up automated alerts for slow queries
- [ ] Implement index usage analysis
- [ ] Create maintenance procedures for optimal performance

### Phase 4: Continuous Optimization (Ongoing)
- [ ] Regular index usage reviews
- [ ] Query optimization based on usage patterns
- [ ] Capacity planning for data growth
- [ ] Performance benchmarking and regression testing

## Expected Performance Improvements

### Query Performance Targets

| Query Type | Current (est.) | Target | Improvement |
|------------|----------------|--------|-------------|
| Dashboard Overview | 800ms | <200ms | 75% faster |
| Habit Analytics | 1.2s | <300ms | 75% faster |
| Time Series Charts | 2.1s | <500ms | 76% faster |
| Productivity Metrics | 950ms | <250ms | 74% faster |
| Streak Calculations | 1.5s | <400ms | 73% faster |

### Resource Utilization Targets

- **CPU Usage**: Reduce analytics query CPU by 60%
- **Memory Usage**: Optimize sort/hash operations with proper indexes
- **I/O Operations**: Reduce disk reads by 70% through covering indexes
- **Cache Hit Rate**: Achieve 85%+ cache hit rate for frequent queries

## Testing & Validation

### Performance Testing Plan

```typescript
// tests/performance/analytics-performance.test.ts
describe('Analytics Performance', () => {
  test('dashboard overview query completes under 200ms', async () => {
    const startTime = performance.now()
    
    const result = await getDashboardOverview(testUserId)
    
    const duration = performance.now() - startTime
    expect(duration).toBeLessThan(200)
    expect(result).toBeDefined()
  })

  test('habit analytics with 1000+ entries loads under 300ms', async () => {
    // Create 1000+ habit entries for testing
    await createTestHabitEntries(testHabitId, 1000)
    
    const startTime = performance.now()
    const analytics = await getHabitAnalytics(testUserId)
    const duration = performance.now() - startTime
    
    expect(duration).toBeLessThan(300)
    expect(analytics.completionRate).toBeDefined()
  })

  test('time series chart data loads under 500ms', async () => {
    const startTime = performance.now()
    
    const chartData = await getProductivityTimeSeries(
      testUserId,
      { start: new Date('2024-01-01'), end: new Date('2024-12-31') }
    )
    
    const duration = performance.now() - startTime
    expect(duration).toBeLessThan(500)
    expect(chartData).toHaveLength(365)
  })
})
```

## Advanced Performance Monitoring

### Real-Time Query Performance Dashboard

```typescript
// lib/analytics/performance-dashboard.ts
export class DatabasePerformanceDashboard {
  constructor(private prisma: PrismaClient) {}

  async getPerformanceMetrics(timeframe: number = 60) {
    const [
      slowQueries,
      indexUsage,
      tableStats,
      connectionStats
    ] = await Promise.all([
      this.getSlowQueries(timeframe),
      this.getIndexUsageStats(),
      this.getTablePerformanceStats(),
      this.getConnectionStats()
    ])

    return {
      slowQueries,
      indexUsage,
      tableStats,
      connectionStats,
      recommendations: await this.generatePerformanceRecommendations()
    }
  }

  private async getSlowQueries(minutes: number) {
    return await this.prisma.$queryRaw<Array<{
      query: string
      avg_time: number
      calls: number
      total_time: number
      rows_per_call: number
    }>>`
      SELECT 
        LEFT(query, 100) as query,
        ROUND(mean_time::numeric, 2) as avg_time,
        calls,
        ROUND(total_time::numeric, 2) as total_time,
        ROUND((rows / NULLIF(calls, 0))::numeric, 2) as rows_per_call
      FROM pg_stat_statements 
      WHERE last_call >= NOW() - INTERVAL '${minutes} minutes'
        AND (query LIKE '%tasks%' 
             OR query LIKE '%habits%' 
             OR query LIKE '%daily_metrics%')
      ORDER BY mean_time DESC 
      LIMIT 20
    `
  }

  private async getIndexUsageStats() {
    return await this.prisma.$queryRaw<Array<{
      table_name: string
      index_name: string
      usage_percentage: number
      scans: number
      size_mb: number
    }>>`
      SELECT 
        schemaname || '.' || tablename as table_name,
        indexname as index_name,
        CASE 
          WHEN seq_scan + idx_scan > 0 
          THEN ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 2)
          ELSE 0
        END as usage_percentage,
        idx_scan as scans,
        ROUND(pg_relation_size(indexrelid)::numeric / 1024 / 1024, 2) as size_mb
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND (tablename LIKE '%task%' 
             OR tablename LIKE '%habit%' 
             OR tablename LIKE '%metric%')
      ORDER BY usage_percentage ASC
    `
  }

  private async getTablePerformanceStats() {
    return await this.prisma.$queryRaw<Array<{
      table_name: string
      sequential_scans: number
      index_scans: number
      rows_read_per_scan: number
      cache_hit_ratio: number
    }>>`
      SELECT 
        relname as table_name,
        seq_scan as sequential_scans,
        idx_scan as index_scans,
        CASE WHEN seq_scan > 0 
          THEN ROUND((seq_tup_read / seq_scan)::numeric, 2)
          ELSE 0 
        END as rows_read_per_scan,
        CASE WHEN heap_blks_read + heap_blks_hit > 0
          THEN ROUND(100.0 * heap_blks_hit / (heap_blks_hit + heap_blks_read), 2)
          ELSE 0
        END as cache_hit_ratio
      FROM pg_stat_user_tables pst
      LEFT JOIN pg_statio_user_tables psio ON pst.relid = psio.relid
      WHERE schemaname = 'public'
        AND (relname LIKE '%task%' 
             OR relname LIKE '%habit%' 
             OR relname LIKE '%metric%')
    `
  }

  private async getConnectionStats() {
    return await this.prisma.$queryRaw<Array<{
      active_connections: number
      idle_connections: number
      max_connections: number
      connection_usage_pct: number
    }>>`
      SELECT 
        COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections,
        COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
        ROUND(100.0 * COUNT(*) / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'), 2) as connection_usage_pct
      FROM pg_stat_activity
      WHERE datname = current_database()
    `
  }

  private async generatePerformanceRecommendations() {
    const recommendations = []
    
    // Check for missing indexes
    const missingIndexes = await this.prisma.$queryRaw<Array<{
      table_name: string
      suggested_index: string
      impact_score: number
    }>>`SELECT * FROM suggest_missing_indexes() WHERE impact_score >= 50`
    
    if (missingIndexes.length > 0) {
      recommendations.push({
        type: 'INDEX_OPTIMIZATION',
        priority: 'HIGH',
        message: `${missingIndexes.length} tables would benefit from additional indexes`,
        details: missingIndexes
      })
    }

    // Check for unused indexes
    const unusedIndexes = await this.prisma.$queryRaw<Array<{
      index_name: string
      size_mb: number
    }>>`
      SELECT indexname as index_name, 
             ROUND(pg_relation_size(indexrelid)::numeric / 1024 / 1024, 2) as size_mb
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0 
        AND schemaname = 'public'
        AND pg_relation_size(indexrelid) > 1024 * 1024 -- > 1MB
    `

    if (unusedIndexes.length > 0) {
      recommendations.push({
        type: 'INDEX_CLEANUP',
        priority: 'MEDIUM',
        message: `${unusedIndexes.length} unused indexes consuming disk space`,
        details: unusedIndexes
      })
    }

    return recommendations
  }
}
```

### Automated Performance Tuning

```sql
-- Function to automatically optimize table statistics
CREATE OR REPLACE FUNCTION auto_analyze_analytics_tables()
RETURNS TABLE(
    table_name text,
    action_taken text,
    stats_updated boolean
) AS $$
DECLARE
    rec RECORD;
    last_analyze timestamp;
    rows_modified bigint;
BEGIN
    -- Analyze tables with significant modifications
    FOR rec IN 
        SELECT schemaname, relname, n_tup_ins + n_tup_upd + n_tup_del as modifications,
               last_analyze
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
          AND (relname LIKE '%task%' OR relname LIKE '%habit%' OR relname LIKE '%metric%')
    LOOP
        -- Check if analysis is needed (>10% modifications or >1 week since last analyze)
        IF rec.modifications > (SELECT reltuples FROM pg_class WHERE relname = rec.relname) * 0.1
           OR rec.last_analyze < NOW() - INTERVAL '1 week'
           OR rec.last_analyze IS NULL THEN
            
            EXECUTE format('ANALYZE %I.%I', rec.schemaname, rec.relname);
            
            RETURN QUERY SELECT 
                rec.relname::text,
                ('ANALYZED: ' || rec.modifications || ' modifications detected')::text,
                true;
        ELSE
            RETURN QUERY SELECT 
                rec.relname::text,
                'SKIPPED: Statistics are current'::text,
                false;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically vacuum analytics tables when needed
CREATE OR REPLACE FUNCTION auto_maintenance_analytics_tables()
RETURNS TABLE(
    table_name text,
    maintenance_action text,
    dead_tuples_before bigint,
    dead_tuples_after bigint
) AS $$
DECLARE
    rec RECORD;
    dead_before bigint;
    dead_after bigint;
BEGIN
    FOR rec IN
        SELECT schemaname, relname, n_dead_tup, n_tup_upd + n_tup_del as modifications
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
          AND (relname LIKE '%task%' OR relname LIKE '%habit%' OR relname LIKE '%metric%')
          AND n_dead_tup > 1000 -- Only tables with significant dead tuples
    LOOP
        dead_before := rec.n_dead_tup;
        
        -- Decide between VACUUM and VACUUM FULL based on dead tuple ratio
        IF rec.n_dead_tup > (SELECT reltuples FROM pg_class WHERE relname = rec.relname) * 0.2 THEN
            -- High dead tuple ratio - consider VACUUM FULL during maintenance window
            EXECUTE format('VACUUM ANALYZE %I.%I', rec.schemaname, rec.relname);
            
            SELECT n_dead_tup INTO dead_after 
            FROM pg_stat_user_tables 
            WHERE relname = rec.relname AND schemaname = rec.schemaname;
            
            RETURN QUERY SELECT 
                rec.relname::text,
                'VACUUM_ANALYZE'::text,
                dead_before,
                COALESCE(dead_after, 0);
        ELSE
            -- Regular maintenance
            EXECUTE format('VACUUM %I.%I', rec.schemaname, rec.relname);
            
            SELECT n_dead_tup INTO dead_after 
            FROM pg_stat_user_tables 
            WHERE relname = rec.relname AND schemaname = rec.schemaname;
            
            RETURN QUERY SELECT 
                rec.relname::text,
                'VACUUM'::text,
                dead_before,
                COALESCE(dead_after, 0);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Query Plan Analysis and Optimization

```typescript
// lib/analytics/query-plan-analyzer.ts
export class QueryPlanAnalyzer {
  constructor(private prisma: PrismaClient) {}

  async analyzeQueryPlan(query: string, params?: any[]) {
    try {
      // Get query plan
      const plan = await this.prisma.$queryRaw<Array<{ 'QUERY PLAN': string }>>`
        EXPLAIN (ANALYZE true, BUFFERS true, FORMAT JSON) ${query}
      `

      const planData = JSON.parse(plan[0]['QUERY PLAN'])
      return this.extractPlanInsights(planData)
    } catch (error) {
      console.error('Query plan analysis failed:', error)
      return null
    }
  }

  private extractPlanInsights(planData: any) {
    const plan = planData.Plan
    
    return {
      totalCost: plan['Total Cost'],
      actualTime: plan['Actual Total Time'],
      rows: plan['Actual Rows'],
      bufferHits: plan['Shared Hit Blocks'] || 0,
      bufferReads: plan['Shared Read Blocks'] || 0,
      cacheHitRatio: this.calculateCacheHitRatio(plan),
      indexUsage: this.extractIndexUsage(plan),
      recommendations: this.generatePlanRecommendations(plan)
    }
  }

  private calculateCacheHitRatio(plan: any): number {
    const hits = this.sumBufferHits(plan)
    const reads = this.sumBufferReads(plan)
    return hits + reads > 0 ? (hits / (hits + reads)) * 100 : 0
  }

  private sumBufferHits(node: any): number {
    let total = node['Shared Hit Blocks'] || 0
    if (node.Plans) {
      for (const childPlan of node.Plans) {
        total += this.sumBufferHits(childPlan)
      }
    }
    return total
  }

  private sumBufferReads(node: any): number {
    let total = node['Shared Read Blocks'] || 0
    if (node.Plans) {
      for (const childPlan of node.Plans) {
        total += this.sumBufferReads(childPlan)
      }
    }
    return total
  }

  private extractIndexUsage(plan: any): Array<{ indexName: string, scanType: string }> {
    const indexes = []
    
    const extractFromNode = (node: any) => {
      if (node['Node Type']?.includes('Index')) {
        indexes.push({
          indexName: node['Index Name'] || 'Unknown',
          scanType: node['Node Type']
        })
      }
      
      if (node.Plans) {
        for (const childPlan of node.Plans) {
          extractFromNode(childPlan)
        }
      }
    }
    
    extractFromNode(plan)
    return indexes
  }

  private generatePlanRecommendations(plan: any): string[] {
    const recommendations = []
    
    // Check for sequential scans
    if (this.hasSequentialScan(plan)) {
      recommendations.push('Consider adding indexes to eliminate sequential scans')
    }
    
    // Check for high cost operations
    if (plan['Total Cost'] > 1000) {
      recommendations.push('High-cost query - review indexes and query structure')
    }
    
    // Check for low cache hit ratio
    const hitRatio = this.calculateCacheHitRatio(plan)
    if (hitRatio < 90) {
      recommendations.push(`Low cache hit ratio (${hitRatio.toFixed(1)}%) - consider query optimization`)
    }
    
    return recommendations
  }

  private hasSequentialScan(node: any): boolean {
    if (node['Node Type'] === 'Seq Scan') {
      return true
    }
    
    if (node.Plans) {
      return node.Plans.some((childPlan: any) => this.hasSequentialScan(childPlan))
    }
    
    return false
  }
}
```

## Implementation Checklist

### Immediate Actions (Week 1)
- [ ] Deploy core analytics indexes using CONCURRENTLY option
- [ ] Set up pg_stat_statements extension for query monitoring
- [ ] Implement QueryPerformanceMonitor class for real-time tracking
- [ ] Create initial materialized views for dashboard data

### Short-term Optimizations (Week 2-3)
- [ ] Implement automated index analysis functions
- [ ] Set up cron jobs for regular maintenance
- [ ] Deploy table partitioning for historical data
- [ ] Implement application-level caching strategy

### Long-term Monitoring (Ongoing)
- [ ] Set up DatabasePerformanceDashboard for ops monitoring
- [ ] Implement automated performance alerting
- [ ] Regular query plan analysis for complex analytics queries
- [ ] Quarterly index usage reviews and cleanup

## Success Metrics Tracking

### Performance Benchmarks
```typescript
// tests/performance/analytics-benchmarks.test.ts
const PERFORMANCE_TARGETS = {
  dashboardOverview: 200, // ms
  habitAnalytics: 300,    // ms
  timeSeriesCharts: 500,  // ms
  productivityMetrics: 250, // ms
  streakCalculations: 400  // ms
}

// Automated performance regression testing
describe('Analytics Performance Benchmarks', () => {
  Object.entries(PERFORMANCE_TARGETS).forEach(([testName, targetMs]) => {
    test(`${testName} completes within ${targetMs}ms`, async () => {
      const result = await measureQueryPerformance(testName)
      expect(result.duration).toBeLessThan(targetMs)
      expect(result.cacheHitRatio).toBeGreaterThan(0.85)
    })
  })
})
```

This comprehensive database indexing strategy addresses all the performance concerns identified in the analytics architecture while providing automated monitoring, maintenance, and optimization capabilities for sustained high performance.