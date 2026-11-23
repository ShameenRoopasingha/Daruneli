import { getDatabase } from './database';
import { DEFAULT_PHM_AREA_ID } from './schema';
import * as Crypto from 'expo-crypto';

export interface Family {
  id: string;
  phm_area_id?: string;
  eligible_family_no: string;
  gn_division: string;
  address: string;
  husband_name: string;
  emergency_phone: string;
  residency_status: 'ACTIVE' | 'TEMP_OUT' | 'TRANSFERRED_OUT';
  gps_lat?: number | null;
  gps_lng?: number | null;
  temp_out_return_date?: string | null;
  transfer_note?: string | null;
  transferred_to_phm_area?: string | null;
  is_dirty?: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Mother {
  id: string;
  phm_area_id?: string;
  family_id: string;
  qr_token: string;
  full_name: string;
  nic: string;
  dob: string;
  phone: string;
  blood_group: string;
  chronic_conditions_json: string;
  fertility_treatment_history: number;
  prev_miscarriages_count: number;
  prev_stillbirths_count: number;
  prev_c_sections_count: number;
  planning_pregnancy: number;
  is_dirty?: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Pregnancy {
  id: string;
  phm_area_id?: string;
  mother_id: string;
  gravida: number;
  para: number;
  lrmp_date: string;
  edd_date: string;
  is_precious_pregnancy: number;
  risk_level: 'GREEN' | 'YELLOW' | 'RED';
  risk_score: number;
  risk_factors_json: string;
  status: 'ACTIVE' | 'DELIVERED' | 'MISCARRIAGE';
  delivery_date: string | null;
  delivery_mode: string | null;
  booking_weight_kg?: number | null;
  booking_height_cm?: number | null;
  booking_bmi?: number | null;
  hospital_delivery_notes_json?: string | null;
  is_dirty?: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AntenatalVisit {
  id: string;
  phm_area_id?: string;
  pregnancy_id: string;
  visit_date: string;
  visit_type: 'HOME' | 'CLINIC' | 'PHONE';
  poa_weeks: number | null;
  sfh_cm?: number | null;
  weight_kg: number | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  hemoglobin: number | null;
  danger_signs_json: string;
  supplements_json: string;
  notes: string;
  next_visit_date: string | null;
  voice_note_local_uri?: string | null;
  voice_note_remote_url?: string | null;
  voice_note_duration_sec?: number | null;
  is_dirty?: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MotherTransfer {
  id: string;
  phm_area_id?: string;
  family_id: string;
  mother_id: string;
  transfer_type: 'TEMP_OUT' | 'PERMANENT_TRANSFER';
  destination_area?: string | null;
  expected_return_date?: string | null;
  handover_summary_json?: string;
  status: 'ACTIVE' | 'RETURNED' | 'COMPLETED';
  is_dirty?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface MotherWithPregnancy extends Mother {
  pregnancy_id?: string;
  risk_level?: 'GREEN' | 'YELLOW' | 'RED';
  risk_score?: number;
  pregnancy_status?: string;
  lrmp_date?: string;
  edd_date?: string;
  gn_division?: string;
  eligible_family_no?: string;
  address?: string;
  husband_name?: string;
  emergency_phone?: string;
  gps_lat?: number | null;
  gps_lng?: number | null;
  residency_status?: 'ACTIVE' | 'TEMP_OUT' | 'TRANSFERRED_OUT';
  temp_out_return_date?: string | null;
  transfer_note?: string | null;
  transferred_to_phm_area?: string | null;
  gravida?: number;
  para?: number;
  is_precious_pregnancy?: number;
  preg_risk_factors?: string;
  risk_factors_json?: string;
  booking_weight_kg?: number | null;
  booking_height_cm?: number | null;
  booking_bmi?: number | null;
  hospital_delivery_notes_json?: string | null;
}

// --- Family Repo ---
export async function createFamily(family: {
  eligible_family_no: string;
  gn_division: string;
  address: string;
  husband_name: string;
  emergency_phone: string;
  residency_status: 'ACTIVE' | 'TEMP_OUT' | 'TRANSFERRED_OUT';
  gps_lat?: number | null;
  gps_lng?: number | null;
  phm_area_id?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const areaId = family.phm_area_id || DEFAULT_PHM_AREA_ID;
  await db.runAsync(
    `INSERT INTO families (id, phm_area_id, eligible_family_no, gn_division, address, husband_name, emergency_phone, residency_status, gps_lat, gps_lng, is_dirty) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, areaId, family.eligible_family_no, family.gn_division, family.address, family.husband_name, family.emergency_phone, family.residency_status, family.gps_lat ?? null, family.gps_lng ?? null]
  );
  return id;
}

export async function updateFamilyGps(familyId: string, lat: number, lng: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE families SET gps_lat = ?, gps_lng = ?, updated_at = datetime('now'), is_dirty = 1 WHERE id = ?`,
    [lat, lng, familyId]
  );
}

// --- Mother Repo ---
export async function getAllMothers(): Promise<MotherWithPregnancy[]> {
  const db = await getDatabase();
  return await db.getAllAsync<MotherWithPregnancy>(`
    SELECT m.*, p.id as pregnancy_id, p.risk_level, p.risk_score, p.status as pregnancy_status, 
           p.lrmp_date, p.edd_date, f.gn_division, f.eligible_family_no,
           f.gps_lat, f.gps_lng, f.residency_status, f.temp_out_return_date
    FROM mothers m
    LEFT JOIN pregnancies p ON p.mother_id = m.id AND p.status = 'ACTIVE' AND p.deleted_at IS NULL
    LEFT JOIN families f ON f.id = m.family_id
    WHERE m.deleted_at IS NULL
    ORDER BY CASE WHEN p.risk_level = 'RED' THEN 0 WHEN p.risk_level = 'YELLOW' THEN 1 ELSE 2 END, m.full_name
  `);
}

export async function getMotherById(id: string): Promise<MotherWithPregnancy | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<MotherWithPregnancy>(`
    SELECT m.*, p.id as pregnancy_id, p.risk_level, p.risk_score, p.status as pregnancy_status,
           p.lrmp_date, p.edd_date, p.risk_factors_json as preg_risk_factors, p.risk_factors_json,
           p.is_precious_pregnancy, p.gravida, p.para, 
           p.booking_weight_kg, p.booking_height_cm, p.booking_bmi, p.hospital_delivery_notes_json,
           f.gn_division, f.eligible_family_no, f.address, f.husband_name, f.emergency_phone,
           f.gps_lat, f.gps_lng, f.residency_status, f.temp_out_return_date, f.transfer_note, f.transferred_to_phm_area
    FROM mothers m
    LEFT JOIN pregnancies p ON p.mother_id = m.id AND p.status = 'ACTIVE' AND p.deleted_at IS NULL
    LEFT JOIN families f ON f.id = m.family_id
    WHERE m.id = ? AND m.deleted_at IS NULL
  `, [id]);
}

export async function getMotherByQR(qrToken: string): Promise<Mother | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Mother>(
    'SELECT * FROM mothers WHERE qr_token = ? AND deleted_at IS NULL', [qrToken]
  );
}

export async function createMother(data: {
  family_id: string;
  full_name: string;
  nic?: string;
  dob?: string;
  phone?: string;
  blood_group?: string;
  chronic_conditions?: string[];
  fertility_treatment_history?: boolean;
  prev_miscarriages_count?: number;
  prev_stillbirths_count?: number;
  prev_c_sections_count?: number;
  planning_pregnancy?: boolean;
  phm_area_id?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const qrToken = `M-${Crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const areaId = data.phm_area_id || DEFAULT_PHM_AREA_ID;

  await db.runAsync(
    `INSERT INTO mothers (id, phm_area_id, family_id, qr_token, full_name, nic, dob, phone, blood_group, 
     chronic_conditions_json, fertility_treatment_history, prev_miscarriages_count, 
     prev_stillbirths_count, prev_c_sections_count, planning_pregnancy, is_dirty) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, areaId, data.family_id, qrToken, data.full_name, data.nic || null, data.dob || null,
     data.phone || null, data.blood_group || null,
     JSON.stringify(data.chronic_conditions || []),
     data.fertility_treatment_history ? 1 : 0,
     data.prev_miscarriages_count || 0, data.prev_stillbirths_count || 0,
     data.prev_c_sections_count || 0, data.planning_pregnancy ? 1 : 0]
  );
  return id;
}

// --- Pregnancy Repo ---
export async function getPregnancy(id: string): Promise<Pregnancy | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Pregnancy>(
    'SELECT * FROM pregnancies WHERE id = ? AND deleted_at IS NULL', [id]
  );
}

export async function getActivePregnancy(motherId: string): Promise<Pregnancy | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Pregnancy>(
    "SELECT * FROM pregnancies WHERE mother_id = ? AND status = 'ACTIVE' AND deleted_at IS NULL", [motherId]
  );
}

export async function createPregnancy(data: {
  mother_id: string;
  gravida: number;
  para: number;
  lrmp_date: string;
  edd_date: string;
  is_precious_pregnancy?: boolean;
  risk_level?: 'GREEN' | 'YELLOW' | 'RED';
  risk_score?: number;
  risk_factors_json?: string;
  phm_area_id?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const areaId = data.phm_area_id || DEFAULT_PHM_AREA_ID;

  await db.runAsync(
    `INSERT INTO pregnancies (id, phm_area_id, mother_id, gravida, para, lrmp_date, edd_date, is_precious_pregnancy,
     risk_level, risk_score, risk_factors_json, status, is_dirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 1)`,
    [id, areaId, data.mother_id, data.gravida, data.para, data.lrmp_date, data.edd_date,
     data.is_precious_pregnancy ? 1 : 0, data.risk_level || 'GREEN', data.risk_score || 0,
     data.risk_factors_json || '[]']
  );
  return id;
}

export async function updatePregnancyRisk(id: string, level: 'GREEN' | 'YELLOW' | 'RED', score: number, factors: string[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE pregnancies SET risk_level = ?, risk_score = ?, risk_factors_json = ?, updated_at = datetime('now'), is_dirty = 1 WHERE id = ?`,
    [level, score, JSON.stringify(factors), id]
  );
}

export async function markDelivered(pregnancyId: string, deliveryDate: string, deliveryMode: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE pregnancies SET status = 'DELIVERED', delivery_date = ?, delivery_mode = ?, updated_at = datetime('now'), is_dirty = 1 WHERE id = ?`,
    [deliveryDate, deliveryMode, pregnancyId]
  );
}

// --- Visit Repo ---
export async function getVisitsForPregnancy(pregnancyId: string): Promise<AntenatalVisit[]> {
  const db = await getDatabase();
  return await db.getAllAsync<AntenatalVisit>(
    'SELECT * FROM antenatal_visits WHERE pregnancy_id = ? AND deleted_at IS NULL ORDER BY visit_date DESC',
    [pregnancyId]
  );
}

export async function createVisit(data: {
  pregnancy_id: string;
  visit_date: string;
  visit_type: 'HOME' | 'CLINIC' | 'PHONE';
  poa_weeks?: number;
  sfh_cm?: number;
  weight_kg?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  hemoglobin?: number;
  danger_signs?: string[];
  supplements?: string[];
  notes?: string;
  next_visit_date?: string;
  voice_note_local_uri?: string;
  voice_note_remote_url?: string;
  voice_note_duration_sec?: number;
  phm_area_id?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const areaId = data.phm_area_id || DEFAULT_PHM_AREA_ID;

  await db.runAsync(
    `INSERT INTO antenatal_visits (id, phm_area_id, pregnancy_id, visit_date, visit_type, poa_weeks, sfh_cm, weight_kg, 
     bp_systolic, bp_diastolic, hemoglobin, danger_signs_json, supplements_json, notes, next_visit_date, 
     voice_note_local_uri, voice_note_remote_url, voice_note_duration_sec, is_dirty) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, areaId, data.pregnancy_id, data.visit_date, data.visit_type, data.poa_weeks ?? null,
     data.sfh_cm ?? null, data.weight_kg ?? null, data.bp_systolic ?? null, data.bp_diastolic ?? null,
     data.hemoglobin ?? null, JSON.stringify(data.danger_signs || []),
     JSON.stringify(data.supplements || []), data.notes || '', data.next_visit_date ?? null,
     data.voice_note_local_uri ?? null, data.voice_note_remote_url ?? null, data.voice_note_duration_sec ?? null]
  );
  return id;
}

// --- Mother Transfer Repo ---
export async function recordMotherTransfer(data: {
  family_id: string;
  mother_id: string;
  transfer_type: 'TEMP_OUT' | 'PERMANENT_TRANSFER';
  destination_area?: string;
  expected_return_date?: string;
  transfer_note?: string;
  handover_summary?: Record<string, any>;
  phm_area_id?: string;
}): Promise<string> {
  const db = await getDatabase();
  const transferId = Crypto.randomUUID();
  const areaId = data.phm_area_id || DEFAULT_PHM_AREA_ID;
  const newStatus = data.transfer_type === 'TEMP_OUT' ? 'TEMP_OUT' : 'TRANSFERRED_OUT';

  await db.withTransactionAsync(async () => {
    // 1. Insert into mother_transfers
    await db.runAsync(
      `INSERT INTO mother_transfers (id, phm_area_id, family_id, mother_id, transfer_type, destination_area, 
       expected_return_date, handover_summary_json, status, is_dirty) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 1)`,
      [
        transferId,
        areaId,
        data.family_id,
        data.mother_id,
        data.transfer_type,
        data.destination_area ?? null,
        data.expected_return_date ?? null,
        JSON.stringify(data.handover_summary || {}),
      ]
    );

    // 2. Update family residency status and transfer metadata
    await db.runAsync(
      `UPDATE families 
       SET residency_status = ?, 
           temp_out_return_date = ?, 
           transfer_note = ?, 
           transferred_to_phm_area = ?, 
           updated_at = datetime('now'), 
           is_dirty = 1 
       WHERE id = ?`,
      [
        newStatus,
        data.expected_return_date ?? null,
        data.transfer_note ?? null,
        data.destination_area ?? null,
        data.family_id,
      ]
    );
  });

  return transferId;
}

export async function markMotherReturned(motherId: string, familyId: string): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    // 1. Mark active transfers for this mother as RETURNED
    await db.runAsync(
      `UPDATE mother_transfers 
       SET status = 'RETURNED', updated_at = datetime('now'), is_dirty = 1 
       WHERE mother_id = ? AND status = 'ACTIVE'`,
      [motherId]
    );

    // 2. Re-activate family status
    await db.runAsync(
      `UPDATE families 
       SET residency_status = 'ACTIVE', 
           temp_out_return_date = NULL, 
           updated_at = datetime('now'), 
           is_dirty = 1 
       WHERE id = ?`,
      [familyId]
    );
  });
}

export async function getLatestTransferForMother(motherId: string): Promise<MotherTransfer | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<MotherTransfer>(
    `SELECT * FROM mother_transfers 
     WHERE mother_id = ? AND deleted_at IS NULL 
     ORDER BY created_at DESC LIMIT 1`,
    [motherId]
  );
}

export async function searchMothers(query: string): Promise<MotherWithPregnancy[]> {
  const db = await getDatabase();
  const q = `%${query}%`;
  return await db.getAllAsync<MotherWithPregnancy>(`
    SELECT m.*, p.id as pregnancy_id, p.risk_level, p.risk_score, p.status as pregnancy_status,
           p.lrmp_date, p.edd_date, f.gn_division, f.eligible_family_no
    FROM mothers m
    LEFT JOIN pregnancies p ON p.mother_id = m.id AND p.status = 'ACTIVE' AND p.deleted_at IS NULL
    LEFT JOIN families f ON f.id = m.family_id
    WHERE m.deleted_at IS NULL AND (
      m.full_name LIKE ? OR m.nic LIKE ? OR f.eligible_family_no LIKE ?
    )
    ORDER BY m.full_name
  `, [q, q, q]);
}
