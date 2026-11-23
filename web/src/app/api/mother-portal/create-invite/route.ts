import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, isAdminConfigured } from '@/lib/supabaseAdmin';
import { CreateInviteSchema } from '@/lib/validations';

// Character set excluding ambiguous characters (0, O, 1, I)
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateInviteCode(): string {
  let result = 'DRN-';
  for (let i = 0; i < 3; i++) {
    result += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const parseResult = CreateInviteSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        { success: false, message: issue?.message || 'Invalid invite request parameters.' },
        { status: 400 }
      );
    }

    const { motherId, phmAreaId } = parseResult.data;

    // Demo Mode fallback
    if (!isAdminConfigured()) {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      let code = 'DRN-74K';
      if (motherId.includes('iresha') || motherId.includes('M5')) code = 'DRN-IRE';
      else if (motherId.includes('nimali') || motherId.includes('M1')) code = 'DRN-NIM';
      else if (motherId.includes('dilini') || motherId.includes('M4')) code = 'DRN-DIL';
      else if (motherId.includes('kamala') || motherId.includes('M2')) code = 'DRN-KAM';

      return NextResponse.json({
        success: true,
        demo_mode: true,
        invite_code: code,
        expires_at: expiresAt,
        qr_url: `/mother-portal/join?code=${code}`,
      });
    }

    const admin = getAdminClient();

    // 1. Check if mother exists
    const { data: mother, error: mErr } = await admin
      .from('mothers')
      .select('id, full_name, phm_area_id, auth_user_id')
      .eq('id', motherId)
      .single();

    if (mErr || !mother) {
      return NextResponse.json(
        { success: false, message: 'Mother record not found.' },
        { status: 404 }
      );
    }

    const areaId = phmAreaId || mother.phm_area_id;

    // 2. Check for active unexpired unused invite
    const nowIso = new Date().toISOString();
    const { data: activeInvites } = await admin
      .from('mother_portal_invites')
      .select('id, invite_code, expires_at')
      .eq('mother_id', motherId)
      .is('used_at', null)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1);

    if (activeInvites && activeInvites.length > 0) {
      const inv = activeInvites[0];
      return NextResponse.json({
        success: true,
        invite_code: inv.invite_code,
        expires_at: inv.expires_at,
        qr_url: `/mother-portal/join?code=${inv.invite_code}`,
      });
    }

    // 3. Generate unique invite code
    let code = generateInviteCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: exists } = await admin
        .from('mother_portal_invites')
        .select('id')
        .eq('invite_code', code)
        .limit(1);
      if (!exists || exists.length === 0) break;
      code = generateInviteCode();
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: newInvite, error: insErr } = await admin
      .from('mother_portal_invites')
      .insert({
        mother_id: motherId,
        phm_area_id: areaId,
        invite_code: code,
        expires_at: expiresAt,
      })
      .select('id, invite_code, expires_at')
      .single();

    if (insErr || !newInvite) {
      return NextResponse.json(
        { success: false, message: insErr?.message || 'Failed to create mother portal invite.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invite_code: newInvite.invite_code,
      expires_at: newInvite.expires_at,
      qr_url: `/mother-portal/join?code=${newInvite.invite_code}`,
    });
  } catch (err: any) {
    console.error('Create mother portal invite error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Server error creating invite code.' },
      { status: 500 }
    );
  }
}
