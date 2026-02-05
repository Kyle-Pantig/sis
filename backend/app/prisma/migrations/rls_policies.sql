-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- School Information System
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTION: Get current user's role
-- =============================================
-- This function should be called with the user_id from your JWT/session
-- You'll need to set the user context before queries: SET LOCAL app.current_user_id = 'uuid';

CREATE OR REPLACE FUNCTION get_current_user_id() 
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', true), '');
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_role() 
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM users 
  WHERE id = get_current_user_id();
  RETURN COALESCE(user_role, 'anonymous');
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'anonymous';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_encoder() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_role() = 'encoder';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_authenticated() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_id() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- USERS TABLE POLICIES
-- =============================================
-- Admins: Full access to all users
-- Encoders: Can only read their own profile

DROP POLICY IF EXISTS "users_admin_all" ON users;
CREATE POLICY "users_admin_all" ON users
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "users_self_read" ON users;
CREATE POLICY "users_self_read" ON users
  FOR SELECT
  USING (id = get_current_user_id());

DROP POLICY IF EXISTS "users_self_update" ON users;
CREATE POLICY "users_self_update" ON users
  FOR UPDATE
  USING (id = get_current_user_id())
  WITH CHECK (id = get_current_user_id());

-- =============================================
-- AUDIT_LOGS TABLE POLICIES
-- =============================================
-- Admins: Can read all audit logs
-- Encoders: Can only read their own audit logs
-- Insert: Authenticated users can insert their own logs

DROP POLICY IF EXISTS "audit_logs_admin_read" ON audit_logs;
CREATE POLICY "audit_logs_admin_read" ON audit_logs
  FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "audit_logs_self_read" ON audit_logs;
CREATE POLICY "audit_logs_self_read" ON audit_logs
  FOR SELECT
  USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT
  WITH CHECK (is_authenticated() AND user_id = get_current_user_id());

-- =============================================
-- COURSES TABLE POLICIES
-- =============================================
-- Admins: Full CRUD access
-- Encoders: Read-only access

DROP POLICY IF EXISTS "courses_authenticated_read" ON courses;
CREATE POLICY "courses_authenticated_read" ON courses
  FOR SELECT
  USING (is_authenticated());

DROP POLICY IF EXISTS "courses_admin_write" ON courses;
CREATE POLICY "courses_admin_write" ON courses
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================
-- STUDENTS TABLE POLICIES
-- =============================================
-- Admins: Full CRUD access
-- Encoders: Full CRUD access (they need to manage students)

DROP POLICY IF EXISTS "students_authenticated_all" ON students;
CREATE POLICY "students_authenticated_all" ON students
  FOR ALL
  USING (is_authenticated())
  WITH CHECK (is_authenticated());

-- =============================================
-- SUBJECTS TABLE POLICIES
-- =============================================
-- Admins: Full CRUD access
-- Encoders: Read-only access

DROP POLICY IF EXISTS "subjects_authenticated_read" ON subjects;
CREATE POLICY "subjects_authenticated_read" ON subjects
  FOR SELECT
  USING (is_authenticated());

DROP POLICY IF EXISTS "subjects_admin_write" ON subjects;
CREATE POLICY "subjects_admin_write" ON subjects
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================
-- SUBJECT_RESERVATIONS TABLE POLICIES
-- =============================================
-- Admins: Full CRUD access
-- Encoders: Full CRUD access (they manage reservations)

DROP POLICY IF EXISTS "subject_reservations_authenticated_all" ON subject_reservations;
CREATE POLICY "subject_reservations_authenticated_all" ON subject_reservations
  FOR ALL
  USING (is_authenticated())
  WITH CHECK (is_authenticated());

-- =============================================
-- GRADES TABLE POLICIES
-- =============================================
-- Admins: Full access to all grades
-- Encoders: Can only see/edit grades they encoded

DROP POLICY IF EXISTS "grades_admin_all" ON grades;
CREATE POLICY "grades_admin_all" ON grades
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "grades_encoder_own" ON grades;
CREATE POLICY "grades_encoder_own" ON grades
  FOR SELECT
  USING (is_encoder() AND encoded_by_user_id = get_current_user_id());

DROP POLICY IF EXISTS "grades_encoder_insert" ON grades;
CREATE POLICY "grades_encoder_insert" ON grades
  FOR INSERT
  WITH CHECK (is_encoder() AND encoded_by_user_id = get_current_user_id());

DROP POLICY IF EXISTS "grades_encoder_update" ON grades;
CREATE POLICY "grades_encoder_update" ON grades
  FOR UPDATE
  USING (is_encoder() AND encoded_by_user_id = get_current_user_id())
  WITH CHECK (is_encoder() AND encoded_by_user_id = get_current_user_id());

DROP POLICY IF EXISTS "grades_encoder_delete" ON grades;
CREATE POLICY "grades_encoder_delete" ON grades
  FOR DELETE
  USING (is_encoder() AND encoded_by_user_id = get_current_user_id());

-- =============================================
-- INVITATIONS TABLE POLICIES
-- =============================================
-- Admins only: Full access
-- Public: Can verify (read) invitations with valid token

DROP POLICY IF EXISTS "invitations_admin_all" ON invitations;
CREATE POLICY "invitations_admin_all" ON invitations
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Allow public to read invitations (for verification)
-- This is needed for the registration flow
DROP POLICY IF EXISTS "invitations_public_read" ON invitations;
CREATE POLICY "invitations_public_read" ON invitations
  FOR SELECT
  USING (true);

-- =============================================
-- FORCE RLS FOR TABLE OWNERS (Optional but recommended)
-- =============================================
-- This ensures RLS is applied even to table owners

ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE courses FORCE ROW LEVEL SECURITY;
ALTER TABLE students FORCE ROW LEVEL SECURITY;
ALTER TABLE subjects FORCE ROW LEVEL SECURITY;
ALTER TABLE subject_reservations FORCE ROW LEVEL SECURITY;
ALTER TABLE grades FORCE ROW LEVEL SECURITY;
ALTER TABLE invitations FORCE ROW LEVEL SECURITY;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================
COMMENT ON POLICY "users_admin_all" ON users IS 'Admins have full access to all user records';
COMMENT ON POLICY "users_self_read" ON users IS 'Users can read their own profile';
COMMENT ON POLICY "users_self_update" ON users IS 'Users can update their own profile';

COMMENT ON POLICY "courses_authenticated_read" ON courses IS 'All authenticated users can read courses';
COMMENT ON POLICY "courses_admin_write" ON courses IS 'Only admins can create/update/delete courses';

COMMENT ON POLICY "subjects_authenticated_read" ON subjects IS 'All authenticated users can read subjects';
COMMENT ON POLICY "subjects_admin_write" ON subjects IS 'Only admins can create/update/delete subjects';

COMMENT ON POLICY "grades_admin_all" ON grades IS 'Admins have full access to all grades';
COMMENT ON POLICY "grades_encoder_own" ON grades IS 'Encoders can only see grades they encoded';

COMMENT ON POLICY "invitations_admin_all" ON invitations IS 'Only admins can manage invitations';
