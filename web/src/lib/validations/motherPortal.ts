import { z } from 'zod';
import { SriLankaPhoneSchema } from './user';

export { SriLankaPhoneSchema };

export const SriLankaNicSchema = z
  .string()
  .trim()
  .regex(
    /^(?:[0-9]{9}[vVxX]|[0-9]{12})$/,
    'Valid Sri Lankan NIC required (e.g. 917654321V or 199176543210)'
  );

export const PinLoginSchema = z
  .object({
    identifier: z.string().trim().optional(),
    nic: z.string().trim().optional(),
    phone: SriLankaPhoneSchema.optional(),
    pin: z.string().trim().optional(),
    is_demo: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.is_demo === true) return true;
      const id = data.identifier || data.nic || data.phone;
      return (
        !!id &&
        id.length >= 3 &&
        !!data.pin &&
        /^\d{4}$/.test(data.pin)
      );
    },
    {
      message: 'Please provide a valid registered Phone/NIC and 4-digit PIN.',
    }
  );

export const ClaimInviteSchema = z.preprocess(
  (arg: any) => {
    if (arg && typeof arg === 'object') {
      return {
        invite_code: arg.invite_code ?? arg.code,
        dob: arg.dob,
        nic: arg.nic,
        pin: arg.pin,
      };
    }
    return arg;
  },
  z
    .object({
      invite_code: z
        .string()
        .trim()
        .min(4, 'Invalid or incomplete invite code format.')
        .max(15, 'Invite code too long'),
      dob: z
        .string()
        .trim()
        .min(4, 'Valid Date of Birth is required for identity verification.')
        .optional(),
      nic: SriLankaNicSchema.optional(),
      pin: z
        .string()
        .trim()
        .regex(/^\d{4}$/, 'Please provide a 4-digit numeric PIN.'),
    })
    .refine((data) => !!(data.dob || data.nic), {
      message: 'Valid Date of Birth is required for identity verification.',
      path: ['dob'],
    })
);

export const CreateInviteSchema = z.preprocess(
  (arg: any) => {
    if (arg && typeof arg === 'object') {
      return {
        motherId: arg.motherId ?? arg.mother_id,
        phmAreaId: arg.phmAreaId ?? arg.phm_area_id,
      };
    }
    return arg;
  },
  z.object({
    motherId: z.string().trim().min(1, 'mother_id is required.'),
    phmAreaId: z.string().trim().optional().nullable(),
  })
);

export const FetalKickLogSchema = z.preprocess(
  (arg: any) => {
    if (arg && typeof arg === 'object') {
      return {
        pregnancyId: arg.pregnancyId ?? arg.pregnancy_id,
        logDate: arg.logDate ?? arg.log_date,
        startTime: arg.startTime ?? arg.start_time,
        tenthKickTime: arg.tenthKickTime ?? arg.tenth_kick_time,
        kickCount: arg.kickCount ?? arg.kick_count,
        durationMinutes: arg.durationMinutes ?? arg.duration_minutes,
        reducedMovementFlag: arg.reducedMovementFlag ?? arg.reduced_movement_flag,
      };
    }
    return arg;
  },
  z.object({
    pregnancyId: z.string().trim().optional().nullable(),
    logDate: z
      .string()
      .trim()
      .regex(
        /^(?:\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/,
        'Date must be formatted as YYYY-MM-DD or DD/MM/YYYY'
      ),
    startTime: z
      .string()
      .trim()
      .regex(/^\d{2}:\d{2}$/, 'Start time must be formatted as HH:mm'),
    tenthKickTime: z
      .string()
      .trim()
      .regex(/^\d{2}:\d{2}$/, '10th kick time must be formatted as HH:mm')
      .optional()
      .nullable(),
    kickCount: z.number().int().min(0, 'Kick count must be at least 0').max(100, 'Kick count cannot exceed 100'),
    durationMinutes: z.number().int().min(0).max(720).optional().nullable(),
    reducedMovementFlag: z.boolean().default(false),
  })
);

export type PinLoginInput = z.infer<typeof PinLoginSchema>;
export type ClaimInviteInput = z.infer<typeof ClaimInviteSchema>;
export type CreateInviteInput = z.infer<typeof CreateInviteSchema>;
export type FetalKickLogInput = z.infer<typeof FetalKickLogSchema>;
