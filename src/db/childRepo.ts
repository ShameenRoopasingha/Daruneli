import { getDatabase } from './database';
import { DEFAULT_PHM_AREA_ID } from './schema';
import * as Crypto from 'expo-crypto';

export interface Child {
  id: string;
  phm_area_id?: string;
  mother_id: string;
  pregnancy_id: string | null;
  qr_token: string;
  full_name: string;
  dob: string;
  gender: 'M' | 'F';
  birth_weight_kg: number | null;
  gestational_age_at_birth_weeks?: number | null;
  nutrition_status: 'NORMAL' | 'MAM' | 'SAM';
  growth_faltering_flag: number;
  is_dirty?: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined fields
  mother_name?: string;
}

export interface ChildGrowthRecord {
  id: string;
  phm_area_id?: string;
  child_id: string;
  recorded_date: string;
  age_months: number;
  weight_kg: number | null;
  height_cm: number | null;
  head_circumference_cm?: number | null;
  milestones_json: string;
  supplements_json: string;
  is_dirty?: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Immunization {
  id: string;
  phm_area_id?: string;
  child_id: string;
  vaccine_code: string;
  vaccine_name: string;
  scheduled_date: string;
  given_date: string | null;
  status: 'PENDING' | 'GIVEN' | 'OVERDUE';
  is_dirty?: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export async function getAllChildren(): Promise<Child[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Child>(`
    SELECT c.*, m.full_name as mother_name
    FROM children c
    LEFT JOIN mothers m ON m.id = c.mother_id
    WHERE c.deleted_at IS NULL
    ORDER BY c.full_name
  `);
}

export async function getChildById(id: string): Promise<Child | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Child>(`
    SELECT c.*, m.full_name as mother_name
    FROM children c
    LEFT JOIN mothers m ON m.id = c.mother_id
    WHERE c.id = ? AND c.deleted_at IS NULL
  `, [id]);
}

export async function getChildByQR(qrToken: string): Promise<Child | null> {
  if (!qrToken) return null;
  const db = await getDatabase();
  const token = qrToken.trim();

  // 1. Direct match on qr_token
  let child = await db.getFirstAsync<Child>(
    'SELECT * FROM children WHERE qr_token = ? AND deleted_at IS NULL', [token]
  );
  if (child) return child;

  // 2. Direct match on UUID id
  child = await db.getFirstAsync<Child>(
    'SELECT * FROM children WHERE id = ? AND deleted_at IS NULL', [token]
  );
  if (child) return child;

  // 3. If token starts with C- or CHLD-
  if (token.toUpperCase().startsWith('C-') || token.toUpperCase().startsWith('CHLD-')) {
    const stripped = token.replace(/^(CHLD-|C-)/i, '').trim();
    child = await db.getFirstAsync<Child>(
      'SELECT * FROM children WHERE (qr_token LIKE ? OR id LIKE ?) AND deleted_at IS NULL',
      [`%${stripped}%`, `%${stripped}%`]
    );
    if (child) return child;
  }

  return null;
}

export async function createChild(data: {
  mother_id: string;
  pregnancy_id?: string;
  full_name: string;
  dob: string;
  gender: 'M' | 'F';
  birth_weight_kg?: number;
  phm_area_id?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const qrToken = `C-${Crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const areaId = data.phm_area_id || DEFAULT_PHM_AREA_ID;

  await db.runAsync(
    `INSERT INTO children (id, phm_area_id, mother_id, pregnancy_id, qr_token, full_name, dob, gender, birth_weight_kg, is_dirty) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, areaId, data.mother_id, data.pregnancy_id || null, qrToken, data.full_name, data.dob, data.gender, data.birth_weight_kg ?? null]
  );
  return id;
}

export async function updateChildGrowthFlag(childId: string, flag: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE children SET growth_faltering_flag = ?, updated_at = datetime('now'), is_dirty = 1 WHERE id = ?`,
    [flag ? 1 : 0, childId]
  );
}

export async function updateChildNutrition(childId: string, status: 'NORMAL' | 'MAM' | 'SAM'): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE children SET nutrition_status = ?, updated_at = datetime('now'), is_dirty = 1 WHERE id = ?`,
    [status, childId]
  );
}

// --- Growth Records ---
export async function getGrowthRecords(childId: string): Promise<ChildGrowthRecord[]> {
  const db = await getDatabase();
  return await db.getAllAsync<ChildGrowthRecord>(
    'SELECT * FROM child_growth_records WHERE child_id = ? AND deleted_at IS NULL ORDER BY recorded_date ASC',
    [childId]
  );
}

export async function createGrowthRecord(data: {
  child_id: string;
  recorded_date: string;
  age_months: number;
  weight_kg?: number;
  height_cm?: number;
  milestones?: string[];
  supplements?: string[];
  phm_area_id?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const areaId = data.phm_area_id || DEFAULT_PHM_AREA_ID;

  await db.runAsync(
    `INSERT INTO child_growth_records (id, phm_area_id, child_id, recorded_date, age_months, weight_kg, height_cm, milestones_json, supplements_json, is_dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, areaId, data.child_id, data.recorded_date, data.age_months, data.weight_kg ?? null,
     data.height_cm ?? null, JSON.stringify(data.milestones || []), JSON.stringify(data.supplements || [])]
  );
  return id;
}

// --- Immunizations ---
export async function getImmunizations(childId: string): Promise<Immunization[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Immunization>(
    'SELECT * FROM immunizations WHERE child_id = ? AND deleted_at IS NULL ORDER BY scheduled_date ASC',
    [childId]
  );
}

export async function createImmunization(data: {
  child_id: string;
  vaccine_code: string;
  vaccine_name: string;
  scheduled_date: string;
  status?: 'PENDING' | 'GIVEN' | 'OVERDUE';
  phm_area_id?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const areaId = data.phm_area_id || DEFAULT_PHM_AREA_ID;

  await db.runAsync(
    `INSERT INTO immunizations (id, phm_area_id, child_id, vaccine_code, vaccine_name, scheduled_date, status, is_dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, areaId, data.child_id, data.vaccine_code, data.vaccine_name, data.scheduled_date, data.status || 'PENDING']
  );
  return id;
}

export async function markVaccineGiven(immunizationId: string): Promise<void> {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  await db.runAsync(
    `UPDATE immunizations SET status = 'GIVEN', given_date = ?, updated_at = datetime('now'), is_dirty = 1 WHERE id = ?`,
    [today, immunizationId]
  );
}

export async function getOverdueVaccinesCount(): Promise<number> {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  // First update overdue status
  await db.runAsync(
    `UPDATE immunizations SET status = 'OVERDUE', updated_at = datetime('now'), is_dirty = 1 WHERE status = 'PENDING' AND scheduled_date < ? AND deleted_at IS NULL`,
    [today]
  );
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM immunizations WHERE status = 'OVERDUE' AND deleted_at IS NULL`
  );
  return result?.count || 0;
}

export async function searchChildren(query: string): Promise<Child[]> {
  const db = await getDatabase();
  const q = `%${query}%`;
  return await db.getAllAsync<Child>(`
    SELECT c.*, m.full_name as mother_name
    FROM children c
    LEFT JOIN mothers m ON m.id = c.mother_id
    WHERE c.deleted_at IS NULL AND c.full_name LIKE ?
    ORDER BY c.full_name
  `, [q]);
}
