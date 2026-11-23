import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, isAdminConfigured } from '@/lib/supabaseAdmin';
import {
  deriveMotherPassword,
  sanitizeIdentifier,
  signMotherSessionToken,
} from '@/lib/motherAuthUtils';
import {
  findDemoMother,
  verifyDemoMotherCredentials,
  getDemoMotherPortalData,
} from '@/lib/demoMothers';
import { PinLoginSchema } from '@/lib/validations';

// In-memory rate limiting map: ip:identifier -> { attempts, resetAt }
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
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid JSON request payload.',
        },
        { status: 400 }
      );
    }

    const parseResult = PinLoginSchema.safeParse(body);

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          message: issue?.message || 'Please provide a valid registered Phone/NIC and 4-digit PIN.',
        },
        { status: 400 }
      );
    }

    const rawIdentifier = String(
      parseResult.data.identifier || parseResult.data.nic || parseResult.data.phone || ''
    ).trim();
    const pin = String(parseResult.data.pin || '').trim();
    const isExplicitDemo = parseResult.data.is_demo === true;

    // 1. Strict Input Sanitization
    const sanitizedId = sanitizeIdentifier(rawIdentifier);

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `${ip}:${(sanitizedId || 'demo').toLowerCase()}`;

    if (!isExplicitDemo && !checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Too many failed login attempts. For patient safety, this account is temporarily locked for 15 minutes.',
        },
        { status: 429 }
      );
    }

    // 2. Demo Mode Handling (Offline / Unconfigured Supabase)
    if (!isAdminConfigured() || isExplicitDemo) {
      if (isExplicitDemo) {
        // Explicit 1-tap demo portal button
        clearRateLimit(rateLimitKey);
        const demoTarget = findDemoMother(sanitizedId || '0771234567') || findDemoMother('0771234567')!;
        const sessionToken = signMotherSessionToken({
          mother_id: demoTarget.id,
          mother_name: demoTarget.fullName,
          nic: demoTarget.nic,
          phone: demoTarget.phone,
          is_demo: true,
        });

        const res = NextResponse.json({
          success: true,
          demo_mode: true,
          mother_name: demoTarget.fullName,
          mother_id: demoTarget.id,
          mother_nic: demoTarget.nic,
          mother_phone: demoTarget.phone,
          message: `Signed in to demo portal as ${demoTarget.fullName}.`,
        });

        res.cookies.set('daruneli_mother_session', sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
        });

        res.cookies.set('daruneli_user_role', 'MOTHER', {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
        });

        return res;
      }

      // Credential-based login in Demo Mode: MUST VERIFY CREDENTIALS
      const verification = verifyDemoMotherCredentials(sanitizedId!, pin);
      if (!verification.success || !verification.mother) {
        return NextResponse.json(
          {
            success: false,
            message: verification.message || 'Invalid Phone/NIC or 4-digit PIN.',
          },
          { status: 401 }
        );
      }

      clearRateLimit(rateLimitKey);
      const verifiedMother = verification.mother;

      const sessionToken = signMotherSessionToken({
        mother_id: verifiedMother.id,
        mother_name: verifiedMother.fullName,
        nic: verifiedMother.nic,
        phone: verifiedMother.phone,
        is_demo: true,
      });

      const res = NextResponse.json({
        success: true,
        demo_mode: true,
        mother_name: verifiedMother.fullName,
        mother_id: verifiedMother.id,
        mother_nic: verifiedMother.nic,
        mother_phone: verifiedMother.phone,
        message: `Signed in as ${verifiedMother.fullName}.`,
      });

      res.cookies.set('daruneli_mother_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });

      res.cookies.set('daruneli_user_role', 'MOTHER', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });

      return res;
    }

    // 3. Supabase Production Mode
    const admin = getAdminClient();

    // Look up mother by phone or NIC with safe parameterized eq filters
    const cleanId = sanitizedId!.replace(/[^A-Za-z0-9]/g, '');
    let motherQuery = admin
      .from('mothers')
      .select('id, full_name, nic, phone, phm_area_id, auth_user_id')
      .eq('phone', sanitizedId);

    const { data: phoneMatch } = await motherQuery.limit(1);

    let mother = phoneMatch && phoneMatch.length > 0 ? phoneMatch[0] : null;

    if (!mother) {
      const { data: nicMatch, error: nicErr } = await admin
        .from('mothers')
        .select('id, full_name, nic, phone, phm_area_id, auth_user_id')
        .ilike('nic', cleanId)
        .limit(1);

      if (!nicErr && nicMatch && nicMatch.length > 0) {
        mother = nicMatch[0];
      }
    }

    if (!mother) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid credentials. If this is your first time, please use the invite code from your midwife.',
        },
        { status: 401 }
      );
    }

    if (!mother.auth_user_id) {
      return NextResponse.json(
        {
          success: false,
          message:
            'This account has not been activated yet. Please click "Claim Invite" and enter your 6-digit invite code.',
        },
        { status: 400 }
      );
    }

    // Validate PIN via synthetic email and deterministic password
    const syntheticEmail = `mother_${mother.id.replace(/-/g, '')}@portal.daruneli.lk`;
    const password = deriveMotherPassword(mother.id, pin);

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

    const sessionToken = signMotherSessionToken({
      mother_id: mother.id,
      mother_name: mother.full_name,
      nic: mother.nic,
      phone: mother.phone,
      is_demo: false,
    });

    const res = NextResponse.json({
      success: true,
      mother_name: mother.full_name,
      mother_id: mother.id,
      mother_nic: mother.nic,
      session: authData.session,
    });

    res.cookies.set('daruneli_mother_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    res.cookies.set('daruneli_user_role', 'MOTHER', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err: any) {
    console.error('Mother portal login error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Server error processing mother portal login.' },
      { status: 500 }
    );
  }
}
