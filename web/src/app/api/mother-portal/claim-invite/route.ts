import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, isAdminConfigured } from '@/lib/supabaseAdmin';
import {
  deriveMotherPassword,
  normalizeDate,
  sanitizeInviteCode,
  signMotherSessionToken,
} from '@/lib/motherAuthUtils';
import { findDemoMother } from '@/lib/demoMothers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCode = String(body.invite_code || '').trim().toUpperCase();
    const cleanCode = sanitizeInviteCode(rawCode);
    const dob = normalizeDate(String(body.dob || ''));
    const pin = String(body.pin || '').trim();

    if (!cleanCode) {
      return NextResponse.json(
        { success: false, message: 'Invalid or incomplete invite code format.' },
        { status: 400 }
      );
    }

    if (!dob) {
      return NextResponse.json(
        { success: false, message: 'Valid Date of Birth is required for identity verification.' },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, message: 'Please provide a 4-digit numeric PIN.' },
        { status: 400 }
      );
    }

    // 1. Demo Mode Handling
    if (!isAdminConfigured()) {
      const demoMother = findDemoMother(cleanCode);

      if (!demoMother) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Invite code not found in demo mode. Try DRN-74K (Inoka) or DRN-IRE (Iresha).',
          },
          { status: 404 }
        );
      }

      // Verify DOB
      if (normalizeDate(demoMother.dob) !== dob) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Identity verification failed. The Date of Birth does not match clinic registration records.',
          },
          { status: 400 }
        );
      }

      // Set PIN for this session
      demoMother.pin = pin;

      const sessionToken = signMotherSessionToken({
        mother_id: demoMother.id,
        mother_name: demoMother.fullName,
        nic: demoMother.nic,
        phone: demoMother.phone,
        is_demo: true,
      });

      const res = NextResponse.json({
        success: true,
        demo_mode: true,
        mother_name: demoMother.fullName,
        mother_id: demoMother.id,
        mother_nic: demoMother.nic,
        login_identifier: demoMother.phone,
        message: `Welcome, ${demoMother.fullName}! Your Daruneli Mother Portal is now active.`,
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

    // 2. Supabase Production Mode
    const admin = getAdminClient();

    // Fetch invite with safe parameterized query
    const { data: invites, error: inviteErr } = await admin
      .from('mother_portal_invites')
      .select('id, mother_id, phm_area_id, invite_code, expires_at, used_at')
      .eq('invite_code', cleanCode)
      .limit(1);

    if (inviteErr || !invites || invites.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invite code was not found. Please verify with your Public Health Midwife (PHM).',
        },
        { status: 404 }
      );
    }

    const invite = invites[0];

    if (invite.used_at) {
      return NextResponse.json(
        {
          success: false,
          message: 'This invite code has already been claimed. Please sign in with your PIN.',
        },
        { status: 400 }
      );
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        {
          success: false,
          message:
            'This invite code has expired (valid 7 days). Please request a new code from your midwife.',
        },
        { status: 400 }
      );
    }

    // Fetch linked mother record
    const { data: mother, error: motherErr } = await admin
      .from('mothers')
      .select('id, full_name, dob, nic, phone, phm_area_id, auth_user_id')
      .eq('id', invite.mother_id)
      .single();

    if (motherErr || !mother) {
      return NextResponse.json(
        {
          success: false,
          message: 'Verification error: Registered mother profile could not be located.',
        },
        { status: 404 }
      );
    }

    // Strict DOB Verification
    const registeredDob = normalizeDate(mother.dob || '');
    if (registeredDob !== dob) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Identity verification failed. The Date of Birth does not match clinic registration records.',
        },
        { status: 400 }
      );
    }

    // Create or update Supabase Auth User
    const syntheticEmail = `mother_${mother.id.replace(/-/g, '')}@portal.daruneli.lk`;
    const deterministicPassword = deriveMotherPassword(mother.id, pin);

    let authUserId = mother.auth_user_id;

    if (!authUserId) {
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        password: deterministicPassword,
        email_confirm: true,
        user_metadata: {
          role: 'MOTHER',
          full_name: mother.full_name,
          mother_id: mother.id,
          phm_area_id: mother.phm_area_id,
        },
      });

      if (createErr || !newUser.user) {
        return NextResponse.json(
          {
            success: false,
            message: createErr?.message || 'Failed to create mother companion login identity.',
          },
          { status: 500 }
        );
      }

      authUserId = newUser.user.id;

      // Update mothers table
      await admin
        .from('mothers')
        .update({
          auth_user_id: authUserId,
          portal_linked_at: new Date().toISOString(),
        })
        .eq('id', mother.id);

      // Insert profile entry with role MOTHER
      await admin.from('profiles').upsert({
        id: authUserId,
        role: 'MOTHER',
        full_name: mother.full_name,
        phone: mother.phone || null,
        is_active: true,
        phm_area_id: mother.phm_area_id,
        updated_at: new Date().toISOString(),
      });
    } else {
      // Update password
      await admin.auth.admin.updateUserById(authUserId, {
        password: deterministicPassword,
      });
    }

    // Mark invite as used
    await admin
      .from('mother_portal_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id);

    // Generate signed session token
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
      login_identifier: mother.phone || mother.nic,
      message: `Welcome, ${mother.full_name}! Your Daruneli Mother Portal is now active.`,
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
    console.error('Claim invite error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Server error claiming mother portal invite.' },
      { status: 500 }
    );
  }
}
