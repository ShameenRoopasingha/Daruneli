/**
 * Clinical Chart Analyzers for Sri Lanka PHM Maternal & Child Monitoring
 */

import {
  getSfhCentiles,
  getWeightGainCorridor,
  getInterpolatedWhoPoint,
  WHO_WFA_BOYS,
  WHO_WFA_GIRLS,
  WHO_HFA_BOYS,
  WHO_HFA_GIRLS,
} from './referenceCurves';

// ============================================================================
// 1. Symphysis-Fundal Height (SFH) Trajectory Analyzer
// ============================================================================
export interface SfhVisitInput {
  visitDate: string;
  poaWeeks?: number | null;
  sfhCm?: number | null;
}

export interface SfhAnalysisResult {
  status: 'NORMAL' | 'SGA' | 'LGA' | 'STATIC_GROWTH' | 'INSUFFICIENT_DATA';
  isAbnormal: boolean;
  alertEn: string;
  alertSi: string;
  latestPoa?: number;
  latestSfh?: number;
}

export function analyzeSfh(visits: SfhVisitInput[]): SfhAnalysisResult {
  const validVisits = visits
    .filter((v) => typeof v.poaWeeks === 'number' && typeof v.sfhCm === 'number' && v.poaWeeks >= 16)
    .sort((a, b) => (a.poaWeeks || 0) - (b.poaWeeks || 0));

  if (validVisits.length === 0) {
    return {
      status: 'INSUFFICIENT_DATA',
      isAbnormal: false,
      alertEn: 'No SFH measurements recorded past 16 weeks.',
      alertSi: 'සති 16න් පසු ගර්භාෂ උස (SFH) සටහන් කර නොමැත.',
    };
  }

  const latest = validVisits[validVisits.length - 1];
  const poa = latest.poaWeeks!;
  const sfh = latest.sfhCm!;
  const centiles = getSfhCentiles(poa);

  // Check for static growth between last 2 measurements if >= 2 weeks apart
  if (validVisits.length >= 2) {
    const prev = validVisits[validVisits.length - 2];
    const weekGap = (latest.poaWeeks || 0) - (prev.poaWeeks || 0);
    const sfhGain = (latest.sfhCm || 0) - (prev.sfhCm || 0);
    if (weekGap >= 2 && sfhGain <= 0.5) {
      return {
        status: 'STATIC_GROWTH',
        isAbnormal: true,
        alertEn: `Static SFH growth detected (${sfh} cm at ${poa}w vs ${prev.sfhCm} cm at ${prev.poaWeeks}w). Growth faltering risk: VOG ultrasound review advised.`,
        alertSi: `ගර්භාෂ උස වර්ධනය අඩාල වීමක් හඳුනාගෙන ඇත (${poa} සතියේදී ${sfh} cm). අතිරේක අල්ට්රා සවුන්ඩ් පරීක්ෂාවක් සඳහා යොමු කරන්න.`,
        latestPoa: poa,
        latestSfh: sfh,
      };
    }
  }

  if (sfh < centiles.p10) {
    return {
      status: 'SGA',
      isAbnormal: true,
      alertEn: `SFH ${sfh} cm is below the 10th centile (${centiles.p10} cm). Suspected Small-for-Gestational-Age (SGA) / Oligohydramnios.`,
      alertSi: `ගර්භාෂ උස ${sfh} cm 10 වන ප්‍රතිශතකයට පහළින් පවතී (${centiles.p10} cm). කලල වර්ධන වේගය අඩු වීමේ අවදානමක් (SGA) පවතී.`,
      latestPoa: poa,
      latestSfh: sfh,
    };
  }

  if (sfh > centiles.p90) {
    return {
      status: 'LGA',
      isAbnormal: true,
      alertEn: `SFH ${sfh} cm is above the 90th centile (${centiles.p90} cm). Suspected Large-for-Gestational-Age (LGA) / Polyhydramnios / Multiple gestation.`,
      alertSi: `ගර්භාෂ උස ${sfh} cm 90 වන ප්‍රතිශතකයට ඉහළින් පවතී (${centiles.p90} cm). විශාල කලලයක් (LGA) හෝ තරල ප්‍රමාණය වැඩි වීමේ අවදානම.`,
      latestPoa: poa,
      latestSfh: sfh,
    };
  }

  return {
    status: 'NORMAL',
    isAbnormal: false,
    alertEn: `SFH ${sfh} cm corresponds normally with gestational age ${poa} weeks (Within 10th-90th centiles).`,
    alertSi: `ගර්භාෂ උස ${sfh} cm ගර්භ සති ${poa} සඳහා සාමාන්‍ය වර්ධන කලාපයේ (10-90 ප්‍රතිශතක අතර) පවතී.`,
    latestPoa: poa,
    latestSfh: sfh,
  };
}

// ============================================================================
// 2. Maternal Weight Gain Trajectory Analyzer
// ============================================================================
export interface WeightGainVisitInput {
  visitDate: string;
  poaWeeks?: number | null;
  weightKg?: number | null;
}

export interface WeightGainAnalysisResult {
  status: 'OPTIMAL' | 'BELOW_TARGET' | 'EXCESSIVE' | 'INSUFFICIENT_DATA';
  totalGainKg: number;
  expectedMinKg: number;
  expectedMaxKg: number;
  messageEn: string;
  messageSi: string;
}

export function analyzeWeightGain(
  bookingWeightKg?: number | null,
  bookingBmi?: number | null,
  visits: WeightGainVisitInput[] = [],
): WeightGainAnalysisResult {
  if (!bookingWeightKg || !bookingBmi) {
    return {
      status: 'INSUFFICIENT_DATA',
      totalGainKg: 0,
      expectedMinKg: 0,
      expectedMaxKg: 0,
      messageEn: 'Booking weight and BMI not recorded.',
      messageSi: 'ලියාපදිංචි බර සහ BMI සටහන් කර නොමැත.',
    };
  }

  const valid = visits
    .filter((v) => typeof v.poaWeeks === 'number' && typeof v.weightKg === 'number')
    .sort((a, b) => (a.poaWeeks || 0) - (b.poaWeeks || 0));

  if (valid.length === 0) {
    return {
      status: 'INSUFFICIENT_DATA',
      totalGainKg: 0,
      expectedMinKg: 0,
      expectedMaxKg: 0,
      messageEn: 'No follow-up weight measurements recorded.',
      messageSi: 'පසු විපරම් බර මිනුම් සටහන් කර නොමැත.',
    };
  }

  const latest = valid[valid.length - 1];
  const poa = latest.poaWeeks || 0;
  const currentWeight = latest.weightKg || bookingWeightKg;
  const totalGainKg = +(currentWeight - bookingWeightKg).toFixed(1);
  const corridor = getWeightGainCorridor(bookingBmi, poa);

  if (totalGainKg < corridor.minGain) {
    return {
      status: 'BELOW_TARGET',
      totalGainKg,
      expectedMinKg: corridor.minGain,
      expectedMaxKg: corridor.maxGain,
      messageEn: `Weight gain of ${totalGainKg} kg is below target (${corridor.minGain} - ${corridor.maxGain} kg). Provide Thriposha and nutritional counseling.`,
      messageSi: `බර වැඩිවීම ${totalGainKg} kg අපේක්ෂිත සීමාවට (${corridor.minGain} - ${corridor.maxGain} kg) වඩා අඩුය. ත්‍රිපෝෂ ලබාදීම සහ පෝෂණ උපදෙස් අවශ්‍ය වේ.`,
    };
  }

  if (totalGainKg > corridor.maxGain) {
    return {
      status: 'EXCESSIVE',
      totalGainKg,
      expectedMinKg: corridor.minGain,
      expectedMaxKg: corridor.maxGain,
      messageEn: `Excessive weight gain of ${totalGainKg} kg (Expected: ${corridor.minGain} - ${corridor.maxGain} kg). Screen for gestational diabetes & pre-eclampsia.`,
      messageSi: `බර වැඩිවීම ${totalGainKg} kg අපේක්ෂිත සීමාව ඉක්මවා ඇත (අපේක්ෂිත: ${corridor.minGain} - ${corridor.maxGain} kg). ගර්භණී දියවැඩියාව සහ අධික රුධිර පීඩනය පරීක්ෂා කරන්න.`,
    };
  }

  return {
    status: 'OPTIMAL',
    totalGainKg,
    expectedMinKg: corridor.minGain,
    expectedMaxKg: corridor.maxGain,
    messageEn: `Weight gain of ${totalGainKg} kg is within the recommended healthy corridor (${corridor.minGain} - ${corridor.maxGain} kg).`,
    messageSi: `බර වැඩිවීම ${totalGainKg} kg නියමිත සෞඛ්‍ය සම්පන්න සීමාව තුළ (${corridor.minGain} - ${corridor.maxGain} kg) සාමාන්‍ය වේ.`,
  };
}

// ============================================================================
// 3. Cardiff Count-to-10 Fetal Kick Analyzer
// ============================================================================
export interface KickLogInput {
  id?: string;
  logDate?: string;
  log_date?: string;
  startTime?: string;
  start_time?: string;
  tenthKickTime?: string | null;
  tenth_kick_time?: string | null;
  kickCount?: number;
  kick_count?: number;
  durationMinutes?: number | null;
  duration_minutes?: number | null;
  reducedMovementFlag?: number;
  reduced_movement_flag?: number;
}

export interface KickAnalysisResult {
  hasReducedMovementAlert: boolean;
  alertEn: string;
  alertSi: string;
  averageDurationMinutes: number;
  totalDaysLogged: number;
}

export function analyzeCardiffKickCount(logs: KickLogInput[]): KickAnalysisResult {
  if (logs.length === 0) {
    return {
      hasReducedMovementAlert: false,
      alertEn: 'No kick records logged yet. Begin Cardiff count daily from 28 weeks.',
      alertSi: 'දරු චලන සටහන් කර නොමැත. සති 28 සිට දිනපතා දරු චලන 10 ගණන් කිරීම ආරම්භ කරන්න.',
      averageDurationMinutes: 0,
      totalDaysLogged: 0,
    };
  }

  // Sort by date ascending
  const sorted = [...logs].sort((a, b) =>
    (a.logDate || a.log_date || '').localeCompare(b.logDate || b.log_date || '')
  );
  const latest = sorted[sorted.length - 1];

  const latestReduced =
    (latest.reducedMovementFlag ?? latest.reduced_movement_flag ?? 0) === 1;
  const latestCount = latest.kickCount ?? latest.kick_count ?? 10;
  const latestDuration = latest.durationMinutes ?? latest.duration_minutes ?? null;

  const isReduced =
    latestReduced ||
    latestCount < 10 ||
    (typeof latestDuration === 'number' && latestDuration > 720);

  const validDurations = sorted
    .map((l) => l.durationMinutes ?? l.duration_minutes)
    .filter((d): d is number => typeof d === 'number' && d > 0);

  const avgMinutes =
    validDurations.length > 0
      ? Math.round(validDurations.reduce((acc, d) => acc + d, 0) / validDurations.length)
      : 120;

  if (isReduced) {
    return {
      hasReducedMovementAlert: true,
      alertEn: 'CRITICAL ALERT: Reduced fetal movement detected (< 10 kicks in 12 hours). Mother must attend hospital maternity unit immediately for CTG monitoring!',
      alertSi: 'හදිසි අනතුරු ඇඟවීම: කලල චලන අඩුවීමක් හඳුනාගෙන ඇත (පැය 12ක් තුළ චලන 10ක් නොමැත). වහාම CTG පරීක්ෂාවක් සඳහා රෝහලට යොමු කරන්න!',
      averageDurationMinutes: avgMinutes,
      totalDaysLogged: sorted.length,
    };
  }

  return {
    hasReducedMovementAlert: false,
    alertEn: `Fetal movements normal. Average time to 10 kicks: ${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m.`,
    alertSi: `කලල චලන සාමාන්‍ය මට්ටමේ පවතී. චලන 10ක් සම්පූර්ණ වීමට සාමාන්‍ය කාලය: පැය ${Math.floor(avgMinutes / 60)} විනාඩි ${avgMinutes % 60}.`,
    averageDurationMinutes: avgMinutes,
    totalDaysLogged: sorted.length,
  };
}

// ============================================================================
// 4. WHO Z-Score Child Nutrition Classifier
// ============================================================================
export interface WhoClassificationResult {
  nutritionStatus: 'NORMAL' | 'MAM' | 'SAM' | 'OVERWEIGHT';
  isStunted: boolean;
  statusLabelEn: string;
  statusLabelSi: string;
  wfaZScore: number;
}

export function classifyWhoZScore(
  gender: 'M' | 'F',
  ageMonths: number,
  weightKg: number,
  heightCm?: number | null,
): WhoClassificationResult {
  const table = gender === 'M' ? WHO_WFA_BOYS : WHO_WFA_GIRLS;
  const ref = getInterpolatedWhoPoint(table, ageMonths);

  let zScore = 0;
  if (weightKg < ref.median) {
    const sdDistance = ref.median - ref.sd2Neg;
    zScore = -((ref.median - weightKg) / (sdDistance / 2));
  } else {
    const sdDistance = ref.sd2Pos - ref.median;
    zScore = (weightKg - ref.median) / (sdDistance / 2);
  }
  const roundedZ = +zScore.toFixed(1);

  let isStunted = false;
  if (heightCm && heightCm > 0) {
    const hfaTable = gender === 'M' ? WHO_HFA_BOYS : WHO_HFA_GIRLS;
    const hfaRef = getInterpolatedWhoPoint(hfaTable, ageMonths);
    if (heightCm < hfaRef.sd2Neg) {
      isStunted = true;
    }
  }

  if (weightKg < ref.sd3Neg) {
    return {
      nutritionStatus: 'SAM',
      isStunted,
      statusLabelEn: 'Severe Acute Malnutrition (SAM) - Red Zone',
      statusLabelSi: 'දරුණු මන්දපෝෂණය (SAM) - රතු කලාපය',
      wfaZScore: roundedZ,
    };
  }

  if (weightKg < ref.sd2Neg) {
    return {
      nutritionStatus: 'MAM',
      isStunted,
      statusLabelEn: 'Moderate Acute Malnutrition (MAM) - Yellow Zone',
      statusLabelSi: 'මධ්‍යස්ථ මන්දපෝෂණය (MAM) - කහ කලාපය',
      wfaZScore: roundedZ,
    };
  }

  if (weightKg > ref.sd2Pos) {
    return {
      nutritionStatus: 'OVERWEIGHT',
      isStunted,
      statusLabelEn: 'Overweight - Purple Zone',
      statusLabelSi: 'අධිබර තත්ත්වය - දම් කලාපය',
      wfaZScore: roundedZ,
    };
  }

  return {
    nutritionStatus: 'NORMAL',
    isStunted,
    statusLabelEn: isStunted ? 'Normal Weight with Stunting' : 'Normal Healthy Growth - Green Zone',
    statusLabelSi: isStunted ? 'සාමාන්‍ය බර නමුත් උස මිටි තත්ත්වය' : 'සාමාන්‍ය සෞඛ්‍ය සම්පන්න වර්ධනය - කොළ කලාපය',
    wfaZScore: roundedZ,
  };
}
