/**
 * Miscarriage & High-Risk Pregnancy Scorer
 * All logic runs 100% locally on-device
 *
 * Implements Sri Lankan maternal health risk stratification
 * using a traffic-light system (GREEN / YELLOW / RED).
 */

export type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';

export type DangerSign =
  | 'BLEEDING'
  | 'SEVERE_HEADACHE'
  | 'EDEMA'
  | 'REDUCED_FM'
  | 'SEVERE_ABDOMINAL_PAIN';

export const DANGER_SIGNS: DangerSign[] = [
  'BLEEDING',
  'SEVERE_HEADACHE',
  'EDEMA',
  'REDUCED_FM',
  'SEVERE_ABDOMINAL_PAIN',
];

export interface RiskInput {
  dangerSigns: DangerSign[];
  isFertilityTreatment: boolean;
  isPreciousPregnancy: boolean;
  prevMiscarriages: number;
  prevStillbirths: number;
  prevCSections: number;
  chronicConditions: string[]; // e.g., 'HEART_DISEASE', 'DIABETES', 'HYPERTENSION', 'THYROID', 'PCOS'
  bpSystolic?: number;
  bpDiastolic?: number;
  hemoglobin?: number;
  maternalAge?: number;
}

export interface RiskResult {
  level: RiskLevel;
  score: number;
  reasons: string[];
  recommendedFollowUpDays: number;
  urgentReferralRequired: boolean;
}

/**
 * Calculate the composite risk level for a pregnant mother.
 *
 * Scoring rules:
 *  - AUTO-RED factors → 7-day follow-up
 *  - AUTO-YELLOW factors → 14-day follow-up (only if not already RED)
 *  - Otherwise GREEN → 28-day follow-up
 */
export function calculateRisk(input: RiskInput): RiskResult {
  let level: RiskLevel = 'GREEN';
  let score = 0;
  const reasons: string[] = [];
  let urgentReferralRequired = false;

  // ──────────────────────────────────────────────
  // AUTO-RED factors (7-day follow-up)
  // ──────────────────────────────────────────────

  // Any active danger sign
  if (input.dangerSigns.length > 0) {
    score += 10 * input.dangerSigns.length;
    input.dangerSigns.forEach((ds) => {
      reasons.push(`Active danger sign: ${ds}`);
      if (ds === 'SEVERE_ABDOMINAL_PAIN') {
        urgentReferralRequired = true;
      }
    });
    level = 'RED';
  }

  // Fertility treatment / precious pregnancy
  if (input.isFertilityTreatment) {
    score += 8;
    reasons.push('Fertility treatment pregnancy');
    level = 'RED';
  }
  if (input.isPreciousPregnancy) {
    score += 8;
    reasons.push('Precious pregnancy');
    level = 'RED';
  }

  // >=2 previous miscarriages
  if (input.prevMiscarriages >= 2) {
    score += 7;
    reasons.push(`Recurrent miscarriages (${input.prevMiscarriages})`);
    level = 'RED';
  }

  // >=1 previous stillbirth
  if (input.prevStillbirths >= 1) {
    score += 8;
    reasons.push(`Previous stillbirth(s) (${input.prevStillbirths})`);
    level = 'RED';
  }

  // Chronic conditions → RED
  const redConditions = ['HEART_DISEASE', 'DIABETES', 'HYPERTENSION'];
  for (const cond of redConditions) {
    if (input.chronicConditions.includes(cond)) {
      score += 6;
      reasons.push(`Chronic condition: ${cond}`);
      level = 'RED';
    }
  }

  // >=2 C-sections
  if (input.prevCSections >= 2) {
    score += 6;
    reasons.push(`Multiple previous C-sections (${input.prevCSections})`);
    level = 'RED';
  }

  // BP >= 140/90 → RED + urgent referral
  if (input.bpSystolic !== undefined && input.bpDiastolic !== undefined) {
    if (input.bpSystolic >= 140 || input.bpDiastolic >= 90) {
      score += 10;
      reasons.push(`High blood pressure (${input.bpSystolic}/${input.bpDiastolic})`);
      level = 'RED';
      urgentReferralRequired = true;
    }
  }

  // Hemoglobin < 8 g/dL → RED
  if (input.hemoglobin !== undefined && input.hemoglobin < 8) {
    score += 8;
    reasons.push(`Severe anemia (Hb ${input.hemoglobin} g/dL)`);
    level = 'RED';
  }

  // ──────────────────────────────────────────────
  // AUTO-YELLOW factors (14-day follow-up)
  // Only upgrade to YELLOW if not already RED
  // ──────────────────────────────────────────────

  // 1 previous miscarriage
  if (input.prevMiscarriages === 1) {
    score += 4;
    reasons.push('Previous miscarriage (1)');
    if (level !== 'RED') level = 'YELLOW';
  }

  // Maternal age < 20 or >= 35
  if (input.maternalAge !== undefined) {
    if (input.maternalAge < 20) {
      score += 4;
      reasons.push(`Young maternal age (${input.maternalAge})`);
      if (level !== 'RED') level = 'YELLOW';
    }
    if (input.maternalAge >= 35) {
      score += 4;
      reasons.push(`Advanced maternal age (${input.maternalAge})`);
      if (level !== 'RED') level = 'YELLOW';
    }
  }

  // Thyroid / PCOS
  const yellowConditions = ['THYROID', 'PCOS'];
  for (const cond of yellowConditions) {
    if (input.chronicConditions.includes(cond)) {
      score += 3;
      reasons.push(`Condition: ${cond}`);
      if (level !== 'RED') level = 'YELLOW';
    }
  }

  // 1 previous C-section
  if (input.prevCSections === 1) {
    score += 3;
    reasons.push('Previous C-section (1)');
    if (level !== 'RED') level = 'YELLOW';
  }

  // Hemoglobin 8.0–9.9 g/dL
  if (input.hemoglobin !== undefined && input.hemoglobin >= 8 && input.hemoglobin < 10) {
    score += 4;
    reasons.push(`Moderate anemia (Hb ${input.hemoglobin} g/dL)`);
    if (level !== 'RED') level = 'YELLOW';
  }

  // ──────────────────────────────────────────────
  // Follow-up interval based on final risk level
  // ──────────────────────────────────────────────
  const recommendedFollowUpDays =
    level === 'RED' ? 7 : level === 'YELLOW' ? 14 : 28;

  return { level, score, reasons, recommendedFollowUpDays, urgentReferralRequired };
}
