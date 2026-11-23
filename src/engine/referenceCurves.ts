/**
 * Standardized Sri Lanka FHB & WHO Midwifery Reference Curves
 * 100% Offline Reference Data & Interpolation Utilities
 *
 * 1. SFH (Symphysis-Fundal Height) 16-40 weeks (10th, 50th, 90th centiles in cm)
 * 2. Maternal Weight Gain Corridors by Booking BMI Class (Underweight, Normal, Overweight, Obese)
 * 3. WHO Child Growth Standards (CHDR) 0-60 months for Boys & Girls (-3SD, -2SD, Median, +2SD)
 * 4. Fenton Preterm Growth Curves 22-50 weeks PMA for Boys & Girls (10th, 50th, 90th centiles)
 */

// ============================================================================
// 1. Symphysis-Fundal Height (SFH) Reference Curve (16 - 40 weeks)
// ============================================================================
export interface SfhCentiles {
  week: number;
  p10: number; // 10th percentile (SGA cutoff)
  p50: number; // 50th percentile (Median)
  p90: number; // 90th percentile (LGA cutoff)
}

export const SFH_REFERENCE_TABLE: SfhCentiles[] = [
  { week: 16, p10: 13.5, p50: 15.0, p90: 16.5 },
  { week: 18, p10: 15.5, p50: 17.2, p90: 19.0 },
  { week: 20, p10: 17.5, p50: 19.5, p90: 21.5 },
  { week: 22, p10: 19.5, p50: 21.5, p90: 23.5 },
  { week: 24, p10: 21.5, p50: 23.5, p90: 25.5 },
  { week: 26, p10: 23.5, p50: 25.5, p90: 27.5 },
  { week: 28, p10: 25.5, p50: 27.5, p90: 29.5 },
  { week: 30, p10: 27.2, p50: 29.3, p90: 31.4 },
  { week: 32, p10: 29.0, p50: 31.0, p90: 33.0 },
  { week: 34, p10: 30.5, p50: 32.8, p90: 34.8 },
  { week: 36, p10: 32.0, p50: 34.5, p90: 36.5 },
  { week: 38, p10: 33.2, p50: 36.0, p90: 38.2 },
  { week: 40, p10: 34.0, p50: 37.0, p90: 39.5 },
];

export function getSfhCentiles(poaWeeks: number): { p10: number; p50: number; p90: number } {
  const clampedWeek = Math.max(16, Math.min(40, poaWeeks));
  for (let i = 0; i < SFH_REFERENCE_TABLE.length - 1; i++) {
    const cur = SFH_REFERENCE_TABLE[i];
    const next = SFH_REFERENCE_TABLE[i + 1];
    if (clampedWeek >= cur.week && clampedWeek <= next.week) {
      const ratio = (clampedWeek - cur.week) / (next.week - cur.week);
      return {
        p10: +(cur.p10 + ratio * (next.p10 - cur.p10)).toFixed(1),
        p50: +(cur.p50 + ratio * (next.p50 - cur.p50)).toFixed(1),
        p90: +(cur.p90 + ratio * (next.p90 - cur.p90)).toFixed(1),
      };
    }
  }
  return {
    p10: SFH_REFERENCE_TABLE[SFH_REFERENCE_TABLE.length - 1].p10,
    p50: SFH_REFERENCE_TABLE[SFH_REFERENCE_TABLE.length - 1].p50,
    p90: SFH_REFERENCE_TABLE[SFH_REFERENCE_TABLE.length - 1].p90,
  };
}

// ============================================================================
// 2. Maternal Weight Gain Corridors by Booking BMI (FHB / WHO / IOM)
// ============================================================================
export type BmiCategory = 'UNDERWEIGHT' | 'NORMAL' | 'OVERWEIGHT' | 'OBESE';

export interface BmiThresholds {
  category: BmiCategory;
  label: string;
  minGainKg: number;
  maxGainKg: number;
  ratePerWeek2nd3rd: number; // kg per week
}

export const BMI_GUIDELINES: Record<BmiCategory, BmiThresholds> = {
  UNDERWEIGHT: {
    category: 'UNDERWEIGHT',
    label: 'Underweight (< 18.5)',
    minGainKg: 12.5,
    maxGainKg: 18.0,
    ratePerWeek2nd3rd: 0.51,
  },
  NORMAL: {
    category: 'NORMAL',
    label: 'Normal (18.5 - 24.9)',
    minGainKg: 11.5,
    maxGainKg: 16.0,
    ratePerWeek2nd3rd: 0.42,
  },
  OVERWEIGHT: {
    category: 'OVERWEIGHT',
    label: 'Overweight (25.0 - 29.9)',
    minGainKg: 7.0,
    maxGainKg: 11.5,
    ratePerWeek2nd3rd: 0.28,
  },
  OBESE: {
    category: 'OBESE',
    label: 'Obese (≥ 30.0)',
    minGainKg: 5.0,
    maxGainKg: 9.0,
    ratePerWeek2nd3rd: 0.22,
  },
};

export function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'UNDERWEIGHT';
  if (bmi < 25.0) return 'NORMAL';
  if (bmi < 30.0) return 'OVERWEIGHT';
  return 'OBESE';
}

/**
 * Returns expected minimum, median, and maximum weight gain in kg at a given POA week.
 */
export function getWeightGainCorridor(
  bmi: number,
  poaWeeks: number,
): { minGain: number; targetGain: number; maxGain: number } {
  const cat = getBmiCategory(bmi);
  const info = BMI_GUIDELINES[cat];

  if (poaWeeks <= 12) {
    // 1st trimester average total gain 0.5 - 2.0 kg
    const progress = Math.max(0, poaWeeks / 12);
    const minGain = +(0.5 * progress).toFixed(1);
    const maxGain = +(2.0 * progress).toFixed(1);
    const targetGain = +((minGain + maxGain) / 2).toFixed(1);
    return { minGain, targetGain, maxGain };
  }

  const weeksPast12 = Math.min(28, poaWeeks - 12);
  const baseMin = 1.0;
  const baseMax = 2.0;
  const minGain = +(baseMin + weeksPast12 * (info.minGainKg - baseMin) / 28).toFixed(1);
  const maxGain = +(baseMax + weeksPast12 * (info.maxGainKg - baseMax) / 28).toFixed(1);
  const targetGain = +((minGain + maxGain) / 2).toFixed(1);

  return { minGain, targetGain, maxGain };
}

// ============================================================================
// 3. WHO Child Growth Standards (0 - 60 Months)
// ============================================================================
export interface WhoGrowthPoint {
  month: number;
  sd3Neg: number;
  sd2Neg: number;
  median: number;
  sd2Pos: number;
  sd3Pos: number;
}

// Weight-for-Age (WFA) in kg (WHO standards)
export const WHO_WFA_BOYS: WhoGrowthPoint[] = [
  { month: 0, sd3Neg: 2.1, sd2Neg: 2.5, median: 3.3, sd2Pos: 4.4, sd3Pos: 5.0 },
  { month: 2, sd3Neg: 3.8, sd2Neg: 4.3, median: 5.6, sd2Pos: 7.1, sd3Pos: 7.8 },
  { month: 4, sd3Neg: 4.9, sd2Neg: 5.6, median: 7.0, sd2Pos: 8.7, sd3Pos: 9.5 },
  { month: 6, sd3Neg: 5.7, sd2Neg: 6.4, median: 7.9, sd2Pos: 9.8, sd3Pos: 10.7 },
  { month: 9, sd3Neg: 6.5, sd2Neg: 7.2, median: 8.9, sd2Pos: 11.0, sd3Pos: 12.0 },
  { month: 12, sd3Neg: 6.9, sd2Neg: 7.7, median: 9.6, sd2Pos: 12.0, sd3Pos: 13.1 },
  { month: 18, sd3Neg: 7.6, sd2Neg: 8.6, median: 10.9, sd2Pos: 13.7, sd3Pos: 15.0 },
  { month: 24, sd3Neg: 8.4, sd2Neg: 9.7, median: 12.2, sd2Pos: 15.3, sd3Pos: 16.9 },
  { month: 36, sd3Neg: 10.0, sd2Neg: 11.3, median: 14.3, sd2Pos: 18.3, sd3Pos: 20.4 },
  { month: 48, sd3Neg: 11.5, sd2Neg: 12.7, median: 16.3, sd2Pos: 21.2, sd3Pos: 23.9 },
  { month: 60, sd3Neg: 12.4, sd2Neg: 14.1, median: 18.3, sd2Pos: 24.2, sd3Pos: 27.5 },
];

export const WHO_WFA_GIRLS: WhoGrowthPoint[] = [
  { month: 0, sd3Neg: 2.0, sd2Neg: 2.4, median: 3.2, sd2Pos: 4.2, sd3Pos: 4.8 },
  { month: 2, sd3Neg: 3.4, sd2Neg: 3.9, median: 5.1, sd2Pos: 6.6, sd3Pos: 7.3 },
  { month: 4, sd3Neg: 4.4, sd2Neg: 5.0, median: 6.4, sd2Pos: 8.2, sd3Pos: 9.0 },
  { month: 6, sd3Neg: 5.1, sd2Neg: 5.7, median: 7.3, sd2Pos: 9.3, sd3Pos: 10.2 },
  { month: 9, sd3Neg: 5.8, sd2Neg: 6.5, median: 8.2, sd2Pos: 10.5, sd3Pos: 11.5 },
  { month: 12, sd3Neg: 6.3, sd2Neg: 7.0, median: 8.9, sd2Pos: 11.5, sd3Pos: 12.6 },
  { month: 18, sd3Neg: 7.2, sd2Neg: 8.1, median: 10.2, sd2Pos: 13.2, sd3Pos: 14.5 },
  { month: 24, sd3Neg: 7.9, sd2Neg: 9.0, median: 11.5, sd2Pos: 14.8, sd3Pos: 16.5 },
  { month: 36, sd3Neg: 9.6, sd2Neg: 10.8, median: 13.9, sd2Pos: 18.1, sd3Pos: 20.2 },
  { month: 48, sd3Neg: 11.0, sd2Neg: 12.3, median: 16.1, sd2Pos: 21.2, sd3Pos: 24.0 },
  { month: 60, sd3Neg: 12.1, sd2Neg: 13.7, median: 18.2, sd2Pos: 24.4, sd3Pos: 28.0 },
];

// Height/Length-for-Age (HFA) in cm (WHO standards)
export const WHO_HFA_BOYS: WhoGrowthPoint[] = [
  { month: 0, sd3Neg: 44.2, sd2Neg: 46.1, median: 49.9, sd2Pos: 53.7, sd3Pos: 55.6 },
  { month: 2, sd3Neg: 52.4, sd2Neg: 54.4, median: 58.4, sd2Pos: 62.4, sd3Pos: 64.4 },
  { month: 4, sd3Neg: 57.8, sd2Neg: 60.0, median: 63.9, sd2Pos: 68.0, sd3Pos: 70.0 },
  { month: 6, sd3Neg: 61.2, sd2Neg: 63.3, median: 67.6, sd2Pos: 71.9, sd3Pos: 74.0 },
  { month: 9, sd3Neg: 65.2, sd2Neg: 67.5, median: 72.0, sd2Pos: 76.5, sd3Pos: 78.7 },
  { month: 12, sd3Neg: 68.6, sd2Neg: 71.0, median: 75.7, sd2Pos: 80.5, sd3Pos: 82.9 },
  { month: 18, sd3Neg: 74.2, sd2Neg: 76.9, median: 82.3, sd2Pos: 87.7, sd3Pos: 90.4 },
  { month: 24, sd3Neg: 78.7, sd2Neg: 81.7, median: 87.8, sd2Pos: 93.9, sd3Pos: 97.0 },
  { month: 36, sd3Neg: 85.0, sd2Neg: 88.7, median: 96.1, sd2Pos: 103.5, sd3Pos: 107.2 },
  { month: 48, sd3Neg: 90.7, sd2Neg: 94.9, median: 103.3, sd2Pos: 111.7, sd3Pos: 115.9 },
  { month: 60, sd3Neg: 96.1, sd2Neg: 100.7, median: 110.0, sd2Pos: 119.2, sd3Pos: 123.9 },
];

export const WHO_HFA_GIRLS: WhoGrowthPoint[] = [
  { month: 0, sd3Neg: 43.6, sd2Neg: 45.4, median: 49.1, sd2Pos: 52.9, sd3Pos: 54.7 },
  { month: 2, sd3Neg: 51.0, sd2Neg: 53.0, median: 57.1, sd2Pos: 61.1, sd3Pos: 63.1 },
  { month: 4, sd3Neg: 56.2, sd2Neg: 58.4, median: 62.1, sd2Pos: 66.2, sd3Pos: 68.2 },
  { month: 6, sd3Neg: 59.5, sd2Neg: 61.2, median: 65.7, sd2Pos: 70.3, sd3Pos: 72.5 },
  { month: 9, sd3Neg: 63.5, sd2Neg: 65.3, median: 70.1, sd2Pos: 74.9, sd3Pos: 77.3 },
  { month: 12, sd3Neg: 66.3, sd2Neg: 68.9, median: 74.0, sd2Pos: 79.2, sd3Pos: 81.7 },
  { month: 18, sd3Neg: 72.8, sd2Neg: 74.9, median: 80.7, sd2Pos: 86.5, sd3Pos: 89.4 },
  { month: 24, sd3Neg: 77.5, sd2Neg: 80.0, median: 86.4, sd2Pos: 92.9, sd3Pos: 96.1 },
  { month: 36, sd3Neg: 83.6, sd2Neg: 87.4, median: 95.1, sd2Pos: 102.7, sd3Pos: 106.5 },
  { month: 48, sd3Neg: 89.8, sd2Neg: 94.1, median: 102.7, sd2Pos: 111.3, sd3Pos: 115.7 },
  { month: 60, sd3Neg: 95.2, sd2Neg: 99.9, median: 109.4, sd2Pos: 118.9, sd3Pos: 123.7 },
];

// Weight-for-Length/Height (WFH) (length in cm vs weight in kg)
export interface WhoWfhPoint {
  lengthCm: number;
  sd3Neg: number;
  sd2Neg: number;
  median: number;
  sd2Pos: number;
  sd3Pos: number;
}

export const WHO_WFH_BOYS: WhoWfhPoint[] = [
  { lengthCm: 45, sd3Neg: 1.9, sd2Neg: 2.0, median: 2.4, sd2Pos: 3.0, sd3Pos: 3.3 },
  { lengthCm: 50, sd3Neg: 2.4, sd2Neg: 2.6, median: 3.3, sd2Pos: 4.0, sd3Pos: 4.4 },
  { lengthCm: 55, sd3Neg: 3.6, sd2Neg: 3.9, median: 4.7, sd2Pos: 5.7, sd3Pos: 6.3 },
  { lengthCm: 60, sd3Neg: 4.8, sd2Neg: 5.3, median: 6.2, sd2Pos: 7.5, sd3Pos: 8.2 },
  { lengthCm: 65, sd3Neg: 5.9, sd2Neg: 6.5, median: 7.6, sd2Pos: 9.1, sd3Pos: 9.9 },
  { lengthCm: 70, sd3Neg: 6.9, sd2Neg: 7.5, median: 8.8, sd2Pos: 10.4, sd3Pos: 11.4 },
  { lengthCm: 75, sd3Neg: 7.7, sd2Neg: 8.4, median: 9.8, sd2Pos: 11.6, sd3Pos: 12.7 },
  { lengthCm: 80, sd3Neg: 8.5, sd2Neg: 9.3, median: 10.8, sd2Pos: 12.7, sd3Pos: 13.9 },
  { lengthCm: 85, sd3Neg: 9.3, sd2Neg: 10.1, median: 11.8, sd2Pos: 14.0, sd3Pos: 15.3 },
  { lengthCm: 90, sd3Neg: 10.1, sd2Neg: 11.0, median: 12.9, sd2Pos: 15.3, sd3Pos: 16.9 },
  { lengthCm: 95, sd3Neg: 10.9, sd2Neg: 12.0, median: 14.1, sd2Pos: 16.8, sd3Pos: 18.6 },
  { lengthCm: 100, sd3Neg: 11.9, sd2Neg: 13.0, median: 15.4, sd2Pos: 18.5, sd3Pos: 20.6 },
  { lengthCm: 110, sd3Neg: 14.0, sd2Neg: 15.3, median: 18.3, sd2Pos: 22.4, sd3Pos: 25.4 },
];

export const WHO_WFH_GIRLS: WhoWfhPoint[] = [
  { lengthCm: 45, sd3Neg: 1.9, sd2Neg: 2.1, median: 2.5, sd2Pos: 3.1, sd3Pos: 3.4 },
  { lengthCm: 50, sd3Neg: 2.4, sd2Neg: 2.6, median: 3.2, sd2Pos: 3.9, sd3Pos: 4.3 },
  { lengthCm: 55, sd3Neg: 3.5, sd2Neg: 3.8, median: 4.5, sd2Pos: 5.5, sd3Pos: 6.1 },
  { lengthCm: 60, sd3Neg: 4.6, sd2Neg: 5.0, median: 5.9, sd2Pos: 7.1, sd3Pos: 7.8 },
  { lengthCm: 65, sd3Neg: 5.6, sd2Neg: 6.1, median: 7.2, sd2Pos: 8.7, sd3Pos: 9.6 },
  { lengthCm: 70, sd3Neg: 6.5, sd2Neg: 7.1, median: 8.3, sd2Pos: 10.0, sd3Pos: 11.0 },
  { lengthCm: 75, sd3Neg: 7.3, sd2Neg: 8.0, median: 9.4, sd2Pos: 11.2, sd3Pos: 12.4 },
  { lengthCm: 80, sd3Neg: 8.1, sd2Neg: 8.8, median: 10.3, sd2Pos: 12.4, sd3Pos: 13.8 },
  { lengthCm: 85, sd3Neg: 8.9, sd2Neg: 9.8, median: 11.4, sd2Pos: 13.7, sd3Pos: 15.3 },
  { lengthCm: 90, sd3Neg: 9.8, sd2Neg: 10.7, median: 12.6, sd2Pos: 15.1, sd3Pos: 17.0 },
  { lengthCm: 95, sd3Neg: 10.7, sd2Neg: 11.7, median: 13.8, sd2Pos: 16.7, sd3Pos: 18.9 },
  { lengthCm: 100, sd3Neg: 11.7, sd2Neg: 12.8, median: 15.2, sd2Pos: 18.5, sd3Pos: 21.2 },
  { lengthCm: 110, sd3Neg: 13.9, sd2Neg: 15.3, median: 18.4, sd2Pos: 22.8, sd3Pos: 26.3 },
];

export function getInterpolatedWhoPoint(
  table: WhoGrowthPoint[],
  month: number,
): WhoGrowthPoint {
  const clampedMonth = Math.max(0, Math.min(60, month));
  for (let i = 0; i < table.length - 1; i++) {
    const cur = table[i];
    const next = table[i + 1];
    if (clampedMonth >= cur.month && clampedMonth <= next.month) {
      const ratio = (clampedMonth - cur.month) / (next.month - cur.month);
      return {
        month: clampedMonth,
        sd3Neg: +(cur.sd3Neg + ratio * (next.sd3Neg - cur.sd3Neg)).toFixed(1),
        sd2Neg: +(cur.sd2Neg + ratio * (next.sd2Neg - cur.sd2Neg)).toFixed(1),
        median: +(cur.median + ratio * (next.median - cur.median)).toFixed(1),
        sd2Pos: +(cur.sd2Pos + ratio * (next.sd2Pos - cur.sd2Pos)).toFixed(1),
        sd3Pos: +(cur.sd3Pos + ratio * (next.sd3Pos - cur.sd3Pos)).toFixed(1),
      };
    }
  }
  return table[table.length - 1];
}

// ============================================================================
// 4. Fenton Preterm Growth Curves (22 - 50 weeks PMA)
// ============================================================================
export interface FentonPretermPoint {
  week: number;
  weightP10: number; // kg
  weightP50: number;
  weightP90: number;
  lengthP10: number; // cm
  lengthP50: number;
  lengthP90: number;
  hcP10: number;     // Head Circumference in cm
  hcP50: number;
  hcP90: number;
}

export const FENTON_PRETERM_GIRLS: FentonPretermPoint[] = [
  { week: 24, weightP10: 0.50, weightP50: 0.62, weightP90: 0.77, lengthP10: 28.5, lengthP50: 31.0, lengthP90: 33.5, hcP10: 20.0, hcP50: 21.8, hcP90: 23.5 },
  { week: 26, weightP10: 0.68, weightP50: 0.83, weightP90: 1.02, lengthP10: 31.5, lengthP50: 34.0, lengthP90: 36.5, hcP10: 22.0, hcP50: 23.8, hcP90: 25.5 },
  { week: 28, weightP10: 0.90, weightP50: 1.10, weightP90: 1.34, lengthP10: 34.5, lengthP50: 37.0, lengthP90: 39.5, hcP10: 24.0, hcP50: 25.8, hcP90: 27.5 },
  { week: 30, weightP10: 1.18, weightP50: 1.43, weightP90: 1.72, lengthP10: 37.2, lengthP50: 39.8, lengthP90: 42.4, hcP10: 26.0, hcP50: 27.9, hcP90: 29.6 },
  { week: 32, weightP10: 1.50, weightP50: 1.80, weightP90: 2.15, lengthP10: 40.0, lengthP50: 42.5, lengthP90: 45.0, hcP10: 28.0, hcP50: 29.8, hcP90: 31.5 },
  { week: 34, weightP10: 1.85, weightP50: 2.22, weightP90: 2.65, lengthP10: 42.5, lengthP50: 45.0, lengthP90: 47.5, hcP10: 29.8, hcP50: 31.5, hcP90: 33.2 },
  { week: 36, weightP10: 2.25, weightP50: 2.68, weightP90: 3.18, lengthP10: 44.8, lengthP50: 47.3, lengthP90: 49.8, hcP10: 31.2, hcP50: 33.0, hcP90: 34.7 },
  { week: 38, weightP10: 2.65, weightP50: 3.10, weightP90: 3.68, lengthP10: 46.8, lengthP50: 49.3, lengthP90: 51.8, hcP10: 32.5, hcP50: 34.1, hcP90: 35.8 },
  { week: 40, weightP10: 2.95, weightP50: 3.45, weightP90: 4.10, lengthP10: 48.2, lengthP50: 50.8, lengthP90: 53.4, hcP10: 33.2, hcP50: 35.0, hcP90: 36.6 },
  { week: 42, weightP10: 3.30, weightP50: 3.85, weightP90: 4.55, lengthP10: 49.8, lengthP50: 52.5, lengthP90: 55.2, hcP10: 34.2, hcP50: 36.0, hcP90: 37.6 },
  { week: 44, weightP10: 3.70, weightP50: 4.30, weightP90: 5.05, lengthP10: 51.5, lengthP50: 54.2, lengthP90: 57.0, hcP10: 35.1, hcP50: 36.9, hcP90: 38.6 },
  { week: 46, weightP10: 4.15, weightP50: 4.80, weightP90: 5.60, lengthP10: 53.0, lengthP50: 56.0, lengthP90: 58.8, hcP10: 36.0, hcP50: 37.8, hcP90: 39.5 },
  { week: 48, weightP10: 4.60, weightP50: 5.30, weightP90: 6.15, lengthP10: 54.6, lengthP50: 57.6, lengthP90: 60.5, hcP10: 36.8, hcP50: 38.6, hcP90: 40.3 },
  { week: 50, weightP10: 5.05, weightP50: 5.80, weightP90: 6.70, lengthP10: 56.0, lengthP50: 59.2, lengthP90: 62.0, hcP10: 37.5, hcP50: 39.3, hcP90: 41.0 },
];

export const FENTON_PRETERM_BOYS: FentonPretermPoint[] = [
  { week: 24, weightP10: 0.55, weightP50: 0.67, weightP90: 0.83, lengthP10: 29.0, lengthP50: 31.5, lengthP90: 34.0, hcP10: 20.5, hcP50: 22.3, hcP90: 24.0 },
  { week: 26, weightP10: 0.74, weightP50: 0.90, weightP90: 1.10, lengthP10: 32.0, lengthP50: 34.6, lengthP90: 37.2, hcP10: 22.5, hcP50: 24.3, hcP90: 26.0 },
  { week: 28, weightP10: 0.98, weightP50: 1.19, weightP90: 1.45, lengthP10: 35.0, lengthP50: 37.6, lengthP90: 40.2, hcP10: 24.5, hcP50: 26.3, hcP90: 28.0 },
  { week: 30, weightP10: 1.28, weightP50: 1.55, weightP90: 1.86, lengthP10: 37.8, lengthP50: 40.5, lengthP90: 43.2, hcP10: 26.5, hcP50: 28.4, hcP90: 30.1 },
  { week: 32, weightP10: 1.62, weightP50: 1.95, weightP90: 2.32, lengthP10: 40.6, lengthP50: 43.2, lengthP90: 45.8, hcP10: 28.5, hcP50: 30.3, hcP90: 32.0 },
  { week: 34, weightP10: 2.00, weightP50: 2.40, weightP90: 2.85, lengthP10: 43.2, lengthP50: 45.8, lengthP90: 48.4, hcP10: 30.3, hcP50: 32.0, hcP90: 33.7 },
  { week: 36, weightP10: 2.42, weightP50: 2.88, weightP90: 3.40, lengthP10: 45.5, lengthP50: 48.0, lengthP90: 50.6, hcP10: 31.8, hcP50: 33.6, hcP90: 35.3 },
  { week: 38, weightP10: 2.82, weightP50: 3.32, weightP90: 3.92, lengthP10: 47.6, lengthP50: 50.1, lengthP90: 52.6, hcP10: 33.1, hcP50: 34.8, hcP90: 36.5 },
  { week: 40, weightP10: 3.12, weightP50: 3.65, weightP90: 4.32, lengthP10: 49.0, lengthP50: 51.6, lengthP90: 54.2, hcP10: 33.8, hcP50: 35.6, hcP90: 37.3 },
  { week: 42, weightP10: 3.50, weightP50: 4.10, weightP90: 4.80, lengthP10: 50.8, lengthP50: 53.4, lengthP90: 56.1, hcP10: 34.8, hcP50: 36.6, hcP90: 38.3 },
  { week: 44, weightP10: 3.95, weightP50: 4.58, weightP90: 5.35, lengthP10: 52.4, lengthP50: 55.2, lengthP90: 58.0, hcP10: 35.8, hcP50: 37.6, hcP90: 39.3 },
  { week: 46, weightP10: 4.40, weightP50: 5.10, weightP90: 5.95, lengthP10: 54.0, lengthP50: 57.0, lengthP90: 59.8, hcP10: 36.7, hcP50: 38.5, hcP90: 40.2 },
  { week: 48, weightP10: 4.90, weightP50: 5.65, weightP90: 6.55, lengthP10: 55.6, lengthP50: 58.6, lengthP90: 61.6, hcP10: 37.5, hcP50: 39.3, hcP90: 41.0 },
  { week: 50, weightP10: 5.40, weightP50: 6.20, weightP90: 7.15, lengthP10: 57.0, lengthP50: 60.2, lengthP90: 63.2, hcP10: 38.2, hcP50: 40.0, hcP90: 41.7 },
];

export function getInterpolatedFentonPoint(
  gender: 'M' | 'F',
  week: number,
): FentonPretermPoint {
  const table = gender === 'M' ? FENTON_PRETERM_BOYS : FENTON_PRETERM_GIRLS;
  const clampedWeek = Math.max(24, Math.min(50, week));

  for (let i = 0; i < table.length - 1; i++) {
    const cur = table[i];
    const next = table[i + 1];
    if (clampedWeek >= cur.week && clampedWeek <= next.week) {
      const ratio = (clampedWeek - cur.week) / (next.week - cur.week);
      return {
        week: clampedWeek,
        weightP10: +(cur.weightP10 + ratio * (next.weightP10 - cur.weightP10)).toFixed(2),
        weightP50: +(cur.weightP50 + ratio * (next.weightP50 - cur.weightP50)).toFixed(2),
        weightP90: +(cur.weightP90 + ratio * (next.weightP90 - cur.weightP90)).toFixed(2),
        lengthP10: +(cur.lengthP10 + ratio * (next.lengthP10 - cur.lengthP10)).toFixed(1),
        lengthP50: +(cur.lengthP50 + ratio * (next.lengthP50 - cur.lengthP50)).toFixed(1),
        lengthP90: +(cur.lengthP90 + ratio * (next.lengthP90 - cur.lengthP90)).toFixed(1),
        hcP10: +(cur.hcP10 + ratio * (next.hcP10 - cur.hcP10)).toFixed(1),
        hcP50: +(cur.hcP50 + ratio * (next.hcP50 - cur.hcP50)).toFixed(1),
        hcP90: +(cur.hcP90 + ratio * (next.hcP90 - cur.hcP90)).toFixed(1),
      };
    }
  }
  return table[table.length - 1];
}
