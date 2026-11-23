import { z } from 'zod';

export const StaffRoleSchema = z.enum(['MOH', 'PHNS', 'PHM']);

export const UserRoleSchema = z.enum([
  'SYSTEM_ADMIN',
  'MOH_DOCTOR',
  'SUPERVISING_PHM',
  'FIELD_PHM',
  'CLINIC_STAFF',
  'MOH',
  'PHNS',
  'PHM',
  'MOTHER',
]);

export const AccountStatusSchema = z.enum([
  'ACTIVE',
  'SUSPENDED',
  'DEACTIVATED',
]);

export const SriLankaPhoneSchema = z
  .string()
  .trim()
  .regex(
    /^(?:\+94|0)[0-9]{9}$/,
    'Valid Sri Lankan telephone number required (e.g., 0771234567 or +94771234567)'
  );

export const UuidSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Valid UUID format required'
  );

export const UserIdParamSchema = z
  .string()
  .trim()
  .min(1, 'User ID is required.');

export const CreatePhmSchema = z.object({
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  phmAreaId: UuidSchema,
  preferredLang: z.enum(['si', 'ta', 'en']).default('si'),
});

export const CreateStaffSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    email: z.string().trim().email('Valid email address is required').toLowerCase(),
    role: StaffRoleSchema,
    phone: SriLankaPhoneSchema.optional().or(z.literal('')),
    employeeId: z.string().trim().optional().or(z.literal('')),
    phmAreaId: UuidSchema.optional().nullable().or(z.literal('')),
    preferredLang: z.enum(['si', 'ta', 'en']).default('si'),
    tempPassword: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
    sendInvite: z.boolean().default(false),
  })
  .refine(
    (data) => data.role !== 'PHM' || (!!data.phmAreaId && data.phmAreaId.trim().length > 0),
    {
      message: 'Assigned PHM Area is required for Field Midwife (PHM) staff.',
      path: ['phmAreaId'],
    }
  );

export const UpdateStaffSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').optional(),
  email: z.string().trim().email('Valid email is required').toLowerCase().optional(),
  phone: SriLankaPhoneSchema.optional().or(z.literal('')),
  employeeId: z.string().trim().optional(),
  role: StaffRoleSchema.optional(),
  phmAreaId: UuidSchema.optional().nullable().or(z.literal('')),
  preferredLang: z.enum(['si', 'ta', 'en']).optional(),
});

export const UpdateStatusSchema = z.object({
  isActive: z.boolean({ message: 'Field "isActive" (boolean) is required.' }),
  reason: z.string().trim().optional(),
});

export const ResetPasswordRouteSchema = z
  .object({
    tempPassword: z.string().min(8, 'Temporary password must be at least 8 characters').optional().or(z.literal('')),
    sendEmail: z.boolean().optional(),
  })
  .refine((data) => (!!data.tempPassword && data.tempPassword.trim().length > 0) || data.sendEmail === true, {
    message: 'Please provide either a temporary password or request an email reset link.',
  });

export const CreateUserSchema = z.object({
  email: z.string().trim().email('Invalid email address format').toLowerCase(),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  role: UserRoleSchema,
  phone: SriLankaPhoneSchema.optional().or(z.literal('')).nullable(),
  phmAreaId: z.string().uuid('Invalid PHM Area UUID format').optional().nullable(),
  mohDivision: z.string().trim().min(2).optional().nullable(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const UpdateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  role: UserRoleSchema.optional(),
  phone: SriLankaPhoneSchema.optional().or(z.literal('')).nullable(),
  phmAreaId: z.string().uuid().optional().nullable(),
  mohDivision: z.string().trim().min(2).optional().nullable(),
});

export const ChangeUserStatusSchema = z.object({
  status: AccountStatusSchema,
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').optional(),
});

export const ResetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

export type CreatePhmInput = z.infer<typeof CreatePhmSchema>;
export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;
export type UpdateStaffInput = z.infer<typeof UpdateStaffSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
export type ResetPasswordRouteInput = z.infer<typeof ResetPasswordRouteSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type ChangeUserStatusInput = z.infer<typeof ChangeUserStatusSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
