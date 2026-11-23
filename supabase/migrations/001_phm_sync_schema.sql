-- =============================================================================
-- Migration: 001_phm_sync_schema.sql
-- Description: Daruneli PHM Bidirectional Offline-to-Cloud Sync Schema with RLS
-- PostgreSQL / Supabase Compatible
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Master Tables: phm_areas & profiles
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS phm_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moh_division TEXT NOT NULL,
  phm_area_code TEXT NOT NULL UNIQUE,
  phm_area_name TEXT NOT NULL,
  gn_divisions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phm_area_id UUID REFERENCES phm_areas(id),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PHM', 'PHNS', 'MOH')),
  preferred_lang TEXT NOT NULL DEFAULT 'si' CHECK (preferred_lang IN ('si', 'en')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- -----------------------------------------------------------------------------
-- 2. Mirrored PHM Domain Tables (8 Tables)
-- -----------------------------------------------------------------------------

-- 1. Families
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY,
  phm_area_id UUID NOT NULL REFERENCES phm_areas(id) ON DELETE CASCADE,
  eligible_family_no TEXT,
  gn_division TEXT NOT NULL,
  address TEXT,
  husband_name TEXT,
  emergency_phone TEXT,
  residency_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (residency_status IN ('ACTIVE', 'TEMP_OUT', 'TRANSFERRED_OUT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- 2. Mothers
CREATE TABLE IF NOT EXISTS mothers (
  id UUID PRIMARY KEY,
  phm_area_id UUID NOT NULL REFERENCES phm_areas(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  qr_token TEXT UNIQUE,
  full_name TEXT NOT NULL,
  nic TEXT,
  dob TEXT,
  phone TEXT,
  blood_group TEXT,
  chronic_conditions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  fertility_treatment_history INTEGER NOT NULL DEFAULT 0,
  prev_miscarriages_count INTEGER NOT NULL DEFAULT 0,
  prev_stillbirths_count INTEGER NOT NULL DEFAULT 0,
  prev_c_sections_count INTEGER NOT NULL DEFAULT 0,
  planning_pregnancy INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- 3. Pregnancies
CREATE TABLE IF NOT EXISTS pregnancies (
  id UUID PRIMARY KEY,
  phm_area_id UUID NOT NULL REFERENCES phm_areas(id) ON DELETE CASCADE,
  mother_id UUID NOT NULL REFERENCES mothers(id) ON DELETE CASCADE,
  gravida INTEGER,
  para INTEGER,
  lrmp_date TEXT,
  edd_date TEXT,
  is_precious_pregnancy INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'GREEN' CHECK (risk_level IN ('GREEN', 'YELLOW', 'RED')),
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_factors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DELIVERED', 'MISCARRIAGE')),
  delivery_date TEXT,
  delivery_mode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- 4. Antenatal Visits
CREATE TABLE IF NOT EXISTS antenatal_visits (
  id UUID PRIMARY KEY,
  phm_area_id UUID NOT NULL REFERENCES phm_areas(id) ON DELETE CASCADE,
  pregnancy_id UUID NOT NULL REFERENCES pregnancies(id) ON DELETE CASCADE,
  visit_date TEXT NOT NULL,
  visit_type TEXT NOT NULL DEFAULT 'HOME' CHECK (visit_type IN ('HOME', 'CLINIC', 'PHONE')),
  poa_weeks NUMERIC,
  weight_kg NUMERIC,
  bp_systolic INTEGER,
  bp_diastolic INTEGER,
  hemoglobin NUMERIC,
  danger_signs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  supplements_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  next_visit_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- 5. Children
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY,
  phm_area_id UUID NOT NULL REFERENCES phm_areas(id) ON DELETE CASCADE,
  mother_id UUID REFERENCES mothers(id) ON DELETE SET NULL,
  pregnancy_id UUID REFERENCES pregnancies(id) ON DELETE SET NULL,
  qr_token TEXT UNIQUE,
  full_name TEXT NOT NULL,
  dob TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  birth_weight_kg NUMERIC,
  nutrition_status TEXT NOT NULL DEFAULT 'NORMAL' CHECK (nutrition_status IN ('NORMAL', 'MAM', 'SAM')),
  growth_faltering_flag INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- 6. Child Growth Records
CREATE TABLE IF NOT EXISTS child_growth_records (
  id UUID PRIMARY KEY,
  phm_area_id UUID NOT NULL REFERENCES phm_areas(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  recorded_date TEXT NOT NULL,
  age_months INTEGER,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  milestones_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  supplements_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- 7. Immunizations
CREATE TABLE IF NOT EXISTS immunizations (
  id UUID PRIMARY KEY,
  phm_area_id UUID NOT NULL REFERENCES phm_areas(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  vaccine_code TEXT NOT NULL,
  vaccine_name TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  given_date TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'GIVEN', 'OVERDUE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- 8. Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  phm_area_id UUID NOT NULL REFERENCES phm_areas(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('MOTHER', 'CHILD')),
  target_id UUID NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('HOME_VISIT', 'CLINIC_DUE', 'VOG_REFERRAL', 'VACCINE_DUE')),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('URGENT', 'HIGH', 'NORMAL')),
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'OVERDUE', 'COMPLETED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 3. Automatic Updated-At Trigger Function
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all synced tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'phm_areas', 'profiles', 'families', 'mothers',
      'pregnancies', 'antenatal_visits', 'children',
      'child_growth_records', 'immunizations', 'tasks'
    )
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_timestamp ON %I;
      CREATE TRIGGER set_timestamp
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();
    ', t, t);
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Indexes for Fast Sync Queries
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_families_sync ON families(phm_area_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_mothers_sync ON mothers(phm_area_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_pregnancies_sync ON pregnancies(phm_area_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_visits_sync ON antenatal_visits(phm_area_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_children_sync ON children(phm_area_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_growth_sync ON child_growth_records(phm_area_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_immunizations_sync ON immunizations(phm_area_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_sync ON tasks(phm_area_id, updated_at);

-- -----------------------------------------------------------------------------
-- 5. Row-Level Security (RLS) Helper Functions & Policies
-- -----------------------------------------------------------------------------

-- Helper functions (SECURITY DEFINER avoids RLS infinite recursion and speeds up checks)
CREATE OR REPLACE FUNCTION get_my_phm_area_id()
RETURNS UUID STABLE SECURITY DEFINER AS $$
  SELECT phm_area_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION is_phm()
RETURNS BOOLEAN STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'PHM');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION is_supervisor()
RETURNS BOOLEAN STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('PHNS', 'MOH'));
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_my_moh_division_area_ids()
RETURNS TABLE (area_id UUID) STABLE SECURITY DEFINER AS $$
  SELECT a.id FROM phm_areas a
  JOIN profiles p ON p.id = auth.uid()
  JOIN phm_areas user_area ON user_area.id = p.phm_area_id
  WHERE a.moh_division = user_area.moh_division;
$$ LANGUAGE sql;

-- Enable RLS on all tables
ALTER TABLE phm_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE mothers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pregnancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE antenatal_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_growth_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE immunizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy for phm_areas: Authenticated and Anon users can view areas
CREATE POLICY "Users can read PHM areas"
  ON phm_areas FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy for profiles: Users can view their own profile or supervisor can view area staff
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR is_supervisor());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- RLS Policies for the 8 synced data tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'families', 'mothers', 'pregnancies', 'antenatal_visits',
      'children', 'child_growth_records', 'immunizations', 'tasks'
    ])
  LOOP
    -- 1. SELECT Policy: PHM sees assigned area, PHNS/MOH sees entire division
    EXECUTE format('
      DROP POLICY IF EXISTS %I ON %I;
      CREATE POLICY %I ON %I FOR SELECT TO authenticated
      USING (
        (is_phm() AND phm_area_id = get_my_phm_area_id())
        OR
        (is_supervisor() AND phm_area_id IN (SELECT area_id FROM get_my_moh_division_area_ids()))
      );
    ', tbl || '_select_policy', tbl, tbl || '_select_policy', tbl);

    -- 2. INSERT Policy: PHM can insert only for assigned phm_area_id
    EXECUTE format('
      DROP POLICY IF EXISTS %I ON %I;
      CREATE POLICY %I ON %I FOR INSERT TO authenticated
      WITH CHECK (
        is_phm() AND phm_area_id = get_my_phm_area_id()
      );
    ', tbl || '_insert_policy', tbl, tbl || '_insert_policy', tbl);

    -- 3. UPDATE Policy: PHM can update rows belonging to their phm_area_id
    EXECUTE format('
      DROP POLICY IF EXISTS %I ON %I;
      CREATE POLICY %I ON %I FOR UPDATE TO authenticated
      USING (
        is_phm() AND phm_area_id = get_my_phm_area_id()
      )
      WITH CHECK (
        is_phm() AND phm_area_id = get_my_phm_area_id()
      );
    ', tbl || '_update_policy', tbl, tbl || '_update_policy', tbl);
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. Initial Seed Areas for Testing / Demonstration
-- -----------------------------------------------------------------------------
INSERT INTO phm_areas (id, moh_division, phm_area_code, phm_area_name, gn_divisions_json)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Maharagama', 'PHM/MAH/01', 'Kottawa North', '["Kottawa North", "Liyanagoda", "Rukmalgama"]'::jsonb),
  ('a0000002-0000-0000-0000-000000000002', 'Maharagama', 'PHM/MAH/02', 'Kottawa South', '["Kottawa South", "Makumbura", "Pannipitiya"]'::jsonb)
ON CONFLICT (phm_area_code) DO NOTHING;
