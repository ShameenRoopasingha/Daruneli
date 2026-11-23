import { getDatabase } from '../db';
import { calculatePOA, formatPOA } from '../engine/pregnancyCalc';
import { formatDate, formatDateTime } from '../utils/dateFormat';

export interface H509ReportParams {
  year: number;
  month: number; // 1 - 12
  phmAreaName?: string;
  mohDivision?: string;
}

export interface RedRiskMotherSummary {
  name: string;
  nic: string;
  gnDivision: string;
  poaString: string;
  riskReasons: string[];
}

export interface OverdueTaskSummary {
  targetName: string;
  taskType: string;
  priority: string;
  dueDate: string;
  notes: string;
}

export interface H509ReportData {
  metadata: {
    year: number;
    month: number;
    monthName: string;
    reportingPeriod: string;
    phmAreaName: string;
    mohDivision: string;
    generatedAt: string;
  };
  section1_antenatal: {
    activePregnantMothers: number;
    newRegistrations: number;
    riskBreakdown: {
      red: number;
      yellow: number;
      green: number;
    };
    totalVisits: number;
    homeVisits: number;
    clinicVisits: number;
    phoneVisits: number;
    urgentReferralsTriggered: number;
    lowHemoglobinCount: number; // Hb < 10.0
  };
  section2_deliveries: {
    totalDeliveries: number;
    vaginalDeliveries: number;
    caesareanDeliveries: number;
    instrumentalDeliveries: number;
    miscarriagesRecorded: number;
    lowBirthWeightCount: number; // < 2.5kg
  };
  section3_childHealth: {
    totalRegisteredChildren: number;
    childrenWeighedInMonth: number;
    weighingCoveragePercent: number;
    nutritionStatus: {
      normal: number;
      mam: number;
      sam: number;
    };
    activeGrowthFalteringAlerts: number;
  };
  section4_immunizations: {
    vaccineDosesGiven: Record<string, number>;
    totalDosesInMonth: number;
    currentlyOverdueDoses: number;
  };
  section5_priorityFollowUp: {
    redRiskMothers: RedRiskMotherSummary[];
    overdueTasks: OverdueTaskSummary[];
  };
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export async function aggregateH509Data(params: H509ReportParams): Promise<H509ReportData> {
  const db = await getDatabase();
  const { year, month } = params;

  const monthStr = String(month).padStart(2, '0');
  const monthName = MONTH_NAMES[month - 1] || `Month ${month}`;

  // Start & End of reporting month
  const startDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
  const endOfMonthIso = `${endDate}T23:59:59.999Z`;

  const nowIso = new Date().toISOString();

  // ---------------------------------------------------------------------------
  // SECTION 1: ANTENATAL CARE
  // ---------------------------------------------------------------------------
  // Active pregnant mothers at month-end
  const activeMothersRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT mother_id) as count FROM pregnancies 
     WHERE status = 'ACTIVE' AND created_at <= ? AND deleted_at IS NULL`,
    [endOfMonthIso]
  );

  // New registrations in month
  const newRegsRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM mothers 
     WHERE created_at >= ? AND created_at <= ? AND deleted_at IS NULL`,
    [startDate, endOfMonthIso]
  );

  // Risk breakdown
  const riskRows = await db.getFirstAsync<{ red: number; yellow: number; green: number }>(
    `SELECT 
       SUM(CASE WHEN risk_level = 'RED' THEN 1 ELSE 0 END) as red,
       SUM(CASE WHEN risk_level = 'YELLOW' THEN 1 ELSE 0 END) as yellow,
       SUM(CASE WHEN risk_level = 'GREEN' THEN 1 ELSE 0 END) as green
     FROM pregnancies WHERE status = 'ACTIVE' AND deleted_at IS NULL`
  );

  // Visits in month
  const visitsBreakdown = await db.getFirstAsync<{
    total: number;
    home: number;
    clinic: number;
    phone: number;
    urgent: number;
    lowHb: number;
  }>(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN visit_type = 'HOME' THEN 1 ELSE 0 END) as home,
       SUM(CASE WHEN visit_type = 'CLINIC' THEN 1 ELSE 0 END) as clinic,
       SUM(CASE WHEN visit_type = 'PHONE' THEN 1 ELSE 0 END) as phone,
       SUM(CASE WHEN bp_systolic >= 140 OR bp_diastolic >= 90 OR danger_signs_json != '[]' THEN 1 ELSE 0 END) as urgent,
       SUM(CASE WHEN hemoglobin IS NOT NULL AND hemoglobin < 10.0 THEN 1 ELSE 0 END) as lowHb
     FROM antenatal_visits 
     WHERE visit_date >= ? AND visit_date <= ? AND deleted_at IS NULL`,
    [startDate, endDate]
  );

  // ---------------------------------------------------------------------------
  // SECTION 2: DELIVERIES & OUTCOMES
  // ---------------------------------------------------------------------------
  const deliveriesBreakdown = await db.getFirstAsync<{
    total: number;
    nvd: number;
    cs: number;
    inst: number;
    miscarriage: number;
  }>(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN delivery_mode IN ('VAGINAL', 'NORMAL') THEN 1 ELSE 0 END) as nvd,
       SUM(CASE WHEN delivery_mode IN ('CS', 'CAESAREAN') THEN 1 ELSE 0 END) as cs,
       SUM(CASE WHEN delivery_mode = 'INSTRUMENTAL' THEN 1 ELSE 0 END) as inst,
       SUM(CASE WHEN status = 'MISCARRIAGE' THEN 1 ELSE 0 END) as miscarriage
     FROM pregnancies 
     WHERE delivery_date >= ? AND delivery_date <= ? AND deleted_at IS NULL`,
    [startDate, endDate]
  );

  const lowBirthWeightRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM children 
     WHERE dob >= ? AND dob <= ? AND birth_weight_kg IS NOT NULL AND birth_weight_kg < 2.5 AND deleted_at IS NULL`,
    [startDate, endDate]
  );

  // ---------------------------------------------------------------------------
  // SECTION 3: CHILD HEALTH & NUTRITION
  // ---------------------------------------------------------------------------
  const totalChildrenRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM children WHERE created_at <= ? AND deleted_at IS NULL`,
    [endOfMonthIso]
  );

  const weighedChildrenRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT child_id) as count FROM child_growth_records 
     WHERE recorded_date >= ? AND recorded_date <= ? AND deleted_at IS NULL`,
    [startDate, endDate]
  );

  const nutritionBreakdown = await db.getFirstAsync<{
    normal: number;
    mam: number;
    sam: number;
    faltering: number;
  }>(
    `SELECT 
       SUM(CASE WHEN nutrition_status = 'NORMAL' THEN 1 ELSE 0 END) as normal,
       SUM(CASE WHEN nutrition_status = 'MAM' THEN 1 ELSE 0 END) as mam,
       SUM(CASE WHEN nutrition_status = 'SAM' THEN 1 ELSE 0 END) as sam,
       SUM(CASE WHEN growth_faltering_flag = 1 THEN 1 ELSE 0 END) as faltering
     FROM children WHERE deleted_at IS NULL`
  );

  const totalChildren = totalChildrenRow?.count || 0;
  const weighedCount = weighedChildrenRow?.count || 0;
  const weighingCoverage = totalChildren > 0 ? Math.round((weighedCount / totalChildren) * 100) : 0;

  // ---------------------------------------------------------------------------
  // SECTION 4: IMMUNIZATIONS (GIVEN IN MONTH)
  // ---------------------------------------------------------------------------
  const vaccineRows = await db.getAllAsync<{ vaccine_code: string; count: number }>(
    `SELECT vaccine_code, COUNT(*) as count 
     FROM immunizations 
     WHERE status = 'GIVEN' AND given_date >= ? AND given_date <= ? AND deleted_at IS NULL
     GROUP BY vaccine_code`,
    [startDate, endDate]
  );

  const vaccineMap: Record<string, number> = {
    BCG: 0,
    PENTA1: 0,
    PENTA2: 0,
    PENTA3: 0,
    OPV1: 0,
    OPV2: 0,
    OPV3: 0,
    OPV4: 0,
    OPV5: 0,
    FIPV1: 0,
    FIPV2: 0,
    MMR1: 0,
    LIVE_JE: 0,
    DTP4: 0,
    MMR2: 0,
    DT: 0,
  };

  let totalDosesGiven = 0;
  vaccineRows.forEach((r) => {
    vaccineMap[r.vaccine_code] = r.count;
    totalDosesGiven += r.count;
  });

  const overdueVaccinesRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM immunizations WHERE status = 'OVERDUE' AND deleted_at IS NULL`
  );

  // ---------------------------------------------------------------------------
  // SECTION 5: PRIORITY FOLLOW-UP (RED MOTHERS & OVERDUE TASKS)
  // ---------------------------------------------------------------------------
  const redMothersDb = await db.getAllAsync<{
    full_name: string;
    nic: string;
    gn_division: string;
    lrmp_date: string;
    risk_factors_json: string;
  }>(`
    SELECT m.full_name, m.nic, f.gn_division, p.lrmp_date, p.risk_factors_json
    FROM mothers m
    JOIN pregnancies p ON p.mother_id = m.id AND p.status = 'ACTIVE' AND p.risk_level = 'RED'
    LEFT JOIN families f ON f.id = m.family_id
    WHERE m.deleted_at IS NULL
    LIMIT 10
  `);

  const redRiskMothers: RedRiskMotherSummary[] = redMothersDb.map((rm) => {
    let poaString = 'N/A';
    if (rm.lrmp_date) {
      poaString = formatPOA(calculatePOA(new Date(rm.lrmp_date)));
    }
    let riskReasons: string[] = [];
    try {
      riskReasons = JSON.parse(rm.risk_factors_json || '[]');
    } catch {
      riskReasons = [];
    }

    return {
      name: rm.full_name,
      nic: rm.nic || 'N/A',
      gnDivision: rm.gn_division || 'Kottawa',
      poaString,
      riskReasons,
    };
  });

  const overdueTasksDb = await db.getAllAsync<{
    target_type: string;
    target_id: string;
    task_type: string;
    priority: string;
    due_date: string;
    notes: string;
  }>(`
    SELECT target_type, target_id, task_type, priority, due_date, notes
    FROM tasks
    WHERE status = 'OVERDUE' AND deleted_at IS NULL
    ORDER BY CASE priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 ELSE 2 END, due_date ASC
    LIMIT 10
  `);

  const overdueTasks: OverdueTaskSummary[] = [];
  for (const t of overdueTasksDb) {
    let targetName = 'Beneficiary';
    if (t.target_type === 'MOTHER') {
      const mRow = await db.getFirstAsync<{ full_name: string }>(
        'SELECT full_name FROM mothers WHERE id = ?',
        [t.target_id]
      );
      if (mRow) targetName = mRow.full_name;
    } else {
      const cRow = await db.getFirstAsync<{ full_name: string }>(
        'SELECT full_name FROM children WHERE id = ?',
        [t.target_id]
      );
      if (cRow) targetName = cRow.full_name;
    }

    overdueTasks.push({
      targetName,
      taskType: t.task_type.replace('_', ' '),
      priority: t.priority,
      dueDate: formatDate(t.due_date),
      notes: t.notes || '',
    });
  }

  return {
    metadata: {
      year,
      month,
      monthName,
      reportingPeriod: `${monthName} ${year} (${formatDate(startDate)} to ${formatDate(endDate)})`,
      phmAreaName: params.phmAreaName || 'Kottawa North (PHM/MAH/01)',
      mohDivision: params.mohDivision || 'Maharagama',
      generatedAt: formatDateTime(new Date()),
    },
    section1_antenatal: {
      activePregnantMothers: activeMothersRow?.count || 0,
      newRegistrations: newRegsRow?.count || 0,
      riskBreakdown: {
        red: riskRows?.red || 0,
        yellow: riskRows?.yellow || 0,
        green: riskRows?.green || 0,
      },
      totalVisits: visitsBreakdown?.total || 0,
      homeVisits: visitsBreakdown?.home || 0,
      clinicVisits: visitsBreakdown?.clinic || 0,
      phoneVisits: visitsBreakdown?.phone || 0,
      urgentReferralsTriggered: visitsBreakdown?.urgent || 0,
      lowHemoglobinCount: visitsBreakdown?.lowHb || 0,
    },
    section2_deliveries: {
      totalDeliveries: deliveriesBreakdown?.total || 0,
      vaginalDeliveries: deliveriesBreakdown?.nvd || 0,
      caesareanDeliveries: deliveriesBreakdown?.cs || 0,
      instrumentalDeliveries: deliveriesBreakdown?.inst || 0,
      miscarriagesRecorded: deliveriesBreakdown?.miscarriage || 0,
      lowBirthWeightCount: lowBirthWeightRow?.count || 0,
    },
    section3_childHealth: {
      totalRegisteredChildren: totalChildren,
      childrenWeighedInMonth: weighedCount,
      weighingCoveragePercent: weighingCoverage,
      nutritionStatus: {
        normal: nutritionBreakdown?.normal || 0,
        mam: nutritionBreakdown?.mam || 0,
        sam: nutritionBreakdown?.sam || 0,
      },
      activeGrowthFalteringAlerts: nutritionBreakdown?.faltering || 0,
    },
    section4_immunizations: {
      vaccineDosesGiven: vaccineMap,
      totalDosesInMonth: totalDosesGiven,
      currentlyOverdueDoses: overdueVaccinesRow?.count || 0,
    },
    section5_priorityFollowUp: {
      redRiskMothers,
      overdueTasks,
    },
  };
}
