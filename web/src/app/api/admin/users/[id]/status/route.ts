import { NextRequest, NextResponse } from 'next/server';
import {
  isAdminConfigured,
  getAdminClient,
  requireMohSession,
} from '@/lib/supabaseAdmin';
import { MOCK_STAFF, MOCK_AUDIT_LOGS } from '@/lib/mockData';
import { StaffMember, UserAuditLogItem } from '@/lib/types';

// POST /api/admin/users/[id]/status — Deactivate or Reactivate Staff Account (MOH Only)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let caller;
    try {
      caller = await requireMohSession();
    } catch (responseErr) {
      if (responseErr instanceof Response) return responseErr;
      throw responseErr;
    }

    const targetId = params.id;
    if (targetId === caller.userId) {
      return NextResponse.json(
        { success: false, message: 'You cannot deactivate your own administrative account.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { isActive, reason } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'Field "isActive" (boolean) is required.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const action = isActive ? 'REACTIVATE_USER' : 'DEACTIVATE_USER';

    if (!isAdminConfigured()) {
      // In-Memory Demo Mode
      const index = MOCK_STAFF.findIndex((s) => s.id === targetId);
      if (index === -1) {
        return NextResponse.json({ success: false, message: 'Staff member not found.' }, { status: 404 });
      }

      const existing = MOCK_STAFF[index];
      const updated: StaffMember = {
        ...existing,
        isActive,
        deactivatedAt: isActive ? null : nowIso,
      };
      MOCK_STAFF[index] = updated;

      const auditItem: UserAuditLogItem = {
        id: `aud_${Date.now()}`,
        mohDivision: caller.mohDivision,
        actorId: caller.userId,
        actorName: caller.fullName,
        targetUserId: targetId,
        targetUserName: updated.fullName,
        action,
        changes: {
          isActive,
          reason: reason || (isActive ? 'Reactivated by MOH' : 'Deactivated by MOH'),
        },
        createdAt: nowIso,
      };
      MOCK_AUDIT_LOGS.unshift(auditItem);

      return NextResponse.json({
        success: true,
        message: isActive
          ? `Staff member ${updated.fullName} has been reactivated.`
          : `Staff member ${updated.fullName} has been deactivated. Sync access has been locked.`,
        data: updated,
      });
    }

    const admin = getAdminClient();

    // 1. Verify target staff profile
    const { data: targetProfile, error: getErr } = await admin
      .from('profiles')
      .select('*, phm_areas(moh_division)')
      .eq('id', targetId)
      .single();

    if (getErr || !targetProfile) {
      return NextResponse.json({ success: false, message: 'Target staff member not found.' }, { status: 404 });
    }

    const targetDiv = targetProfile.moh_division || targetProfile.phm_areas?.moh_division;
    if (targetDiv && targetDiv !== caller.mohDivision) {
      return NextResponse.json(
        { success: false, message: 'Cannot modify staff outside your MOH division.' },
        { status: 403 }
      );
    }

    // 2. Lock or Unlock Auth User in Supabase Auth
    // Setting ban_duration to '876000h' (100 years) effectively prevents login and token refreshes.
    const banDuration = isActive ? 'none' : '876000h';
    const { error: authErr } = await admin.auth.admin.updateUserById(targetId, {
      ban_duration: banDuration,
    });

    if (authErr) {
      return NextResponse.json(
        { success: false, message: `Failed to update auth status: ${authErr.message}` },
        { status: 500 }
      );
    }

    // 3. Update Profiles Table
    const { data: updatedProfile, error: profileErr } = await admin
      .from('profiles')
      .update({
        is_active: isActive,
        deactivated_at: isActive ? null : nowIso,
        updated_at: nowIso,
      })
      .eq('id', targetId)
      .select('*, phm_areas(phm_area_code, phm_area_name)')
      .single();

    if (profileErr) {
      return NextResponse.json(
        { success: false, message: `Failed to update profile: ${profileErr.message}` },
        { status: 500 }
      );
    }

    // 4. Record Audit Log
    await admin.from('user_audit_logs').insert({
      moh_division: caller.mohDivision,
      actor_id: caller.userId,
      target_user_id: targetId,
      action,
      changes_json: {
        isActive,
        reason: reason || (isActive ? 'Reactivated by MOH' : 'Deactivated by MOH'),
        previousStatus: targetProfile.is_active,
      },
    });

    return NextResponse.json({
      success: true,
      message: isActive
        ? `Staff member ${updatedProfile.full_name} has been reactivated.`
        : `Staff member ${updatedProfile.full_name} has been deactivated. Sync and mobile access are now locked.`,
      data: updatedProfile,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
