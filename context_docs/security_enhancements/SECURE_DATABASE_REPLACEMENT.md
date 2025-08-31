# SECURE Database Query Replacement

**CRITICAL SQL INJECTION FIX**: Replace vulnerable raw SQL in `/context_docs/phase1/05_core_api_data_management.md`

## VULNERABLE CODE TO REMOVE (lines 2849-2883):

```typescript
// REMOVE THIS VULNERABLE CODE:
export const queryHints = {
  // Use raw queries for complex aggregations
  getTaskMetrics: async (userId: string) => {
    return await prisma.$queryRaw<Array<{
      status: string
      priority: string
      count: bigint
      totalEstimated: bigint | null
      totalActual: bigint | null
    }>>`
      SELECT 
        status,
        priority,
        COUNT(*) as count,
        SUM(estimated_minutes) as totalEstimated,
        SUM(actual_minutes) as totalActual
      FROM tasks 
      WHERE user_id = ${userId}  // SQL INJECTION VULNERABILITY
        AND deleted_at IS NULL
      GROUP BY status, priority
      ORDER BY 
        CASE priority 
          WHEN 'URGENT' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          WHEN 'LOW' THEN 4 
        END,
        CASE status 
          WHEN 'TODO' THEN 1 
          WHEN 'IN_PROGRESS' THEN 2 
          WHEN 'COMPLETED' THEN 3 
          WHEN 'ON_HOLD' THEN 4 
          WHEN 'CANCELLED' THEN 5 
        END
    `
  },
```

## SECURE REPLACEMENT CODE:

```typescript
// SECURITY FIXED - REPLACE WITH THIS:
export const secureQueryHints = {
  // SECURITY FIX: Use type-safe Prisma groupBy instead of raw SQL
  getTaskMetrics: async (userId: string) => {
    try {
      // SECURITY: Input validation
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid user ID')
      }
      
      // SECURITY: Validate UUID format
      if (!DatabaseSanitizer.validateUUID(userId)) {
        throw new Error('Invalid user ID format')
      }
      
      const metrics = await prisma.task.groupBy({
        by: ['status', 'priority'],
        where: {
          userId: userId, // SECURE: Prisma handles parameterization
          deletedAt: null
        },
        _count: {
          id: true
        },
        _sum: {
          estimatedMinutes: true,
          actualMinutes: true
        }
      })

      // Apply custom sorting logic securely
      const priorityOrder: Record<string, number> = { 'URGENT': 1, 'HIGH': 2, 'MEDIUM': 3, 'LOW': 4 }
      const statusOrder: Record<string, number> = { 'TODO': 1, 'IN_PROGRESS': 2, 'COMPLETED': 3, 'ON_HOLD': 4, 'CANCELLED': 5 }

      return metrics
        .sort((a, b) => {
          const priorityDiff = (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999)
          if (priorityDiff !== 0) return priorityDiff
          return (statusOrder[a.status] || 999) - (statusOrder[b.status] || 999)
        })
        .map(metric => ({
          status: metric.status,
          priority: metric.priority,
          count: Number(metric._count.id), // Safe BigInt conversion
          totalEstimated: Number(metric._sum.estimatedMinutes || 0),
          totalActual: Number(metric._sum.actualMinutes || 0)
        }))
    } catch (error) {
      logger.error('Failed to get task metrics', { error, userId })
      throw new Error('Failed to retrieve task metrics')
    }
  },

  // SECURITY FIX: Additional secure queries
  getTaskAnalytics: async (userId: string, dateRange: { start: Date; end: Date }) => {
    try {
      if (!DatabaseSanitizer.validateUUID(userId)) {
        throw new Error('Invalid user ID format')
      }
      
      const [completedTasks, pendingTasks, overdueTasksCount] = await Promise.all([
        // Completed tasks analytics
        prisma.task.aggregate({
          where: {
            userId: userId,
            status: 'COMPLETED',
            completedAt: {
              gte: dateRange.start,
              lte: dateRange.end
            },
            deletedAt: null
          },
          _count: { id: true },
          _sum: { actualMinutes: true, estimatedMinutes: true },
          _avg: { actualMinutes: true }
        }),
        
        // Pending tasks count
        prisma.task.count({
          where: {
            userId: userId,
            status: { in: ['TODO', 'IN_PROGRESS'] },
            deletedAt: null
          }
        }),
        
        // Overdue tasks
        prisma.task.count({
          where: {
            userId: userId,
            status: { not: 'COMPLETED' },
            dueDate: { lt: new Date() },
            deletedAt: null
          }
        })
      ])

      return {
        completedCount: completedTasks._count.id,
        pendingCount: pendingTasks,
        overdueCount: overdueTasksCount,
        totalMinutesSpent: Number(completedTasks._sum.actualMinutes || 0),
        totalMinutesEstimated: Number(completedTasks._sum.estimatedMinutes || 0),
        averageMinutesPerTask: Number(completedTasks._avg.actualMinutes || 0)
      }
    } catch (error) {
      logger.error('Failed to get task analytics', { error, userId })
      throw new Error('Failed to retrieve analytics')
    }
  }
}

// SECURITY FIX: Input sanitization utility
export class DatabaseSanitizer {
  static validateUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return typeof uuid === 'string' && uuidRegex.test(uuid)
  }

  static sanitizeSearchQuery(query: string): string {
    if (typeof query !== 'string') {
      throw new Error('Search query must be a string')
    }
    
    return query
      .trim()
      .replace(/[%_\\]/g, '\\$&') // Escape SQL wildcards
      .replace(/[<>'"]/g, '') // Remove injection vectors
      .substring(0, 100) // Limit length
  }

  static sanitizeStringArray(arr: unknown): string[] {
    if (!Array.isArray(arr)) {
      throw new Error('Expected array input')
    }
    
    return arr
      .filter(item => typeof item === 'string')
      .map(item => item.trim().substring(0, 50))
      .slice(0, 100)
  }
}
```

## VULNERABLE CODE TO REMOVE (lines 2315-2321):

```typescript
// REMOVE THIS VULNERABLE CODE:
await tx.$executeRaw`
  INSERT INTO activity_log (user_id, action, resource_type, resource_ids, metadata)
  VALUES (${userId}, 'MOVE_TASKS', 'Task', ${JSON.stringify(taskIds)}, ${JSON.stringify({
    targetProjectId,
    count: updateResult.count
  })})
`
```

## SECURE REPLACEMENT:

```typescript
// SECURITY FIXED - REPLACE WITH THIS:
// Log the move operation using Prisma model
await tx.activityLog.create({
  data: {
    userId: userId, // SECURE: Prisma parameterization
    action: 'MOVE_TASKS',
    resourceType: 'Task',
    resourceIds: DatabaseSanitizer.sanitizeStringArray(taskIds),
    metadata: DatabaseSanitizer.sanitizeMetadata({
      targetProjectId,
      count: updateResult.count,
      timestamp: new Date().toISOString()
    }),
    timestamp: new Date()
  }
})
```

## PRISMA SCHEMA UPDATE REQUIRED:

Add this to your Prisma schema:

```prisma
model ActivityLog {
  id           String   @id @default(cuid())
  userId       String
  action       String
  resourceType String
  resourceIds  String[] 
  metadata     Json?    
  timestamp    DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([timestamp])
  @@index([action])
  @@map("activity_log")
}

// Add to User model:
model User {
  // ... existing fields ...
  activityLogs ActivityLog[]
  // ... rest of model ...
}
```

## IMMEDIATE ACTIONS:

1. ⚠️  **Replace vulnerable session config** (lines 179-187)
2. ⚠️  **Add secure cookie configuration** 
3. ⚠️  **Replace raw SQL queries** (lines 2849-2883 and 2315-2321)
4. ⚠️  **Add database sanitization utility**
5. ⚠️  **Update Prisma schema** with ActivityLog model

**CRITICAL**: These fixes must be applied before any code implementation to prevent SQL injection and XSS vulnerabilities.