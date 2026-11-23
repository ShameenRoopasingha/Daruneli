/**
 * Pregnancy Date Calculator
 *
 * Computes Expected Date of Delivery (EDD), Period of Amenorrhea (POA),
 * trimester, and progress percentage from the Last Regular Menstrual Period (LRMP).
 */

export interface PregnancyDates {
  edd: Date;
  poaWeeks: number;
  poaDays: number;
  poaTotalDays: number;
  progressPercent: number; // 0–100, capped at 100
  trimester: 1 | 2 | 3;
  isPostDate: boolean;
}

/** Full-term pregnancy duration in days (40 weeks). */
const FULL_TERM_DAYS = 280;

/**
 * Calculate the Expected Date of Delivery.
 * EDD = LRMP + 280 days (Naegele's rule simplified).
 */
export function calculateEDD(lrmpDate: Date): Date {
  const edd = new Date(lrmpDate);
  edd.setDate(edd.getDate() + FULL_TERM_DAYS);
  return edd;
}

/**
 * Calculate all pregnancy date information from LRMP.
 *
 * @param lrmpDate  - Date of Last Regular Menstrual Period
 * @param referenceDate - Date to calculate against (defaults to now)
 */
export function calculatePOA(lrmpDate: Date, referenceDate?: Date): PregnancyDates {
  const now = referenceDate || new Date();
  const edd = calculateEDD(lrmpDate);

  const diffMs = now.getTime() - lrmpDate.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;

  const progressPercent = Math.min(
    100,
    Math.max(0, (totalDays / FULL_TERM_DAYS) * 100),
  );

  let trimester: 1 | 2 | 3 = 1;
  if (weeks >= 28) trimester = 3;
  else if (weeks >= 13) trimester = 2;

  const isPostDate = totalDays > FULL_TERM_DAYS;

  return {
    edd,
    poaWeeks: weeks,
    poaDays: days,
    poaTotalDays: totalDays,
    progressPercent,
    trimester,
    isPostDate,
  };
}

/** Format POA as "Xw Yd" (e.g. "32w 4d"). */
export function formatPOA(poa: PregnancyDates): string {
  return `${poa.poaWeeks}w ${poa.poaDays}d`;
}

/** Format EDD as an ISO date string (YYYY-MM-DD). */
export function formatEDD(edd: Date): string {
  return edd.toISOString().split('T')[0];
}
