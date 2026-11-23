/**
 * Sri Lanka National EPI (Expanded Programme on Immunization) Scheduler
 *
 * Auto-generates the full immunization schedule for a child based on
 * date of birth, following the Sri Lankan national guidelines.
 */

export type VaccineStatus = 'PENDING' | 'GIVEN' | 'OVERDUE';

export interface VaccineScheduleEntry {
  vaccineCode: string;
  vaccineName: string;
  scheduledDate: Date;
  ageDescription: string;
}

interface VaccineTemplate {
  code: string;
  name: string;
  monthsFromBirth: number;
}

/**
 * Sri Lanka National EPI Schedule
 * Source: Epidemiology Unit, Ministry of Health, Sri Lanka
 */
const SRI_LANKA_EPI_SCHEDULE: VaccineTemplate[] = [
  // Birth
  { code: 'BCG', name: 'BCG', monthsFromBirth: 0 },

  // 2 months
  { code: 'PENTA1', name: 'Pentavalent 1', monthsFromBirth: 2 },
  { code: 'OPV1', name: 'OPV 1', monthsFromBirth: 2 },
  { code: 'FIPV1', name: 'fIPV 1', monthsFromBirth: 2 },

  // 4 months
  { code: 'PENTA2', name: 'Pentavalent 2', monthsFromBirth: 4 },
  { code: 'OPV2', name: 'OPV 2', monthsFromBirth: 4 },
  { code: 'FIPV2', name: 'fIPV 2', monthsFromBirth: 4 },

  // 6 months
  { code: 'PENTA3', name: 'Pentavalent 3', monthsFromBirth: 6 },
  { code: 'OPV3', name: 'OPV 3', monthsFromBirth: 6 },

  // 9 months
  { code: 'MMR1', name: 'MMR 1', monthsFromBirth: 9 },

  // 12 months
  { code: 'LIVE_JE', name: 'Live JE', monthsFromBirth: 12 },

  // 18 months
  { code: 'DTP4', name: 'DTP 4', monthsFromBirth: 18 },
  { code: 'OPV4', name: 'OPV 4', monthsFromBirth: 18 },

  // 3 years (36 months)
  { code: 'MMR2', name: 'MMR 2', monthsFromBirth: 36 },

  // 5 years (60 months)
  { code: 'DT', name: 'DT', monthsFromBirth: 60 },
  { code: 'OPV5', name: 'OPV 5', monthsFromBirth: 60 },
];

/** Add calendar months to a date, preserving the day-of-month when possible. */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/** Convert a month offset into a human-readable age description. */
function getAgeDescription(months: number): string {
  if (months === 0) return 'Birth';
  if (months < 12) return `${months} months`;
  if (months === 12) return '1 year';
  if (months < 24) return `${months} months`;
  return `${Math.floor(months / 12)} years`;
}

/**
 * Generate the complete EPI vaccination schedule for a child.
 *
 * @param dob - Child's date of birth
 * @returns Array of scheduled vaccine entries sorted chronologically
 */
export function generateEPISchedule(dob: Date): VaccineScheduleEntry[] {
  return SRI_LANKA_EPI_SCHEDULE.map((v) => ({
    vaccineCode: v.code,
    vaccineName: v.name,
    scheduledDate:
      v.monthsFromBirth === 0 ? new Date(dob) : addMonths(dob, v.monthsFromBirth),
    ageDescription: getAgeDescription(v.monthsFromBirth),
  }));
}

/**
 * Determine the current status of a single vaccine.
 *
 * @param scheduledDate - When the vaccine was due
 * @param givenDate     - When it was administered (null if not yet given)
 * @param today         - Reference date (defaults to now)
 */
export function determineVaccineStatus(
  scheduledDate: Date,
  givenDate: Date | null,
  today?: Date,
): VaccineStatus {
  if (givenDate) return 'GIVEN';
  const now = today || new Date();
  return scheduledDate < now ? 'OVERDUE' : 'PENDING';
}

/**
 * Filter a child's vaccine records to find all overdue vaccines.
 *
 * @param schedule - Array of vaccine records with scheduled and given dates
 * @param today    - Reference date (defaults to now)
 * @returns Only the vaccines that are overdue (past scheduled date, not yet given)
 */
export function getOverdueVaccines(
  schedule: {
    scheduledDate: Date;
    givenDate: Date | null;
    vaccineCode: string;
    vaccineName: string;
  }[],
  today?: Date,
): typeof schedule {
  const now = today || new Date();
  return schedule.filter((v) => !v.givenDate && v.scheduledDate < now);
}
