-- ========================================
-- TaskMaster Pro - Row-Level Security Policies
-- ========================================
-- Comprehensive RLS implementation for multi-tenant security
-- All policies enforce strict user isolation and data protection

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- USERS TABLE POLICIES
-- ========================================

-- Users can only access their own user record
CREATE POLICY "users_own_record_access" ON users
  FOR ALL USING (auth.uid()::text = id);

-- Allow users to update their own profile
CREATE POLICY "users_own_profile_update" ON users  
  FOR UPDATE USING (auth.uid()::text = id);

-- Allow user registration (insert their own record)
CREATE POLICY "users_registration_insert" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id);

-- ========================================
-- ACCOUNTS TABLE POLICIES (NextAuth)
-- ========================================

-- Users can only access their own OAuth accounts
CREATE POLICY "accounts_user_isolation" ON accounts
  FOR ALL USING (auth.uid()::text = "userId");

-- Allow account creation during OAuth flow
CREATE POLICY "accounts_oauth_creation" ON accounts
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- ========================================
-- SESSIONS TABLE POLICIES (NextAuth)
-- ========================================

-- Users can only access their own sessions
CREATE POLICY "sessions_user_isolation" ON sessions
  FOR ALL USING (auth.uid()::text = "userId");

-- Allow session creation during authentication
CREATE POLICY "sessions_auth_creation" ON sessions
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- ========================================
-- PROJECTS TABLE POLICIES
-- ========================================

-- Users can only access projects they own
CREATE POLICY "projects_owner_access" ON projects
  FOR ALL USING (auth.uid()::text = user_id);

-- Users can create projects (assigned to themselves)
CREATE POLICY "projects_owner_creation" ON projects
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own projects
CREATE POLICY "projects_owner_modification" ON projects
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Users can delete their own projects
CREATE POLICY "projects_owner_deletion" ON projects
  FOR DELETE USING (auth.uid()::text = user_id);

-- ========================================
-- TASKS TABLE POLICIES
-- ========================================

-- Users can only access tasks from their own projects
CREATE POLICY "tasks_project_owner_access" ON tasks
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
  );

-- Users can create tasks in their own projects
CREATE POLICY "tasks_project_owner_creation" ON tasks
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
  );

-- Users can update tasks in their own projects
CREATE POLICY "tasks_project_owner_modification" ON tasks
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
  );

-- Users can delete tasks from their own projects
CREATE POLICY "tasks_project_owner_deletion" ON tasks
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
  );

-- ========================================
-- NOTES TABLE POLICIES
-- ========================================

-- Users can only access their own notes
CREATE POLICY "notes_owner_access" ON notes
  FOR ALL USING (auth.uid()::text = user_id);

-- Users can create their own notes
CREATE POLICY "notes_owner_creation" ON notes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own notes
CREATE POLICY "notes_owner_modification" ON notes
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Users can delete their own notes
CREATE POLICY "notes_owner_deletion" ON notes
  FOR DELETE USING (auth.uid()::text = user_id);

-- ========================================
-- HABITS TABLE POLICIES
-- ========================================

-- Users can only access their own habits
CREATE POLICY "habits_owner_access" ON habits
  FOR ALL USING (auth.uid()::text = user_id);

-- Users can create their own habits
CREATE POLICY "habits_owner_creation" ON habits
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own habits
CREATE POLICY "habits_owner_modification" ON habits
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Users can delete their own habits
CREATE POLICY "habits_owner_deletion" ON habits
  FOR DELETE USING (auth.uid()::text = user_id);

-- ========================================
-- FOCUS_SESSIONS TABLE POLICIES
-- ========================================

-- Users can only access their own focus sessions
CREATE POLICY "focus_sessions_owner_access" ON focus_sessions
  FOR ALL USING (auth.uid()::text = user_id);

-- Users can create their own focus sessions
CREATE POLICY "focus_sessions_owner_creation" ON focus_sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own focus sessions
CREATE POLICY "focus_sessions_owner_modification" ON focus_sessions
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Users can delete their own focus sessions
CREATE POLICY "focus_sessions_owner_deletion" ON focus_sessions
  FOR DELETE USING (auth.uid()::text = user_id);

-- ========================================
-- SERVICE ROLE POLICIES (Admin/System Operations)
-- ========================================

-- Create service role for admin operations
-- These policies allow the service role to bypass RLS for system operations
CREATE POLICY "service_role_full_access_users" ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_full_access_projects" ON projects
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_full_access_tasks" ON tasks
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_full_access_notes" ON notes
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_full_access_habits" ON habits
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_full_access_focus_sessions" ON focus_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- SECURITY FUNCTIONS
-- ========================================

-- Function to check if user owns a project
CREATE OR REPLACE FUNCTION user_owns_project(project_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects 
    WHERE id = project_uuid 
    AND user_id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access a task
CREATE OR REPLACE FUNCTION user_can_access_task(task_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_uuid 
    AND p.user_id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's project IDs (for performance optimization)
CREATE OR REPLACE FUNCTION user_project_ids()
RETURNS SETOF uuid AS $$
BEGIN
  RETURN QUERY 
    SELECT id FROM projects 
    WHERE user_id = auth.uid()::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- AUDIT & COMPLIANCE
-- ========================================

-- Create audit log table for security compliance
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text REFERENCES auth.users(id),
  table_name text NOT NULL,
  operation text NOT NULL, -- INSERT, UPDATE, DELETE
  record_id text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs
CREATE POLICY "audit_log_user_access" ON audit_log
  FOR SELECT USING (auth.uid()::text = user_id);

-- Only service role can insert audit logs
CREATE POLICY "audit_log_service_insert" ON audit_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ========================================
-- PERFORMANCE INDEXES FOR RLS
-- ========================================

-- Indexes to optimize RLS policy performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts("userId");
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions("userId");

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_priority ON tasks(project_id, priority);
CREATE INDEX IF NOT EXISTS idx_notes_user_folder ON notes(user_id, folder_id);

-- ========================================
-- TRIGGERS FOR AUDIT LOGGING
-- ========================================

-- Function to log changes for audit trail
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS trigger AS $$
BEGIN
  -- Only log for authenticated users, not service operations
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO audit_log (
      user_id,
      table_name,
      operation,
      record_id,
      old_data,
      new_data,
      ip_address,
      created_at
    ) VALUES (
      auth.uid()::text,
      TG_TABLE_NAME,
      TG_OP,
      COALESCE(NEW.id::text, OLD.id::text),
      CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
      inet_client_addr(),
      now()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for all tables
DROP TRIGGER IF EXISTS projects_audit_trigger ON projects;
CREATE TRIGGER projects_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS tasks_audit_trigger ON tasks;
CREATE TRIGGER tasks_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS notes_audit_trigger ON notes;
CREATE TRIGGER notes_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON notes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ========================================
-- SECURITY VALIDATION QUERIES
-- ========================================

-- Test queries to validate RLS policies work correctly
-- These should be run with different user contexts

/*
-- Test 1: Verify user isolation (run as different users)
SELECT count(*) FROM projects; -- Should only return current user's projects
SELECT count(*) FROM tasks;    -- Should only return tasks from user's projects

-- Test 2: Attempt cross-user access (should return empty)
SET auth.role = 'authenticated';
SET auth.user_id = 'user-1-id';
SELECT * FROM projects WHERE user_id = 'user-2-id'; -- Should return empty

-- Test 3: Service role access (should return all)
SET auth.role = 'service_role';
SELECT count(*) FROM projects; -- Should return all projects

-- Test 4: Performance test for RLS policies
EXPLAIN ANALYZE SELECT * FROM tasks WHERE status = 'TODO'; -- Check execution plan
*/

-- ========================================
-- CLEANUP & SECURITY NOTES
-- ========================================

-- Important: After running this script:
-- 1. Verify all policies work with application code
-- 2. Test multi-user scenarios thoroughly
-- 3. Monitor performance impact of RLS policies
-- 4. Set up monitoring for RLS policy violations
-- 5. Document emergency procedures for RLS issues
-- 6. Test service role access for admin operations
-- 7. Validate audit logging captures all required events

-- CRITICAL SECURITY REMINDERS:
-- - RLS policies must be tested with actual user sessions
-- - Service role key must be securely stored and rotated
-- - Audit logs should be backed up and monitored
-- - Performance impact should be continuously monitored
-- - All client-side code must handle RLS-filtered results gracefully