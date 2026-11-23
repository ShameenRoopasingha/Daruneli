import crypto from 'crypto';

export interface MotherSessionPayload {
  mother_id: string;
  mother_name: string;
  nic: string;
  phone?: string;
  role: 'MOTHER';
  exp: number; // Unix timestamp seconds
  iat: number; // Unix timestamp seconds
  is_demo?: boolean;
}

const TOKEN_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.MOTHER_SESSION_SECRET ||
  'daruneli_mother_portal_hmac_secret_2026';

/**
 * Derive a secure deterministic password for the synthetic mother auth user
 */
export function deriveMotherPassword(motherId: string, pin: string): string {
  return crypto
    .createHmac('sha256', TOKEN_SECRET)
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

/**
 * Strictly sanitize phone or NIC input to prevent PostgREST / SQL query injection
 */
export function sanitizeIdentifier(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  // Allow only alphanumeric chars, spaces, dashes, and leading '+'
  if (!/^[0-9A-Za-z+ -]{8,25}$/.test(trimmed)) {
    return null;
  }
  // Strip out spacing and hyphens for clean matching
  return trimmed.replace(/[\s-]/g, '');
}

/**
 * Strictly sanitize 6-character invite codes
 */
export function sanitizeInviteCode(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim().toUpperCase();
  if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ-]{5,10}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Sign a tamper-proof session token using HMAC-SHA256
 */
export function signMotherSessionToken(
  data: Omit<MotherSessionPayload, 'exp' | 'iat' | 'role'> & { expiresInDays?: number }
): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + (data.expiresInDays || 30) * 24 * 60 * 60;

  const payload: MotherSessionPayload = {
    mother_id: data.mother_id,
    mother_name: data.mother_name,
    nic: data.nic,
    phone: data.phone,
    role: 'MOTHER',
    is_demo: data.is_demo ?? false,
    iat,
    exp,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode an HMAC-SHA256 signed session token
 */
export function verifyMotherSessionToken(token: string): MotherSessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(payloadB64)
      .digest('base64url');

    const sigA = Buffer.from(signature);
    const sigB = Buffer.from(expectedSignature);

    if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
      return null; // Signature mismatch / tampered token
    }

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload: MotherSessionPayload = JSON.parse(payloadJson);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null; // Expired token
    }

    if (payload.role !== 'MOTHER' || !payload.mother_id) {
      return null; // Invalid role or payload
    }

    return payload;
  } catch {
    return null;
  }
}
