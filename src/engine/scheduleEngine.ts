/**
 * Suwa PHM Advance Programme & Weekly Timetable Calculation Engine
 *
 * Pure TypeScript functions with 100% offline local evaluation.
 */

export type WeekPattern = 'ALL' | '1_3' | '2_4' | 'FIRST' | 'LAST';

export type ActivityType =
  | 'HOME_VISIT'
  | 'ANC_CLINIC'
  | 'CWC_CLINIC'
  | 'MOH_OFFICE'
  | 'CATCH_UP'
  | 'HOLIDAY'
  | 'LEAVE'
  | 'OFF';

export interface ScheduleTemplate {
  id: string;
  phm_area_id?: string;
  day_of_week: number; // 0 = Sun, 1 = Mon ... 6 = Sat
  week_pattern: WeekPattern;
  activity_type: ActivityType;
  gn_division?: string | null;
  title: string;
  start_time?: string;
  end_time?: string;
  is_dirty?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ScheduleOverride {
  id: string;
  phm_area_id?: string;
  override_date: string; // YYYY-MM-DD
  activity_type: ActivityType;
  gn_division?: string | null;
  title: string;
  notes?: string | null;
  is_dirty?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ResolvedDayPlan {
  date: string; // YYYY-MM-DD
  day_of_week: number;
  activity_type: ActivityType;
  title: string;
  gn_division?: string | null;
  start_time: string;
  end_time: string;
  is_override: boolean;
  override_id?: string;
  template_id?: string;
  notes?: string | null;
}

export interface DayDotIndicators {
  hasUrgentRed: boolean;
  isClinic: boolean;
  isHomeVisit: boolean;
  isHolidayOrOff: boolean;
}

/**
 * Extracts year, month (1-12), day (1-31), and day-of-week (0-6) from a date string (YYYY-MM-DD).
 * Parses string parts directly to avoid timezone drift across UTC/local time.
 */
export function parseDateParts(dateStr: string): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
} {
  const clean = dateStr.split('T')[0];
  const [y, m, d] = clean.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return {
    year: y,
    month: m,
    day: d,
    dayOfWeek: dateObj.getDay(),
  };
}

/**
 * Returns the occurrence number of this day's weekday in the month (1st, 2nd, 3rd, 4th, or 5th).
 * E.g., for day 1..7 -> 1, 8..14 -> 2, 15..21 -> 3, 22..28 -> 4, 29..31 -> 5.
 */
export function getWeekOfMonth(dateStr: string): number {
  const { day } = parseDateParts(dateStr);
  return Math.floor((day - 1) / 7) + 1;
}

/**
 * Checks if this date is the final occurrence of its weekday in the calendar month.
 */
export function isLastOccurrenceOfMonth(dateStr: string): boolean {
  const { year, month, day } = parseDateParts(dateStr);
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  return day + 7 > totalDaysInMonth;
}

/**
 * Evaluates whether a date string satisfies a recurring week pattern.
 */
export function matchesWeekPattern(dateStr: string, pattern: WeekPattern): boolean {
  if (pattern === 'ALL') return true;

  const weekNum = getWeekOfMonth(dateStr);

  switch (pattern) {
    case '1_3':
      return weekNum === 1 || weekNum === 3;
    case '2_4':
      return weekNum === 2 || weekNum === 4;
    case 'FIRST':
      return weekNum === 1;
    case 'LAST':
      return isLastOccurrenceOfMonth(dateStr);
    default:
      return true;
  }
}

/**
 * Resolves the advance programme / activity plan for a specific date.
 *
 * Priority 1: Check schedule_overrides for exact override_date === dateStr.
 * Priority 2: Match schedule_templates by day_of_week and matchesWeekPattern.
 * Fallback: Return 'OFF' / Unscheduled plan.
 */
export function resolveDayPlan(
  dateStr: string,
  templates: ScheduleTemplate[],
  overrides: ScheduleOverride[]
): ResolvedDayPlan {
  const dateKey = dateStr.split('T')[0];
  const { dayOfWeek } = parseDateParts(dateKey);

  // 1. Check for overrides on this exact date
  const activeOverride = overrides.find(
    (o) => !o.deleted_at && o.override_date.split('T')[0] === dateKey
  );

  if (activeOverride) {
    return {
      date: dateKey,
      day_of_week: dayOfWeek,
      activity_type: activeOverride.activity_type,
      title: activeOverride.title,
      gn_division: activeOverride.gn_division || null,
      start_time: '08:30',
      end_time: '16:00',
      is_override: true,
      override_id: activeOverride.id,
      notes: activeOverride.notes || null,
    };
  }

  // 2. Check for matching weekly template
  const matchingTemplates = templates.filter(
    (t) => !t.deleted_at && t.day_of_week === dayOfWeek && matchesWeekPattern(dateKey, t.week_pattern)
  );

  if (matchingTemplates.length > 0) {
    // Prefer specific patterns (1_3, 2_4, FIRST, LAST) over generic 'ALL'
    const sorted = [...matchingTemplates].sort((a, b) => {
      if (a.week_pattern !== 'ALL' && b.week_pattern === 'ALL') return -1;
      if (a.week_pattern === 'ALL' && b.week_pattern !== 'ALL') return 1;
      return 0;
    });

    const chosen = sorted[0];
    return {
      date: dateKey,
      day_of_week: dayOfWeek,
      activity_type: chosen.activity_type,
      title: chosen.title,
      gn_division: chosen.gn_division || null,
      start_time: chosen.start_time || '08:30',
      end_time: chosen.end_time || '16:00',
      is_override: false,
      template_id: chosen.id,
      notes: null,
    };
  }

  // 3. Fallback
  const isSunday = dayOfWeek === 0;
  return {
    date: dateKey,
    day_of_week: dayOfWeek,
    activity_type: isSunday ? 'OFF' : 'OFF',
    title: isSunday ? 'Weekly Rest Day' : 'Unscheduled Day',
    gn_division: null,
    start_time: '08:30',
    end_time: '16:00',
    is_override: false,
    notes: null,
  };
}

/**
 * Computes status indicators for calendar day strips and day chips.
 */
export function getDayDotIndicators(
  dateStr: string,
  plan: ResolvedDayPlan,
  items: {
    riskLevel?: string;
    status?: string;
    priority?: string;
    badgeColor?: string;
  }[] = []
): DayDotIndicators {
  const hasUrgentRed = items.some(
    (item) =>
      item.riskLevel === 'RED' ||
      item.badgeColor === 'red' ||
      item.status === 'OVERDUE' ||
      item.priority === 'URGENT'
  );

  const isClinic = plan.activity_type === 'ANC_CLINIC' || plan.activity_type === 'CWC_CLINIC';
  const isHomeVisit = plan.activity_type === 'HOME_VISIT';
  const isHolidayOrOff =
    plan.activity_type === 'HOLIDAY' ||
    plan.activity_type === 'LEAVE' ||
    plan.activity_type === 'OFF';

  return {
    hasUrgentRed,
    isClinic,
    isHomeVisit,
    isHolidayOrOff,
  };
}

export interface AutoBalanceItemCandidate {
  id: string;
  type: 'MOTHER' | 'CHILD' | 'TASK' | 'SUMMARY';
  targetId: string;
  name: string;
  gnDivision?: string;
  badgeColor?: string;
  riskLevel?: string;
  status?: string;
  priority?: string;
  taskId?: string;
  motherId?: string;
  childId?: string;
}

export interface AutoBalanceMove {
  itemId: string;
  taskId?: string;
  targetType: 'MOTHER' | 'CHILD';
  targetId: string;
  name: string;
  gnDivision: string;
  fromDate: string;
  toDate: string; // 'YYYY-MM-DD'
  toDayLabel: string; // e.g., "Sat 28/11/2026 (Catch-Up)"
}

export interface AutoBalanceProposal {
  sourceDate: string;
  lockedCount: number; // Urgent/RED items that cannot be auto-moved
  moves: AutoBalanceMove[];
}

const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTargetDayLabel(dateStr: string, activityType: ActivityType): string {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const dateObj = new Date(y, m - 1, d);
  const dayName = SHORT_DAY_NAMES[dateObj.getDay()];
  const formattedDate = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  const actLabel =
    activityType === 'CATCH_UP'
      ? 'Catch-Up'
      : activityType === 'HOME_VISIT'
      ? 'Home Visit'
      : 'Field';

  return `${dayName} ${formattedDate} (${actLabel})`;
}

/**
 * Computes an auto-balance proposal for overloaded home visit days.
 *
 * Rules:
 * 1. RED-risk, URGENT priority, and OVERDUE items are locked and NEVER moved.
 * 2. Excess routine/normal items are moved up to (dayItems.length - dailyCap).
 * 3. Movable items are distributed to upcoming available days (Catch-Up days prioritized, followed by Home Visit days under capacity).
 */
export function computeAutoBalancePlan(
  dateStr: string,
  dayItems: AutoBalanceItemCandidate[],
  dailyCap: number,
  templates: ScheduleTemplate[],
  overrides: ScheduleOverride[],
  existingCountsByDate: Record<string, number> = {}
): AutoBalanceProposal {
  const sourceDate = dateStr.split('T')[0];
  const excessCount = Math.max(0, dayItems.length - dailyCap);

  const isLocked = (item: AutoBalanceItemCandidate): boolean => {
    return (
      item.riskLevel === 'RED' ||
      item.badgeColor === 'red' ||
      item.status === 'OVERDUE' ||
      item.priority === 'URGENT' ||
      item.type === 'SUMMARY'
    );
  };

  const lockedItems = dayItems.filter(isLocked);
  const lockedCount = lockedItems.length;

  if (excessCount <= 0) {
    return {
      sourceDate,
      lockedCount,
      moves: [],
    };
  }

  // Get movable candidate items (routine visits, normal tasks, green/yellow risk)
  const movableItems = dayItems.filter((i) => !isLocked(i));

  // Sort movable items: green risk mothers & routine tasks first, yellow risk last
  const sortedMovable = [...movableItems].sort((a, b) => {
    if (a.riskLevel === 'GREEN' && b.riskLevel !== 'GREEN') return -1;
    if (a.riskLevel !== 'GREEN' && b.riskLevel === 'GREEN') return 1;
    return 0;
  });

  const itemsToMove = sortedMovable.slice(0, excessCount);
  if (itemsToMove.length === 0) {
    return {
      sourceDate,
      lockedCount,
      moves: [],
    };
  }

  // Find candidate target dates over the next 7 days
  const [sy, sm, sd] = sourceDate.split('-').map(Number);
  const candidateDates: { dateStr: string; activityType: ActivityType; availableSlots: number }[] = [];

  for (let offset = 1; offset <= 7; offset++) {
    const nextDate = new Date(sy, sm - 1, sd + offset);
    const yStr = nextDate.getFullYear();
    const mStr = String(nextDate.getMonth() + 1).padStart(2, '0');
    const dStr = String(nextDate.getDate()).padStart(2, '0');
    const targetStr = `${yStr}-${mStr}-${dStr}`;

    const plan = resolveDayPlan(targetStr, templates, overrides);
    const act = plan.activity_type;

    // We only redistribute home visits to CATCH_UP days or HOME_VISIT days with capacity
    if (act === 'CATCH_UP') {
      const currentCount = existingCountsByDate[targetStr] || 0;
      candidateDates.push({
        dateStr: targetStr,
        activityType: act,
        availableSlots: Math.max(1, dailyCap - currentCount),
      });
    } else if (act === 'HOME_VISIT') {
      const currentCount = existingCountsByDate[targetStr] || 0;
      if (currentCount < dailyCap) {
        candidateDates.push({
          dateStr: targetStr,
          activityType: act,
          availableSlots: dailyCap - currentCount,
        });
      }
    }
  }

  // If no ideal CATCH_UP or HOME_VISIT days found, find next working day that isn't OFF/HOLIDAY/LEAVE
  if (candidateDates.length === 0) {
    for (let offset = 1; offset <= 7; offset++) {
      const nextDate = new Date(sy, sm - 1, sd + offset);
      const yStr = nextDate.getFullYear();
      const mStr = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(nextDate.getDate()).padStart(2, '0');
      const targetStr = `${yStr}-${mStr}-${dStr}`;

      const plan = resolveDayPlan(targetStr, templates, overrides);
      if (plan.activity_type !== 'OFF' && plan.activity_type !== 'HOLIDAY' && plan.activity_type !== 'LEAVE') {
        candidateDates.push({
          dateStr: targetStr,
          activityType: plan.activity_type,
          availableSlots: 4,
        });
        break;
      }
    }
  }

  // If still nothing, fallback to Saturday of that week (sd + 4)
  if (candidateDates.length === 0) {
    const fallbackDate = new Date(sy, sm - 1, sd + 4);
    const targetStr = `${fallbackDate.getFullYear()}-${String(fallbackDate.getMonth() + 1).padStart(2, '0')}-${String(fallbackDate.getDate()).padStart(2, '0')}`;
    candidateDates.push({
      dateStr: targetStr,
      activityType: 'CATCH_UP',
      availableSlots: 10,
    });
  }

  // Distribute itemsToMove across candidateDates
  const moves: AutoBalanceMove[] = [];
  let candidateIndex = 0;
  const allocatedCounts: Record<string, number> = {};

  for (const item of itemsToMove) {
    const target = candidateDates[candidateIndex % candidateDates.length];
    const targetDateStr = target.dateStr;
    const currentAllocated = allocatedCounts[targetDateStr] || 0;

    moves.push({
      itemId: item.id,
      taskId: item.taskId,
      targetType: item.childId ? 'CHILD' : 'MOTHER',
      targetId: item.targetId,
      name: item.name,
      gnDivision: item.gnDivision || 'General Area',
      fromDate: sourceDate,
      toDate: targetDateStr,
      toDayLabel: formatTargetDayLabel(targetDateStr, target.activityType),
    });

    allocatedCounts[targetDateStr] = currentAllocated + 1;
    if (allocatedCounts[targetDateStr] >= target.availableSlots && candidateDates.length > 1) {
      candidateIndex++;
    }
  }

  return {
    sourceDate,
    lockedCount,
    moves,
  };
}
