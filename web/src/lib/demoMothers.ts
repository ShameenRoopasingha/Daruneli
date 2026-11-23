import { MotherPortalData } from './motherPortalService';

export interface DemoMotherAccount {
  id: string;
  fullName: string;
  nic: string;
  phone: string;
  dob: string; // YYYY-MM-DD
  dobDisplay: string; // DD/MM/YYYY
  pin: string; // 4-digit PIN
  inviteCode: string;
  qrToken: string;
  bloodGroup: string;
  phmAreaName: string;
  mohDivision: string;
  phmContact: {
    name: string;
    phone: string;
    areaName: string;
    mohDivision: string;
  };
  pregnancy: {
    id: string;
    pogWeeks: number;
    pogDays: number;
    trimester: 1 | 2 | 3;
    edd: string; // DD/MM/YYYY
    lrmp: string; // DD/MM/YYYY
    riskTier: 'GREEN' | 'YELLOW' | 'RED';
    riskScore: number;
    riskFactors: string[];
    milestone: string;
  };
  latestVitals: {
    visitDate: string; // DD/MM/YYYY
    bp: string;
    weightKg: number;
    sfhCm: number;
    hb: number;
  };
  upcomingSchedule: {
    nextVisitDate: string; // DD/MM/YYYY
    nextVisitType: 'HOME_VISIT' | 'CLINIC';
    daysRemaining: number;
  };
  kickLogs: Array<{
    id: string;
    logDate: string;
    startTime: string;
    tenthKickTime: string;
    kickCount: number;
    durationMinutes: number;
    reducedMovementFlag: boolean;
    source: 'PHM_APP' | 'MOTHER_PORTAL';
  }>;
  children: MotherPortalData['children'];
}

export const DEMO_MOTHER_ROSTER: DemoMotherAccount[] = [
  {
    id: 'moth_inoka_001',
    fullName: 'Inoka Dilhani',
    nic: '917654321V',
    phone: '0771234567',
    dob: '1991-05-14',
    dobDisplay: '14/05/1991',
    pin: '1234',
    inviteCode: 'DRN-74K',
    qrToken: 'MOTH-917654321V',
    bloodGroup: 'B+',
    phmAreaName: 'Walasmulla Town',
    mohDivision: 'Walasmulla MOH Division',
    phmContact: {
      name: 'Mrs. Sunethra Perera',
      phone: '0714567890',
      areaName: 'Walasmulla Town (Area 01)',
      mohDivision: 'Walasmulla MOH Division',
    },
    pregnancy: {
      id: 'preg_inoka_01',
      pogWeeks: 32,
      pogDays: 3,
      trimester: 3,
      edd: '18/01/2027',
      lrmp: '13/04/2026',
      riskTier: 'GREEN',
      riskScore: 0,
      riskFactors: [],
      milestone: 'Baby weighs approximately 1.8 kg (4 lbs) and is practicing rhythmic breathing motions.',
    },
    latestVitals: {
      visitDate: '20/11/2026',
      bp: '118/76',
      weightKg: 64.2,
      sfhCm: 31.0,
      hb: 11.4,
    },
    upcomingSchedule: {
      nextVisitDate: '26/11/2026',
      nextVisitType: 'HOME_VISIT',
      daysRemaining: 2,
    },
    kickLogs: [
      {
        id: 'k_inoka_01',
        logDate: '23/11/2026',
        startTime: '09:00',
        tenthKickTime: '10:45',
        kickCount: 10,
        durationMinutes: 105,
        reducedMovementFlag: false,
        source: 'MOTHER_PORTAL',
      },
      {
        id: 'k_inoka_02',
        logDate: '22/11/2026',
        startTime: '09:00',
        tenthKickTime: '10:48',
        kickCount: 10,
        durationMinutes: 108,
        reducedMovementFlag: false,
        source: 'MOTHER_PORTAL',
      },
    ],
    children: [
      {
        id: 'ch_inoka_01',
        fullName: 'Kasun Bandara',
        chdrNumber: 'CHDR/KOT/2025/089',
        dob: '23/09/2025',
        ageMonths: 14,
        gender: 'MALE',
        birthWeightKg: 3.1,
        bloodGroup: 'B+',
        growthRecords: [
          { monthAge: 0, weightKg: 3.1, measuredDate: '23/09/2025' },
          { monthAge: 2, weightKg: 4.8, measuredDate: '25/11/2025' },
          { monthAge: 4, weightKg: 6.2, measuredDate: '24/01/2026' },
          { monthAge: 6, weightKg: 7.4, measuredDate: '26/03/2026' },
          { monthAge: 9, weightKg: 8.6, measuredDate: '24/06/2026' },
          { monthAge: 12, weightKg: 9.7, measuredDate: '25/09/2026' },
          { monthAge: 14, weightKg: 10.2, measuredDate: '20/11/2026' },
        ],
        immunizations: [
          {
            id: 'v_bcg',
            vaccineCode: 'BCG',
            vaccineName: 'Bacille Calmette-Guérin',
            targetAgeMonths: 0,
            status: 'COMPLETED',
            dateAdministered: '23/09/2025',
          },
          {
            id: 'v_penta1',
            vaccineCode: 'Pentavalent 1 + OPV 1',
            vaccineName: 'DTP-HepB-Hib 1st Dose',
            targetAgeMonths: 2,
            status: 'COMPLETED',
            dateAdministered: '25/11/2025',
          },
          {
            id: 'v_je',
            vaccineCode: 'Live JE',
            vaccineName: 'Japanese Encephalitis',
            targetAgeMonths: 12,
            status: 'COMPLETED',
            dateAdministered: '25/09/2026',
          },
          {
            id: 'v_dpt_opv',
            vaccineCode: 'DPT + OPV 4',
            vaccineName: 'Diphtheria, Pertussis, Tetanus Booster',
            targetAgeMonths: 18,
            status: 'NEXT_DUE',
            dueDate: '23/03/2027',
          },
        ],
      },
    ],
  },
  {
    id: 'moth_iresha_002',
    fullName: 'Iresha Bandara',
    nic: '887654322V',
    phone: '0775566778',
    dob: '1988-09-05',
    dobDisplay: '05/09/1988',
    pin: '7412',
    inviteCode: 'DRN-IRE',
    qrToken: 'MOTH-887654322V',
    bloodGroup: 'A-',
    phmAreaName: 'Medagangoda',
    mohDivision: 'Walasmulla MOH Division',
    phmContact: {
      name: 'Mrs. Jayanthi Wickramasinghe',
      phone: '0715678901',
      areaName: 'Medagangoda (Area 04)',
      mohDivision: 'Walasmulla MOH Division',
    },
    pregnancy: {
      id: 'preg_iresha_01',
      pogWeeks: 24,
      pogDays: 1,
      trimester: 2,
      edd: '15/03/2027',
      lrmp: '08/06/2026',
      riskTier: 'RED',
      riskScore: 20,
      riskFactors: ['Chronic condition: DIABETES', 'Chronic condition: HEART_DISEASE', 'Previous stillbirth (1)'],
      milestone: 'Week 24: Baby weighs approximately 600g. Hearing is fully developed, and baby responds to sounds!',
    },
    latestVitals: {
      visitDate: '18/11/2026',
      bp: '138/88',
      weightKg: 76.5,
      sfhCm: 23.5,
      hb: 10.2,
    },
    upcomingSchedule: {
      nextVisitDate: '25/11/2026',
      nextVisitType: 'CLINIC',
      daysRemaining: 1,
    },
    kickLogs: [
      {
        id: 'k_iresha_01',
        logDate: '23/11/2026',
        startTime: '09:00',
        tenthKickTime: '11:35',
        kickCount: 10,
        durationMinutes: 155,
        reducedMovementFlag: false,
        source: 'MOTHER_PORTAL',
      },
    ],
    children: [],
  },
  {
    id: 'moth_nimali_003',
    fullName: 'Nimali Perera',
    nic: '887654321V',
    phone: '0771122334',
    dob: '1989-03-15',
    dobDisplay: '15/03/1989',
    pin: '2580',
    inviteCode: 'DRN-NIM',
    qrToken: 'MOTH-887654321V',
    bloodGroup: 'A+',
    phmAreaName: 'Walasmulla Town',
    mohDivision: 'Walasmulla MOH Division',
    phmContact: {
      name: 'Mrs. Sunethra Perera',
      phone: '0714567890',
      areaName: 'Walasmulla Town (Area 01)',
      mohDivision: 'Walasmulla MOH Division',
    },
    pregnancy: {
      id: 'preg_nimali_01',
      pogWeeks: 28,
      pogDays: 0,
      trimester: 3,
      edd: '16/02/2027',
      lrmp: '11/05/2026',
      riskTier: 'RED',
      riskScore: 16,
      riskFactors: ['Fertility treatment pregnancy', 'Precious pregnancy'],
      milestone: 'Week 28: Third trimester begins! Baby weighs over 1 kg and can open and close eyes.',
    },
    latestVitals: {
      visitDate: '19/11/2026',
      bp: '122/80',
      weightKg: 62.0,
      sfhCm: 27.0,
      hb: 11.1,
    },
    upcomingSchedule: {
      nextVisitDate: '27/11/2026',
      nextVisitType: 'HOME_VISIT',
      daysRemaining: 3,
    },
    kickLogs: [],
    children: [],
  },
  {
    id: 'moth_dilini_004',
    fullName: 'Dilini Jayawardena',
    nic: '957654321V',
    phone: '0774455667',
    dob: '1995-11-28',
    dobDisplay: '28/11/1995',
    pin: '9630',
    inviteCode: 'DRN-DIL',
    qrToken: 'MOTH-957654321V',
    bloodGroup: 'AB+',
    phmAreaName: 'Omara',
    mohDivision: 'Walasmulla MOH Division',
    phmContact: {
      name: 'Mrs. Nilmini Alwis',
      phone: '0716789012',
      areaName: 'Omara (Area 03)',
      mohDivision: 'Walasmulla MOH Division',
    },
    pregnancy: {
      id: 'preg_dilini_01',
      pogWeeks: 32,
      pogDays: 5,
      trimester: 3,
      edd: '14/01/2027',
      lrmp: '09/04/2026',
      riskTier: 'GREEN',
      riskScore: 0,
      riskFactors: [],
      milestone: 'Week 32: Baby has soft nails and bones are continuing to harden.',
    },
    latestVitals: {
      visitDate: '21/11/2026',
      bp: '115/74',
      weightKg: 65.4,
      sfhCm: 31.5,
      hb: 12.0,
    },
    upcomingSchedule: {
      nextVisitDate: '29/11/2026',
      nextVisitType: 'HOME_VISIT',
      daysRemaining: 5,
    },
    kickLogs: [],
    children: [],
  },
  {
    id: 'moth_kamala_005',
    fullName: 'Kamala Silva',
    nic: '917654321V',
    phone: '0772233445',
    dob: '1991-07-22',
    dobDisplay: '22/07/1991',
    pin: '1122',
    inviteCode: 'DRN-KAM',
    qrToken: 'MOTH-917654321V',
    bloodGroup: 'B+',
    phmAreaName: 'Bowala',
    mohDivision: 'Walasmulla MOH Division',
    phmContact: {
      name: 'Mrs. Chandani Silva',
      phone: '0717890123',
      areaName: 'Bowala (Area 11)',
      mohDivision: 'Walasmulla MOH Division',
    },
    pregnancy: {
      id: 'preg_kamala_01',
      pogWeeks: 20,
      pogDays: 2,
      trimester: 2,
      edd: '12/04/2027',
      lrmp: '24/11/2026',
      riskTier: 'RED',
      riskScore: 17,
      riskFactors: ['Recurrent miscarriages (3)', 'Chronic condition: HYPERTENSION'],
      milestone: 'Week 20: Halfway mark! Anomaly ultrasound milestone.',
    },
    latestVitals: {
      visitDate: '15/11/2026',
      bp: '136/86',
      weightKg: 68.2,
      sfhCm: 19.5,
      hb: 10.8,
    },
    upcomingSchedule: {
      nextVisitDate: '26/11/2026',
      nextVisitType: 'CLINIC',
      daysRemaining: 2,
    },
    kickLogs: [],
    children: [],
  },
];

/**
 * Clean and normalize phone or NIC string for flexible matching
 */
function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Find demo mother by Phone, NIC, Invite Code, or ID
 */
export function findDemoMother(identifier: string): DemoMotherAccount | null {
  if (!identifier) return null;
  const key = normalizeKey(identifier);

  return (
    DEMO_MOTHER_ROSTER.find((m) => {
      return (
        normalizeKey(m.id) === key ||
        normalizeKey(m.nic) === key ||
        normalizeKey(m.phone) === key ||
        normalizeKey(m.inviteCode) === key
      );
    }) || null
  );
}

/**
 * Verify credentials for Demo Mode
 */
export function verifyDemoMotherCredentials(
  identifier: string,
  pin: string
): { success: boolean; mother?: DemoMotherAccount; message?: string } {
  const mother = findDemoMother(identifier);

  if (!mother) {
    return {
      success: false,
      message:
        'No registered maternal record found for this Phone or NIC in demo mode. Please try a registered demo mother (e.g. 0771234567 or 0775566778).',
    };
  }

  if (mother.pin !== pin.trim()) {
    return {
      success: false,
      message: 'Incorrect 4-digit PIN. Please verify your PIN.',
    };
  }

  return { success: true, mother };
}

/**
 * Format demo mother into full MotherPortalData
 */
export function getDemoMotherPortalData(identifier: string): MotherPortalData {
  const account = findDemoMother(identifier) || DEMO_MOTHER_ROSTER[0];

  return {
    mother: {
      id: account.id,
      qrToken: account.qrToken,
      fullName: account.fullName,
      nic: account.nic,
      phone: account.phone,
      dob: account.dobDisplay,
      bloodGroup: account.bloodGroup,
      phmAreaName: account.phmAreaName,
      mohDivision: account.mohDivision,
    },
    phmContact: account.phmContact,
    pregnancy: {
      id: account.pregnancy.id,
      pogWeeks: account.pregnancy.pogWeeks,
      pogDays: account.pregnancy.pogDays,
      trimester: account.pregnancy.trimester,
      edd: account.pregnancy.edd,
      lrmp: account.pregnancy.lrmp,
      riskTier: account.pregnancy.riskTier,
      milestone: account.pregnancy.milestone,
    },
    latestVitals: account.latestVitals,
    upcomingSchedule: account.upcomingSchedule,
    kickLogs: account.kickLogs,
    children: account.children,
  };
}
