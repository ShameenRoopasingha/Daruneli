-- =============================================================================
-- Migration: 006_user_management_crud.sql
-- Description: Phase 3B: User Management CRUD, Staff Audit Logging,
--              Deactivation Tracking, and Active-User RLS Guard
-- PostgreSQL / Supabase Compatible
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Alter profiles Table with Staff Management Fields
-- -----------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS employee_id TEXT,
  ADD COLUMN IF NOT EXISTS moh_division TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Allow Tamil 'ta' in preferred_lang if not already permitted
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_preferred_lang_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_lang_check
  CHECK (preferred_lang IN ('si', 'ta', 'en'));

-- Backfill moh_division from phm_areas where phm_area_id is set
UPDATE profiles p
SET moh_division = a.moh_division
FROM phm_areas a
WHERE p.phm_area_id = a.id AND (p.moh_division IS NULL OR p.moh_division = '');

-- Indexes for staff lookups & active status filters
CREATE INDEX IF NOT EXISTS idx_profiles_moh_division ON profiles(moh_division);
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_role_active ON profiles(role, is_active);

-- -----------------------------------------------------------------------------
-- 2. Create user_audit_logs Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moh_division TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (
    action IN (
      'CREATE_USER',
      'UPDATE_USER',
      'REASSIGN_AREA',
      'DEACTIVATE_USER',
      'REACTIVATE_USER',
      'RESET_PASSWORD'
    )
  ),
  changes_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_user_audit_logs_division ON user_audit_logs(moh_division);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_target ON user_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_actor ON user_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_created ON user_audit_logs(created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. Row-Level Security (RLS) on user_audit_logs
-- -----------------------------------------------------------------------------
ALTER TABLE user_audit_logs ENABLE ROW LEVEL SECURITY;

-- Read Policy: Supervisors (MOH and PHNS) can inspect audit logs within their MOH division
DROP POLICY IF EXISTS "Supervisors read user audit logs for their MOH division" ON user_audit_logs;
CREATE POLICY "Supervisors read user audit logs for their MOH division"
  ON user_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    is_supervisor() AND (
      moh_division = (SELECT p.moh_division FROM profiles p WHERE p.id = auth.uid())
      OR
      moh_division IN (
        SELECT a.moh_division FROM phm_areas a
        JOIN profiles p ON p.id = auth.uid()
        WHERE p.phm_area_id = a.id
      )
    )
  );

-- Note: INSERTS to user_audit_logs occur exclusively via the server-side
-- admin API routes using SUPABASE_SERVICE_ROLE_KEY, blocking client-side tampering.

-- -----------------------------------------------------------------------------
-- 4. Helper Function: public.is_active_user() and Active-User RLS Guard
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_active = TRUE
  );
$$ LANGUAGE sql;

-- Upgrade is_phm() and is_supervisor() functions from 001_phm_sync_schema.sql
-- to strictly require is_active = TRUE.
-- This automatically prevents deactivated PHMs or supervisors from executing
-- SELECT, INSERT, or UPDATE sync operations across all clinical domain tables!
CREATE OR REPLACE FUNCTION is_phm()
RETURNS BOOLEAN STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'PHM' AND is_active = TRUE
  );
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION is_supervisor()
RETURNS BOOLEAN STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('PHNS', 'MOH') AND is_active = TRUE
  );
$$ LANGUAGE sql;
