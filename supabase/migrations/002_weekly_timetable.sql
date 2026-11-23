-- =============================================================================
-- Migration: 002_weekly_timetable.sql
-- Description: PHM Advance Programme / Weekly Timetable and Overrides with RLS
-- PostgreSQL / Supabase Compatible
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Schedule Templates Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedule_templates (
  id UUID PRIMARY KEY,
  phm_area_id UUID NOT NULL REFERENCES phm_areas(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  week_pattern TEXT NOT NULL DEFAULT 'ALL' CHECK (week_pattern IN ('ALL', '1_3', '2_4', 'FIRST', 'LAST')),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('HOME_VISIT', 'ANC_CLINIC', 'CWC_CLINIC', 'MOH_OFFICE', 'CATCH_UP', 'OFF')),
  gn_division TEXT,
  title TEXT NOT NULL,
  start_time TEXT DEFAULT '08:30',
  end_time TEXT DEFAULT '16:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 2. Schedule Overrides Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedule_overrides (
  id UUID PRIMARY KEY,
  phm_area_id UUID NOT NULL REFERENCES phm_areas(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('HOLIDAY', 'LEAVE', 'HOME_VISIT', 'ANC_CLINIC', 'CWC_CLINIC', 'MOH_OFFICE', 'CATCH_UP')),
  gn_division TEXT,
  title TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 3. Automatic Timestamp Triggers
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_timestamp ON schedule_templates;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON schedule_templates
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp ON schedule_overrides;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON schedule_overrides
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- -----------------------------------------------------------------------------
-- 4. Indexes for Fast Sync Queries
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_schedule_templates_sync ON schedule_templates(phm_area_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_day ON schedule_templates(day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedule_overrides_sync ON schedule_overrides(phm_area_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_schedule_overrides_date ON schedule_overrides(override_date);

-- -----------------------------------------------------------------------------
-- 5. Row-Level Security (RLS) Policies
-- -----------------------------------------------------------------------------
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_overrides ENABLE ROW LEVEL SECURITY;

-- schedule_templates: SELECT policy
DROP POLICY IF EXISTS schedule_templates_select_policy ON schedule_templates;
CREATE POLICY schedule_templates_select_policy ON schedule_templates FOR SELECT TO authenticated
USING (
  (is_phm() AND phm_area_id = get_my_phm_area_id())
  OR
  (is_supervisor() AND phm_area_id IN (SELECT area_id FROM get_my_moh_division_area_ids()))
);

-- schedule_templates: INSERT policy
DROP POLICY IF EXISTS schedule_templates_insert_policy ON schedule_templates;
CREATE POLICY schedule_templates_insert_policy ON schedule_templates FOR INSERT TO authenticated
WITH CHECK (
  is_phm() AND phm_area_id = get_my_phm_area_id()
);

-- schedule_templates: UPDATE policy
DROP POLICY IF EXISTS schedule_templates_update_policy ON schedule_templates;
CREATE POLICY schedule_templates_update_policy ON schedule_templates FOR UPDATE TO authenticated
USING (
  is_phm() AND phm_area_id = get_my_phm_area_id()
)
WITH CHECK (
  is_phm() AND phm_area_id = get_my_phm_area_id()
);

-- schedule_overrides: SELECT policy
DROP POLICY IF EXISTS schedule_overrides_select_policy ON schedule_overrides;
CREATE POLICY schedule_overrides_select_policy ON schedule_overrides FOR SELECT TO authenticated
USING (
  (is_phm() AND phm_area_id = get_my_phm_area_id())
  OR
  (is_supervisor() AND phm_area_id IN (SELECT area_id FROM get_my_moh_division_area_ids()))
);

-- schedule_overrides: INSERT policy
DROP POLICY IF EXISTS schedule_overrides_insert_policy ON schedule_overrides;
CREATE POLICY schedule_overrides_insert_policy ON schedule_overrides FOR INSERT TO authenticated
WITH CHECK (
  is_phm() AND phm_area_id = get_my_phm_area_id()
);

-- schedule_overrides: UPDATE policy
DROP POLICY IF EXISTS schedule_overrides_update_policy ON schedule_overrides;
CREATE POLICY schedule_overrides_update_policy ON schedule_overrides FOR UPDATE TO authenticated
USING (
  is_phm() AND phm_area_id = get_my_phm_area_id()
)
WITH CHECK (
  is_phm() AND phm_area_id = get_my_phm_area_id()
);
