/**
 * Prisma ORM Database Service Layer for Daruneli Maternal & Child Health System
 *
 * Provides type-safe database queries using Prisma Client that mirror existing
 * Supabase operations for:
 *   - Mother (Maternal registry, NIC/QR lookups, risk tracking)
 *   - Pregnancy (Gravida, Para, LRMP, EDD, active status, risk assessments)
 *   - AntenatalVisit (Clinical vitals, SFH, BP, weight, fetal assessments)
 *   - Child (CHDR child records, growth faltering, nutrition status, immunizations)
 *   - UserAuditLog (Audit trails for user management and clinical compliance)
 *
 * Built-in Offline Demo Mode:
 * Automatically falls back to high-fidelity mock/demo data when DATABASE_URL is not
 * configured or when database connectivity is unavailable.
 */

import {
  Prisma,
  Mother,
  Pregnancy,
  AntenatalVisit,
  Child,
  ChildGrowthRecord,
  ChildImmunization,
  FetalKickLog,
  UserAuditLog,
  PhmArea,
  Family,
  Profile,
  RiskLevel,
  PregnancyStatus,
  Gender,
  NutritionStatus,
  ImmunizationStatus,
} from '@prisma/client';
import { prisma, isPrismaConfigured } from '../prisma';
import { DEMO_MOTHER_ROSTER } from '../demoMothers';
import { MOCK_AUDIT_LOGS } from '../mockData';

// ============================================================================
// Types & Relations
// ============================================================================

export type MotherWithRelations = Prisma.MotherGetPayload<{
  include: {
    phmArea: true;
    family: true;
    pregnancies: {
      include: {
        antenatalVisits: true;
        fetalKickLogs: true;
      };
    };
    children: {
      include: {
        growthRecords: true;
        immunizations: true;
      };
    };
  };
}>;

export type PregnancyWithRelations = Prisma.PregnancyGetPayload<{
  include: {
    mother: true;
    phmArea: true;
    antenatalVisits: true;
    fetalKickLogs: true;
  };
}>;

export type AntenatalVisitWithRelations = Prisma.AntenatalVisitGetPayload<{
  include: {
    pregnancy: {
      include: {
        mother: true;
      };
    };
    phmArea: true;
  };
}>;

export type ChildWithRelations = Prisma.ChildGetPayload<{
  include: {
    mother: true;
    phmArea: true;
    pregnancy: true;
    growthRecords: true;
    immunizations: true;
  };
}>;

export type UserAuditLogWithPerformer = Prisma.UserAuditLogGetPayload<{
  include: {
    performer: true;
  };
}>;

// Filter interfaces
export interface MotherFilters {
  phmAreaId?: string;
  familyId?: string;
  search?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface PregnancyFilters {
  motherId?: string;
  phmAreaId?: string;
  status?: PregnancyStatus;
  riskLevel?: RiskLevel;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface AntenatalVisitFilters {
  pregnancyId?: string;
  phmAreaId?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface ChildFilters {
  motherId?: string;
  phmAreaId?: string;
  pregnancyId?: string;
  nutritionStatus?: NutritionStatus;
  gender?: Gender;
  search?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface AuditLogFilters {
  performedBy?: string;
  targetUserId?: string;
  action?: string;
  mohDivision?: string;
  limit?: number;
  offset?: number;
}

// Input interfaces
export interface CreateMotherInput {
  id?: string;
  phmAreaId?: string | null;
  familyId: string;
  qrToken?: string;
  fullName: string;
  nic?: string | null;
  dob?: Date | string | null;
  phone?: string | null;
  bloodGroup?: string | null;
  chronicConditionsJson?: string | null;
  fertilityTreatmentHistory?: number;
  prevMiscarriagesCount?: number;
  prevStillbirthsCount?: number;
  prevCSectionsCount?: number;
  planningPregnancy?: number;
}

export interface UpdateMotherInput {
  phmAreaId?: string | null;
  familyId?: string;
  qrToken?: string;
  fullName?: string;
  nic?: string | null;
  dob?: Date | string | null;
  phone?: string | null;
  bloodGroup?: string | null;
  chronicConditionsJson?: string | null;
  fertilityTreatmentHistory?: number;
  prevMiscarriagesCount?: number;
  prevStillbirthsCount?: number;
  prevCSectionsCount?: number;
  planningPregnancy?: number;
  deletedAt?: Date | string | null;
}

export interface CreatePregnancyInput {
  id?: string;
  phmAreaId?: string | null;
  motherId: string;
  gravida: number;
  para: number;
  lrmpDate: Date | string;
  eddDate: Date | string;
  isPreciousPregnancy?: number;
  riskLevel?: RiskLevel;
  riskScore?: number;
  riskFactorsJson?: string | null;
  status?: PregnancyStatus;
  deliveryDate?: Date | string | null;
  bookingWeightKg?: number | null;
  bookingHeightCm?: number | null;
  bookingBmi?: number | null;
  hospitalDeliveryNotesJson?: string | null;
}

export interface UpdatePregnancyInput {
  phmAreaId?: string | null;
  motherId?: string;
  gravida?: number;
  para?: number;
  lrmpDate?: Date | string;
  eddDate?: Date | string;
  isPreciousPregnancy?: number;
  riskLevel?: RiskLevel;
  riskScore?: number;
  riskFactorsJson?: string | null;
  status?: PregnancyStatus;
  deliveryDate?: Date | string | null;
  bookingWeightKg?: number | null;
  bookingHeightCm?: number | null;
  bookingBmi?: number | null;
  hospitalDeliveryNotesJson?: string | null;
  deletedAt?: Date | string | null;
}

export interface CreateAntenatalVisitInput {
  id?: string;
  phmAreaId?: string | null;
  pregnancyId: string;
  visitDate: Date | string;
  pogWeeks: number;
  pogDays: number;
  weightKg?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  urineAlbumin?: string | null;
  urineSugar?: string | null;
  pallor?: number | null;
  edema?: number | null;
  fundalHeightCm?: number | null;
  fetalHeartRate?: number | null;
  fetalMovementPresent?: number | null;
  fetalPresentation?: string | null;
  ironFolateGiven?: number | null;
  calciumGiven?: number | null;
  vitaminCGiven?: number | null;
  notes?: string | null;
}

export interface UpdateAntenatalVisitInput {
  phmAreaId?: string | null;
  visitDate?: Date | string;
  pogWeeks?: number;
  pogDays?: number;
  weightKg?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  urineAlbumin?: string | null;
  urineSugar?: string | null;
  pallor?: number | null;
  edema?: number | null;
  fundalHeightCm?: number | null;
  fetalHeartRate?: number | null;
  fetalMovementPresent?: number | null;
  fetalPresentation?: string | null;
  ironFolateGiven?: number | null;
  calciumGiven?: number | null;
  vitaminCGiven?: number | null;
  notes?: string | null;
  deletedAt?: Date | string | null;
}

export interface CreateChildInput {
  id?: string;
  phmAreaId?: string | null;
  motherId: string;
  pregnancyId?: string | null;
  qrToken?: string;
  fullName: string;
  dob: Date | string;
  gender: Gender;
  birthWeightKg?: number | null;
  gestationalAgeAtBirthWeeks?: number | null;
  nutritionStatus?: NutritionStatus;
  growthFalteringFlag?: number;
}

export interface UpdateChildInput {
  phmAreaId?: string | null;
  motherId?: string;
  pregnancyId?: string | null;
  qrToken?: string;
  fullName?: string;
  dob?: Date | string;
  gender?: Gender;
  birthWeightKg?: number | null;
  gestationalAgeAtBirthWeeks?: number | null;
  nutritionStatus?: NutritionStatus;
  growthFalteringFlag?: number;
  deletedAt?: Date | string | null;
}

export interface CreateUserAuditLogInput {
  id?: string;
  performedBy?: string | null;
  targetUserId?: string | null;
  action: string;
  detailsJson?: string | Record<string, any> | null;
  ipAddress?: string | null;
}

// ============================================================================
// Date & UUID Helpers
// ============================================================================

function parseFlexibleDate(val: Date | string | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string' && val.includes('/')) {
    const parts = val.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseRequiredDate(val: Date | string | null | undefined, fallback: Date = new Date()): Date {
  const parsed = parseFlexibleDate(val);
  return parsed || fallback;
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// In-Memory Offline Demo Store
// ============================================================================

interface DemoStore {
  phmAreas: PhmArea[];
  families: Family[];
  profiles: Profile[];
  mothers: Mother[];
  pregnancies: Pregnancy[];
  antenatalVisits: AntenatalVisit[];
  fetalKickLogs: FetalKickLog[];
  children: Child[];
  growthRecords: ChildGrowthRecord[];
  immunizations: ChildImmunization[];
  auditLogs: UserAuditLog[];
}

function initializeDemoStore(): DemoStore {
  const baseDate = new Date('2026-01-01T00:00:00Z');

  const phmAreas: PhmArea[] = [
    {
      id: 'b0000001-0000-0000-0000-000000000001',
      mohDivision: 'Maharagama MOH Division',
      phmAreaName: 'Kottawa North',
      areaCode: 'PHM-01',
      createdAt: baseDate,
      updatedAt: baseDate,
    },
    {
      id: 'b0000002-0000-0000-0000-000000000002',
      mohDivision: 'Maharagama MOH Division',
      phmAreaName: 'Kottawa South',
      areaCode: 'PHM-02',
      createdAt: baseDate,
      updatedAt: baseDate,
    },
    {
      id: 'b0000003-0000-0000-0000-000000000003',
      mohDivision: 'Maharagama MOH Division',
      phmAreaName: 'Maharagama East',
      areaCode: 'PHM-03',
      createdAt: baseDate,
      updatedAt: baseDate,
    },
    {
      id: 'b0000004-0000-0000-0000-000000000004',
      mohDivision: 'Maharagama MOH Division',
      phmAreaName: 'Maharagama West',
      areaCode: 'PHM-04',
      createdAt: baseDate,
      updatedAt: baseDate,
    },
  ];

  const families: Family[] = [
    {
      id: 'f0000001-0000-0000-0000-000000000001',
      phmAreaId: phmAreas[0].id,
      eligibleFamilyNo: 'EF/KOT/001',
      gnDivision: 'Kottawa North',
      address: '42, Temple Road, Kottawa',
      husbandName: 'Ruwan Perera',
      emergencyPhone: '0771234561',
      residencyStatus: 'ACTIVE',
      gpsLat: 6.8405,
      gpsLng: 79.9658,
      tempOutReturnDate: null,
      transferNote: null,
      transferredToPhmArea: null,
      createdAt: baseDate,
      updatedAt: baseDate,
      deletedAt: null,
    },
    {
      id: 'f0000002-0000-0000-0000-000000000002',
      phmAreaId: phmAreas[1].id,
      eligibleFamilyNo: 'EF/KOT/002',
      gnDivision: 'Kottawa South',
      address: '15, Galle Road, Kottawa',
      husbandName: 'Kasun Silva',
      emergencyPhone: '0772345672',
      residencyStatus: 'ACTIVE',
      gpsLat: 6.835,
      gpsLng: 79.97,
      tempOutReturnDate: null,
      transferNote: null,
      transferredToPhmArea: null,
      createdAt: baseDate,
      updatedAt: baseDate,
      deletedAt: null,
    },
    {
      id: 'f0000003-0000-0000-0000-000000000003',
      phmAreaId: phmAreas[2].id,
      eligibleFamilyNo: 'EF/MAH/001',
      gnDivision: 'Maharagama East',
      address: '23, Station Road, Maharagama',
      husbandName: 'Dinesh Jayawardena',
      emergencyPhone: '0774567894',
      residencyStatus: 'ACTIVE',
      gpsLat: 6.848,
      gpsLng: 79.928,
      tempOutReturnDate: null,
      transferNote: null,
      transferredToPhmArea: null,
      createdAt: baseDate,
      updatedAt: baseDate,
      deletedAt: null,
    },
  ];

  const profiles: Profile[] = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      role: 'MOH_DOCTOR',
      fullName: 'Dr. Anuradha Jayawardena',
      phmAreaId: null,
      mohDivision: 'Maharagama MOH Division',
      phone: '0712345678',
      accountStatus: 'ACTIVE',
      passwordHash: null,
      createdAt: baseDate,
      updatedAt: baseDate,
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      role: 'FIELD_PHM',
      fullName: 'Mrs. Sunethra Perera',
      phmAreaId: phmAreas[0].id,
      mohDivision: 'Maharagama MOH Division',
      phone: '0714567890',
      accountStatus: 'ACTIVE',
      passwordHash: null,
      createdAt: baseDate,
      updatedAt: baseDate,
    },
  ];

  const mothers: Mother[] = [];
  const pregnancies: Pregnancy[] = [];
  const antenatalVisits: AntenatalVisit[] = [];
  const fetalKickLogs: FetalKickLog[] = [];
  const children: Child[] = [];
  const growthRecords: ChildGrowthRecord[] = [];
  const immunizations: ChildImmunization[] = [];

  // Seed mothers from DEMO_MOTHER_ROSTER
  DEMO_MOTHER_ROSTER.forEach((demoAccount, idx) => {
    const area = phmAreas.find((a) => a.phmAreaName.includes(demoAccount.phmAreaName)) || phmAreas[idx % phmAreas.length];
    const family = families[idx % families.length];
    const motherId = demoAccount.id;

    mothers.push({
      id: motherId,
      phmAreaId: area.id,
      familyId: family.id,
      qrToken: demoAccount.qrToken || `MOTH-${demoAccount.nic}`,
      fullName: demoAccount.fullName,
      nic: demoAccount.nic,
      dob: parseFlexibleDate(demoAccount.dob) || new Date('1992-01-01'),
      phone: demoAccount.phone,
      bloodGroup: demoAccount.bloodGroup || 'O+',
      chronicConditionsJson: JSON.stringify(demoAccount.pregnancy?.riskFactors || []),
      fertilityTreatmentHistory: 0,
      prevMiscarriagesCount: 0,
      prevStillbirthsCount: 0,
      prevCSectionsCount: 0,
      planningPregnancy: 0,
      createdAt: baseDate,
      updatedAt: new Date(),
      deletedAt: null,
    });

    if (demoAccount.pregnancy) {
      const pregId = demoAccount.pregnancy.id || `preg_${motherId}`;
      const lrmp = parseFlexibleDate(demoAccount.pregnancy.lrmp) || new Date('2026-04-13');
      const edd = parseFlexibleDate(demoAccount.pregnancy.edd) || new Date('2027-01-18');
      const riskTier = (demoAccount.pregnancy.riskTier || 'GREEN') as RiskLevel;

      pregnancies.push({
        id: pregId,
        phmAreaId: area.id,
        motherId,
        gravida: 1,
        para: 0,
        lrmpDate: lrmp,
        eddDate: edd,
        isPreciousPregnancy: riskTier === 'RED' ? 1 : 0,
        riskLevel: riskTier,
        riskScore: demoAccount.pregnancy.riskScore || 0,
        riskFactorsJson: JSON.stringify(demoAccount.pregnancy.riskFactors || []),
        status: 'ACTIVE',
        deliveryDate: null,
        bookingWeightKg: demoAccount.latestVitals?.weightKg || 62.0,
        bookingHeightCm: 158.0,
        bookingBmi: 24.8,
        hospitalDeliveryNotesJson: null,
        createdAt: baseDate,
        updatedAt: new Date(),
        deletedAt: null,
      });

      if (demoAccount.latestVitals) {
        const bpParts = (demoAccount.latestVitals.bp || '120/80').split('/');
        antenatalVisits.push({
          id: `anc_${pregId}_latest`,
          phmAreaId: area.id,
          pregnancyId: pregId,
          visitDate: parseFlexibleDate(demoAccount.latestVitals.visitDate) || new Date(),
          pogWeeks: demoAccount.pregnancy.pogWeeks || 32,
          pogDays: demoAccount.pregnancy.pogDays || 3,
          weightKg: demoAccount.latestVitals.weightKg,
          bpSystolic: parseInt(bpParts[0] || '120', 10),
          bpDiastolic: parseInt(bpParts[1] || '80', 10),
          urineAlbumin: 'NIL',
          urineSugar: 'NIL',
          pallor: 0,
          edema: 0,
          fundalHeightCm: demoAccount.latestVitals.sfhCm,
          fetalHeartRate: 142,
          fetalMovementPresent: 1,
          fetalPresentation: 'CEPHALIC',
          ironFolateGiven: 1,
          calciumGiven: 1,
          vitaminCGiven: 1,
          notes: demoAccount.pregnancy.milestone || 'Routine checkup completed',
          createdAt: baseDate,
          updatedAt: new Date(),
          deletedAt: null,
        });
      }

      if (demoAccount.kickLogs && Array.isArray(demoAccount.kickLogs)) {
        demoAccount.kickLogs.forEach((kl, kIdx) => {
          fetalKickLogs.push({
            id: kl.id || `fkl_${pregId}_${kIdx}`,
            pregnancyId: pregId,
            logDate: parseFlexibleDate(kl.logDate) || new Date(),
            startTime: kl.startTime,
            tenthKickTime: kl.tenthKickTime,
            kickCount: kl.kickCount,
            durationMinutes: kl.durationMinutes,
            reducedMovementFlag: Boolean(kl.reducedMovementFlag),
            createdAt: baseDate,
          });
        });
      }
    }

    if (demoAccount.children && Array.isArray(demoAccount.children)) {
      demoAccount.children.forEach((childItem, cIdx) => {
        const childId = childItem.id || `ch_${motherId}_${cIdx}`;
        children.push({
          id: childId,
          phmAreaId: area.id,
          motherId,
          pregnancyId: null,
          qrToken: `C-QR-${childId}`,
          fullName: childItem.fullName,
          dob: parseFlexibleDate(childItem.dob) || new Date('2025-09-23'),
          gender: childItem.gender === 'FEMALE' ? 'F' : 'M',
          birthWeightKg: childItem.birthWeightKg || 3.2,
          gestationalAgeAtBirthWeeks: 39,
          nutritionStatus: 'NORMAL',
          growthFalteringFlag: 0,
          createdAt: baseDate,
          updatedAt: new Date(),
          deletedAt: null,
        });

        if (childItem.growthRecords) {
          childItem.growthRecords.forEach((gr, grIdx) => {
            growthRecords.push({
              id: `cgr_${childId}_${grIdx}`,
              phmAreaId: area.id,
              childId,
              recordedDate: parseFlexibleDate(gr.measuredDate) || new Date(),
              ageMonths: gr.monthAge,
              weightKg: gr.weightKg,
              heightCm: gr.heightCm || null,
              headCircumferenceCm: null,
              milestonesJson: '[]',
              supplementsJson: '[]',
              createdAt: baseDate,
              updatedAt: new Date(),
              deletedAt: null,
            });
          });
        }

        if (childItem.immunizations) {
          childItem.immunizations.forEach((imm, immIdx) => {
            immunizations.push({
              id: imm.id || `imm_${childId}_${immIdx}`,
              phmAreaId: area.id,
              childId,
              vaccineCode: imm.vaccineCode,
              vaccineName: imm.vaccineName,
              scheduledDate: parseFlexibleDate(imm.dueDate) || new Date(),
              givenDate: parseFlexibleDate(imm.dateAdministered),
              status: imm.status === 'COMPLETED' ? 'GIVEN' : 'PENDING',
              batchNumber: 'B-2026-09',
              adverseEvents: null,
              createdAt: baseDate,
              updatedAt: new Date(),
              deletedAt: null,
            });
          });
        }
      });
    }
  });

  // Seed Audit Logs from MOCK_AUDIT_LOGS
  const auditLogs: UserAuditLog[] = MOCK_AUDIT_LOGS.map((mockLog, idx) => ({
    id: mockLog.id || `aud_demo_${idx}`,
    performedBy: profiles[0].id,
    targetUserId: profiles[1].id,
    action: mockLog.action,
    detailsJson: JSON.stringify({
      ...mockLog.changes,
      actorName: mockLog.actorName,
      targetUserName: mockLog.targetUserName,
      mohDivision: mockLog.mohDivision,
    }),
    ipAddress: '127.0.0.1',
    createdAt: new Date(mockLog.createdAt),
  }));

  return {
    phmAreas,
    families,
    profiles,
    mothers,
    pregnancies,
    antenatalVisits,
    fetalKickLogs,
    children,
    growthRecords,
    immunizations,
    auditLogs,
  };
}

// Global in-memory store initialized once
const demoStore: DemoStore = initializeDemoStore();

// Demo relation resolvers
function resolveMotherRelations(mother: Mother): MotherWithRelations {
  const phmArea = demoStore.phmAreas.find((a) => a.id === mother.phmAreaId) || null;
  const family =
    demoStore.families.find((f) => f.id === mother.familyId) || demoStore.families[0];

  const pregs = demoStore.pregnancies
    .filter((p) => p.motherId === mother.id && p.deletedAt === null)
    .map((p) => ({
      ...p,
      antenatalVisits: demoStore.antenatalVisits.filter(
        (v) => v.pregnancyId === p.id && v.deletedAt === null
      ),
      fetalKickLogs: demoStore.fetalKickLogs.filter((k) => k.pregnancyId === p.id),
    }));

  const chs = demoStore.children
    .filter((c) => c.motherId === mother.id && c.deletedAt === null)
    .map((c) => ({
      ...c,
      growthRecords: demoStore.growthRecords.filter(
        (g) => g.childId === c.id && g.deletedAt === null
      ),
      immunizations: demoStore.immunizations.filter(
        (i) => i.childId === c.id && i.deletedAt === null
      ),
    }));

  return {
    ...mother,
    phmArea,
    family,
    pregnancies: pregs,
    children: chs,
  };
}

function resolvePregnancyRelations(pregnancy: Pregnancy): PregnancyWithRelations {
  const mother = demoStore.mothers.find((m) => m.id === pregnancy.motherId)!;
  const phmArea = demoStore.phmAreas.find((a) => a.id === pregnancy.phmAreaId) || null;
  const visits = demoStore.antenatalVisits.filter(
    (v) => v.pregnancyId === pregnancy.id && v.deletedAt === null
  );
  const kickLogs = demoStore.fetalKickLogs.filter((k) => k.pregnancyId === pregnancy.id);

  return {
    ...pregnancy,
    mother,
    phmArea,
    antenatalVisits: visits,
    fetalKickLogs: kickLogs,
  };
}

function resolveAntenatalVisitRelations(visit: AntenatalVisit): AntenatalVisitWithRelations {
  const pregnancy = demoStore.pregnancies.find((p) => p.id === visit.pregnancyId)!;
  const mother = demoStore.mothers.find((m) => m.id === pregnancy?.motherId)!;
  const phmArea = demoStore.phmAreas.find((a) => a.id === visit.phmAreaId) || null;

  return {
    ...visit,
    phmArea,
    pregnancy: {
      ...pregnancy,
      mother,
    },
  };
}

function resolveChildRelations(child: Child): ChildWithRelations {
  const mother = demoStore.mothers.find((m) => m.id === child.motherId)!;
  const phmArea = demoStore.phmAreas.find((a) => a.id === child.phmAreaId) || null;
  const pregnancy = child.pregnancyId
    ? demoStore.pregnancies.find((p) => p.id === child.pregnancyId) || null
    : null;
  const growth = demoStore.growthRecords.filter(
    (g) => g.childId === child.id && g.deletedAt === null
  );
  const immunizations = demoStore.immunizations.filter(
    (i) => i.childId === child.id && i.deletedAt === null
  );

  return {
    ...child,
    mother,
    phmArea,
    pregnancy,
    growthRecords: growth,
    immunizations,
  };
}

function resolveAuditLogRelations(log: UserAuditLog): UserAuditLogWithPerformer {
  const performer = log.performedBy
    ? demoStore.profiles.find((p) => p.id === log.performedBy) || null
    : null;

  return {
    ...log,
    performer,
  };
}

// Standard Prisma include configurations
const MOTHER_INCLUDE = {
  phmArea: true,
  family: true,
  pregnancies: {
    where: { deletedAt: null },
    include: {
      antenatalVisits: { where: { deletedAt: null }, orderBy: { visitDate: 'desc' as const } },
      fetalKickLogs: { orderBy: { logDate: 'desc' as const } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  children: {
    where: { deletedAt: null },
    include: {
      growthRecords: { where: { deletedAt: null }, orderBy: { recordedDate: 'asc' as const } },
      immunizations: { where: { deletedAt: null }, orderBy: { scheduledDate: 'asc' as const } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

const PREGNANCY_INCLUDE = {
  mother: true,
  phmArea: true,
  antenatalVisits: {
    where: { deletedAt: null },
    orderBy: { visitDate: 'desc' as const },
  },
  fetalKickLogs: {
    orderBy: { logDate: 'desc' as const },
  },
} as const;

const ANTENATAL_VISIT_INCLUDE = {
  phmArea: true,
  pregnancy: {
    include: {
      mother: true,
    },
  },
} as const;

const CHILD_INCLUDE = {
  mother: true,
  phmArea: true,
  pregnancy: true,
  growthRecords: {
    where: { deletedAt: null },
    orderBy: { recordedDate: 'asc' as const },
  },
  immunizations: {
    where: { deletedAt: null },
    orderBy: { scheduledDate: 'asc' as const },
  },
} as const;

const AUDIT_LOG_INCLUDE = {
  performer: true,
} as const;

// ============================================================================
// Service: Mother
// ============================================================================

export const motherService = {
  async getMothers(filters?: MotherFilters): Promise<MotherWithRelations[]> {
    if (isPrismaConfigured()) {
      try {
        const where: Prisma.MotherWhereInput = {};
        if (!filters?.includeDeleted) where.deletedAt = null;
        if (filters?.phmAreaId) where.phmAreaId = filters.phmAreaId;
        if (filters?.familyId) where.familyId = filters.familyId;
        if (filters?.search) {
          where.OR = [
            { fullName: { contains: filters.search, mode: 'insensitive' } },
            { nic: { contains: filters.search, mode: 'insensitive' } },
            { phone: { contains: filters.search, mode: 'insensitive' } },
            { qrToken: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        const mothers = await prisma.mother.findMany({
          where,
          include: MOTHER_INCLUDE,
          orderBy: { createdAt: 'desc' },
          take: filters?.limit,
          skip: filters?.offset,
        });

        return mothers as unknown as MotherWithRelations[];
      } catch (err) {
        console.warn('[motherService.getMothers] Database query failed, using demo fallback:', err);
      }
    }

    // Demo store query
    let list = demoStore.mothers.filter((m) => filters?.includeDeleted || m.deletedAt === null);

    if (filters?.phmAreaId) {
      list = list.filter((m) => m.phmAreaId === filters.phmAreaId);
    }
    if (filters?.familyId) {
      list = list.filter((m) => m.familyId === filters.familyId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          (m.nic && m.nic.toLowerCase().includes(q)) ||
          (m.phone && m.phone.toLowerCase().includes(q)) ||
          m.qrToken.toLowerCase().includes(q)
      );
    }

    if (filters?.offset) list = list.slice(filters.offset);
    if (filters?.limit) list = list.slice(0, filters.limit);

    return list.map(resolveMotherRelations);
  },

  async getMotherById(id: string): Promise<MotherWithRelations | null> {
    if (isPrismaConfigured()) {
      try {
        const mother = await prisma.mother.findUnique({
          where: { id },
          include: MOTHER_INCLUDE,
        });
        if (mother) return mother as unknown as MotherWithRelations;
      } catch (err) {
        console.warn(`[motherService.getMotherById] Database query failed for ${id}:`, err);
      }
    }

    const found = demoStore.mothers.find((m) => m.id === id && m.deletedAt === null);
    return found ? resolveMotherRelations(found) : null;
  },

  async getMotherByNic(nic: string): Promise<MotherWithRelations | null> {
    if (isPrismaConfigured()) {
      try {
        const mother = await prisma.mother.findUnique({
          where: { nic },
          include: MOTHER_INCLUDE,
        });
        if (mother) return mother as unknown as MotherWithRelations;
      } catch (err) {
        console.warn(`[motherService.getMotherByNic] Database query failed for NIC ${nic}:`, err);
      }
    }

    const found = demoStore.mothers.find(
      (m) => m.nic?.toLowerCase() === nic.toLowerCase() && m.deletedAt === null
    );
    return found ? resolveMotherRelations(found) : null;
  },

  async getMotherByQr(qrToken: string): Promise<MotherWithRelations | null> {
    if (isPrismaConfigured()) {
      try {
        const mother = await prisma.mother.findUnique({
          where: { qrToken },
          include: MOTHER_INCLUDE,
        });
        if (mother) return mother as unknown as MotherWithRelations;
      } catch (err) {
        console.warn(`[motherService.getMotherByQr] Database query failed for QR ${qrToken}:`, err);
      }
    }

    const found = demoStore.mothers.find((m) => m.qrToken === qrToken && m.deletedAt === null);
    return found ? resolveMotherRelations(found) : null;
  },

  async createMother(data: CreateMotherInput): Promise<Mother> {
    const motherId = data.id || generateUuid();
    const qr = data.qrToken || `MOTH-${data.nic || motherId.slice(0, 8)}`;
    const now = new Date();

    if (isPrismaConfigured()) {
      try {
        const created = await prisma.mother.create({
          data: {
            id: motherId,
            phmAreaId: data.phmAreaId || null,
            familyId: data.familyId,
            qrToken: qr,
            fullName: data.fullName,
            nic: data.nic || null,
            dob: parseFlexibleDate(data.dob),
            phone: data.phone || null,
            bloodGroup: data.bloodGroup || null,
            chronicConditionsJson: data.chronicConditionsJson || '[]',
            fertilityTreatmentHistory: data.fertilityTreatmentHistory ?? 0,
            prevMiscarriagesCount: data.prevMiscarriagesCount ?? 0,
            prevStillbirthsCount: data.prevStillbirthsCount ?? 0,
            prevCSectionsCount: data.prevCSectionsCount ?? 0,
            planningPregnancy: data.planningPregnancy ?? 0,
          },
        });
        return created;
      } catch (err) {
        console.warn('[motherService.createMother] DB creation failed, saving to demo store:', err);
      }
    }

    const newMother: Mother = {
      id: motherId,
      phmAreaId: data.phmAreaId || demoStore.phmAreas[0].id,
      familyId: data.familyId || demoStore.families[0].id,
      qrToken: qr,
      fullName: data.fullName,
      nic: data.nic || null,
      dob: parseFlexibleDate(data.dob),
      phone: data.phone || null,
      bloodGroup: data.bloodGroup || null,
      chronicConditionsJson: data.chronicConditionsJson || '[]',
      fertilityTreatmentHistory: data.fertilityTreatmentHistory ?? 0,
      prevMiscarriagesCount: data.prevMiscarriagesCount ?? 0,
      prevStillbirthsCount: data.prevStillbirthsCount ?? 0,
      prevCSectionsCount: data.prevCSectionsCount ?? 0,
      planningPregnancy: data.planningPregnancy ?? 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    demoStore.mothers.unshift(newMother);
    return newMother;
  },

  async updateMother(id: string, data: UpdateMotherInput): Promise<Mother | null> {
    const now = new Date();

    if (isPrismaConfigured()) {
      try {
        const updated = await prisma.mother.update({
          where: { id },
          data: {
            ...data,
            dob: data.dob !== undefined ? parseFlexibleDate(data.dob) : undefined,
            deletedAt: data.deletedAt !== undefined ? parseFlexibleDate(data.deletedAt) : undefined,
          },
        });
        return updated;
      } catch (err) {
        console.warn(`[motherService.updateMother] DB update failed for ${id}:`, err);
      }
    }

    const idx = demoStore.mothers.findIndex((m) => m.id === id);
    if (idx === -1) return null;

    const existing = demoStore.mothers[idx];
    const updated: Mother = {
      ...existing,
      ...data,
      dob: data.dob !== undefined ? parseFlexibleDate(data.dob) : existing.dob,
      deletedAt:
        data.deletedAt !== undefined ? parseFlexibleDate(data.deletedAt) : existing.deletedAt,
      updatedAt: now,
    };

    demoStore.mothers[idx] = updated;
    return updated;
  },

  async deleteMother(id: string, soft: boolean = true): Promise<Mother | null> {
    if (isPrismaConfigured()) {
      try {
        if (soft) {
          return await prisma.mother.update({
            where: { id },
            data: { deletedAt: new Date() },
          });
        }
        return await prisma.mother.delete({ where: { id } });
      } catch (err) {
        console.warn(`[motherService.deleteMother] DB delete failed for ${id}:`, err);
      }
    }

    const idx = demoStore.mothers.findIndex((m) => m.id === id);
    if (idx === -1) return null;

    if (soft) {
      demoStore.mothers[idx].deletedAt = new Date();
      return demoStore.mothers[idx];
    }

    const [deleted] = demoStore.mothers.splice(idx, 1);
    return deleted;
  },
};

// ============================================================================
// Service: Pregnancy
// ============================================================================

export const pregnancyService = {
  async getPregnancies(filters?: PregnancyFilters): Promise<PregnancyWithRelations[]> {
    if (isPrismaConfigured()) {
      try {
        const where: Prisma.PregnancyWhereInput = {};
        if (!filters?.includeDeleted) where.deletedAt = null;
        if (filters?.motherId) where.motherId = filters.motherId;
        if (filters?.phmAreaId) where.phmAreaId = filters.phmAreaId;
        if (filters?.status) where.status = filters.status;
        if (filters?.riskLevel) where.riskLevel = filters.riskLevel;

        const results = await prisma.pregnancy.findMany({
          where,
          include: PREGNANCY_INCLUDE,
          orderBy: { createdAt: 'desc' },
          take: filters?.limit,
          skip: filters?.offset,
        });

        return results as unknown as PregnancyWithRelations[];
      } catch (err) {
        console.warn('[pregnancyService.getPregnancies] DB query failed, using demo store:', err);
      }
    }

    let list = demoStore.pregnancies.filter((p) => filters?.includeDeleted || p.deletedAt === null);

    if (filters?.motherId) list = list.filter((p) => p.motherId === filters.motherId);
    if (filters?.phmAreaId) list = list.filter((p) => p.phmAreaId === filters.phmAreaId);
    if (filters?.status) list = list.filter((p) => p.status === filters.status);
    if (filters?.riskLevel) list = list.filter((p) => p.riskLevel === filters.riskLevel);

    if (filters?.offset) list = list.slice(filters.offset);
    if (filters?.limit) list = list.slice(0, filters.limit);

    return list.map(resolvePregnancyRelations);
  },

  async getPregnancyById(id: string): Promise<PregnancyWithRelations | null> {
    if (isPrismaConfigured()) {
      try {
        const preg = await prisma.pregnancy.findUnique({
          where: { id },
          include: PREGNANCY_INCLUDE,
        });
        if (preg) return preg as unknown as PregnancyWithRelations;
      } catch (err) {
        console.warn(`[pregnancyService.getPregnancyById] DB query failed for ${id}:`, err);
      }
    }

    const found = demoStore.pregnancies.find((p) => p.id === id && p.deletedAt === null);
    return found ? resolvePregnancyRelations(found) : null;
  },

  async getActivePregnancyByMotherId(motherId: string): Promise<PregnancyWithRelations | null> {
    if (isPrismaConfigured()) {
      try {
        const active = await prisma.pregnancy.findFirst({
          where: {
            motherId,
            status: 'ACTIVE',
            deletedAt: null,
          },
          include: PREGNANCY_INCLUDE,
          orderBy: { createdAt: 'desc' },
        });
        if (active) return active as unknown as PregnancyWithRelations;
      } catch (err) {
        console.warn(`[pregnancyService.getActivePregnancy] DB failed for mother ${motherId}:`, err);
      }
    }

    const found = demoStore.pregnancies.find(
      (p) => p.motherId === motherId && p.status === 'ACTIVE' && p.deletedAt === null
    );
    return found ? resolvePregnancyRelations(found) : null;
  },

  async createPregnancy(data: CreatePregnancyInput): Promise<Pregnancy> {
    const id = data.id || generateUuid();
    const now = new Date();
    const lrmp = parseRequiredDate(data.lrmpDate);
    const edd = parseRequiredDate(data.eddDate);

    if (isPrismaConfigured()) {
      try {
        const created = await prisma.pregnancy.create({
          data: {
            id,
            phmAreaId: data.phmAreaId || null,
            motherId: data.motherId,
            gravida: data.gravida,
            para: data.para,
            lrmpDate: lrmp,
            eddDate: edd,
            isPreciousPregnancy: data.isPreciousPregnancy ?? 0,
            riskLevel: data.riskLevel || 'GREEN',
            riskScore: data.riskScore ?? 0,
            riskFactorsJson: data.riskFactorsJson || '[]',
            status: data.status || 'ACTIVE',
            deliveryDate: parseFlexibleDate(data.deliveryDate),
            bookingWeightKg: data.bookingWeightKg || null,
            bookingHeightCm: data.bookingHeightCm || null,
            bookingBmi: data.bookingBmi || null,
            hospitalDeliveryNotesJson: data.hospitalDeliveryNotesJson || null,
          },
        });
        return created;
      } catch (err) {
        console.warn('[pregnancyService.createPregnancy] DB create failed, saving to demo:', err);
      }
    }

    const newPreg: Pregnancy = {
      id,
      phmAreaId: data.phmAreaId || null,
      motherId: data.motherId,
      gravida: data.gravida,
      para: data.para,
      lrmpDate: lrmp,
      eddDate: edd,
      isPreciousPregnancy: data.isPreciousPregnancy ?? 0,
      riskLevel: data.riskLevel || 'GREEN',
      riskScore: data.riskScore ?? 0,
      riskFactorsJson: data.riskFactorsJson || '[]',
      status: data.status || 'ACTIVE',
      deliveryDate: parseFlexibleDate(data.deliveryDate),
      bookingWeightKg: data.bookingWeightKg || null,
      bookingHeightCm: data.bookingHeightCm || null,
      bookingBmi: data.bookingBmi || null,
      hospitalDeliveryNotesJson: data.hospitalDeliveryNotesJson || null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    demoStore.pregnancies.unshift(newPreg);
    return newPreg;
  },

  async updatePregnancy(id: string, data: UpdatePregnancyInput): Promise<Pregnancy | null> {
    const now = new Date();

    if (isPrismaConfigured()) {
      try {
        const updated = await prisma.pregnancy.update({
          where: { id },
          data: {
            ...data,
            lrmpDate: data.lrmpDate !== undefined ? parseRequiredDate(data.lrmpDate) : undefined,
            eddDate: data.eddDate !== undefined ? parseRequiredDate(data.eddDate) : undefined,
            deliveryDate:
              data.deliveryDate !== undefined ? parseFlexibleDate(data.deliveryDate) : undefined,
            deletedAt:
              data.deletedAt !== undefined ? parseFlexibleDate(data.deletedAt) : undefined,
          },
        });
        return updated;
      } catch (err) {
        console.warn(`[pregnancyService.updatePregnancy] DB update failed for ${id}:`, err);
      }
    }

    const idx = demoStore.pregnancies.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    const existing = demoStore.pregnancies[idx];
    const updated: Pregnancy = {
      ...existing,
      ...data,
      lrmpDate: data.lrmpDate !== undefined ? parseRequiredDate(data.lrmpDate) : existing.lrmpDate,
      eddDate: data.eddDate !== undefined ? parseRequiredDate(data.eddDate) : existing.eddDate,
      deliveryDate:
        data.deliveryDate !== undefined
          ? parseFlexibleDate(data.deliveryDate)
          : existing.deliveryDate,
      deletedAt:
        data.deletedAt !== undefined ? parseFlexibleDate(data.deletedAt) : existing.deletedAt,
      updatedAt: now,
    };

    demoStore.pregnancies[idx] = updated;
    return updated;
  },

  async deletePregnancy(id: string, soft: boolean = true): Promise<Pregnancy | null> {
    if (isPrismaConfigured()) {
      try {
        if (soft) {
          return await prisma.pregnancy.update({
            where: { id },
            data: { deletedAt: new Date() },
          });
        }
        return await prisma.pregnancy.delete({ where: { id } });
      } catch (err) {
        console.warn(`[pregnancyService.deletePregnancy] DB delete failed for ${id}:`, err);
      }
    }

    const idx = demoStore.pregnancies.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    if (soft) {
      demoStore.pregnancies[idx].deletedAt = new Date();
      return demoStore.pregnancies[idx];
    }

    const [deleted] = demoStore.pregnancies.splice(idx, 1);
    return deleted;
  },
};

// ============================================================================
// Service: AntenatalVisit
// ============================================================================

export const antenatalVisitService = {
  async getAntenatalVisits(filters?: AntenatalVisitFilters): Promise<AntenatalVisitWithRelations[]> {
    if (isPrismaConfigured()) {
      try {
        const where: Prisma.AntenatalVisitWhereInput = {};
        if (!filters?.includeDeleted) where.deletedAt = null;
        if (filters?.pregnancyId) where.pregnancyId = filters.pregnancyId;
        if (filters?.phmAreaId) where.phmAreaId = filters.phmAreaId;

        const results = await prisma.antenatalVisit.findMany({
          where,
          include: ANTENATAL_VISIT_INCLUDE,
          orderBy: { visitDate: 'desc' },
          take: filters?.limit,
          skip: filters?.offset,
        });

        return results as unknown as AntenatalVisitWithRelations[];
      } catch (err) {
        console.warn('[antenatalVisitService.getVisits] DB query failed, using demo store:', err);
      }
    }

    let list = demoStore.antenatalVisits.filter(
      (v) => filters?.includeDeleted || v.deletedAt === null
    );

    if (filters?.pregnancyId) list = list.filter((v) => v.pregnancyId === filters.pregnancyId);
    if (filters?.phmAreaId) list = list.filter((v) => v.phmAreaId === filters.phmAreaId);

    if (filters?.offset) list = list.slice(filters.offset);
    if (filters?.limit) list = list.slice(0, filters.limit);

    return list.map(resolveAntenatalVisitRelations);
  },

  async getAntenatalVisitById(id: string): Promise<AntenatalVisitWithRelations | null> {
    if (isPrismaConfigured()) {
      try {
        const visit = await prisma.antenatalVisit.findUnique({
          where: { id },
          include: ANTENATAL_VISIT_INCLUDE,
        });
        if (visit) return visit as unknown as AntenatalVisitWithRelations;
      } catch (err) {
        console.warn(`[antenatalVisitService.getById] DB query failed for ${id}:`, err);
      }
    }

    const found = demoStore.antenatalVisits.find((v) => v.id === id && v.deletedAt === null);
    return found ? resolveAntenatalVisitRelations(found) : null;
  },

  async createAntenatalVisit(data: CreateAntenatalVisitInput): Promise<AntenatalVisit> {
    const id = data.id || generateUuid();
    const now = new Date();
    const visitDate = parseRequiredDate(data.visitDate);

    if (isPrismaConfigured()) {
      try {
        const created = await prisma.antenatalVisit.create({
          data: {
            id,
            phmAreaId: data.phmAreaId || null,
            pregnancyId: data.pregnancyId,
            visitDate,
            pogWeeks: data.pogWeeks,
            pogDays: data.pogDays,
            weightKg: data.weightKg || null,
            bpSystolic: data.bpSystolic || null,
            bpDiastolic: data.bpDiastolic || null,
            urineAlbumin: data.urineAlbumin || null,
            urineSugar: data.urineSugar || null,
            pallor: data.pallor ?? 0,
            edema: data.edema ?? 0,
            fundalHeightCm: data.fundalHeightCm || null,
            fetalHeartRate: data.fetalHeartRate || null,
            fetalMovementPresent: data.fetalMovementPresent ?? 1,
            fetalPresentation: data.fetalPresentation || null,
            ironFolateGiven: data.ironFolateGiven ?? 0,
            calciumGiven: data.calciumGiven ?? 0,
            vitaminCGiven: data.vitaminCGiven ?? 0,
            notes: data.notes || null,
          },
        });
        return created;
      } catch (err) {
        console.warn('[antenatalVisitService.createVisit] DB create failed, saving to demo:', err);
      }
    }

    const newVisit: AntenatalVisit = {
      id,
      phmAreaId: data.phmAreaId || null,
      pregnancyId: data.pregnancyId,
      visitDate,
      pogWeeks: data.pogWeeks,
      pogDays: data.pogDays,
      weightKg: data.weightKg || null,
      bpSystolic: data.bpSystolic || null,
      bpDiastolic: data.bpDiastolic || null,
      urineAlbumin: data.urineAlbumin || null,
      urineSugar: data.urineSugar || null,
      pallor: data.pallor ?? 0,
      edema: data.edema ?? 0,
      fundalHeightCm: data.fundalHeightCm || null,
      fetalHeartRate: data.fetalHeartRate || null,
      fetalMovementPresent: data.fetalMovementPresent ?? 1,
      fetalPresentation: data.fetalPresentation || null,
      ironFolateGiven: data.ironFolateGiven ?? 0,
      calciumGiven: data.calciumGiven ?? 0,
      vitaminCGiven: data.vitaminCGiven ?? 0,
      notes: data.notes || null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    demoStore.antenatalVisits.unshift(newVisit);
    return newVisit;
  },

  async updateAntenatalVisit(id: string, data: UpdateAntenatalVisitInput): Promise<AntenatalVisit | null> {
    const now = new Date();

    if (isPrismaConfigured()) {
      try {
        const updated = await prisma.antenatalVisit.update({
          where: { id },
          data: {
            ...data,
            visitDate:
              data.visitDate !== undefined ? parseRequiredDate(data.visitDate) : undefined,
            deletedAt:
              data.deletedAt !== undefined ? parseFlexibleDate(data.deletedAt) : undefined,
          },
        });
        return updated;
      } catch (err) {
        console.warn(`[antenatalVisitService.updateVisit] DB update failed for ${id}:`, err);
      }
    }

    const idx = demoStore.antenatalVisits.findIndex((v) => v.id === id);
    if (idx === -1) return null;

    const existing = demoStore.antenatalVisits[idx];
    const updated: AntenatalVisit = {
      ...existing,
      ...data,
      visitDate:
        data.visitDate !== undefined ? parseRequiredDate(data.visitDate) : existing.visitDate,
      deletedAt:
        data.deletedAt !== undefined ? parseFlexibleDate(data.deletedAt) : existing.deletedAt,
      updatedAt: now,
    };

    demoStore.antenatalVisits[idx] = updated;
    return updated;
  },

  async deleteAntenatalVisit(id: string, soft: boolean = true): Promise<AntenatalVisit | null> {
    if (isPrismaConfigured()) {
      try {
        if (soft) {
          return await prisma.antenatalVisit.update({
            where: { id },
            data: { deletedAt: new Date() },
          });
        }
        return await prisma.antenatalVisit.delete({ where: { id } });
      } catch (err) {
        console.warn(`[antenatalVisitService.deleteVisit] DB delete failed for ${id}:`, err);
      }
    }

    const idx = demoStore.antenatalVisits.findIndex((v) => v.id === id);
    if (idx === -1) return null;

    if (soft) {
      demoStore.antenatalVisits[idx].deletedAt = new Date();
      return demoStore.antenatalVisits[idx];
    }

    const [deleted] = demoStore.antenatalVisits.splice(idx, 1);
    return deleted;
  },
};

// ============================================================================
// Service: Child
// ============================================================================

export const childService = {
  async getChildren(filters?: ChildFilters): Promise<ChildWithRelations[]> {
    if (isPrismaConfigured()) {
      try {
        const where: Prisma.ChildWhereInput = {};
        if (!filters?.includeDeleted) where.deletedAt = null;
        if (filters?.motherId) where.motherId = filters.motherId;
        if (filters?.phmAreaId) where.phmAreaId = filters.phmAreaId;
        if (filters?.pregnancyId) where.pregnancyId = filters.pregnancyId;
        if (filters?.nutritionStatus) where.nutritionStatus = filters.nutritionStatus;
        if (filters?.gender) where.gender = filters.gender;
        if (filters?.search) {
          where.OR = [
            { fullName: { contains: filters.search, mode: 'insensitive' } },
            { qrToken: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        const results = await prisma.child.findMany({
          where,
          include: CHILD_INCLUDE,
          orderBy: { createdAt: 'asc' },
          take: filters?.limit,
          skip: filters?.offset,
        });

        return results as unknown as ChildWithRelations[];
      } catch (err) {
        console.warn('[childService.getChildren] DB query failed, using demo store:', err);
      }
    }

    let list = demoStore.children.filter((c) => filters?.includeDeleted || c.deletedAt === null);

    if (filters?.motherId) list = list.filter((c) => c.motherId === filters.motherId);
    if (filters?.phmAreaId) list = list.filter((c) => c.phmAreaId === filters.phmAreaId);
    if (filters?.pregnancyId) list = list.filter((c) => c.pregnancyId === filters.pregnancyId);
    if (filters?.nutritionStatus)
      list = list.filter((c) => c.nutritionStatus === filters.nutritionStatus);
    if (filters?.gender) list = list.filter((c) => c.gender === filters.gender);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (c) => c.fullName.toLowerCase().includes(q) || c.qrToken.toLowerCase().includes(q)
      );
    }

    if (filters?.offset) list = list.slice(filters.offset);
    if (filters?.limit) list = list.slice(0, filters.limit);

    return list.map(resolveChildRelations);
  },

  async getChildById(id: string): Promise<ChildWithRelations | null> {
    if (isPrismaConfigured()) {
      try {
        const child = await prisma.child.findUnique({
          where: { id },
          include: CHILD_INCLUDE,
        });
        if (child) return child as unknown as ChildWithRelations;
      } catch (err) {
        console.warn(`[childService.getChildById] DB query failed for ${id}:`, err);
      }
    }

    const found = demoStore.children.find((c) => c.id === id && c.deletedAt === null);
    return found ? resolveChildRelations(found) : null;
  },

  async getChildByQr(qrToken: string): Promise<ChildWithRelations | null> {
    if (isPrismaConfigured()) {
      try {
        const child = await prisma.child.findUnique({
          where: { qrToken },
          include: CHILD_INCLUDE,
        });
        if (child) return child as unknown as ChildWithRelations;
      } catch (err) {
        console.warn(`[childService.getChildByQr] DB query failed for QR ${qrToken}:`, err);
      }
    }

    const found = demoStore.children.find((c) => c.qrToken === qrToken && c.deletedAt === null);
    return found ? resolveChildRelations(found) : null;
  },

  async createChild(data: CreateChildInput): Promise<Child> {
    const id = data.id || generateUuid();
    const qr = data.qrToken || `C-QR-${id.slice(0, 8).toUpperCase()}`;
    const now = new Date();
    const dob = parseRequiredDate(data.dob);

    if (isPrismaConfigured()) {
      try {
        const created = await prisma.child.create({
          data: {
            id,
            phmAreaId: data.phmAreaId || null,
            motherId: data.motherId,
            pregnancyId: data.pregnancyId || null,
            qrToken: qr,
            fullName: data.fullName,
            dob,
            gender: data.gender,
            birthWeightKg: data.birthWeightKg || null,
            gestationalAgeAtBirthWeeks: data.gestationalAgeAtBirthWeeks || null,
            nutritionStatus: data.nutritionStatus || 'NORMAL',
            growthFalteringFlag: data.growthFalteringFlag ?? 0,
          },
        });
        return created;
      } catch (err) {
        console.warn('[childService.createChild] DB create failed, saving to demo store:', err);
      }
    }

    const newChild: Child = {
      id,
      phmAreaId: data.phmAreaId || null,
      motherId: data.motherId,
      pregnancyId: data.pregnancyId || null,
      qrToken: qr,
      fullName: data.fullName,
      dob,
      gender: data.gender,
      birthWeightKg: data.birthWeightKg || null,
      gestationalAgeAtBirthWeeks: data.gestationalAgeAtBirthWeeks || null,
      nutritionStatus: data.nutritionStatus || 'NORMAL',
      growthFalteringFlag: data.growthFalteringFlag ?? 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    demoStore.children.push(newChild);
    return newChild;
  },

  async updateChild(id: string, data: UpdateChildInput): Promise<Child | null> {
    const now = new Date();

    if (isPrismaConfigured()) {
      try {
        const updated = await prisma.child.update({
          where: { id },
          data: {
            ...data,
            dob: data.dob !== undefined ? parseRequiredDate(data.dob) : undefined,
            deletedAt:
              data.deletedAt !== undefined ? parseFlexibleDate(data.deletedAt) : undefined,
          },
        });
        return updated;
      } catch (err) {
        console.warn(`[childService.updateChild] DB update failed for ${id}:`, err);
      }
    }

    const idx = demoStore.children.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    const existing = demoStore.children[idx];
    const updated: Child = {
      ...existing,
      ...data,
      dob: data.dob !== undefined ? parseRequiredDate(data.dob) : existing.dob,
      deletedAt:
        data.deletedAt !== undefined ? parseFlexibleDate(data.deletedAt) : existing.deletedAt,
      updatedAt: now,
    };

    demoStore.children[idx] = updated;
    return updated;
  },

  async deleteChild(id: string, soft: boolean = true): Promise<Child | null> {
    if (isPrismaConfigured()) {
      try {
        if (soft) {
          return await prisma.child.update({
            where: { id },
            data: { deletedAt: new Date() },
          });
        }
        return await prisma.child.delete({ where: { id } });
      } catch (err) {
        console.warn(`[childService.deleteChild] DB delete failed for ${id}:`, err);
      }
    }

    const idx = demoStore.children.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    if (soft) {
      demoStore.children[idx].deletedAt = new Date();
      return demoStore.children[idx];
    }

    const [deleted] = demoStore.children.splice(idx, 1);
    return deleted;
  },
};

// ============================================================================
// Service: UserAuditLog
// ============================================================================

export const userAuditLogService = {
  async getAuditLogs(filters?: AuditLogFilters): Promise<UserAuditLogWithPerformer[]> {
    if (isPrismaConfigured()) {
      try {
        const where: Prisma.UserAuditLogWhereInput = {};
        if (filters?.performedBy) where.performedBy = filters.performedBy;
        if (filters?.targetUserId) where.targetUserId = filters.targetUserId;
        if (filters?.action) where.action = filters.action;
        if (filters?.mohDivision) {
          where.performer = {
            mohDivision: filters.mohDivision,
          };
        }

        const logs = await prisma.userAuditLog.findMany({
          where,
          include: AUDIT_LOG_INCLUDE,
          orderBy: { createdAt: 'desc' },
          take: filters?.limit || 50,
          skip: filters?.offset,
        });

        return logs as unknown as UserAuditLogWithPerformer[];
      } catch (err) {
        console.warn('[userAuditLogService.getLogs] DB query failed, using demo store:', err);
      }
    }

    let list = [...demoStore.auditLogs];

    if (filters?.performedBy) {
      list = list.filter((l) => l.performedBy === filters.performedBy);
    }
    if (filters?.targetUserId) {
      list = list.filter((l) => l.targetUserId === filters.targetUserId);
    }
    if (filters?.action) {
      list = list.filter((l) => l.action === filters.action);
    }
    if (filters?.mohDivision) {
      list = list.filter((l) => {
        try {
          const parsed = JSON.parse(l.detailsJson || '{}');
          return parsed.mohDivision === filters.mohDivision;
        } catch {
          return true;
        }
      });
    }

    if (filters?.offset) list = list.slice(filters.offset);
    if (filters?.limit) list = list.slice(0, filters.limit);

    return list.map(resolveAuditLogRelations);
  },

  async createAuditLog(data: CreateUserAuditLogInput): Promise<UserAuditLog> {
    const id = data.id || generateUuid();
    const now = new Date();
    const detailsStr =
      typeof data.detailsJson === 'object' && data.detailsJson !== null
        ? JSON.stringify(data.detailsJson)
        : data.detailsJson || '{}';

    if (isPrismaConfigured()) {
      try {
        const created = await prisma.userAuditLog.create({
          data: {
            id,
            performedBy: data.performedBy || null,
            targetUserId: data.targetUserId || null,
            action: data.action,
            detailsJson: detailsStr,
            ipAddress: data.ipAddress || null,
          },
        });
        return created;
      } catch (err) {
        console.warn('[userAuditLogService.createAuditLog] DB create failed, saving to demo:', err);
      }
    }

    const newLog: UserAuditLog = {
      id,
      performedBy: data.performedBy || demoStore.profiles[0].id,
      targetUserId: data.targetUserId || null,
      action: data.action,
      detailsJson: detailsStr,
      ipAddress: data.ipAddress || '127.0.0.1',
      createdAt: now,
    };

    demoStore.auditLogs.unshift(newLog);
    return newLog;
  },
};

// ============================================================================
// Service: Full Composite Mother Portal Data Helper
// ============================================================================

export interface MotherPortalAggregate {
  mother: Mother;
  phmArea: PhmArea | null;
  activePregnancy: (Pregnancy & { antenatalVisits: AntenatalVisit[]; fetalKickLogs: FetalKickLog[] }) | null;
  children: (Child & { growthRecords: ChildGrowthRecord[]; immunizations: ChildImmunization[] })[];
  isDemo: boolean;
}

export async function getMotherPortalAggregate(
  identifier: string // motherId, NIC, or QR token
): Promise<MotherPortalAggregate | null> {
  let motherRecord: MotherWithRelations | null = null;

  // Try lookups in order: ID -> NIC -> QR
  if (identifier.includes('-') && identifier.length > 20) {
    motherRecord = await motherService.getMotherById(identifier);
  }
  if (!motherRecord) {
    motherRecord = await motherService.getMotherByNic(identifier);
  }
  if (!motherRecord) {
    motherRecord = await motherService.getMotherByQr(identifier);
  }
  if (!motherRecord) {
    motherRecord = await motherService.getMotherById(identifier);
  }

  if (!motherRecord) return null;

  const activePregnancy =
    motherRecord.pregnancies.find((p) => p.status === 'ACTIVE' && p.deletedAt === null) || null;

  return {
    mother: motherRecord,
    phmArea: motherRecord.phmArea,
    activePregnancy,
    children: motherRecord.children,
    isDemo: !isPrismaConfigured(),
  };
}

// ============================================================================
// Top-Level Convenience Exports
// ============================================================================

export const isPrismaDbConfigured = isPrismaConfigured;

// Mother
export const getMothers = motherService.getMothers;
export const getMotherById = motherService.getMotherById;
export const getMotherByNic = motherService.getMotherByNic;
export const getMotherByQr = motherService.getMotherByQr;
export const createMother = motherService.createMother;
export const updateMother = motherService.updateMother;
export const deleteMother = motherService.deleteMother;

// Pregnancy
export const getPregnancies = pregnancyService.getPregnancies;
export const getPregnancyById = pregnancyService.getPregnancyById;
export const getActivePregnancyByMotherId = pregnancyService.getActivePregnancyByMotherId;
export const createPregnancy = pregnancyService.createPregnancy;
export const updatePregnancy = pregnancyService.updatePregnancy;
export const deletePregnancy = pregnancyService.deletePregnancy;

// AntenatalVisit
export const getAntenatalVisits = antenatalVisitService.getAntenatalVisits;
export const getAntenatalVisitById = antenatalVisitService.getAntenatalVisitById;
export const createAntenatalVisit = antenatalVisitService.createAntenatalVisit;
export const updateAntenatalVisit = antenatalVisitService.updateAntenatalVisit;
export const deleteAntenatalVisit = antenatalVisitService.deleteAntenatalVisit;

// Child
export const getChildren = childService.getChildren;
export const getChildById = childService.getChildById;
export const getChildByQr = childService.getChildByQr;
export const createChild = childService.createChild;
export const updateChild = childService.updateChild;
export const deleteChild = childService.deleteChild;

// UserAuditLog
export const getAuditLogs = userAuditLogService.getAuditLogs;
export const createAuditLog = userAuditLogService.createAuditLog;

// Unified Service Object
export const prismaDbService = {
  mother: motherService,
  pregnancy: pregnancyService,
  antenatalVisit: antenatalVisitService,
  child: childService,
  auditLog: userAuditLogService,
  getMotherPortalAggregate,
  isConfigured: isPrismaConfigured,
};

export default prismaDbService;
