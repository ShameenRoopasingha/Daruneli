-- =============================================================================
-- Migration: 004_phase3a_transfers_gps_voice.sql
-- Description: Phase 3A: GPS Pinning, Mother Transfers & Handover, Voice Notes,
--              and SMS Reminder Logs
-- PostgreSQL / Supabase Compatible
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Alter families with GPS & Transfer Metadata
-- -----------------------------------------------------------------------------
ALTER TABLE families
  ADD COLUMN IF NOT EXISTS gps_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gps_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS temp_out_return_date DATE,
  ADD COLUMN IF NOT EXISTS transfer_note TEXT,
  ADD COLUMN IF NOT EXISTS transferred_to_phm_area TEXT;

-- -----------------------------------------------------------------------------
-- 2. Alter antenatal_visits with Voice Note Fields
-- -----------------------------------------------------------------------------
ALTER TABLE antenatal_visits
  ADD COLUMN IF NOT EXISTS voice_note_local_uri TEXT,
  ADD COLUMN IF NOT EXISTS voice_note_remote_url TEXT,
  ADD COLUMN IF NOT EXISTS voice_note_duration_sec INTEGER;

-- -----------------------------------------------------------------------------
-- 3. Create mother_transfers Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mother_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phm_area_id UUID NOT NULL REFERENCES phm_areas(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  mother_id UUID NOT NULL REFERENCES mothers(id) ON DELETE CASCADE,
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('TEMP_OUT', 'PERMANENT_TRANSFER')),
  destination_area TEXT,
  expected_return_date DATE,
  handover_summary_json JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RETURNED', 'COMPLETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mother_transfers_area ON mother_transfers(phm_area_id);
CREATE INDEX IF NOT EXISTS idx_mother_transfers_mother ON mother_transfers(mother_id);
CREATE INDEX IF NOT EXISTS idx_mother_transfers_family ON mother_transfers(family_id);
CREATE INDEX IF NOT EXISTS idx_mother_transfers_status ON mother_transfers(status);
CREATE INDEX IF NOT EXISTS idx_mother_transfers_sync ON mother_transfers(phm_area_id, updated_at);

-- Attach updated_at trigger if helper exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS set_updated_at ON mother_transfers;
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON mother_transfers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

-- RLS on mother_transfers
ALTER TABLE mother_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mother_transfers_select_policy ON mother_transfers;
CREATE POLICY mother_transfers_select_policy ON mother_transfers FOR SELECT TO authenticated
USING (
  (is_phm() AND phm_area_id = get_my_phm_area_id())
  OR
  (is_supervisor() AND phm_area_id IN (SELECT area_id FROM get_my_moh_division_area_ids()))
);

DROP POLICY IF EXISTS mother_transfers_insert_policy ON mother_transfers;
CREATE POLICY mother_transfers_insert_policy ON mother_transfers FOR INSERT TO authenticated
WITH CHECK (
  is_phm() AND phm_area_id = get_my_phm_area_id()
);

DROP POLICY IF EXISTS mother_transfers_update_policy ON mother_transfers;
CREATE POLICY mother_transfers_update_policy ON mother_transfers FOR UPDATE TO authenticated
USING (
  is_phm() AND phm_area_id = get_my_phm_area_id()
)
WITH CHECK (
  is_phm() AND phm_area_id = get_my_phm_area_id()
);

-- -----------------------------------------------------------------------------
-- 4. Create sms_reminder_logs Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sms_reminder_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phm_area_id UUID REFERENCES phm_areas(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  phone TEXT,
  reminder_type TEXT NOT NULL,
  due_date DATE NOT NULL,
  message_body TEXT,
  provider_status TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_sms_target_type_due UNIQUE (target_id, reminder_type, due_date)
);

CREATE INDEX IF NOT EXISTS idx_sms_reminder_logs_target ON sms_reminder_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_sms_reminder_logs_due ON sms_reminder_logs(due_date);

ALTER TABLE sms_reminder_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sms_reminder_logs_select_policy ON sms_reminder_logs;
CREATE POLICY sms_reminder_logs_select_policy ON sms_reminder_logs FOR SELECT TO authenticated
USING (
  (is_phm() AND phm_area_id = get_my_phm_area_id())
  OR
  (is_supervisor() AND phm_area_id IN (SELECT area_id FROM get_my_moh_division_area_ids()))
);

DROP POLICY IF EXISTS sms_reminder_logs_insert_policy ON sms_reminder_logs;
CREATE POLICY sms_reminder_logs_insert_policy ON sms_reminder_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 5. Supabase Storage: Private bucket 'voice-notes'
-- Run the following in Supabase SQL editor or Storage Settings:
-- -----------------------------------------------------------------------------
/*
-- 1. Create the private storage bucket:
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow authenticated PHMs to upload voice notes:
CREATE POLICY "PHMs can upload voice notes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] = get_my_phm_area_id()::text
);

-- 3. Allow authenticated PHMs and Supervisors to view/download voice notes:
CREATE POLICY "PHMs and Supervisors can access voice notes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (
    (is_phm() AND (storage.foldername(name))[1] = get_my_phm_area_id()::text)
    OR
    (is_supervisor() AND (storage.foldername(name))[1]::uuid IN (SELECT area_id FROM get_my_moh_division_area_ids()))
  )
);
*/
