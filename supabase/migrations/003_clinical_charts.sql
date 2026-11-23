-- =============================================================================
-- Migration: 003_clinical_charts.sql
-- Description: Standardized Sri Lanka FHB & WHO Midwifery Charts schema additions
-- PostgreSQL / Supabase Compatible
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Alter Existing Tables for Clinical Charts
-- -----------------------------------------------------------------------------
ALTER TABLE pregnancies
  ADD COLUMN IF NOT EXISTS booking_weight_kg NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS booking_height_cm NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS booking_bmi NUMERIC(4, 2),
  ADD COLUMN IF NOT EXISTS hospital_delivery_notes_json JSONB DEFAULT '{}'::jsonb;

ALTER TABLE antenatal_visits
  ADD COLUMN IF NOT EXISTS sfh_cm NUMERIC(4, 1);

ALTER TABLE children
  ADD COLUMN IF NOT EXISTS gestational_age_at_birth_weeks NUMERIC(4, 1) DEFAULT 39;

ALTER TABLE child_growth_records
  ADD COLUMN IF NOT EXISTS head_circumference_cm NUMERIC(4, 1);

-- -----------------------------------------------------------------------------
-- 2. Fetal Kick Logs Table (Cardiff Count-to-10)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fetal_kick_logs (
  id UUID PRIMARY KEY,
  phm_area_id UUID NOT NULL REFERENCES phm_areas(id) ON DELETE CASCADE,
  pregnancy_id UUID NOT NULL REFERENCES pregnancies(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  start_time TIME NOT NULL,
  tenth_kick_time TIME,
  kick_count INTEGER NOT NULL DEFAULT 10,
  duration_minutes INTEGER,
  reduced_movement_flag INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 3. Postnatal MEOWS Table (Maternal Early Obstetric Warning Score)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS postnatal_meows (
  id UUID PRIMARY KEY,
  phm_area_id UUID NOT NULL REFERENCES phm_areas(id) ON DELETE CASCADE,
  pregnancy_id UUID NOT NULL REFERENCES pregnancies(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL,
  days_postpartum INTEGER NOT NULL,
  bp_systolic INTEGER NOT NULL,
  bp_diastolic INTEGER NOT NULL,
  pulse_bpm INTEGER NOT NULL,
  resp_rate INTEGER NOT NULL,
  temp_c NUMERIC(4, 1) NOT NULL,
  lochia_bleeding TEXT NOT NULL,
  alert_level TEXT NOT NULL,
  action_advice TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 4. Automatic Timestamp Triggers
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_timestamp ON fetal_kick_logs;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON fetal_kick_logs
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp ON postnatal_meows;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON postnatal_meows
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- -----------------------------------------------------------------------------
-- 5. Indexes for Fast Sync Queries
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fetal_kick_logs_sync ON fetal_kick_logs(phm_area_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_fetal_kick_logs_preg ON fetal_kick_logs(pregnancy_id);
CREATE INDEX IF NOT EXISTS idx_fetal_kick_logs_date ON fetal_kick_logs(log_date);

CREATE INDEX IF NOT EXISTS idx_postnatal_meows_sync ON postnatal_meows(phm_area_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_postnatal_meows_preg ON postnatal_meows(pregnancy_id);
CREATE INDEX IF NOT EXISTS idx_postnatal_meows_date ON postnatal_meows(recorded_at);

-- -----------------------------------------------------------------------------
-- 6. Row-Level Security (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE fetal_kick_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE postnatal_meows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to fetal_kick_logs" ON fetal_kick_logs
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert/update to fetal_kick_logs" ON fetal_kick_logs
  FOR ALL USING (true);

CREATE POLICY "Allow public read access to postnatal_meows" ON postnatal_meows
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert/update to postnatal_meows" ON postnatal_meows
  FOR ALL USING (true);
