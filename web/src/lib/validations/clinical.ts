import { z } from 'zod';
import { SriLankaNicSchema, SriLankaPhoneSchema } from './motherPortal';

export const BloodGroupSchema = z.enum([
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
]);

export const RiskTierSchema = z.enum(['GREEN', 'YELLOW', 'RED']);

export const MotherRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, 'Mother full name must be at least 2 characters').max(100),
  nic: SriLankaNicSchema.optional().nullable(),
  dob: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be formatted as YYYY-MM-DD'),
  phone: SriLankaPhoneSchema.optional().or(z.literal('')).nullable(),
  bloodGroup: BloodGroupSchema.optional().nullable(),
  eligibleFamilyNo: z.string().trim().min(2, 'Eligible Family No required'),
  gnDivision: z.string().trim().min(2, 'Grama Niladhari Division required'),
  address: z.string().trim().min(3, 'Address required'),
  husbandName: z.string().trim().min(2, "Husband's name required"),
  emergencyPhone: SriLankaPhoneSchema,
  chronicConditions: z.array(z.string()).default([]),
  fertilityTreatmentHistory: z.boolean().default(false),
  prevMiscarriagesCount: z.number().int().min(0).default(0),
  prevStillbirthsCount: z.number().int().min(0).default(0),
  prevCSectionsCount: z.number().int().min(0).default(0),
  planningPregnancy: z.boolean().default(false),
});

export const AntenatalVisitSchema = z.object({
  pregnancyId: z.string().uuid('Invalid Pregnancy UUID'),
  visitDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  pogWeeks: z.number().int().min(4).max(45),
  pogDays: z.number().int().min(0).max(6),
  weightKg: z.number().min(30).max(200).optional().nullable(),
  bpSystolic: z.number().int().min(60).max(260).optional().nullable(),
  bpDiastolic: z.number().int().min(40).max(180).optional().nullable(),
  urineAlbumin: z.string().optional().nullable(),
  urineSugar: z.string().optional().nullable(),
  pallor: z.number().int().min(0).max(1).default(0),
  edema: z.number().int().min(0).max(1).default(0),
  fundalHeightCm: z.number().min(10).max(50).optional().nullable(),
  fetalHeartRate: z.number().int().min(80).max(220).optional().nullable(),
  fetalMovementPresent: z.number().int().min(0).max(1).default(1),
  fetalPresentation: z.string().optional().nullable(),
  ironFolateGiven: z.number().int().min(0).max(1).default(0),
  calciumGiven: z.number().int().min(0).max(1).default(0),
  vitaminCGiven: z.number().int().min(0).max(1).default(0),
  notes: z.string().max(1000).optional().nullable(),
});

export const ChildRegistrationSchema = z.object({
  motherId: z.string().uuid('Invalid Mother UUID'),
  pregnancyId: z.string().uuid().optional().nullable(),
  fullName: z.string().trim().min(2, 'Child name must be at least 2 characters').max(100),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be formatted as YYYY-MM-DD'),
  gender: z.enum(['M', 'F']),
  birthWeightKg: z.number().min(0.5).max(8.0).optional().nullable(),
  gestationalAgeAtBirthWeeks: z.number().int().min(20).max(45).optional().nullable(),
});

export type MotherRegistrationInput = z.infer<typeof MotherRegistrationSchema>;
export type AntenatalVisitInput = z.infer<typeof AntenatalVisitSchema>;
export type ChildRegistrationInput = z.infer<typeof ChildRegistrationSchema>;
