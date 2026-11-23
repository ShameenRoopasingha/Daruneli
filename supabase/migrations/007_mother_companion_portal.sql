-- =============================================================================
-- Migration 007: Daruneli Mother Companion Portal (Phase 4A)
-- Strict Patient-Scoped RLS, Onboarding Invites, Mother Role & Fetal Kick Source
-- =============================================================================

-- 1. Alter mothers table to link Supabase Auth user
ALTER TABLE mothers
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS portal_linked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_mothers_auth_user ON mothers(auth_user_id);

-- 2. Update profiles role check to permit 'MOTHER'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('PHM', 'PHNS', 'MOH', 'MOTHER'));

-- 3. Alter fetal_kick_logs to track origin source
ALTER TABLE fetal_kick_logs
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'PHM_APP'
  CHECK (source IN ('PHM_APP', 'MOTHER_PORTAL'));

CREATE INDEX IF NOT EXISTS idx_fetal_kick_source ON fetal_kick_logs(source);

-- 4. Create mother_portal_invites table for onboarding
CREATE TABLE IF NOT EXISTS mother_portal_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mother_id UUID NOT NULL REFERENCES mothers(id) ON DELETE CASCADE,
  phm_area_id UUID NOT NULL REFERENCES phm_areas(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_invites_mother ON mother_portal_invites(mother_id);
CREATE INDEX IF NOT EXISTS idx_invites_code ON mother_portal_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_invites_area ON mother_portal_invites(phm_area_id);

-- -----------------------------------------------------------------------------
-- 5. Strict Patient-Scoped RLS Policies
-- -----------------------------------------------------------------------------
ALTER TABLE mother_portal_invites ENABLE ROW LEVEL SECURITY;

-- PHM officers can view/generate invites within their own assigned area
CREATE POLICY "phm_select_invites" ON mother_portal_invites
  FOR SELECT TO authenticated
  USING (
    phm_area_id = (SELECT phm_area_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('MOH', 'PHNS'))
  );

CREATE POLICY "phm_insert_invites" ON mother_portal_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    phm_area_id = (SELECT phm_area_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'PHM')
  );

-- Mothers do NOT have direct access to mother_portal_invites; claims occur exclusively via server Route Handler.

-- Add SELECT-only RLS policies for authenticated MOTHER users
-- Mothers can ONLY read their own record
CREATE POLICY "mother_read_own_profile" ON mothers
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid() AND deleted_at IS NULL
  );

-- Mothers can read their own family record
CREATE POLICY "mother_read_own_family" ON families
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT family_id FROM mothers WHERE auth_user_id = auth.uid())
    AND deleted_at IS NULL
  );

-- Mothers can read their own pregnancies
CREATE POLICY "mother_read_own_pregnancies" ON pregnancies
  FOR SELECT TO authenticated
  USING (
    mother_id IN (SELECT id FROM mothers WHERE auth_user_id = auth.uid())
    AND deleted_at IS NULL
  );

-- Mothers can read their antenatal visits
CREATE POLICY "mother_read_own_antenatal_visits" ON antenatal_visits
  FOR SELECT TO authenticated
  USING (
    pregnancy_id IN (
      SELECT p.id FROM pregnancies p
      JOIN mothers m ON m.id = p.mother_id
      WHERE m.auth_user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Mothers can read tasks assigned to themselves or their children
CREATE POLICY "mother_read_own_tasks" ON tasks
  FOR SELECT TO authenticated
  USING (
    (target_type = 'MOTHER' AND target_id IN (SELECT id FROM mothers WHERE auth_user_id = auth.uid()))
    OR
    (target_type = 'CHILD' AND target_id IN (
      SELECT c.id FROM children c
      JOIN mothers m ON m.id = c.mother_id
      WHERE m.auth_user_id = auth.uid()
    ))
  );

-- Mothers can read their own children
CREATE POLICY "mother_read_own_children" ON children
  FOR SELECT TO authenticated
  USING (
    mother_id IN (SELECT id FROM mothers WHERE auth_user_id = auth.uid())
    AND deleted_at IS NULL
  );

-- Mothers can read their children's growth records
CREATE POLICY "mother_read_own_growth" ON child_growth_records
  FOR SELECT TO authenticated
  USING (
    child_id IN (
      SELECT c.id FROM children c
      JOIN mothers m ON m.id = c.mother_id
      WHERE m.auth_user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Mothers can read their children's immunizations
CREATE POLICY "mother_read_own_immunizations" ON immunizations
  FOR SELECT TO authenticated
  USING (
    child_id IN (
      SELECT c.id FROM children c
      JOIN mothers m ON m.id = c.mother_id
      WHERE m.auth_user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Mothers can read kick logs for their active pregnancies
CREATE POLICY "mother_read_own_kick_logs" ON fetal_kick_logs
  FOR SELECT TO authenticated
  USING (
    pregnancy_id IN (
      SELECT p.id FROM pregnancies p
      JOIN mothers m ON m.id = p.mother_id
      WHERE m.auth_user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Mothers can INSERT kick logs for their active pregnancies with source = 'MOTHER_PORTAL'
CREATE POLICY "mother_insert_own_kick_logs" ON fetal_kick_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    pregnancy_id IN (
      SELECT p.id FROM pregnancies p
      JOIN mothers m ON m.id = p.mother_id
      WHERE m.auth_user_id = auth.uid()
    )
    AND source = 'MOTHER_PORTAL'
  );

-- -----------------------------------------------------------------------------
-- 6. SECURITY DEFINER RPC: public.get_my_phm_contact()
-- Returns ONLY safe contact details for the mother's assigned PHM
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_phm_contact()
RETURNS TABLE (
  phm_name TEXT,
  phm_phone TEXT,
  phm_area_name TEXT,
  moh_division TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_area_id UUID;
BEGIN
  -- Look up assigned phm_area_id for the authenticated mother
  SELECT phm_area_id INTO v_area_id
  FROM mothers
  WHERE auth_user_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_area_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(p.full_name, 'Area Public Health Midwife') AS phm_name,
    COALESCE(p.phone, a.phone, '0112840252') AS phm_phone,
    a.name AS phm_area_name,
    a.moh_division
  FROM phm_areas a
  LEFT JOIN profiles p ON p.phm_area_id = a.id AND p.role = 'PHM' AND p.is_active = TRUE
  WHERE a.id = v_area_id
  LIMIT 1;
END;
$$;
