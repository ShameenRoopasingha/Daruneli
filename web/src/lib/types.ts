// Data models for MOH & PHNS Supervision Portal

export type OfficerRole = 'MOH' | 'PHNS' | 'PHM' | 'MOTHER';

export interface UserProfile {
  id: string;
  fullName: string;
  role: OfficerRole;
  mohDivision: string;
  phmAreaId?: string | null;
  phmAreaName?: string | null;
}

export interface PhmAreaSummary {
  id: string;
  code: string;
  name: string;
  mohDivision: string;
  gnDivisions: string[];
  phmOfficerName: string;
  phmOfficerPhone: string;
  activeMothers: number;
  redRiskCount: number;
  yellowRiskCount: number;
  greenRiskCount: number;
  activeChildren: number;
  mamCount: number;
  samCount: number;
  growthFalteringCount: number;
  overdueTasksCount: number;
  overdueVaccinesCount: number;
  lastSyncAt: string; // ISO string
  syncHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL'; // <24h, 24-48h, >48h
}

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE';
export type AlertCategory =
  | 'DANGER_SIGNS'
  | 'HIGH_BP'
  | 'POSTNATAL_MEOWS'
  | 'REDUCED_FETAL_KICKS'
  | 'OVERDUE_RED_RISK'
  | 'CHILD_SAM'
  | 'GROWTH_FALTERING';

export type ReviewStatus = 'ACKNOWLEDGED' | 'FOLLOW_UP_REQUESTED' | 'RESOLVED' | 'UNREVIEWED';

export interface EscalationAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  status: ReviewStatus;
  targetType: 'MOTHER' | 'CHILD';
  targetId: string;
  targetName: string;
  ageYears?: number;
  poaWeeks?: number;
  eligibleFamilyNo: string;
  phmAreaId: string;
  phmAreaName: string;
  gnDivision: string;
  detectedAt: string; // ISO
  summary: string;
  details: string;
  vitals?: {
    bp?: string;
    pulse?: number;
    temp?: number;
    sfh?: number;
    weightKg?: number;
    fetalHeartRate?: string;
    urineAlbumin?: string;
  };
  vitalsTrend?: {
    date: string;
    bpSystolic?: number;
    bpDiastolic?: number;
    weightKg?: number;
  }[];
  riskFactors?: string[];
  dangerSigns?: string[];
  source?: 'PHM_APP' | 'MOTHER_PORTAL';
  voiceNoteUrl?: string | null;
  voiceNoteDurationSec?: number | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  supervisionNotes?: SupervisionNote[];
}

export interface SupervisionNote {
  id: string;
  mohDivision: string;
  phmAreaId: string;
  targetType: 'MOTHER' | 'CHILD' | 'PHM_AREA';
  targetId: string;
  authorId: string;
  authorName: string;
  authorRole: 'PHNS' | 'MOH';
  status: 'ACKNOWLEDGED' | 'FOLLOW_UP_REQUESTED' | 'RESOLVED';
  note: string;
  createdAt: string;
}

export interface H509Report {
  metadata: {
    mohDivision: string;
    phmAreaName: string;
    phmAreaId?: string | null;
    reportingPeriod: string;
    generatedAt: string;
    phmOfficerName?: string;
    preparedBy: string;
    approvedBy: string;
  };
  section1_antenatal: {
    totalEligibleFamilies: number;
    activeMothers: number;
    newRegistrationsThisMonth: number;
    registeredBefore12Weeks: number;
    riskBreakdown: { red: number; yellow: number; green: number };
    totalHomeVisits: number;
    totalClinicVisits: number;
    mothersWithLowHb: number; // Hb < 10
    urgentHospitalReferrals: number;
  };
  section2_deliveries: {
    totalDeliveries: number;
    normalVaginalDeliveries: number;
    cesareanSections: number;
    instrumentalDeliveries: number;
    liveBirths: number;
    stillbirths: number;
    miscarriages: number;
    lowBirthWeightBabies: number; // < 2.5 kg
  };
  section3_childHealth: {
    registeredChildren0to5: number;
    weighedThisMonth: number;
    weighingPercentage: number;
    nutritionStatus: { normal: number; mam: number; sam: number };
    growthFalteringCount: number;
  };
  section4_immunization: {
    bcgCount: number;
    pentavalentCount: number;
    mmrCount: number;
    opvCount: number;
    overdueVaccinesCount: number;
  };
  section5_appendix: {
    highRiskMothers: {
      id: string;
      name: string;
      riskLevel: string;
      riskFactors: string[];
      phmArea: string;
      eddDate: string;
    }[];
    overdueTasks: {
      id: string;
      targetName: string;
      taskType: string;
      dueDate: string;
      phmArea: string;
    }[];
  };
}

export interface TimetableTemplateItem {
  id: string;
  dayOfWeek: number; // 1 = Monday, 6 = Saturday
  weekPattern: 'ALL' | '1_3' | '2_4' | 'FIRST' | 'LAST';
  activityType: 'HOME_VISIT' | 'ANC_CLINIC' | 'CWC_CLINIC' | 'MOH_OFFICE' | 'CATCH_UP' | 'OFF';
  gnDivision?: string;
  title: string;
  startTime: string;
  endTime: string;
}

export interface ScheduleOverrideItem {
  id: string;
  overrideDate: string; // YYYY-MM-DD
  activityType: 'HOLIDAY' | 'LEAVE' | 'HOME_VISIT' | 'ANC_CLINIC' | 'CWC_CLINIC' | 'MOH_OFFICE' | 'CATCH_UP';
  gnDivision?: string;
  title: string;
  notes?: string;
}

export interface MotherTransferItem {
  id: string;
  phmAreaId: string;
  phmAreaName: string;
  motherId: string;
  motherName: string;
  transferType: 'TEMP_OUT' | 'PERMANENT_TRANSFER';
  destinationArea: string;
  expectedReturnDate?: string | null;
  status: 'ACTIVE' | 'RETURNED' | 'COMPLETED';
  notes?: string;
  createdAt: string;
}

export interface SmsLogItem {
  id: string;
  phmAreaId: string;
  phmAreaName: string;
  recipientType: 'MOTHER' | 'CHILD_CARETAKER';
  phone: string;
  reminderType: 'ANTENATAL_CLINIC' | 'CHILD_VACCINE' | 'HOME_VISIT';
  dueDate: string; // DD/MM/YYYY
  messageBody: string;
  providerStatus: 'SENT' | 'DELIVERED' | 'FAILED' | 'DRY_RUN';
  sentAt: string; // DD/MM/YYYY HH:mm
}

export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  employeeId: string;
  role: OfficerRole;
  phmAreaId?: string | null;
  phmAreaCode?: string | null;
  phmAreaName?: string | null;
  mohDivision: string;
  preferredLang: 'si' | 'ta' | 'en';
  isActive: boolean;
  deactivatedAt?: string | null;
  lastSignInAt?: string | null;
  createdAt: string;
}

export type UserAuditAction =
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'REASSIGN_AREA'
  | 'DEACTIVATE_USER'
  | 'REACTIVATE_USER'
  | 'RESET_PASSWORD';

export interface UserAuditLogItem {
  id: string;
  mohDivision: string;
  actorId: string;
  actorName?: string;
  targetUserId: string;
  targetUserName?: string;
  action: UserAuditAction;
  changes: Record<string, any>;
  createdAt: string;
}

