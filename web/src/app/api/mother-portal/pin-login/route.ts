import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, isAdminConfigured } from '@/lib/supabaseAdmin';
import { deriveMotherPassword } from '@/lib/motherAuthUtils';

// In-memory rate limiting map: identifier -> { attempts, lockedUntil }
const rateLimitMap = new Map<string, { attempts: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry) {
    rateLimitMap.set(key, { attempts: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (now > entry.resetAt) {
    rateLimitMap.set(key, { attempts: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.attempts >= 5) {
    return false;
  }
  entry.attempts += 1;
  return true;
}

function clearRateLimit(key: string) {
  rateLimitMap.delete(key);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = String(body.identifier || '').trim();
    const pin = String(body.pin || '').trim();
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `${ip}:${identifier.toLowerCase()}`;

    if (!identifier || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, message: 'Please provide your registered Phone/NIC and 4-digit PIN.' },
        { status: 400 }
      );
    }

    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many failed login attempts. For patient safety, this account is temporarily locked for 15 minutes.',
        },
        { status: 429 }
      );
    }

    // Demo Mode handling
    if (!isAdminConfigured() || body.is_demo === true) {
      clearRateLimit(rateLimitKey);
      return NextResponse.json({
        success: true,
        demo_mode: true,
        mother_name: 'Inoka Dilhani',
        mother_id: 'moth_demo_001',
        message: 'Signed in to Mother Companion Portal (Demo Mode).',
      });
    }

    const admin = getAdminClient();

    // 1. Look up mother by phone or NIC
    const cleanId = identifier.replace(/[^A-Za-z0-9]/g, '');
    const { data: mothers, error: motherErr } = await admin
      .from('mothers')
      .select('id, full_name, nic, phone, phm_area_id, auth_user_id')
      .or(`phone.eq.${identifier},nic.ilike.${cleanId},nic.ilike.${identifier}`)
      .limit(1);

    if (motherErr || !mothers || mothers.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials. If this is your first time, please use the invite code from your midwife.' },
        { status: 401 }
      );
    }

    const mother = mothers[0];

    if (!mother.auth_user_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'This account has not been activated yet. Please click "Claim Invite" and enter your 6-digit invite code.',
        },
        { status: 400 }
      );
    }

    // 2. Validate PIN via synthetic email and deterministic password
    const syntheticEmail = `mother_${mother.id.replace(/-/g, '')}@portal.daruneli.lk`;
    const password = deriveMotherPassword(mother.id, pin);

    // Verify against Supabase Auth
    const { data: authData, error: authError } = await admin.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    });

    if (authError || !authData.session) {
      return NextResponse.json(
        { success: false, message: 'Incorrect 4-digit PIN. Please try again.' },
        { status: 401 }
      );
    }

    clearRateLimit(rateLimitKey);

    return NextResponse.json({
      success: true,
      mother_name: mother.full_name,
      mother_id: mother.id,
      session: authData.session,
    });
  } catch (err: any) {
    console.error('Mother portal login error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Server error processing mother portal login.' },
      { status: 500 }
    );
  }
}
