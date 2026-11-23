import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, isAdminConfigured } from '@/lib/supabaseAdmin';
import { deriveMotherPassword, normalizeDate } from '@/lib/motherAuthUtils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCode = String(body.invite_code || '').trim().toUpperCase();
    const cleanCode = rawCode.replace(/[^A-Z0-9]/g, '');
    const dob = normalizeDate(String(body.dob || ''));
    const pin = String(body.pin || '').trim();

    if (!cleanCode || cleanCode.length < 5) {
      return NextResponse.json(
        { success: false, message: 'Invalid or incomplete invite code.' },
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

    // Demo Mode fallback if Supabase Admin is not configured
    if (!isAdminConfigured()) {
      return NextResponse.json({
        success: true,
        demo_mode: true,
        mother_name: 'Inoka Dilhani',
        login_identifier: '0771234567',
        message: 'Demo Portal invitation claimed successfully.',
      });
    }

    const admin = getAdminClient();

    // 1. Fetch invite
    const { data: invites, error: inviteErr } = await admin
      .from('mother_portal_invites')
      .select('id, mother_id, phm_area_id, invite_code, expires_at, used_at')
      .or(`invite_code.eq.${rawCode},invite_code.eq.${cleanCode}`)
      .limit(1);

    if (inviteErr || !invites || invites.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invite code was not found. Please verify with your Public Health Midwife (PHM).' },
        { status: 404 }
      );
    }

    const invite = invites[0];

    if (invite.used_at) {
      return NextResponse.json(
        { success: false, message: 'This invite code has already been claimed. Please sign in with your PIN.' },
        { status: 400 }
      );
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, message: 'This invite code has expired (valid 7 days). Please request a new code from your midwife.' },
        { status: 400 }
      );
    }

    // 2. Fetch linked mother record
    const { data: mother, error: motherErr } = await admin
      .from('mothers')
      .select('id, full_name, dob, nic, phone, phm_area_id, auth_user_id')
      .eq('id', invite.mother_id)
      .single();

    if (motherErr || !mother) {
      return NextResponse.json(
        { success: false, message: 'Verification error: Registered mother profile could not be located.' },
        { status: 404 }
      );
    }

    // 3. Strict DOB Verification (generic response to prevent enumeration)
    const registeredDob = normalizeDate(mother.dob || '');
    if (registeredDob !== dob) {
      return NextResponse.json(
        {
          success: false,
          message: 'Identity verification failed. The Date of Birth does not match clinic registration records.',
        },
        { status: 400 }
      );
    }

    // 4. Create or update Supabase Auth User
    const syntheticEmail = `mother_${mother.id.replace(/-/g, '')}@portal.daruneli.lk`;
    const deterministicPassword = deriveMotherPassword(mother.id, pin);

    let authUserId = mother.auth_user_id;

    if (!authUserId) {
      // Create fresh auth user
      const { data: newUser, error: createAuthErr } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        password: deterministicPassword,
        email_confirm: true,
        user_metadata: {
          role: 'MOTHER',
          mother_id: mother.id,
          full_name: mother.full_name,
        },
      });

      if (createAuthErr || !newUser.user) {
        // If user already exists by email, update password
        if (createAuthErr?.message?.includes('already been registered')) {
          const { data: userList } = await admin.auth.admin.listUsers();
          const existing = userList.users.find((u) => u.email === syntheticEmail);
          if (existing) {
            authUserId = existing.id;
            await admin.auth.admin.updateUserById(authUserId, {
              password: deterministicPassword,
              user_metadata: { role: 'MOTHER', mother_id: mother.id },
            });
          }
        } else {
          return NextResponse.json(
            { success: false, message: createAuthErr?.message || 'Failed to initialize mother secure portal login.' },
            { status: 500 }
          );
        }
      } else {
        authUserId = newUser.user.id;
      }
    } else {
      // Reset PIN / password on existing auth user
      await admin.auth.admin.updateUserById(authUserId, {
        password: deterministicPassword,
        user_metadata: { role: 'MOTHER', mother_id: mother.id },
      });
    }

    // 5. Upsert profile for mother
    await admin.from('profiles').upsert(
      {
        id: authUserId,
        full_name: mother.full_name,
        role: 'MOTHER',
        phm_area_id: mother.phm_area_id,
        phone: mother.phone || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    // 6. Link auth user on mother record & mark invite as used
    await admin
      .from('mothers')
      .update({
        auth_user_id: authUserId,
        portal_linked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', mother.id);

    await admin
      .from('mother_portal_invites')
      .update({
        used_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    return NextResponse.json({
      success: true,
      mother_name: mother.full_name,
      login_identifier: mother.phone || mother.nic || syntheticEmail,
      message: 'Mother companion portal access activated successfully.',
    });
  } catch (err: any) {
    console.error('Mother portal invite claim error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Server error claiming mother portal invite.' },
      { status: 500 }
    );
  }
}
