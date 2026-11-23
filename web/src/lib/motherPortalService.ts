import { formatDate } from './dateFormat';

export interface MotherPortalData {
  mother: {
    id: string;
    qrToken: string;
    fullName: string;
    nic: string;
    phone: string;
    dob: string;
    bloodGroup: string;
    phmAreaName: string;
    mohDivision: string;
  };
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
    logDate: string; // DD/MM/YYYY
    startTime: string;
    tenthKickTime: string;
    kickCount: number;
    durationMinutes: number;
    reducedMovementFlag: boolean;
    source: 'PHM_APP' | 'MOTHER_PORTAL';
  }>;
  children: Array<{
    id: string;
    fullName: string;
    gender: 'MALE' | 'FEMALE';
    dob: string; // DD/MM/YYYY
    ageMonths: number;
    birthWeightKg: number;
    growthRecords: Array<{
      monthAge: number;
      weightKg: number;
      heightCm?: number;
      measuredDate: string; // DD/MM/YYYY
    }>;
    immunizations: Array<{
      id: string;
      vaccineCode: string;
      vaccineName: string;
      targetAgeMonths: number;
      status: 'COMPLETED' | 'NEXT_DUE' | 'UPCOMING';
      dateAdministered?: string; // DD/MM/YYYY
      dueDate?: string; // DD/MM/YYYY
    }>;
  }>;
}

export const DEMO_MOTHER_PORTAL_DATA: MotherPortalData = {
  mother: {
    id: 'moth_demo_001',
    qrToken: 'MOTH-887654322V',
    fullName: 'Inoka Dilhani',
    nic: '917654321V',
    phone: '0771234567',
    dob: '14/05/1991',
    bloodGroup: 'B+',
    phmAreaName: 'Kottawa North',
    mohDivision: 'Maharagama MOH Division',
  },
  phmContact: {
    name: 'Mrs. Sunethra Perera',
    phone: '0714567890',
    areaName: 'Kottawa North (Area 14)',
    mohDivision: 'Maharagama MOH Division',
  },
  pregnancy: {
    id: 'preg_demo_001',
    pogWeeks: 32,
    pogDays: 3,
    trimester: 3,
    edd: '18/01/2027',
    lrmp: '13/04/2026',
    riskTier: 'GREEN',
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
    daysRemaining: 3,
  },
  kickLogs: [
    {
      id: 'k_001',
      logDate: '22/11/2026',
      startTime: '09:00',
      tenthKickTime: '10:48',
      kickCount: 10,
      durationMinutes: 108,
      reducedMovementFlag: false,
      source: 'MOTHER_PORTAL',
    },
    {
      id: 'k_002',
      logDate: '21/11/2026',
      startTime: '09:00',
      tenthKickTime: '11:15',
      kickCount: 10,
      durationMinutes: 135,
      reducedMovementFlag: false,
      source: 'MOTHER_PORTAL',
    },
    {
      id: 'k_003',
      logDate: '20/11/2026',
      startTime: '09:15',
      tenthKickTime: '11:00',
      kickCount: 10,
      durationMinutes: 105,
      reducedMovementFlag: false,
      source: 'MOTHER_PORTAL',
    },
    {
      id: 'k_004',
      logDate: '19/11/2026',
      startTime: '09:00',
      tenthKickTime: '11:40',
      kickCount: 10,
      durationMinutes: 160,
      reducedMovementFlag: false,
      source: 'MOTHER_PORTAL',
    },
    {
      id: 'k_005',
      logDate: '18/11/2026',
      startTime: '09:30',
      tenthKickTime: '11:10',
      kickCount: 10,
      durationMinutes: 100,
      reducedMovementFlag: false,
      source: 'PHM_APP',
    },
  ],
  children: [
    {
      id: 'ch_001',
      fullName: 'Kasun Bandara',
      gender: 'MALE',
      dob: '23/09/2025',
      ageMonths: 14,
      birthWeightKg: 3.2,
      growthRecords: [
        { monthAge: 0, weightKg: 3.2, heightCm: 50.0, measuredDate: '23/09/2025' },
        { monthAge: 2, weightKg: 5.1, heightCm: 57.5, measuredDate: '24/11/2025' },
        { monthAge: 4, weightKg: 6.7, heightCm: 63.0, measuredDate: '25/01/2026' },
        { monthAge: 6, weightKg: 7.8, heightCm: 67.0, measuredDate: '24/03/2026' },
        { monthAge: 9, weightKg: 8.6, heightCm: 71.5, measuredDate: '23/06/2026' },
        { monthAge: 12, weightKg: 9.4, heightCm: 75.0, measuredDate: '23/09/2026' },
      ],
      immunizations: [
        {
          id: 'v_bcg',
          vaccineCode: 'BCG',
          vaccineName: 'BCG (Tuberculosis)',
          targetAgeMonths: 0,
          status: 'COMPLETED',
          dateAdministered: '24/09/2025',
        },
        {
          id: 'v_penta1',
          vaccineCode: 'Pentavalent 1',
          vaccineName: 'Penta 1 + OPV 1 + fIPV 1',
          targetAgeMonths: 2,
          status: 'COMPLETED',
          dateAdministered: '24/11/2025',
        },
        {
          id: 'v_penta2',
          vaccineCode: 'Pentavalent 2',
          vaccineName: 'Penta 2 + OPV 2',
          targetAgeMonths: 4,
          status: 'COMPLETED',
          dateAdministered: '26/01/2026',
        },
        {
          id: 'v_penta3',
          vaccineCode: 'Pentavalent 3',
          vaccineName: 'Penta 3 + OPV 3 + fIPV 2',
          targetAgeMonths: 6,
          status: 'COMPLETED',
          dateAdministered: '25/03/2026',
        },
        {
          id: 'v_mmr1',
          vaccineCode: 'MMR 1',
          vaccineName: 'Measles, Mumps & Rubella (Dose 1)',
          targetAgeMonths: 9,
          status: 'COMPLETED',
          dateAdministered: '24/06/2026',
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
        {
          id: 'v_mmr2',
          vaccineCode: 'MMR 2',
          vaccineName: 'Measles, Mumps & Rubella (Dose 2)',
          targetAgeMonths: 36,
          status: 'UPCOMING',
          dueDate: '23/09/2028',
        },
        {
          id: 'v_dt',
          vaccineCode: 'DT + OPV 5',
          vaccineName: 'Diphtheria & Tetanus Booster (School Entry)',
          targetAgeMonths: 60,
          status: 'UPCOMING',
          dueDate: '23/09/2030',
        },
      ],
    },
  ],
};
