/**
 * Postnatal Maternal Early Obstetric Warning Score (MEOWS) Engine
 * Standardized for Sri Lanka PHM Postpartum In-Home and Clinic Monitoring
 */

export type MeowsAlertLevel = 'WHITE' | 'YELLOW' | 'RED';

export interface MeowsInput {
  bpSystolic: number;
  bpDiastolic: number;
  pulseBpm: number;
  respRate: number;
  tempC: number;
  lochiaBleeding: string; // 'NORMAL' | 'FRESH_RED' | 'CLOTS' | 'EXCESSIVE' | 'OFFENSIVE'
}

export interface MeowsParamEvaluation {
  name: string;
  labelEn: string;
  labelSi: string;
  value: number | string;
  displayValue: string;
  status: 'NORMAL' | 'YELLOW' | 'RED';
  notes?: string;
}

export interface MeowsEvaluationResult {
  alertLevel: MeowsAlertLevel;
  redCount: number;
  yellowCount: number;
  parameters: MeowsParamEvaluation[];
  actionAdviceEn: string;
  actionAdviceSi: string;
  isUrgentReferralNeeded: boolean;
}

export function evaluateMeows(input: MeowsInput): MeowsEvaluationResult {
  const params: MeowsParamEvaluation[] = [];

  // 1. Systolic Blood Pressure
  let sbpStatus: 'NORMAL' | 'YELLOW' | 'RED' = 'NORMAL';
  if (input.bpSystolic < 90 || input.bpSystolic >= 160) {
    sbpStatus = 'RED';
  } else if ((input.bpSystolic >= 140 && input.bpSystolic <= 159) || (input.bpSystolic >= 90 && input.bpSystolic <= 99)) {
    sbpStatus = 'YELLOW';
  }
  params.push({
    name: 'bpSystolic',
    labelEn: 'Systolic BP',
    labelSi: 'සිස්ටොලික් රුධිර පීඩනය',
    value: input.bpSystolic,
    displayValue: `${input.bpSystolic} mmHg`,
    status: sbpStatus,
  });

  // 2. Diastolic Blood Pressure
  let dbpStatus: 'NORMAL' | 'YELLOW' | 'RED' = 'NORMAL';
  if (input.bpDiastolic >= 100) {
    dbpStatus = 'RED';
  } else if (input.bpDiastolic >= 90 && input.bpDiastolic <= 99) {
    dbpStatus = 'YELLOW';
  }
  params.push({
    name: 'bpDiastolic',
    labelEn: 'Diastolic BP',
    labelSi: 'ඩයස්ටොලික් රුධිර පීඩනය',
    value: input.bpDiastolic,
    displayValue: `${input.bpDiastolic} mmHg`,
    status: dbpStatus,
  });

  // 3. Heart Rate / Pulse
  let pulseStatus: 'NORMAL' | 'YELLOW' | 'RED' = 'NORMAL';
  if (input.pulseBpm < 50 || input.pulseBpm >= 120) {
    pulseStatus = 'RED';
  } else if ((input.pulseBpm >= 100 && input.pulseBpm <= 119) || (input.pulseBpm >= 50 && input.pulseBpm <= 59)) {
    pulseStatus = 'YELLOW';
  }
  params.push({
    name: 'pulseBpm',
    labelEn: 'Pulse / Heart Rate',
    labelSi: 'නාඩි වේගය',
    value: input.pulseBpm,
    displayValue: `${input.pulseBpm} bpm`,
    status: pulseStatus,
  });

  // 4. Respiratory Rate
  let respStatus: 'NORMAL' | 'YELLOW' | 'RED' = 'NORMAL';
  if (input.respRate < 10 || input.respRate >= 30) {
    respStatus = 'RED';
  } else if (input.respRate >= 21 && input.respRate <= 29) {
    respStatus = 'YELLOW';
  }
  params.push({
    name: 'respRate',
    labelEn: 'Respiratory Rate',
    labelSi: 'ශ්වසන වේගය',
    value: input.respRate,
    displayValue: `${input.respRate} /min`,
    status: respStatus,
  });

  // 5. Temperature
  let tempStatus: 'NORMAL' | 'YELLOW' | 'RED' = 'NORMAL';
  if (input.tempC < 35.5 || input.tempC >= 38.5) {
    tempStatus = 'RED';
  } else if ((input.tempC >= 37.5 && input.tempC < 38.5) || (input.tempC >= 35.5 && input.tempC < 36.0)) {
    tempStatus = 'YELLOW';
  }
  params.push({
    name: 'tempC',
    labelEn: 'Temperature',
    labelSi: 'උෂ්ණත්වය',
    value: input.tempC,
    displayValue: `${input.tempC} °C`,
    status: tempStatus,
  });

  // 6. Lochia Bleeding
  let lochiaStatus: 'NORMAL' | 'YELLOW' | 'RED' = 'NORMAL';
  const lochiaUpper = (input.lochiaBleeding || 'NORMAL').toUpperCase();
  if (lochiaUpper === 'EXCESSIVE' || lochiaUpper === 'OFFENSIVE') {
    lochiaStatus = 'RED';
  } else if (lochiaUpper === 'FRESH_RED' || lochiaUpper === 'CLOTS') {
    lochiaStatus = 'YELLOW';
  }
  params.push({
    name: 'lochiaBleeding',
    labelEn: 'Lochia / Vaginal Bleeding',
    labelSi: 'ප්‍රසවයෙන් පසු රුධිර වහනය (ලෝකියා)',
    value: input.lochiaBleeding,
    displayValue: input.lochiaBleeding,
    status: lochiaStatus,
  });

  const redCount = params.filter((p) => p.status === 'RED').length;
  const yellowCount = params.filter((p) => p.status === 'YELLOW').length;

  let alertLevel: MeowsAlertLevel = 'WHITE';
  let isUrgentReferralNeeded = false;
  let actionAdviceEn = 'All vital signs normal. Continue standard postpartum care and feeding support.';
  let actionAdviceSi = 'සියලු වැදගත් ලක්ෂණ සාමාන්‍ය මට්ටමේ පවතී. සාමාන්‍ය පසු ප්‍රසව සත්කාර සහ මවුකිරි දීම දිගටම කරගෙන යන්න.';

  if (redCount >= 1 || yellowCount >= 2) {
    alertLevel = 'RED';
    isUrgentReferralNeeded = true;
    actionAdviceEn = 'CRITICAL ALERT (Red zone): Urgent obstetric consultation required! Contact MOH doctor immediately and arrange hospital emergency transfer.';
    actionAdviceSi = 'අත්‍යවශ්‍ය හදිසි අනතුරු ඇඟවීම (රතු කලාපය): වහාම සෞඛ්‍ය වෛද්‍ය නිලධාරී අමතා රෝහල් වෙත හදිසි යොමු කිරීමක් සිදු කරන්න!';
  } else if (yellowCount === 1) {
    alertLevel = 'YELLOW';
    isUrgentReferralNeeded = false;
    actionAdviceEn = 'CAUTION (Yellow zone): 1 trigger detected. Re-evaluate vital signs within 1-2 hours and notify supervising PHNS/MOH.';
    actionAdviceSi = 'අවවාදයයි (කහ කලාපය): අසාමාන්‍ය ලක්ෂණයක් හඳුනාගෙන ඇත. පැය 1-2ක් ඇතුළත නැවත පරීක්ෂා කර ප්‍රධාන මහජන සෞඛ්‍ය හෙද නිලධාරිනිය දැනුවත් කරන්න.';
  }

  return {
    alertLevel,
    redCount,
    yellowCount,
    parameters: params,
    actionAdviceEn,
    actionAdviceSi,
    isUrgentReferralNeeded,
  };
}
