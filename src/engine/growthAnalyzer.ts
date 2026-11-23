/**
 * Growth Faltering Detection & Nutrition Status
 *
 * Detects growth faltering when weight fails to increase across
 * two consecutive monthly measurements. Also provides a simplified
 * WHO weight-for-age nutrition status classification.
 */

export interface GrowthRecord {
  recordedDate: Date;
  ageMonths: number;
  weightKg: number;
  heightCm?: number;
}

export interface GrowthAnalysis {
  isFaltering: boolean;
  trend: 'GAINING' | 'STATIC' | 'LOSING';
  lastTwoWeights: { ageMonths: number; weightKg: number }[];
  message: string;
}

/**
 * Analyze growth trend from a series of weight measurements.
 * Requires at least 2 records to determine a trend.
 *
 * @param records - Array of growth records (any order)
 * @returns Growth analysis with faltering detection
 */
export function analyzeGrowth(records: GrowthRecord[]): GrowthAnalysis {
  // Sort by date ascending
  const sorted = [...records].sort(
    (a, b) => a.recordedDate.getTime() - b.recordedDate.getTime(),
  );

  if (sorted.length < 2) {
    return {
      isFaltering: false,
      trend: 'GAINING',
      lastTwoWeights: sorted.map((r) => ({
        ageMonths: r.ageMonths,
        weightKg: r.weightKg,
      })),
      message: 'Insufficient data for growth analysis (need at least 2 records)',
    };
  }

  // Get last 2 consecutive records
  const prev = sorted[sorted.length - 2];
  const latest = sorted[sorted.length - 1];

  const lastTwoWeights = [
    { ageMonths: prev.ageMonths, weightKg: prev.weightKg },
    { ageMonths: latest.ageMonths, weightKg: latest.weightKg },
  ];

  if (latest.weightKg > prev.weightKg) {
    return {
      isFaltering: false,
      trend: 'GAINING',
      lastTwoWeights,
      message: `Weight increased from ${prev.weightKg}kg to ${latest.weightKg}kg`,
    };
  }

  if (latest.weightKg === prev.weightKg) {
    return {
      isFaltering: true,
      trend: 'STATIC',
      lastTwoWeights,
      message: `Growth faltering: Weight static at ${latest.weightKg}kg for 2 consecutive measurements`,
    };
  }

  // Weight decreased
  return {
    isFaltering: true,
    trend: 'LOSING',
    lastTwoWeights,
    message: `Growth faltering: Weight decreased from ${prev.weightKg}kg to ${latest.weightKg}kg`,
  };
}

/**
 * Calculate a child's age in months from their date of birth.
 *
 * @param dob           - Date of birth
 * @param referenceDate - Date to calculate against (defaults to now)
 * @returns Age in complete months (minimum 0)
 */
export function calculateAgeMonths(dob: Date, referenceDate?: Date): number {
  const now = referenceDate || new Date();
  let months = (now.getFullYear() - dob.getFullYear()) * 12;
  months += now.getMonth() - dob.getMonth();
  if (now.getDate() < dob.getDate()) months--;
  return Math.max(0, months);
}

/**
 * Classify nutrition status using a simplified WHO weight-for-age approximation.
 *
 * Uses approximate median weights and estimated standard deviations
 * to classify as:
 *  - NORMAL: weight >= median − 2 SD
 *  - MAM (Moderate Acute Malnutrition): median − 3 SD <= weight < median − 2 SD
 *  - SAM (Severe Acute Malnutrition): weight < median − 3 SD
 *
 * Note: This is a simplified approximation. For clinical decisions,
 * use the full WHO growth standards z-score tables.
 *
 * @param weightKg  - Child's weight in kilograms
 * @param ageMonths - Child's age in months (0–24 supported)
 * @param gender    - 'M' for male, 'F' for female
 */
export function getNutritionStatus(
  weightKg: number,
  ageMonths: number,
  gender: 'M' | 'F',
): 'NORMAL' | 'MAM' | 'SAM' {
  // Approximate median weights (WHO standards, simplified)
  // Index = age in months (0–24)
  const medianWeights: Record<string, number[]> = {
    M: [
      3.3, 4.5, 5.6, 6.4, 7.0, 7.5, 7.9, 8.3, 8.6, 8.9, 9.2, 9.4, 9.6, 9.9,
      10.1, 10.3, 10.5, 10.7, 10.9, 11.1, 11.3, 11.5, 11.8, 12.0, 12.2,
    ],
    F: [
      3.2, 4.2, 5.1, 5.8, 6.4, 6.9, 7.3, 7.6, 7.9, 8.2, 8.5, 8.7, 8.9, 9.2,
      9.4, 9.6, 9.8, 10.0, 10.2, 10.4, 10.6, 10.9, 11.1, 11.3, 11.5,
    ],
  };

  const idx = Math.min(ageMonths, 24);
  const median = medianWeights[gender]?.[idx] ?? medianWeights.M[idx] ?? 10;
  const sd = median * 0.12; // Approximate SD as 12% of median

  if (weightKg < median - 3 * sd) return 'SAM';
  if (weightKg < median - 2 * sd) return 'MAM';
  return 'NORMAL';
}
