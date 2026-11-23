import { getDatabase } from './database';
import { DEFAULT_PHM_AREA_ID } from './schema';
import * as Crypto from 'expo-crypto';

export interface Task {
  id: string;
  phm_area_id?: string;
  target_type: 'MOTHER' | 'CHILD';
  target_id: string;
  task_type: 'HOME_VISIT' | 'CLINIC_DUE' | 'VOG_REFERRAL' | 'VACCINE_DUE';
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  due_date: string;
  status: 'OPEN' | 'OVERDUE' | 'COMPLETED';
  notes: string;
  is_dirty?: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined fields
  target_name?: string;
  gn_division?: string;
}

export async function getAllTasks(statusFilter?: string): Promise<Task[]> {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];

  // Auto-mark overdue
  await db.runAsync(
    `UPDATE tasks SET status = 'OVERDUE', updated_at = datetime('now'), is_dirty = 1 WHERE status = 'OPEN' AND due_date < ? AND deleted_at IS NULL`,
    [today]
  );

  let query = `
    SELECT t.*, 
      CASE 
        WHEN t.target_type = 'MOTHER' THEN (SELECT full_name FROM mothers WHERE id = t.target_id)
        WHEN t.target_type = 'CHILD' THEN (SELECT full_name FROM children WHERE id = t.target_id)
      END as target_name,
      CASE
        WHEN t.target_type = 'MOTHER' THEN (SELECT f.gn_division FROM mothers m JOIN families f ON f.id = m.family_id WHERE m.id = t.target_id)
        ELSE NULL
      END as gn_division
    FROM tasks t WHERE t.deleted_at IS NULL`;

  const params: string[] = [];
  if (statusFilter) {
    query += ' AND t.status = ?';
    params.push(statusFilter);
  }
  query += " ORDER BY CASE t.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 ELSE 2 END, t.due_date ASC";

  return await db.getAllAsync<Task>(query, params);
}

export async function getTodaysTasks(): Promise<Task[]> {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];

  // Auto-mark overdue
  await db.runAsync(
    `UPDATE tasks SET status = 'OVERDUE', updated_at = datetime('now'), is_dirty = 1 WHERE status = 'OPEN' AND due_date < ? AND deleted_at IS NULL`,
    [today]
  );

  return await db.getAllAsync<Task>(
    `
    SELECT t.*, 
      CASE 
        WHEN t.target_type = 'MOTHER' THEN (SELECT full_name FROM mothers WHERE id = t.target_id)
        WHEN t.target_type = 'CHILD' THEN (SELECT full_name FROM children WHERE id = t.target_id)
      END as target_name,
      CASE
        WHEN t.target_type = 'MOTHER' THEN (SELECT f.gn_division FROM mothers m JOIN families f ON f.id = m.family_id WHERE m.id = t.target_id)
        ELSE NULL
      END as gn_division
    FROM tasks t 
    WHERE t.deleted_at IS NULL AND (t.due_date <= ? OR t.status = 'OVERDUE') AND t.status != 'COMPLETED'
    ORDER BY CASE t.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 ELSE 2 END, t.due_date ASC
  `,
    [today]
  );
}

export async function createTask(data: {
  target_type: 'MOTHER' | 'CHILD';
  target_id: string;
  task_type: 'HOME_VISIT' | 'CLINIC_DUE' | 'VOG_REFERRAL' | 'VACCINE_DUE';
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  due_date: string;
  notes?: string;
  phm_area_id?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const areaId = data.phm_area_id || DEFAULT_PHM_AREA_ID;

  await db.runAsync(
    `INSERT INTO tasks (id, phm_area_id, target_type, target_id, task_type, priority, due_date, status, notes, is_dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, 1)`,
    [id, areaId, data.target_type, data.target_id, data.task_type, data.priority, data.due_date, data.notes || '']
  );
  return id;
}

export async function completeTask(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE tasks SET status = 'COMPLETED', updated_at = datetime('now'), is_dirty = 1 WHERE id = ?`,
    [id]
  );
}

export async function getOverdueTaskCount(): Promise<number> {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  await db.runAsync(
    `UPDATE tasks SET status = 'OVERDUE', updated_at = datetime('now'), is_dirty = 1 WHERE status = 'OPEN' AND due_date < ? AND deleted_at IS NULL`,
    [today]
  );
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM tasks WHERE status = 'OVERDUE' AND deleted_at IS NULL`
  );
  return result?.count || 0;
}
