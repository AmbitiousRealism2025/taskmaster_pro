/**
 * TaskMaster Pro - Row-Level Security Management
 * 
 * Utilities for managing and validating RLS policies in Supabase
 * Provides programmatic access to RLS policy management and testing
 */

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Types for RLS policy management
interface RLSPolicy {
  id: string
  table_name: string
  policy_name: string
  permissive: 'PERMISSIVE' | 'RESTRICTIVE'
  roles: string[]
  cmd: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL'
  qual: string | null
  with_check: string | null
}

interface RLSTestResult {
  table: string
  policy: string
  passed: boolean
  error?: string
  rowCount?: number
  expectedRowCount?: number
}

interface SecurityValidation {
  userId: string
  tests: RLSTestResult[]
  overallPassed: boolean
  timestamp: string
}

/**
 * RLS Management Class
 * Provides utilities for managing Row-Level Security policies
 */
export class RLSManager {
  private serviceClient: ReturnType<typeof createClient>
  
  constructor() {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for RLS management')
    }
    
    // Create service role client for admin operations
    this.serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }

  /**
   * Apply RLS policies from SQL file
   */
  async applyRLSPolicies(): Promise<void> {
    try {
      const { error } = await this.serviceClient.rpc('exec_sql', {
        sql: this.getRLSPoliciesSQL()
      })
      
      if (error) {
        throw new Error(`Failed to apply RLS policies: ${error.message}`)
      }
      
      console.log('RLS policies applied successfully')
    } catch (error) {
      console.error('Error applying RLS policies:', error)
      throw error
    }
  }

  /**
   * List all RLS policies in the database
   */
  async listPolicies(): Promise<RLSPolicy[]> {
    try {
      const { data, error } = await this.serviceClient
        .from('pg_policies')
        .select('*')
        .order('schemaname', { ascending: true })
        .order('tablename', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error listing RLS policies:', error)
      throw error
    }
  }

  /**
   * Validate RLS policies for a specific user
   */
  async validateUserIsolation(userId: string): Promise<SecurityValidation> {
    const tests: RLSTestResult[] = []
    
    // Create user-specific client
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // Simulate user session
    await userClient.auth.signInWithPassword({
      email: `test-${userId}@example.com`,
      password: 'test-password'
    })

    try {
      // Test 1: User can only see their own projects
      const projectsTest = await this.testTableAccess(
        userClient,
        'projects',
        'user_id',
        userId,
        'projects_owner_access'
      )
      tests.push(projectsTest)

      // Test 2: User can only see tasks from their projects  
      const tasksTest = await this.testTaskAccess(userClient, userId)
      tests.push(tasksTest)

      // Test 3: User can only see their own notes
      const notesTest = await this.testTableAccess(
        userClient,
        'notes',
        'user_id',
        userId,
        'notes_owner_access'
      )
      tests.push(notesTest)

      // Test 4: User can only see their own habits
      const habitsTest = await this.testTableAccess(
        userClient,
        'habits',
        'user_id',
        userId,
        'habits_owner_access'
      )
      tests.push(habitsTest)

      // Test 5: User can only see their own focus sessions
      const focusTest = await this.testTableAccess(
        userClient,
        'focus_sessions',
        'user_id',
        userId,
        'focus_sessions_owner_access'
      )
      tests.push(focusTest)

    } catch (error) {
      console.error('Error during RLS validation:', error)
      tests.push({
        table: 'validation',
        policy: 'general',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    const overallPassed = tests.every(test => test.passed)

    return {
      userId,
      tests,
      overallPassed,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Test cross-user access (should fail)
   */
  async testCrossUserAccess(user1Id: string, user2Id: string): Promise<RLSTestResult[]> {
    const tests: RLSTestResult[] = []
    
    // Create client for user1
    const user1Client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    await user1Client.auth.signInWithPassword({
      email: `test-${user1Id}@example.com`,
      password: 'test-password'
    })

    try {
      // User 1 should not see User 2's projects
      const { data: crossProjects, error } = await user1Client
        .from('projects')
        .select('*')
        .eq('user_id', user2Id)

      tests.push({
        table: 'projects',
        policy: 'cross_user_isolation',
        passed: !error && (crossProjects?.length === 0),
        rowCount: crossProjects?.length || 0,
        expectedRowCount: 0
      })

      // User 1 should not see User 2's notes
      const { data: crossNotes } = await user1Client
        .from('notes')
        .select('*')
        .eq('user_id', user2Id)

      tests.push({
        table: 'notes',
        policy: 'cross_user_isolation',
        passed: crossNotes?.length === 0,
        rowCount: crossNotes?.length || 0,
        expectedRowCount: 0
      })

    } catch (error) {
      tests.push({
        table: 'cross_access',
        policy: 'isolation_test',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return tests
  }

  /**
   * Monitor RLS policy performance
   */
  async monitorRLSPerformance(): Promise<{
    slowQueries: Array<{ query: string; duration: number }>
    policyUsage: Array<{ policy: string; usage_count: number }>
  }> {
    try {
      // Query slow queries related to RLS
      const { data: slowQueries } = await this.serviceClient
        .from('pg_stat_statements')
        .select('query, mean_exec_time, calls')
        .gt('mean_exec_time', 1000) // Queries slower than 1s
        .ilike('query', '%policy%')
        .order('mean_exec_time', { ascending: false })
        .limit(10)

      // Get policy usage statistics
      const { data: policyStats } = await this.serviceClient
        .from('pg_stat_user_tables')
        .select('relname, n_tup_ins, n_tup_upd, n_tup_del')
        .order('n_tup_ins', { ascending: false })

      return {
        slowQueries: slowQueries?.map(q => ({
          query: q.query,
          duration: q.mean_exec_time
        })) || [],
        policyUsage: policyStats?.map(p => ({
          policy: p.relname,
          usage_count: p.n_tup_ins + p.n_tup_upd + p.n_tup_del
        })) || []
      }
    } catch (error) {
      console.error('Error monitoring RLS performance:', error)
      return { slowQueries: [], policyUsage: [] }
    }
  }

  /**
   * Create emergency bypass for RLS (USE WITH EXTREME CAUTION)
   */
  async createEmergencyBypass(table: string, reason: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Emergency bypass not allowed in production')
    }

    console.warn(`SECURITY WARNING: Creating emergency RLS bypass for ${table}. Reason: ${reason}`)
    
    try {
      const { error } = await this.serviceClient.rpc('exec_sql', {
        sql: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
      })
      
      if (error) throw error
      
      // Log the bypass
      await this.logSecurityEvent('RLS_BYPASS_CREATED', {
        table,
        reason,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error creating emergency bypass:', error)
      throw error
    }
  }

  /**
   * Helper method to test table access
   */
  private async testTableAccess(
    client: ReturnType<typeof createClient>,
    table: string,
    userColumn: string,
    userId: string,
    policyName: string
  ): Promise<RLSTestResult> {
    try {
      const { data, error } = await client
        .from(table)
        .select('*')
        .limit(100)

      if (error) {
        return {
          table,
          policy: policyName,
          passed: false,
          error: error.message
        }
      }

      // All returned rows should belong to the user
      const invalidRows = data?.filter(row => row[userColumn] !== userId) || []
      
      return {
        table,
        policy: policyName,
        passed: invalidRows.length === 0,
        rowCount: data?.length || 0,
        error: invalidRows.length > 0 ? 
          `Found ${invalidRows.length} rows not belonging to user` : undefined
      }
    } catch (error) {
      return {
        table,
        policy: policyName,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Helper method to test task access (more complex due to project relationship)
   */
  private async testTaskAccess(
    client: ReturnType<typeof createClient>,
    userId: string
  ): Promise<RLSTestResult> {
    try {
      // Get user's tasks
      const { data: tasks, error } = await client
        .from('tasks')
        .select('*, projects(*)')
        .limit(100)

      if (error) {
        return {
          table: 'tasks',
          policy: 'tasks_project_owner_access',
          passed: false,
          error: error.message
        }
      }

      // All returned tasks should belong to projects owned by the user
      const invalidTasks = tasks?.filter(task => 
        task.projects && task.projects.user_id !== userId
      ) || []
      
      return {
        table: 'tasks',
        policy: 'tasks_project_owner_access',
        passed: invalidTasks.length === 0,
        rowCount: tasks?.length || 0,
        error: invalidTasks.length > 0 ? 
          `Found ${invalidTasks.length} tasks from other users' projects` : undefined
      }
    } catch (error) {
      return {
        table: 'tasks',
        policy: 'tasks_project_owner_access',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Log security events for audit trail
   */
  private async logSecurityEvent(event: string, details: Record<string, any>): Promise<void> {
    try {
      await this.serviceClient
        .from('audit_log')
        .insert({
          user_id: 'system',
          table_name: 'security_events',
          operation: event,
          record_id: 'security',
          new_data: details,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error logging security event:', error)
    }
  }

  /**
   * Get RLS policies SQL (would be loaded from file in real implementation)
   */
  private getRLSPoliciesSQL(): string {
    // In production, this would load from the actual SQL file
    // For now, return a placeholder
    return `-- RLS policies would be loaded from rls-policies.sql file`
  }
}

/**
 * Create server-side RLS manager
 */
export function createRLSManager(): RLSManager {
  return new RLSManager()
}

/**
 * Validate RLS for current user (server-side)
 */
export async function validateCurrentUserRLS(): Promise<SecurityValidation | null> {
  try {
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    const rlsManager = new RLSManager()
    return await rlsManager.validateUserIsolation(user.id)
  } catch (error) {
    console.error('Error validating current user RLS:', error)
    return null
  }
}

/**
 * Client-side RLS validation hook
 */
export function useRLSValidation() {
  const validateRLS = async (): Promise<SecurityValidation | null> => {
    try {
      const response = await fetch('/api/security/validate-rls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) throw new Error('RLS validation failed')
      
      return await response.json()
    } catch (error) {
      console.error('RLS validation error:', error)
      return null
    }
  }

  return { validateRLS }
}