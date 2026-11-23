import crypto from 'crypto';

/**
 * Derive a secure deterministic password for the synthetic mother auth user
 */
export function deriveMotherPassword(motherId: string, pin: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'daruneli_mother_portal_salt_2026';
  return crypto
    .createHmac('sha256', secret)
    .update(`daruneli:mother:${motherId}:${pin}`)
    .digest('hex');
}

/**
 * Normalize date strings into YYYY-MM-DD
 */
export function normalizeDate(d: string): string {
  if (!d) return '';
  const trimmed = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [dd, mm, yyyy] = trimmed.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  return trimmed;
}
