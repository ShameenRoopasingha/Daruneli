import { getDatabase } from './database';

export interface AreaStats {
  totalMothers: number;
  activeMothers: number;
  redRisk: number;
  yellowRisk: number;
  greenRisk: number;
  totalChildren: number;
  growthFalteringCount: number;
  mamCount: number;
  samCount: number;
  overdueVisits: number;
  overdueVaccines: number;
  totalVaccines: number;
  givenVaccines: number;
  vaccineCompletionPercent: number;
}

export interface MonthlyReport {
  activePregnancies: number;
  newRegistrations: number;
  highRiskCount: number;
  deliveries: number;
  vaccinesGiven: number;
}

export async function getAreaStats(): Promise<AreaStats> {
  const db = await getDatabase();
  
  const mothers = await db.getFirstAsync<{ total: number; active: number }>(
    `SELECT COUNT(*) as total,
     SUM(CASE WHEN EXISTS(SELECT 1 FROM pregnancies p WHERE p.mother_id = m.id AND p.status = 'ACTIVE') THEN 1 ELSE 0 END) as active
     FROM mothers m WHERE m.deleted_at IS NULL`
  );

  const risks = await db.getFirstAsync<{ red: number; yellow: number; green: number }>(
    `SELECT 
     SUM(CASE WHEN risk_level = 'RED' THEN 1 ELSE 0 END) as red,
     SUM(CASE WHEN risk_level = 'YELLOW' THEN 1 ELSE 0 END) as yellow,
     SUM(CASE WHEN risk_level = 'GREEN' THEN 1 ELSE 0 END) as green
     FROM pregnancies WHERE status = 'ACTIVE' AND deleted_at IS NULL`
  );

  const children = await db.getFirstAsync<{ total: number; faltering: number; mam: number; sam: number }>(
    `SELECT COUNT(*) as total,
     SUM(CASE WHEN growth_faltering_flag = 1 THEN 1 ELSE 0 END) as faltering,
     SUM(CASE WHEN nutrition_status = 'MAM' THEN 1 ELSE 0 END) as mam,
     SUM(CASE WHEN nutrition_status = 'SAM' THEN 1 ELSE 0 END) as sam
     FROM children WHERE deleted_at IS NULL`
  );

  const overdueVisits = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM tasks WHERE status = 'OVERDUE' AND task_type IN ('HOME_VISIT','CLINIC_DUE') AND deleted_at IS NULL`
  );

  const vaccines = await db.getFirstAsync<{ total: number; given: number; overdue: number }>(
    `SELECT COUNT(*) as total,
     SUM(CASE WHEN status = 'GIVEN' THEN 1 ELSE 0 END) as given,
     SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END) as overdue
     FROM immunizations WHERE deleted_at IS NULL`
  );

  const totalVax = vaccines?.total || 0;
  const givenVax = vaccines?.given || 0;

  return {
    totalMothers: mothers?.total || 0,
    activeMothers: mothers?.active || 0,
    redRisk: risks?.red || 0,
    yellowRisk: risks?.yellow || 0,
    greenRisk: risks?.green || 0,
    totalChildren: children?.total || 0,
    growthFalteringCount: children?.faltering || 0,
    mamCount: children?.mam || 0,
    samCount: children?.sam || 0,
    overdueVisits: overdueVisits?.count || 0,
    overdueVaccines: vaccines?.overdue || 0,
    totalVaccines: totalVax,
    givenVaccines: givenVax,
    vaccineCompletionPercent: totalVax > 0 ? Math.round((givenVax / totalVax) * 100) : 0,
  };
}

export async function getMonthlyReport(): Promise<MonthlyReport> {
  const db = await getDatabase();
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  
  const active = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM pregnancies WHERE status = 'ACTIVE' AND deleted_at IS NULL`
  );

  const newRegs = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM mothers WHERE created_at >= ? AND deleted_at IS NULL`,
    [firstOfMonth]
  );

  const highRisk = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM pregnancies WHERE risk_level = 'RED' AND status = 'ACTIVE' AND deleted_at IS NULL`
  );

  const deliveries = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM pregnancies WHERE status = 'DELIVERED' AND delivery_date >= ? AND deleted_at IS NULL`,
    [firstOfMonth]
  );

  const vaccinesGiven = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM immunizations WHERE status = 'GIVEN' AND given_date >= ? AND deleted_at IS NULL`,
    [firstOfMonth]
  );

  return {
    activePregnancies: active?.count || 0,
    newRegistrations: newRegs?.count || 0,
    highRiskCount: highRisk?.count || 0,
    deliveries: deliveries?.count || 0,
    vaccinesGiven: vaccinesGiven?.count || 0,
  };
}
