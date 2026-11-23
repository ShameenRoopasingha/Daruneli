// SQLite Database Schema for Daruneli PHM App
// All tables use UUID v4 primary keys, soft-delete timestamps, and sync metadata (phm_area_id, is_dirty)

export const DEFAULT_PHM_AREA_ID = 'a0000001-0000-0000-0000-000000000001';

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS families (
    id TEXT PRIMARY KEY,
    phm_area_id TEXT NOT NULL DEFAULT '${DEFAULT_PHM_AREA_ID}',
    eligible_family_no TEXT,
    gn_division TEXT NOT NULL,
    address TEXT,
    husband_name TEXT,
    emergency_phone TEXT,
    residency_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(residency_status IN ('ACTIVE', 'TEMP_OUT', 'TRANSFERRED_OUT')),
    gps_lat REAL,
    gps_lng REAL,
    temp_out_return_date TEXT,
    transfer_note TEXT,
    transferred_to_phm_area TEXT,
    is_dirty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS mothers (
    id TEXT PRIMARY KEY,
    phm_area_id TEXT NOT NULL DEFAULT '${DEFAULT_PHM_AREA_ID}',
    family_id TEXT REFERENCES families(id),
    qr_token TEXT UNIQUE,
    full_name TEXT NOT NULL,
    nic TEXT,
    dob TEXT,
    phone TEXT,
    blood_group TEXT,
    chronic_conditions_json TEXT DEFAULT '[]',
    fertility_treatment_history INTEGER NOT NULL DEFAULT 0,
    prev_miscarriages_count INTEGER NOT NULL DEFAULT 0,
    prev_stillbirths_count INTEGER NOT NULL DEFAULT 0,
    prev_c_sections_count INTEGER NOT NULL DEFAULT 0,
    planning_pregnancy INTEGER NOT NULL DEFAULT 0,
    is_dirty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS pregnancies (
    id TEXT PRIMARY KEY,
    phm_area_id TEXT NOT NULL DEFAULT '${DEFAULT_PHM_AREA_ID}',
    mother_id TEXT NOT NULL REFERENCES mothers(id),
    gravida INTEGER,
    para INTEGER,
    lrmp_date TEXT,
    edd_date TEXT,
    is_precious_pregnancy INTEGER NOT NULL DEFAULT 0,
    risk_level TEXT NOT NULL DEFAULT 'GREEN' CHECK(risk_level IN ('GREEN', 'YELLOW', 'RED')),
    risk_score INTEGER NOT NULL DEFAULT 0,
    risk_factors_json TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'DELIVERED', 'MISCARRIAGE')),
    delivery_date TEXT,
    delivery_mode TEXT,
    booking_weight_kg REAL,
    booking_height_cm REAL,
    booking_bmi REAL,
    hospital_delivery_notes_json TEXT DEFAULT '{}',
    is_dirty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS antenatal_visits (
    id TEXT PRIMARY KEY,
    phm_area_id TEXT NOT NULL DEFAULT '${DEFAULT_PHM_AREA_ID}',
    pregnancy_id TEXT NOT NULL REFERENCES pregnancies(id),
    visit_date TEXT NOT NULL,
    visit_type TEXT NOT NULL DEFAULT 'HOME' CHECK(visit_type IN ('HOME', 'CLINIC', 'PHONE')),
    poa_weeks REAL,
    sfh_cm REAL,
    weight_kg REAL,
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    hemoglobin REAL,
    danger_signs_json TEXT DEFAULT '[]',
    supplements_json TEXT DEFAULT '[]',
    notes TEXT,
    next_visit_date TEXT,
    voice_note_local_uri TEXT,
    voice_note_remote_url TEXT,
    voice_note_duration_sec INTEGER,
    is_dirty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS children (
    id TEXT PRIMARY KEY,
    phm_area_id TEXT NOT NULL DEFAULT '${DEFAULT_PHM_AREA_ID}',
    mother_id TEXT REFERENCES mothers(id),
    pregnancy_id TEXT REFERENCES pregnancies(id),
    qr_token TEXT UNIQUE,
    full_name TEXT NOT NULL,
    dob TEXT NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('M', 'F')),
    birth_weight_kg REAL,
    gestational_age_at_birth_weeks REAL DEFAULT 39,
    nutrition_status TEXT NOT NULL DEFAULT 'NORMAL' CHECK(nutrition_status IN ('NORMAL', 'MAM', 'SAM')),
    growth_faltering_flag INTEGER NOT NULL DEFAULT 0,
    is_dirty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS child_growth_records (
    id TEXT PRIMARY KEY,
    phm_area_id TEXT NOT NULL DEFAULT '${DEFAULT_PHM_AREA_ID}',
    child_id TEXT NOT NULL REFERENCES children(id),
    recorded_date TEXT NOT NULL,
    age_months INTEGER,
    weight_kg REAL,
    height_cm REAL,
    head_circumference_cm REAL,
    milestones_json TEXT DEFAULT '[]',
    supplements_json TEXT DEFAULT '[]',
    is_dirty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS immunizations (
    id TEXT PRIMARY KEY,
    phm_area_id TEXT NOT NULL DEFAULT '${DEFAULT_PHM_AREA_ID}',
    child_id TEXT NOT NULL REFERENCES children(id),
    vaccine_code TEXT NOT NULL,
    vaccine_name TEXT NOT NULL,
    scheduled_date TEXT NOT NULL,
    given_date TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'GIVEN', 'OVERDUE')),
    is_dirty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    phm_area_id TEXT NOT NULL DEFAULT '${DEFAULT_PHM_AREA_ID}',
    target_type TEXT NOT NULL CHECK(target_type IN ('MOTHER', 'CHILD')),
    target_id TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK(task_type IN ('HOME_VISIT', 'CLINIC_DUE', 'VOG_REFERRAL', 'VACCINE_DUE')),
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('URGENT', 'HIGH', 'NORMAL')),
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'OVERDUE', 'COMPLETED')),
    notes TEXT,
    is_dirty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS schedule_templates (
    id TEXT PRIMARY KEY,
    phm_area_id TEXT NOT NULL DEFAULT '${DEFAULT_PHM_AREA_ID}',
    day_of_week INTEGER NOT NULL,
    week_pattern TEXT NOT NULL DEFAULT 'ALL',
    activity_type TEXT NOT NULL,
    gn_division TEXT,
    title TEXT NOT NULL,
    start_time TEXT DEFAULT '08:30',
    end_time TEXT DEFAULT '16:00',
    is_dirty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS schedule_overrides (
    id TEXT PRIMARY KEY,
    phm_area_id TEXT NOT NULL DEFAULT '${DEFAULT_PHM_AREA_ID}',
    override_date TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    gn_division TEXT,
    title TEXT NOT NULL,
    notes TEXT,
    is_dirty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS fetal_kick_logs (
    id TEXT PRIMARY KEY,
    phm_area_id TEXT NOT NULL DEFAULT '${DEFAULT_PHM_AREA_ID}',
    pregnancy_id TEXT NOT NULL REFERENCES pregnancies(id),
    log_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    tenth_kick_time TEXT,
    kick_count INTEGER NOT NULL DEFAULT 10,
    duration_minutes INTEGER,
    reduced_movement_flag INTEGER NOT NULL DEFAULT 0,
    is_dirty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS postnatal_meows (
    id TEXT PRIMARY KEY,
    phm_area_id TEXT NOT NULL DEFAULT '${DEFAULT_PHM_AREA_ID}',
    pregnancy_id TEXT NOT NULL REFERENCES pregnancies(id),
    recorded_at TEXT NOT NULL,
    days_postpartum INTEGER NOT NULL,
    bp_systolic INTEGER NOT NULL,
    bp_diastolic INTEGER NOT NULL,
    pulse_bpm INTEGER NOT NULL,
    resp_rate INTEGER NOT NULL,
    temp_c REAL NOT NULL,
    lochia_bleeding TEXT NOT NULL,
    alert_level TEXT NOT NULL,
    action_advice TEXT,
    is_dirty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS mother_transfers (
    id TEXT PRIMARY KEY,
    phm_area_id TEXT NOT NULL DEFAULT '${DEFAULT_PHM_AREA_ID}',
    family_id TEXT NOT NULL REFERENCES families(id),
    mother_id TEXT NOT NULL REFERENCES mothers(id),
    transfer_type TEXT NOT NULL CHECK(transfer_type IN ('TEMP_OUT', 'PERMANENT_TRANSFER')),
    destination_area TEXT,
    expected_return_date TEXT,
    handover_summary_json TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'RETURNED', 'COMPLETED')),
    is_dirty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sync_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_transfers_mother ON mother_transfers(mother_id);
  CREATE INDEX IF NOT EXISTS idx_transfers_family ON mother_transfers(family_id);
  CREATE INDEX IF NOT EXISTS idx_transfers_status ON mother_transfers(status);

  CREATE INDEX IF NOT EXISTS idx_mothers_family ON mothers(family_id);
  CREATE INDEX IF NOT EXISTS idx_mothers_qr ON mothers(qr_token);
  CREATE INDEX IF NOT EXISTS idx_pregnancies_mother ON pregnancies(mother_id);
  CREATE INDEX IF NOT EXISTS idx_pregnancies_status ON pregnancies(status);
  CREATE INDEX IF NOT EXISTS idx_visits_pregnancy ON antenatal_visits(pregnancy_id);
  CREATE INDEX IF NOT EXISTS idx_children_mother ON children(mother_id);
  CREATE INDEX IF NOT EXISTS idx_children_qr ON children(qr_token);
  CREATE INDEX IF NOT EXISTS idx_growth_child ON child_growth_records(child_id);
  CREATE INDEX IF NOT EXISTS idx_immunizations_child ON immunizations(child_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_target ON tasks(target_type, target_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_schedule_templates_day ON schedule_templates(day_of_week);
  CREATE INDEX IF NOT EXISTS idx_schedule_overrides_date ON schedule_overrides(override_date);
  CREATE INDEX IF NOT EXISTS idx_kick_logs_pregnancy ON fetal_kick_logs(pregnancy_id);
  CREATE INDEX IF NOT EXISTS idx_kick_logs_date ON fetal_kick_logs(log_date);
  CREATE INDEX IF NOT EXISTS idx_meows_pregnancy ON postnatal_meows(pregnancy_id);
  CREATE INDEX IF NOT EXISTS idx_meows_date ON postnatal_meows(recorded_at);
`;
