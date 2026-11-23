-- =============================================================================
-- Migration: 005_moh_dashboard_supervision.sql
-- Description: Phase 3B: MOH & PHNS Web Dashboard Supervision Schema,
--              Escalation Notes, Composite Performance Indexes, and Scorecard View
-- PostgreSQL / Supabase Compatible
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create supervision_notes Table
-- -----------------------------------------------------------------------------
-- Allows PHNS and MOH supervisor officers to review clinical escalations,
-- log supervisor directives, and track safety actions without altering PHM field records.
CREATE TABLE IF NOT EXISTS supervision_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moh_division TEXT NOT NULL,
  phm_area_id UUID NOT NULL REFERENCES phm_areas(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('MOTHER', 'CHILD', 'PHM_AREA')),
  target_id UUID NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL CHECK (author_role IN ('PHNS', 'MOH')),
  status TEXT NOT NULL DEFAULT 'ACKNOWLEDGED' CHECK (status IN ('ACKNOWLEDGED', 'FOLLOW_UP_REQUESTED', 'RESOLVED')),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Indexing for fast queue lookups & filters
CREATE INDEX IF NOT EXISTS idx_supervision_notes_area_status ON supervision_notes(phm_area_id, status);
CREATE INDEX IF NOT EXISTS idx_supervision_notes_target ON supervision_notes(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_supervision_notes_division ON supervision_notes(moh_division);
CREATE INDEX IF NOT EXISTS idx_supervision_notes_created ON supervision_notes(created_at DESC);

-- Attach automatic updated_at timestamp trigger
DROP TRIGGER IF EXISTS set_supervision_notes_timestamp ON supervision_notes;
CREATE TRIGGER set_supervision_notes_timestamp
BEFORE UPDATE ON supervision_notes
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- -----------------------------------------------------------------------------
-- 2. Row-Level Security (RLS) on supervision_notes
-- -----------------------------------------------------------------------------
ALTER TABLE supervision_notes ENABLE ROW LEVEL SECURITY;

-- Policy 1: Supervisors (PHNS / MOH) have full read/write access within their MOH division
DROP POLICY IF EXISTS "Supervisors manage supervision notes in MOH division" ON supervision_notes;
CREATE POLICY "Supervisors manage supervision notes in MOH division"
  ON supervision_notes
  FOR ALL
  TO authenticated
  USING (
    is_supervisor() AND phm_area_id IN (SELECT area_id FROM get_my_moh_division_area_ids())
  )
  WITH CHECK (
    is_supervisor() AND phm_area_id IN (SELECT area_id FROM get_my_moh_division_area_ids())
  );

-- Policy 2: Field Midwives (PHM) have read-only access to directives targeting their own PHM area
DROP POLICY IF EXISTS "PHMs read supervision notes for assigned area" ON supervision_notes;
CREATE POLICY "PHMs read supervision notes for assigned area"
  ON supervision_notes
  FOR SELECT
  TO authenticated
  USING (
    is_phm() AND phm_area_id = get_my_phm_area_id()
  );

-- -----------------------------------------------------------------------------
-- 3. Composite Performance Indexes on (phm_area_id, deleted_at)
-- -----------------------------------------------------------------------------
-- Accelerates MOH executive dashboards and division-wide aggregations
CREATE INDEX IF NOT EXISTS idx_pregnancies_area_deleted ON pregnancies(phm_area_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_antenatal_visits_area_deleted ON antenatal_visits(phm_area_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_children_area_deleted ON children(phm_area_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_child_growth_records_area_deleted ON child_growth_records(phm_area_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_immunizations_area_deleted ON immunizations(phm_area_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_area_deleted ON tasks(phm_area_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_postnatal_meows_area_deleted ON postnatal_meows(phm_area_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_fetal_kick_logs_area_deleted ON fetal_kick_logs(phm_area_id, deleted_at);

-- -----------------------------------------------------------------------------
-- 4. SECURITY INVOKER View: v_phm_area_scorecards
-- -----------------------------------------------------------------------------
-- Aggregates real-time health KPIs per PHM area across synced tables.
-- Uses WITH (security_invoker = true) so caller's division-level RLS is enforced.
CREATE OR REPLACE VIEW v_phm_area_scorecards
WITH (security_invoker = true)
AS
SELECT
  a.id AS phm_area_id,
  a.phm_area_code,
  a.phm_area_name,
  a.moh_division,
  -- Active Pregnancies & Risk breakdown
  COUNT(DISTINCT p.id) FILTER (WHERE p.deleted_at IS NULL AND p.status = 'ACTIVE') AS active_pregnancies_count,
  COUNT(DISTINCT p.id) FILTER (WHERE p.deleted_at IS NULL AND p.status = 'ACTIVE' AND p.risk_level = 'RED') AS red_risk_count,
  COUNT(DISTINCT p.id) FILTER (WHERE p.deleted_at IS NULL AND p.status = 'ACTIVE' AND p.risk_level = 'YELLOW') AS yellow_risk_count,
  COUNT(DISTINCT p.id) FILTER (WHERE p.deleted_at IS NULL AND p.status = 'ACTIVE' AND p.risk_level = 'GREEN') AS green_risk_count,
  -- Active Children
  COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL) AS active_children_count,
  -- Nutrition Watchlist (MAM / SAM / Growth Faltering)
  COUNT(DISTINCT gr.id) FILTER (WHERE gr.deleted_at IS NULL AND gr.weight_kg IS NOT NULL AND gr.weight_kg < 10.0) AS mam_count,
  COUNT(DISTINCT gr.id) FILTER (WHERE gr.deleted_at IS NULL AND gr.weight_kg IS NOT NULL AND gr.weight_kg < 8.0) AS sam_count,
  COUNT(DISTINCT gr.id) FILTER (WHERE gr.deleted_at IS NULL AND gr.growth_faltering_flag = 1) AS growth_faltering_count,
  -- Overdue Tasks
  COUNT(DISTINCT t.id) FILTER (WHERE t.deleted_at IS NULL AND t.status = 'OVERDUE') AS overdue_tasks_count,
  -- Overdue Vaccines
  COUNT(DISTINCT imm.id) FILTER (WHERE imm.deleted_at IS NULL AND imm.status = 'OVERDUE') AS overdue_vaccines_count,
  -- Last Sync Timestamp (max updated_at across domain tables for this area)
  GREATEST(
    MAX(p.updated_at),
    MAX(c.updated_at),
    MAX(t.updated_at),
    MAX(imm.updated_at),
    a.updated_at
  ) AS last_sync_at
FROM phm_areas a
LEFT JOIN pregnancies p ON p.phm_area_id = a.id
LEFT JOIN children c ON c.phm_area_id = a.id
LEFT JOIN child_growth_records gr ON gr.phm_area_id = a.id
LEFT JOIN tasks t ON t.phm_area_id = a.id
LEFT JOIN immunizations imm ON imm.phm_area_id = a.id
GROUP BY a.id, a.phm_area_code, a.phm_area_name, a.moh_division, a.updated_at;
