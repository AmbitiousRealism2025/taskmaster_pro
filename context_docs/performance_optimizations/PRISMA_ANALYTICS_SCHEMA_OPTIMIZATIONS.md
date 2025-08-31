# Prisma Schema Analytics Optimizations

**Context**: Database schema optimizations specifically for analytics performance  
**Focus**: Prisma schema updates with comprehensive indexing strategy for TaskMaster Pro  
**Related**: DATABASE_INDEXING_STRATEGY.md, ANALYTICS_QUERY_OPTIMIZATION.md

## Enhanced Prisma Schema with Analytics Indexes

### Core Analytics Models with Optimized Indexes

```prisma
// prisma/schema.prisma

model Task {
  id                String     @id @default(cuid())
  userId            String
  projectId         String?
  title             String
  description       String?
  status            TaskStatus
  priority          Priority
  tags              String[]
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
  completedAt       DateTime?
  dueDate           DateTime?
  estimatedMinutes  Int?
  actualMinutes     Int?
  deletedAt         DateTime?
  
  // Relationships
  user              User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  project           Project?   @relation(fields: [projectId], references: [id], onDelete: SetNull)
  
  // Analytics-optimized indexes
  @@index([userId, status, createdAt(sort: Desc)], 
          map: "idx_tasks_analytics_primary", 
          where: { deletedAt: null })
  
  @@index([userId, completedAt(sort: Desc), priority, actualMinutes], 
          map: "idx_tasks_completion_analytics", 
          where: { status: COMPLETED, deletedAt: null })
  
  @@index([userId, createdAt, status], 
          map: "idx_tasks_time_range_analytics", 
          where: { deletedAt: null })
  
  @@index([userId, priority, status, createdAt(sort: Desc)], 
          map: "idx_tasks_priority_analytics", 
          where: { deletedAt: null })
  
  @@index([userId, projectId, status, createdAt(sort: Desc)], 
          map: "idx_tasks_project_analytics", 
          where: { projectId: { not: null }, deletedAt: null })
  
  // Covering index for dashboard queries
  @@index([userId, status, priority], 
          map: "idx_tasks_dashboard_covering")
  
  // Performance index for time-based analytics
  @@index([userId, dueDate, status], 
          map: "idx_tasks_due_date_analytics", 
          where: { dueDate: { not: null }, deletedAt: null })
  
  // Efficiency tracking index
  @@index([userId, estimatedMinutes, actualMinutes, status], 
          map: "idx_tasks_efficiency_analytics", 
          where: { estimatedMinutes: { not: null }, actualMinutes: { not: null } })
  
  @@map("tasks")
}

model Habit {
  id              String         @id @default(cuid())
  userId          String
  categoryId      String?
  name            String
  description     String?
  frequency       HabitFrequency
  targetValue     Int            @default(1)
  currentStreak   Int            @default(0)
  bestStreak      Int            @default(0)
  completionRate  Float          @default(0)
  isActive        Boolean        @default(true)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  deletedAt       DateTime?
  
  // Relationships
  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  category        HabitCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  entries         HabitEntry[]
  
  // Analytics-optimized indexes
  @@index([userId, isActive, frequency], 
          map: "idx_habits_user_active", 
          where: { deletedAt: null })
  
  @@index([userId, categoryId, frequency, isActive], 
          map: "idx_habits_category_frequency", 
          where: { deletedAt: null })
  
  // Covering index for habit summary queries
  @@index([userId, isActive], 
          map: "idx_habits_summary_covering", 
          where: { deletedAt: null })
  
  // Streak analytics index
  @@index([userId, currentStreak(sort: Desc), bestStreak(sort: Desc)], 
          map: "idx_habits_streak_analytics", 
          where: { isActive: true, deletedAt: null })
  
  @@map("habits")
}

model HabitEntry {
  id        String   @id @default(cuid())
  habitId   String
  userId    String   // Denormalized for performance
  date      String   @db.VarChar(10) // YYYY-MM-DD format for efficient range queries
  completed Boolean  @default(false)
  value     Int?
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relationships
  habit     Habit    @relation(fields: [habitId], references: [id], onDelete: Cascade)
  
  // Analytics-optimized indexes
  @@index([habitId, date(sort: Desc), completed], 
          map: "idx_habit_entries_analytics_primary")
  
  @@index([userId, date(sort: Desc), completed, value], 
          map: "idx_habit_entries_user_date")
  
  @@index([habitId, date(sort: Asc), completed], 
          map: "idx_habit_entries_streak_calc")
  
  // Heatmap visualization index
  @@index([habitId, completed, date], 
          map: "idx_habit_entries_heatmap", 
          where: { completed: true })
  
  // Time-range analytics index
  @@index([userId, date, completed], 
          map: "idx_habit_entries_time_range")
  
  // Weekly/monthly aggregation index
  @@index([habitId, date, value], 
          map: "idx_habit_entries_aggregation", 
          where: { completed: true })
  
  @@unique([habitId, date])
  @@map("habit_entries")
}

model DailyMetrics {
  id                String   @id @default(cuid())
  userId            String
  date              DateTime @db.Date
  productivityScore Float
  focusHours        Float
  tasksCompleted    Int      @default(0)
  habitsCompleted   Int      @default(0)
  workSessions      Int      @default(0)
  breaksTaken       Int      @default(0)
  energyLevel       Int      @default(5) // 1-10 scale
  moodRating        Int      @default(5) // 1-10 scale
  notes             String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Analytics-optimized indexes
  @@index([userId, date(sort: Desc)], 
          map: "idx_daily_metrics_user_time")
  
  @@index([userId, date, productivityScore, focusHours], 
          map: "idx_daily_metrics_analytics")
  
  // Covering index for dashboard metrics
  @@index([userId, date], 
          map: "idx_daily_metrics_covering")
  
  // Trend analysis indexes
  @@index([userId, productivityScore, date], 
          map: "idx_daily_metrics_productivity_trend")
  
  @@index([userId, focusHours, date], 
          map: "idx_daily_metrics_focus_trend")
  
  // Correlation analysis indexes
  @@index([userId, energyLevel, productivityScore], 
          map: "idx_daily_metrics_energy_correlation")
  
  @@index([userId, moodRating, productivityScore], 
          map: "idx_daily_metrics_mood_correlation")
  
  @@unique([userId, date])
  @@map("daily_metrics")
}

model Project {
  id          String    @id @default(cuid())
  userId      String
  name        String
  description String?
  color       String    @default("#6366f1")
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  
  // Relationships
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks       Task[]
  
  // Analytics-optimized indexes
  @@index([userId, isActive], 
          map: "idx_projects_user_active", 
          where: { deletedAt: null })
  
  @@index([userId, createdAt(sort: Desc)], 
          map: "idx_projects_user_created", 
          where: { deletedAt: null })
  
  @@map("projects")
}

model HabitCategory {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String?
  color       String   @default("#6366f1")
  icon        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relationships
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  habits      Habit[]
  
  // Analytics indexes
  @@index([userId, name], map: "idx_habit_categories_user_name")
  
  @@map("habit_categories")
}

// Enums
enum TaskStatus {
  TODO
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum Priority {
  URGENT
  HIGH
  MEDIUM
  LOW
}

enum HabitFrequency {
  DAILY
  WEEKLY
  MONTHLY
}
```

## Database Views for Analytics Performance

### Materialized Views for Complex Analytics

```sql
-- Materialized view for user productivity summary
CREATE MATERIALIZED VIEW user_productivity_summary_mv AS
SELECT 
    u.id as user_id,
    u.email,
    DATE_TRUNC('week', dm.date) as week_start,
    AVG(dm.productivity_score) as avg_productivity,
    SUM(dm.focus_hours) as total_focus,
    COUNT(t.id) FILTER (WHERE t.status = 'COMPLETED') as completed_tasks,
    COUNT(he.id) FILTER (WHERE he.completed = true) as completed_habits,
    STDDEV(dm.productivity_score) as productivity_variance,
    MAX(dm.date) as latest_metric_date
FROM users u
LEFT JOIN daily_metrics dm ON u.id = dm.user_id
LEFT JOIN tasks t ON u.id = t.user_id AND DATE(t.completed_at) = dm.date
LEFT JOIN habits h ON u.id = h.user_id AND h.is_active = true
LEFT JOIN habit_entries he ON h.id = he.habit_id AND he.date::date = dm.date
WHERE dm.date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY u.id, u.email, DATE_TRUNC('week', dm.date)
ORDER BY week_start DESC;

-- Unique index for efficient refreshing
CREATE UNIQUE INDEX idx_user_productivity_summary_mv_unique 
ON user_productivity_summary_mv (user_id, week_start);

-- Additional indexes for query performance
CREATE INDEX idx_user_productivity_summary_mv_productivity 
ON user_productivity_summary_mv (user_id, avg_productivity DESC);

CREATE INDEX idx_user_productivity_summary_mv_recent 
ON user_productivity_summary_mv (user_id, latest_metric_date DESC);

-- Habit analytics materialized view
CREATE MATERIALIZED VIEW habit_analytics_mv AS
SELECT 
    h.id as habit_id,
    h.user_id,
    h.name as habit_name,
    h.frequency,
    h.category_id,
    COUNT(he.id) as total_entries,
    COUNT(he.id) FILTER (WHERE he.completed = true) as completed_entries,
    ROUND(
        100.0 * COUNT(he.id) FILTER (WHERE he.completed = true) / 
        NULLIF(COUNT(he.id), 0), 2
    ) as completion_rate,
    MAX(he.date) as last_entry_date,
    MIN(he.date) as first_entry_date,
    AVG(he.value) FILTER (WHERE he.completed = true) as avg_value,
    EXTRACT(DAYS FROM (MAX(he.date::date) - MIN(he.date::date))) + 1 as tracking_days
FROM habits h
LEFT JOIN habit_entries he ON h.id = he.habit_id
WHERE h.deleted_at IS NULL
    AND h.is_active = true
    AND (he.date IS NULL OR he.date >= (CURRENT_DATE - INTERVAL '90 days')::text)
GROUP BY h.id, h.user_id, h.name, h.frequency, h.category_id;

-- Unique index for habit analytics
CREATE UNIQUE INDEX idx_habit_analytics_mv_unique 
ON habit_analytics_mv (habit_id);

-- Performance indexes for habit analytics
CREATE INDEX idx_habit_analytics_mv_user_completion 
ON habit_analytics_mv (user_id, completion_rate DESC);

CREATE INDEX idx_habit_analytics_mv_category 
ON habit_analytics_mv (category_id, completion_rate DESC);

-- Task analytics materialized view
CREATE MATERIALIZED VIEW task_analytics_mv AS
SELECT 
    t.user_id,
    t.project_id,
    DATE_TRUNC('week', t.created_at) as week_start,
    t.priority,
    t.status,
    COUNT(*) as task_count,
    AVG(t.actual_minutes) as avg_duration,
    SUM(t.actual_minutes) as total_duration,
    AVG(
        CASE 
            WHEN t.estimated_minutes > 0 AND t.actual_minutes > 0 
            THEN t.actual_minutes::float / t.estimated_minutes 
            ELSE NULL 
        END
    ) as avg_efficiency_ratio,
    COUNT(CASE WHEN t.due_date < t.completed_at THEN 1 END) as overdue_count
FROM tasks t
WHERE t.deleted_at IS NULL
    AND t.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY t.user_id, t.project_id, DATE_TRUNC('week', t.created_at), t.priority, t.status;

-- Indexes for task analytics
CREATE INDEX idx_task_analytics_mv_user_week 
ON task_analytics_mv (user_id, week_start DESC);

CREATE INDEX idx_task_analytics_mv_project_performance 
ON task_analytics_mv (project_id, avg_efficiency_ratio DESC)
WHERE project_id IS NOT NULL;
```

## Advanced Database Functions for Analytics

### Streak Calculation Function

```sql
-- Optimized streak calculation function
CREATE OR REPLACE FUNCTION calculate_habit_streak(
    p_habit_id text,
    p_as_of_date date DEFAULT CURRENT_DATE
) RETURNS json AS $$
DECLARE
    result json;
BEGIN
    WITH streak_data AS (
        SELECT 
            date::date,
            completed,
            -- Create groups for consecutive streaks
            date::date - (ROW_NUMBER() OVER (
                PARTITION BY completed 
                ORDER BY date::date
            ))::integer * INTERVAL '1 day' as streak_group
        FROM habit_entries 
        WHERE habit_id = p_habit_id 
            AND date::date <= p_as_of_date
            AND date::date >= p_as_of_date - INTERVAL '365 days'
        ORDER BY date::date DESC
    ),
    streak_lengths AS (
        SELECT 
            completed,
            streak_group,
            COUNT(*) as streak_length,
            MAX(date) as streak_end_date,
            MIN(date) as streak_start_date
        FROM streak_data 
        WHERE completed = true
        GROUP BY completed, streak_group
    ),
    current_streak AS (
        SELECT 
            COALESCE(
                MAX(streak_length) FILTER (
                    WHERE streak_end_date >= p_as_of_date - INTERVAL '1 day'
                ), 0
            ) as current_streak_length
        FROM streak_lengths
    ),
    best_streak AS (
        SELECT COALESCE(MAX(streak_length), 0) as best_streak_length
        FROM streak_lengths
    )
    SELECT json_build_object(
        'current_streak', cs.current_streak_length,
        'best_streak', bs.best_streak_length,
        'calculation_date', p_as_of_date
    ) INTO result
    FROM current_streak cs
    CROSS JOIN best_streak bs;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Batch streak calculation for all user habits
CREATE OR REPLACE FUNCTION calculate_user_habit_streaks(
    p_user_id text,
    p_as_of_date date DEFAULT CURRENT_DATE
) RETURNS TABLE(
    habit_id text,
    habit_name text,
    current_streak integer,
    best_streak integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.name,
        (calculate_habit_streak(h.id, p_as_of_date)->>'current_streak')::integer,
        (calculate_habit_streak(h.id, p_as_of_date)->>'best_streak')::integer
    FROM habits h
    WHERE h.user_id = p_user_id 
        AND h.is_active = true 
        AND h.deleted_at IS NULL
    ORDER BY h.name;
END;
$$ LANGUAGE plpgsql STABLE;
```

### Productivity Analytics Functions

```sql
-- Function to calculate productivity trends
CREATE OR REPLACE FUNCTION calculate_productivity_trends(
    p_user_id text,
    p_days integer DEFAULT 30
) RETURNS json AS $$
DECLARE
    trend_data json;
BEGIN
    WITH daily_scores AS (
        SELECT 
            date,
            productivity_score,
            LAG(productivity_score, 1) OVER (ORDER BY date) as prev_day_score,
            LAG(productivity_score, 7) OVER (ORDER BY date) as week_ago_score,
            AVG(productivity_score) OVER (
                ORDER BY date 
                ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
            ) as seven_day_avg
        FROM daily_metrics
        WHERE user_id = p_user_id
            AND date >= CURRENT_DATE - INTERVAL '%s days'
        ORDER BY date DESC
    ),
    trend_analysis AS (
        SELECT 
            COUNT(*) as total_days,
            AVG(productivity_score) as avg_score,
            STDDEV(productivity_score) as score_stddev,
            MIN(productivity_score) as min_score,
            MAX(productivity_score) as max_score,
            CORR(EXTRACT(epoch FROM date)::numeric, productivity_score) as time_correlation,
            COUNT(CASE WHEN productivity_score > prev_day_score THEN 1 END) as improving_days,
            COUNT(CASE WHEN productivity_score < prev_day_score THEN 1 END) as declining_days
        FROM daily_scores
        WHERE prev_day_score IS NOT NULL
    )
    SELECT json_build_object(
        'avg_score', ROUND(ta.avg_score::numeric, 2),
        'volatility', ROUND(ta.score_stddev::numeric, 2),
        'trend_direction', 
            CASE 
                WHEN ta.time_correlation > 0.3 THEN 'IMPROVING'
                WHEN ta.time_correlation < -0.3 THEN 'DECLINING'
                ELSE 'STABLE'
            END,
        'consistency', 
            CASE 
                WHEN ta.score_stddev < 1.0 THEN 'HIGH'
                WHEN ta.score_stddev < 2.0 THEN 'MEDIUM'
                ELSE 'LOW'
            END,
        'improvement_ratio', 
            ROUND(ta.improving_days::numeric / (ta.improving_days + ta.declining_days), 2),
        'total_days_analyzed', ta.total_days,
        'score_range', json_build_object(
            'min', ta.min_score,
            'max', ta.max_score
        )
    ) INTO trend_data
    FROM trend_analysis ta;
    
    RETURN trend_data;
END;
$$ LANGUAGE plpgsql STABLE;
```

## Automated Maintenance and Monitoring

### Maintenance Schedule

```sql
-- Schedule materialized view refreshes
SELECT cron.schedule(
    'refresh-productivity-summary-mv',
    '0 */6 * * *', -- Every 6 hours
    'REFRESH MATERIALIZED VIEW CONCURRENTLY user_productivity_summary_mv;'
);

SELECT cron.schedule(
    'refresh-habit-analytics-mv',
    '15 */6 * * *', -- Every 6 hours, offset by 15 minutes
    'REFRESH MATERIALIZED VIEW CONCURRENTLY habit_analytics_mv;'
);

SELECT cron.schedule(
    'refresh-task-analytics-mv',
    '30 */6 * * *', -- Every 6 hours, offset by 30 minutes
    'REFRESH MATERIALIZED VIEW CONCURRENTLY task_analytics_mv;'
);

-- Schedule statistics updates
SELECT cron.schedule(
    'update-analytics-stats',
    '0 2 * * *', -- Daily at 2 AM
    'SELECT * FROM auto_analyze_analytics_tables();'
);

-- Schedule index maintenance
SELECT cron.schedule(
    'analytics-index-maintenance',
    '0 3 * * 0', -- Weekly on Sunday at 3 AM
    'SELECT * FROM auto_maintenance_analytics_tables();'
);
```

## Performance Testing Queries

### Benchmark Query Set

```sql
-- Test query performance for common analytics operations

-- Dashboard overview query benchmark
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN status = 'TODO' THEN 1 END) as pending_tasks,
    AVG(actual_minutes) as avg_task_duration
FROM tasks 
WHERE user_id = 'test_user_id' 
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND deleted_at IS NULL;

-- Habit completion rate benchmark
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    h.name,
    COUNT(he.id) as total_entries,
    COUNT(he.id) FILTER (WHERE he.completed = true) as completed_entries,
    ROUND(100.0 * COUNT(he.id) FILTER (WHERE he.completed = true) / COUNT(he.id), 2) as completion_rate
FROM habits h
LEFT JOIN habit_entries he ON h.id = he.habit_id 
    AND he.date >= (CURRENT_DATE - INTERVAL '30 days')::text
WHERE h.user_id = 'test_user_id' 
    AND h.is_active = true
    AND h.deleted_at IS NULL
GROUP BY h.id, h.name;

-- Time series data benchmark
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    date,
    productivity_score,
    focus_hours,
    tasks_completed,
    habits_completed
FROM daily_metrics 
WHERE user_id = 'test_user_id'
    AND date BETWEEN '2024-01-01' AND '2024-12-31'
ORDER BY date ASC;
```

This comprehensive Prisma schema optimization provides the foundation for high-performance analytics queries while maintaining data integrity and supporting complex analytical workloads.