import { getDatabase } from './database';
import { DEFAULT_PHM_AREA_ID } from './schema';
import * as Crypto from 'expo-crypto';

export interface FetalKickLog {
  id: string;
  phm_area_id?: string;
  pregnancy_id: string;
  log_date: string;
  start_time: string;
  tenth_kick_time: string | null;
  kick_count: number;
  duration_minutes: number | null;
  reduced_movement_flag: number;
  is_dirty?: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PostnatalMeows {
  id: string;
  phm_area_id?: string;
  pregnancy_id: string;
  recorded_at: string;
  days_postpartum: number;
  bp_systolic: number;
  bp_diastolic: number;
  pulse_bpm: number;
  resp_rate: number;
  temp_c: number;
  lochia_bleeding: string;
  alert_level: 'WHITE' | 'YELLOW' | 'RED';
  action_advice: string | null;
  is_dirty?: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export async function getKickLogsForPregnancy(pregnancyId: string): Promise<FetalKickLog[]> {
  const db = await getDatabase();
  return await db.getAllAsync<FetalKickLog>(
    'SELECT * FROM fetal_kick_logs WHERE pregnancy_id = ? AND deleted_at IS NULL ORDER BY log_date ASC',
    [pregnancyId]
  );
}

export async function addKickLog(data: {
  pregnancy_id: string;
  log_date: string;
  start_time: string;
  tenth_kick_time?: string | null;
  kick_count?: number;
  duration_minutes?: number | null;
  reduced_movement_flag?: number;
  phm_area_id?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const areaId = data.phm_area_id || DEFAULT_PHM_AREA_ID;
  const count = data.kick_count ?? 10;
  const reduced = data.reduced_movement_flag ?? 0;
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO fetal_kick_logs (
      id, phm_area_id, pregnancy_id, log_date, start_time,
      tenth_kick_time, kick_count, duration_minutes, reduced_movement_flag,
      is_dirty, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      areaId,
      data.pregnancy_id,
      data.log_date,
      data.start_time,
      data.tenth_kick_time || null,
      count,
      data.duration_minutes ?? null,
      reduced,
      now,
      now,
    ]
  );
  return id;
}

export async function getMeowsLogsForPregnancy(pregnancyId: string): Promise<PostnatalMeows[]> {
  const db = await getDatabase();
  return await db.getAllAsync<PostnatalMeows>(
    'SELECT * FROM postnatal_meows WHERE pregnancy_id = ? AND deleted_at IS NULL ORDER BY recorded_at ASC',
    [pregnancyId]
  );
}

export async function addMeowsLog(data: {
  pregnancy_id: string;
  recorded_at?: string;
  days_postpartum: number;
  bp_systolic: number;
  bp_diastolic: number;
  pulse_bpm: number;
  resp_rate: number;
  temp_c: number;
  lochia_bleeding: string;
  alert_level: string;
  action_advice?: string;
  phm_area_id?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const areaId = data.phm_area_id || DEFAULT_PHM_AREA_ID;
  const recordedAt = data.recorded_at || new Date().toISOString();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO postnatal_meows (
      id, phm_area_id, pregnancy_id, recorded_at, days_postpartum,
      bp_systolic, bp_diastolic, pulse_bpm, resp_rate, temp_c,
      lochia_bleeding, alert_level, action_advice, is_dirty, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      areaId,
      data.pregnancy_id,
      recordedAt,
      data.days_postpartum,
      data.bp_systolic,
      data.bp_diastolic,
      data.pulse_bpm,
      data.resp_rate,
      data.temp_c,
      data.lochia_bleeding,
      data.alert_level,
      data.action_advice || null,
      now,
      now,
    ]
  );
  return id;
}

export async function updateHospitalDeliveryNotes(
  pregnancyId: string,
  notes: Record<string, any>
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE pregnancies 
     SET hospital_delivery_notes_json = ?, updated_at = ?, is_dirty = 1 
     WHERE id = ?`,
    [JSON.stringify(notes), now, pregnancyId]
  );
}
