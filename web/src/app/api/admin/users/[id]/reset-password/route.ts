import { NextRequest, NextResponse } from 'next/server';
import {
  isAdminConfigured,
  getAdminClient,
  requireMohSession,
} from '@/lib/supabaseAdmin';
import { MOCK_STAFF, MOCK_AUDIT_LOGS } from '@/lib/mockData';
import { UserAuditLogItem } from '@/lib/types';

// POST /api/admin/users/[id]/reset-password — Reset password or send recovery link (MOH Only)
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
    const body = await req.json();
    const { tempPassword, sendEmail } = body;

    if (!tempPassword && !sendEmail) {
      return NextResponse.json(
        { success: false, message: 'Please provide either a temporary password or request an email reset link.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    if (!isAdminConfigured()) {
      // Demo Mode
      const staff = MOCK_STAFF.find((s) => s.id === targetId);
      if (!staff) {
        return NextResponse.json({ success: false, message: 'Staff member not found.' }, { status: 404 });
      }

      const auditItem: UserAuditLogItem = {
        id: `aud_${Date.now()}`,
        mohDivision: caller.mohDivision,
        actorId: caller.userId,
        actorName: caller.fullName,
        targetUserId: targetId,
        targetUserName: staff.fullName,
        action: 'RESET_PASSWORD',
        changes: {
          method: sendEmail ? 'EMAIL_RECOVERY_LINK' : 'TEMPORARY_PASSWORD',
        },
        createdAt: nowIso,
      };
      MOCK_AUDIT_LOGS.unshift(auditItem);

      return NextResponse.json({
        success: true,
        message: sendEmail
          ? `Password reset link dispatched to ${staff.email} (Offline Demo Mode).`
          : `Temporary password for ${staff.fullName} has been updated (Offline Demo Mode).`,
      });
    }

    const admin = getAdminClient();

    // 1. Verify target profile
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

    // 2. Fetch User Email from Auth
    const { data: authUser, error: authUserErr } = await admin.auth.admin.getUserById(targetId);
    if (authUserErr || !authUser?.user) {
      return NextResponse.json({ success: false, message: 'Auth record for staff member not found.' }, { status: 404 });
    }

    const targetEmail = authUser.user.email;

    // 3. Perform Password Reset
    if (tempPassword) {
      if (tempPassword.length < 8) {
        return NextResponse.json(
          { success: false, message: 'Temporary password must be at least 8 characters long.' },
          { status: 400 }
        );
      }

      const { error: updateErr } = await admin.auth.admin.updateUserById(targetId, {
        password: tempPassword,
      });

      if (updateErr) {
        return NextResponse.json(
          { success: false, message: `Failed to update password: ${updateErr.message}` },
          { status: 500 }
        );
      }
    } else if (sendEmail && targetEmail) {
      const { error: linkErr } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email: targetEmail,
      });

      if (linkErr) {
        return NextResponse.json(
          { success: false, message: `Failed to send password reset: ${linkErr.message}` },
          { status: 500 }
        );
      }
    }

    // 4. Record Audit Log
    await admin.from('user_audit_logs').insert({
      moh_division: caller.mohDivision,
      actor_id: caller.userId,
      target_user_id: targetId,
      action: 'RESET_PASSWORD',
      changes_json: {
        method: tempPassword ? 'TEMPORARY_PASSWORD' : 'EMAIL_RECOVERY_LINK',
        targetEmail,
      },
    });

    return NextResponse.json({
      success: true,
      message: tempPassword
        ? `Temporary password for ${targetProfile.full_name} has been updated successfully.`
        : `Password recovery link dispatched to ${targetEmail}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
