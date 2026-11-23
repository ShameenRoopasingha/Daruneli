import { z } from 'zod';

export const SriLankaNicSchema = z
  .string()
  .trim()
  .regex(
    /^(?:[0-9]{9}[vVxX]|[0-9]{12})$/,
    'Valid Sri Lankan NIC required (e.g. 917654321V or 199176543210)'
  );

export const SriLankaPhoneSchema = z
  .string()
  .trim()
  .regex(
    /^(?:\+94|0)[0-9]{9}$/,
    'Valid Sri Lankan telephone number required (e.g., 0771234567 or +94771234567)'
  );

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

export const MotherFormValidationSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  nic: SriLankaNicSchema.optional().or(z.literal('')),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of Birth must be YYYY-MM-DD'),
  phone: SriLankaPhoneSchema.optional().or(z.literal('')),
  bloodGroup: BloodGroupSchema.optional().or(z.literal('')),
  eligibleFamilyNo: z.string().trim().min(2, 'Eligible Family No required'),
  gnDivision: z.string().trim().min(2, 'GN Division required'),
  address: z.string().trim().min(3, 'Address required'),
  husbandName: z.string().trim().min(2, "Husband's name required"),
  emergencyPhone: SriLankaPhoneSchema,
});

export const ChildFormValidationSchema = z.object({
  fullName: z.string().trim().min(2, 'Child name must be at least 2 characters').max(100),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be YYYY-MM-DD'),
  gender: z.enum(['M', 'F']),
  birthWeightKg: z
    .number()
    .min(0.5, 'Birth weight must be at least 0.5 kg')
    .max(7.0, 'Birth weight must be at most 7.0 kg')
    .optional()
    .nullable(),
});

export const QrCodeScanSchema = z.object({
  token: z.string().trim().min(3, 'QR Token must be at least 3 characters'),
});

export const AntenatalVisitValidationSchema = z.object({
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Visit date must be YYYY-MM-DD'),
  bpSystolic: z
    .number()
    .int('Systolic BP must be a whole number')
    .min(50, 'Systolic BP must be between 50 and 250 mmHg')
    .max(250, 'Systolic BP must be between 50 and 250 mmHg'),
  bpDiastolic: z
    .number()
    .int('Diastolic BP must be a whole number')
    .min(30, 'Diastolic BP must be between 30 and 150 mmHg')
    .max(150, 'Diastolic BP must be between 30 and 150 mmHg'),
  weightKg: z
    .number()
    .min(30, 'Maternal weight must be between 30 and 200 kg')
    .max(200, 'Maternal weight must be between 30 and 200 kg')
    .optional()
    .nullable(),
  hemoglobin: z
    .number()
    .min(3, 'Hemoglobin must be between 3 and 20 g/dL')
    .max(20, 'Hemoglobin must be between 3 and 20 g/dL')
    .optional()
    .nullable(),
});

export const GrowthLogValidationSchema = z.object({
  recordedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Recorded date must be YYYY-MM-DD'),
  weightKg: z
    .number()
    .min(0.5, 'Child weight must be at least 0.5 kg')
    .max(60, 'Child weight must be at most 60 kg'),
  heightCm: z
    .number()
    .min(20, 'Child height must be at least 20 cm')
    .max(180, 'Child height must be at most 180 cm')
    .optional()
    .nullable(),
});

export type MotherFormValues = z.infer<typeof MotherFormValidationSchema>;
export type ChildFormValues = z.infer<typeof ChildFormValidationSchema>;
export type QrCodeScanValues = z.infer<typeof QrCodeScanSchema>;
export type AntenatalVisitValues = z.infer<typeof AntenatalVisitValidationSchema>;
export type GrowthLogValues = z.infer<typeof GrowthLogValidationSchema>;
