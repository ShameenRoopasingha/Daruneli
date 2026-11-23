import * as Crypto from 'expo-crypto';
import { getDatabase } from '../database';
import { DEFAULT_PHM_AREA_ID } from '../schema';
import { getSyncMeta, setSyncMeta } from '../syncRepo';
import type {
  ScheduleTemplate,
  ScheduleOverride,
  ResolvedDayPlan,
  AutoBalanceProposal,
} from '../../engine/scheduleEngine';

export const DEFAULT_DAILY_HOME_VISIT_CAP = 8;
export const DAILY_CAP_OPTIONS = [6, 8, 10, 12] as const;

/**
 * Gets the persisted daily home visit cap from sync_meta (defaults to 8).
 */
export async function getDailyHomeVisitCap(): Promise<number> {
  const val = await getSyncMeta('daily_home_visit_cap');
  if (!val) return DEFAULT_DAILY_HOME_VISIT_CAP;
  const num = parseInt(val, 10);
  return isNaN(num) ? DEFAULT_DAILY_HOME_VISIT_CAP : num;
}

/**
 * Persists the configured daily home visit cap in sync_meta.
 */
export async function setDailyHomeVisitCap(cap: number): Promise<void> {
  await setSyncMeta('daily_home_visit_cap', String(cap));
}

export interface AutoPopulatedItem {
  id: string;
  type: 'MOTHER' | 'CHILD' | 'TASK' | 'SUMMARY';
  targetId: string;
  name: string;
  gnDivision?: string;
  badgeText: string;
  badgeColor: 'red' | 'yellow' | 'green' | 'blue' | 'gray';
  reason: string;
  phone?: string;
  riskLevel?: string;
  dueDate?: string;
  taskId?: string;
  motherId?: string;
  pregnancyId?: string;
  childId?: string;
  isOverdue?: boolean;
}

/**
 * Returns all active schedule templates ordered by day of week.
 */
export async function getScheduleTemplates(): Promise<ScheduleTemplate[]> {
  const db = await getDatabase();
  return await db.getAllAsync<ScheduleTemplate>(
    'SELECT * FROM schedule_templates WHERE deleted_at IS NULL ORDER BY day_of_week ASC, created_at ASC'
  );
}

/**
 * Upserts a schedule template, generating a valid UUID if none is provided.
 */
export async function upsertScheduleTemplate(
  template: Partial<ScheduleTemplate> & { day_of_week: number; title: string; activity_type: string }
): Promise<ScheduleTemplate> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = template.id || Crypto.randomUUID();
  const phmAreaId = template.phm_area_id || DEFAULT_PHM_AREA_ID;
  const weekPattern = template.week_pattern || 'ALL';
  const activityType = template.activity_type;
  const gnDivision = template.gn_division || null;
  const title = template.title;
  const startTime = template.start_time || '08:30';
  const endTime = template.end_time || '16:00';

  await db.runAsync(
    `INSERT INTO schedule_templates (
      id, phm_area_id, day_of_week, week_pattern, activity_type, gn_division, title, start_time, end_time, is_dirty, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NULL)
    ON CONFLICT(id) DO UPDATE SET
      day_of_week = excluded.day_of_week,
      week_pattern = excluded.week_pattern,
      activity_type = excluded.activity_type,
      gn_division = excluded.gn_division,
      title = excluded.title,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      is_dirty = 1,
      updated_at = excluded.updated_at,
      deleted_at = NULL;`,
    [id, phmAreaId, template.day_of_week, weekPattern, activityType, gnDivision, title, startTime, endTime, now, now]
  );

  return {
    id,
    phm_area_id: phmAreaId,
    day_of_week: template.day_of_week,
    week_pattern: weekPattern as any,
    activity_type: activityType as any,
    gn_division: gnDivision,
    title,
    start_time: startTime,
    end_time: endTime,
    is_dirty: 1,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}

/**
 * Soft deletes a schedule template.
 */
export async function softDeleteScheduleTemplate(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE schedule_templates SET deleted_at = ?, is_dirty = 1, updated_at = ? WHERE id = ?`,
    [now, now, id]
  );
}

/**
 * Gets overrides within a specified date range.
 */
export async function getOverridesForRange(
  startDate: string,
  endDate: string
): Promise<ScheduleOverride[]> {
  const db = await getDatabase();
  const start = startDate.split('T')[0];
  const end = endDate.split('T')[0];
  return await db.getAllAsync<ScheduleOverride>(
    'SELECT * FROM schedule_overrides WHERE override_date BETWEEN ? AND ? AND deleted_at IS NULL ORDER BY override_date ASC',
    [start, end]
  );
}

/**
 * Upserts a day override.
 */
export async function upsertScheduleOverride(
  override: Partial<ScheduleOverride> & { override_date: string; activity_type: string; title: string }
): Promise<ScheduleOverride> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = override.id || Crypto.randomUUID();
  const phmAreaId = override.phm_area_id || DEFAULT_PHM_AREA_ID;
  const overrideDate = override.override_date.split('T')[0];
  const activityType = override.activity_type;
  const gnDivision = override.gn_division || null;
  const title = override.title;
  const notes = override.notes || null;

  // Clear existing override for this date if it has a different ID
  await db.runAsync(
    `UPDATE schedule_overrides SET deleted_at = ?, is_dirty = 1, updated_at = ? WHERE override_date = ? AND id != ? AND deleted_at IS NULL`,
    [now, now, overrideDate, id]
  );

  await db.runAsync(
    `INSERT INTO schedule_overrides (
      id, phm_area_id, override_date, activity_type, gn_division, title, notes, is_dirty, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NULL)
    ON CONFLICT(id) DO UPDATE SET
      override_date = excluded.override_date,
      activity_type = excluded.activity_type,
      gn_division = excluded.gn_division,
      title = excluded.title,
      notes = excluded.notes,
      is_dirty = 1,
      updated_at = excluded.updated_at,
      deleted_at = NULL;`,
    [id, phmAreaId, overrideDate, activityType, gnDivision, title, notes, now, now]
  );

  return {
    id,
    phm_area_id: phmAreaId,
    override_date: overrideDate,
    activity_type: activityType as any,
    gn_division: gnDivision,
    title,
    notes,
    is_dirty: 1,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}

/**
 * Clears an override for a specific date (reverting back to template).
 */
export async function clearOverrideForDate(dateStr: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const dateKey = dateStr.split('T')[0];
  await db.runAsync(
    `UPDATE schedule_overrides SET deleted_at = ?, is_dirty = 1, updated_at = ? WHERE override_date = ? AND deleted_at IS NULL`,
    [now, now, dateKey]
  );
}

/**
 * Gets all distinct GN Divisions registered across families.
 */
export async function getDistinctGnDivisions(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ gn_division: string }>(
    `SELECT DISTINCT gn_division FROM families WHERE deleted_at IS NULL AND gn_division IS NOT NULL ORDER BY gn_division ASC`
  );
  return rows.map((r) => r.gn_division).filter(Boolean);
}

/**
 * Reschedules a task to exactly 7 days later and marks it dirty for sync.
 */
export async function rescheduleTaskNextWeek(taskId: string): Promise<void> {
  const db = await getDatabase();
  const task = await db.getFirstAsync<{ due_date: string }>(
    'SELECT due_date FROM tasks WHERE id = ?',
    [taskId]
  );
  if (!task) return;

  const currentDue = new Date(task.due_date);
  currentDue.setDate(currentDue.getDate() + 7);
  const newDue = currentDue.toISOString().split('T')[0];
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE tasks SET due_date = ?, status = 'OPEN', updated_at = ?, is_dirty = 1 WHERE id = ?`,
    [newDue, now, taskId]
  );
}

/**
 * Reschedules a single item (task, mother, or child visit) to a specific target date.
 */
export async function rescheduleItemToDate(
  item: AutoPopulatedItem,
  targetDate: string,
  notes?: string
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const cleanTargetDate = targetDate.split('T')[0];

  if (item.taskId) {
    await db.runAsync(
      `UPDATE tasks SET due_date = ?, status = 'OPEN', updated_at = ?, is_dirty = 1 WHERE id = ?`,
      [cleanTargetDate, now, item.taskId]
    );
  } else {
    const newTaskId = Crypto.randomUUID();
    const targetType = item.childId ? 'CHILD' : 'MOTHER';
    const targetId = item.targetId || item.motherId || item.childId || '';
    const taskNotes = notes || `Manually rescheduled visit for ${item.name}`;

    await db.runAsync(
      `INSERT INTO tasks (
        id, phm_area_id, target_type, target_id, task_type, priority, due_date, status, notes, is_dirty, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'HOME_VISIT', 'NORMAL', ?, 'OPEN', ?, 1, ?, ?)`,
      [newTaskId, DEFAULT_PHM_AREA_ID, targetType, targetId, cleanTargetDate, taskNotes, now, now]
    );
  }
}

/**
 * Applies an auto-balance proposal, moving each proposed item to its assigned target date.
 */
export async function applyAutoBalancePlan(proposal: AutoBalanceProposal): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  for (const move of proposal.moves) {
    if (move.taskId) {
      await db.runAsync(
        `UPDATE tasks SET due_date = ?, status = 'OPEN', updated_at = ?, is_dirty = 1 WHERE id = ?`,
        [move.toDate, now, move.taskId]
      );
    } else {
      const newTaskId = Crypto.randomUUID();
      const taskNotes = `Auto-balanced from ${move.fromDate} (${move.toDayLabel})`;

      await db.runAsync(
        `INSERT INTO tasks (
          id, phm_area_id, target_type, target_id, task_type, priority, due_date, status, notes, is_dirty, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'HOME_VISIT', 'NORMAL', ?, 'OPEN', ?, 1, ?, ?)`,
        [newTaskId, DEFAULT_PHM_AREA_ID, move.targetType, move.targetId, move.toDate, taskNotes, now, now]
      );
    }
  }
}

/**
 * Auto-populates actionable items for the given day based on the resolved activity plan.
 */
export async function getAutoPopulatedItemsForDay(
  _dateStr: string,
  resolvedPlan: ResolvedDayPlan
): Promise<AutoPopulatedItem[]> {
  const db = await getDatabase();
  const items: AutoPopulatedItem[] = [];

  const activity = resolvedPlan.activity_type;

  if (activity === 'HOLIDAY' || activity === 'LEAVE' || activity === 'OFF') {
    return items;
  }

  if (activity === 'MOH_OFFICE') {
    items.push({
      id: 'moh_office_summary',
      type: 'SUMMARY',
      targetId: 'moh_office',
      name: 'MOH Office Monthly Conference & H509 Review',
      badgeText: 'H509 වාර්තාව (Monthly Return)',
      badgeColor: 'blue',
      reason: 'Review maternal & child health returns, immunization tallies, and submit H509 monthly report.',
    });
    return items;
  }

  // 1. HOME VISIT: Pull mothers in assigned GN division with RED risk pinned at top, plus active tasks in that GN division
  if (activity === 'HOME_VISIT') {
    const gn = resolvedPlan.gn_division;

    // A. Overdue & high-priority tasks in this GN division
    const taskRows = await db.getAllAsync<{
      id: string;
      target_type: 'MOTHER' | 'CHILD';
      target_id: string;
      task_type: string;
      priority: string;
      due_date: string;
      status: string;
      notes: string;
      target_name: string;
      gn_division: string;
      phone: string;
    }>(
      `SELECT t.*, 
        CASE WHEN t.target_type = 'MOTHER' THEN m.full_name ELSE c.full_name END as target_name,
        f.gn_division,
        CASE WHEN t.target_type = 'MOTHER' THEN m.phone ELSE mp.phone END as phone
       FROM tasks t
       LEFT JOIN mothers m ON t.target_type = 'MOTHER' AND t.target_id = m.id
       LEFT JOIN children c ON t.target_type = 'CHILD' AND t.target_id = c.id
       LEFT JOIN mothers mp ON c.mother_id = mp.id
       LEFT JOIN families f ON (m.family_id = f.id OR mp.family_id = f.id)
       WHERE t.deleted_at IS NULL AND t.status IN ('OPEN', 'OVERDUE')
         AND (? IS NULL OR f.gn_division = ?)
       ORDER BY CASE WHEN t.status = 'OVERDUE' THEN 0 WHEN t.priority = 'URGENT' THEN 1 ELSE 2 END, t.due_date ASC`,
      [gn || null, gn || null]
    );

    for (const t of taskRows) {
      const isOverdue = t.status === 'OVERDUE';
      items.push({
        id: `task_${t.id}`,
        type: 'TASK',
        targetId: t.target_id,
        taskId: t.id,
        name: t.target_name || 'Care Recipient',
        gnDivision: t.gn_division,
        badgeText: isOverdue ? 'ප්‍රමාදයි (Overdue)' : t.priority === 'URGENT' ? 'හදිසි (Urgent)' : 'නියමිත කාර්යය',
        badgeColor: isOverdue || t.priority === 'URGENT' ? 'red' : 'yellow',
        reason: t.notes || `${t.task_type} due on ${t.due_date}`,
        phone: t.phone,
        dueDate: t.due_date,
        motherId: t.target_type === 'MOTHER' ? t.target_id : undefined,
        childId: t.target_type === 'CHILD' ? t.target_id : undefined,
        isOverdue,
      });
    }

    // B. Mothers in this GN Division (Active Pregnancies with RED risk pinned at top)
    const motherRows = await db.getAllAsync<{
      mother_id: string;
      full_name: string;
      phone: string;
      gn_division: string;
      pregnancy_id: string | null;
      risk_level: string | null;
      risk_score: number | null;
      edd_date: string | null;
    }>(
      `SELECT m.id as mother_id, m.full_name, m.phone, f.gn_division,
              p.id as pregnancy_id, p.risk_level, p.risk_score, p.edd_date
       FROM mothers m
       JOIN families f ON m.family_id = f.id
       LEFT JOIN pregnancies p ON p.mother_id = m.id AND p.status = 'ACTIVE'
       WHERE m.deleted_at IS NULL
         AND (? IS NULL OR f.gn_division = ?)
       ORDER BY 
         CASE WHEN p.risk_level = 'RED' THEN 0 
              WHEN p.risk_level = 'YELLOW' THEN 1 
              ELSE 2 END,
         m.full_name ASC`,
      [gn || null, gn || null]
    );

    for (const m of motherRows) {
      // Don't duplicate if already added as task
      if (items.some((item) => item.targetId === m.mother_id)) continue;

      const isRed = m.risk_level === 'RED';
      const isYellow = m.risk_level === 'YELLOW';
      const badgeColor = isRed ? 'red' : isYellow ? 'yellow' : 'green';
      const badgeText = isRed
        ? 'ඉහළ අවදානම (High Risk)'
        : isYellow
        ? 'මධ්‍යම අවදානම (Moderate)'
        : 'සාමාන්‍ය ගැබ් ගැනීම';

      const reason = isRed
        ? `Home Visit: Intensive monitoring required (Risk Score: ${m.risk_score || 0})`
        : m.edd_date
        ? `Home Visit: Routine prenatal assessment (EDD: ${m.edd_date})`
        : 'Home Visit: Community maternal health follow-up';

      items.push({
        id: `mother_${m.mother_id}`,
        type: 'MOTHER',
        targetId: m.mother_id,
        motherId: m.mother_id,
        pregnancyId: m.pregnancy_id || undefined,
        name: m.full_name,
        gnDivision: m.gn_division,
        badgeText,
        badgeColor,
        reason,
        phone: m.phone,
        riskLevel: m.risk_level || undefined,
      });
    }

    // C. Growth faltering children in this GN division
    const falteringChildren = await db.getAllAsync<{
      id: string;
      full_name: string;
      nutrition_status: string;
      growth_faltering_flag: number;
      gn_division: string;
      phone: string;
    }>(
      `SELECT c.id, c.full_name, c.nutrition_status, c.growth_faltering_flag, f.gn_division, m.phone
       FROM children c
       JOIN mothers m ON c.mother_id = m.id
       JOIN families f ON m.family_id = f.id
       WHERE c.deleted_at IS NULL AND c.growth_faltering_flag = 1
         AND (? IS NULL OR f.gn_division = ?)`,
      [gn || null, gn || null]
    );

    for (const c of falteringChildren) {
      if (items.some((item) => item.targetId === c.id)) continue;
      items.push({
        id: `child_${c.id}`,
        type: 'CHILD',
        targetId: c.id,
        childId: c.id,
        name: c.full_name,
        gnDivision: c.gn_division,
        badgeText: 'වර්ධන අඩාලයි (Growth Faltering)',
        badgeColor: 'red',
        reason: `Nutritional assessment: Child flagged with faltering weight (${c.nutrition_status}). Check Thriposha and feeding.`,
        phone: c.phone,
      });
    }

    return items;
  }

  // 2. ANC_CLINIC: Active pregnant mothers due for clinic visit + all RED risk mothers
  if (activity === 'ANC_CLINIC') {
    const mothers = await db.getAllAsync<{
      mother_id: string;
      pregnancy_id: string;
      full_name: string;
      phone: string;
      gn_division: string;
      risk_level: string;
      risk_score: number;
      edd_date: string;
      next_visit_date: string | null;
    }>(
      `SELECT m.id as mother_id, p.id as pregnancy_id, m.full_name, m.phone, f.gn_division,
              p.risk_level, p.risk_score, p.edd_date,
              (SELECT next_visit_date FROM antenatal_visits v WHERE v.pregnancy_id = p.id AND v.deleted_at IS NULL ORDER BY visit_date DESC LIMIT 1) as next_visit_date
       FROM pregnancies p
       JOIN mothers m ON p.mother_id = m.id
       JOIN families f ON m.family_id = f.id
       WHERE p.deleted_at IS NULL AND p.status = 'ACTIVE'
       ORDER BY CASE WHEN p.risk_level = 'RED' THEN 0 WHEN p.risk_level = 'YELLOW' THEN 1 ELSE 2 END, m.full_name ASC`
    );

    for (const m of mothers) {
      const isRed = m.risk_level === 'RED';
      const badgeColor = isRed ? 'red' : m.risk_level === 'YELLOW' ? 'yellow' : 'blue';
      const badgeText = isRed ? 'ඉහළ අවදානම් මව' : 'සායන පරීක්ෂාව';
      const reason = isRed
        ? `ANC Clinic: Specialist / VOG referral surveillance (Risk Score: ${m.risk_score})`
        : m.next_visit_date
        ? `ANC Clinic: Follow-up visit scheduled on ${m.next_visit_date}`
        : `ANC Clinic: Routine antenatal physical & lab screening (EDD: ${m.edd_date})`;

      items.push({
        id: `anc_${m.mother_id}`,
        type: 'MOTHER',
        targetId: m.mother_id,
        motherId: m.mother_id,
        pregnancyId: m.pregnancy_id,
        name: m.full_name,
        gnDivision: m.gn_division,
        badgeText,
        badgeColor,
        reason,
        phone: m.phone,
        riskLevel: m.risk_level,
      });
    }

    return items;
  }

  // 3. CWC_CLINIC: Children with pending/overdue immunizations, faltering growth, or unweighed
  if (activity === 'CWC_CLINIC') {
    // A. Immunization due / overdue
    const immRows = await db.getAllAsync<{
      imm_id: string;
      child_id: string;
      child_name: string;
      vaccine_code: string;
      vaccine_name: string;
      scheduled_date: string;
      imm_status: string;
      phone: string;
      gn_division: string;
    }>(
      `SELECT i.id as imm_id, i.child_id, c.full_name as child_name, i.vaccine_code, i.vaccine_name,
              i.scheduled_date, i.status as imm_status, m.phone, f.gn_division
       FROM immunizations i
       JOIN children c ON i.child_id = c.id
       JOIN mothers m ON c.mother_id = m.id
       JOIN families f ON m.family_id = f.id
       WHERE i.deleted_at IS NULL AND i.status IN ('PENDING', 'OVERDUE')
       ORDER BY CASE WHEN i.status = 'OVERDUE' THEN 0 ELSE 1 END, i.scheduled_date ASC`
    );

    for (const imm of immRows) {
      const isOverdue = imm.imm_status === 'OVERDUE';
      items.push({
        id: `imm_${imm.imm_id}`,
        type: 'CHILD',
        targetId: imm.child_id,
        childId: imm.child_id,
        name: imm.child_name,
        gnDivision: imm.gn_division,
        badgeText: isOverdue ? `ප්‍රමාද එන්නත: ${imm.vaccine_code}` : `නියමිත එන්නත: ${imm.vaccine_code}`,
        badgeColor: isOverdue ? 'red' : 'blue',
        reason: `EPI Clinic: ${imm.vaccine_name} due (${imm.scheduled_date})`,
        phone: imm.phone,
        isOverdue,
      });
    }

    // B. Faltering growth children
    const faltering = await db.getAllAsync<{
      id: string;
      full_name: string;
      nutrition_status: string;
      phone: string;
      gn_division: string;
    }>(
      `SELECT c.id, c.full_name, c.nutrition_status, m.phone, f.gn_division
       FROM children c
       JOIN mothers m ON c.mother_id = m.id
       JOIN families f ON m.family_id = f.id
       WHERE c.deleted_at IS NULL AND c.growth_faltering_flag = 1`
    );

    for (const f of faltering) {
      if (items.some((i) => i.targetId === f.id)) continue;
      items.push({
        id: `cwc_faltering_${f.id}`,
        type: 'CHILD',
        targetId: f.id,
        childId: f.id,
        name: f.full_name,
        gnDivision: f.gn_division,
        badgeText: 'වර්ධන ගැටලුවක්',
        badgeColor: 'red',
        reason: `CWC Clinic: Weight monitoring and Thriposha nutritional review (${f.nutrition_status})`,
        phone: f.phone,
      });
    }

    return items;
  }

  // 4. CATCH_UP: Overdue tasks and overdue vaccines across entire area
  if (activity === 'CATCH_UP') {
    const overdueTasks = await db.getAllAsync<{
      id: string;
      target_type: 'MOTHER' | 'CHILD';
      target_id: string;
      task_type: string;
      priority: string;
      due_date: string;
      notes: string;
      target_name: string;
      gn_division: string;
      phone: string;
    }>(
      `SELECT t.*,
        CASE WHEN t.target_type = 'MOTHER' THEN m.full_name ELSE c.full_name END as target_name,
        f.gn_division,
        CASE WHEN t.target_type = 'MOTHER' THEN m.phone ELSE mp.phone END as phone
       FROM tasks t
       LEFT JOIN mothers m ON t.target_type = 'MOTHER' AND t.target_id = m.id
       LEFT JOIN children c ON t.target_type = 'CHILD' AND t.target_id = c.id
       LEFT JOIN mothers mp ON c.mother_id = mp.id
       LEFT JOIN families f ON (m.family_id = f.id OR mp.family_id = f.id)
       WHERE t.deleted_at IS NULL AND (t.status = 'OVERDUE' OR t.priority = 'URGENT')
       ORDER BY t.due_date ASC`
    );

    for (const t of overdueTasks) {
      items.push({
        id: `catchup_task_${t.id}`,
        type: 'TASK',
        targetId: t.target_id,
        taskId: t.id,
        name: t.target_name || 'Care Recipient',
        gnDivision: t.gn_division,
        badgeText: 'මගහැරුණු කාර්යය (Overdue)',
        badgeColor: 'red',
        reason: t.notes || `${t.task_type} missed (Due: ${t.due_date})`,
        phone: t.phone,
        dueDate: t.due_date,
        motherId: t.target_type === 'MOTHER' ? t.target_id : undefined,
        childId: t.target_type === 'CHILD' ? t.target_id : undefined,
        isOverdue: true,
      });
    }

    const overdueVaccines = await db.getAllAsync<{
      imm_id: string;
      child_id: string;
      child_name: string;
      vaccine_code: string;
      vaccine_name: string;
      scheduled_date: string;
      phone: string;
      gn_division: string;
    }>(
      `SELECT i.id as imm_id, i.child_id, c.full_name as child_name, i.vaccine_code, i.vaccine_name,
              i.scheduled_date, m.phone, f.gn_division
       FROM immunizations i
       JOIN children c ON i.child_id = c.id
       JOIN mothers m ON c.mother_id = m.id
       JOIN families f ON m.family_id = f.id
       WHERE i.deleted_at IS NULL AND i.status = 'OVERDUE'
       ORDER BY i.scheduled_date ASC`
    );

    for (const v of overdueVaccines) {
      if (items.some((i) => i.targetId === v.child_id)) continue;
      items.push({
        id: `catchup_imm_${v.imm_id}`,
        type: 'CHILD',
        targetId: v.child_id,
        childId: v.child_id,
        name: v.child_name,
        gnDivision: v.gn_division,
        badgeText: `ප්‍රමාද එන්නත: ${v.vaccine_code}`,
        badgeColor: 'red',
        reason: `Catch-up field vaccination: ${v.vaccine_name} (Scheduled: ${v.scheduled_date})`,
        phone: v.phone,
        isOverdue: true,
      });
    }

    return items;
  }

  return items;
}
