import { NextRequest, NextResponse } from 'next/server';
import {
  isAdminConfigured,
  getAdminClient,
  requireMohSession,
} from '@/lib/supabaseAdmin';
import { MOCK_STAFF, MOCK_AUDIT_LOGS } from '@/lib/mockData';
import { StaffMember, UserAuditLogItem } from '@/lib/types';
import { UpdateStaffSchema, UserIdParamSchema } from '@/lib/validations';

// PATCH /api/admin/users/[id] — Update staff member profile / reassign area
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idValidation = UserIdParamSchema.safeParse(params?.id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid or missing user ID in URL parameters.' },
        { status: 400 }
      );
    }
    const targetId = idValidation.data;

    let caller;
    try {
      caller = await requireMohSession();
    } catch (responseErr) {
      if (responseErr instanceof Response) return responseErr;
      throw responseErr;
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const parseResult = UpdateStaffSchema.safeParse(body);

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        { success: false, message: issue?.message || 'Invalid update parameters.' },
        { status: 400 }
      );
    }

    const { fullName, email, phone, employeeId, role, phmAreaId, preferredLang } = parseResult.data;

    if (!isAdminConfigured()) {
      // In-Memory Demo Mode Update
      const index = MOCK_STAFF.findIndex((s) => s.id === targetId);
      if (index === -1) {
        return NextResponse.json({ success: false, message: 'Staff member not found.' }, { status: 404 });
      }

      const existing = MOCK_STAFF[index];
      const isReassign = phmAreaId !== undefined && phmAreaId !== existing.phmAreaId;

      const updated: StaffMember = {
        ...existing,
        fullName: fullName ?? existing.fullName,
        email: email ?? existing.email,
        phone: phone ?? existing.phone,
        employeeId: employeeId ?? existing.employeeId,
        role: role ?? existing.role,
        phmAreaId: phmAreaId !== undefined ? phmAreaId : existing.phmAreaId,
        preferredLang: preferredLang ?? existing.preferredLang,
      };

      MOCK_STAFF[index] = updated;

      const auditItem: UserAuditLogItem = {
        id: `aud_${Date.now()}`,
        mohDivision: caller.mohDivision,
        actorId: caller.userId,
        actorName: caller.fullName,
        targetUserId: targetId,
        targetUserName: updated.fullName,
        action: isReassign ? 'REASSIGN_AREA' : 'UPDATE_USER',
        changes: {
          previous: {
            fullName: existing.fullName,
            role: existing.role,
            phmAreaId: existing.phmAreaId,
          },
          updated: {
            fullName: updated.fullName,
            role: updated.role,
            phmAreaId: updated.phmAreaId,
          },
        },
        createdAt: new Date().toISOString(),
      };
      MOCK_AUDIT_LOGS.unshift(auditItem);

      return NextResponse.json({
        success: true,
        message: 'Staff profile updated successfully (Offline Demo Mode).',
        data: updated,
      });
    }

    const admin = getAdminClient();

    // 1. Verify target user profile belongs to caller's division
    const { data: targetProfile, error: getErr } = await admin
      .from('profiles')
      .select('*, phm_areas(moh_division)')
      .eq('id', targetId)
      .single();

    if (getErr || !targetProfile) {
      return NextResponse.json({ success: false, message: 'Target staff profile not found.' }, { status: 404 });
    }

    const targetDiv = targetProfile.moh_division || targetProfile.phm_areas?.moh_division;
    if (targetDiv && targetDiv !== caller.mohDivision) {
      return NextResponse.json(
        { success: false, message: 'Cannot modify staff outside your MOH division.' },
        { status: 403 }
      );
    }

    const isAreaReassigned = phmAreaId !== undefined && phmAreaId !== targetProfile.phm_area_id;

    // 2. Update Auth email if provided and changed
    if (email && email.trim().toLowerCase()) {
      const newEmail = email.trim().toLowerCase();
      await admin.auth.admin.updateUserById(targetId, { email: newEmail });
    }

    // 3. Update Profile record
    const updates: Record<string, any> = {};
    if (fullName) updates.full_name = fullName.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (employeeId !== undefined) updates.employee_id = employeeId.trim();
    if (role) updates.role = role;
    if (phmAreaId !== undefined) updates.phm_area_id = phmAreaId || null;
    if (preferredLang) updates.preferred_lang = preferredLang;

    const { error: updateErr } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', targetId);

    if (updateErr) {
      return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 });
    }

    // 4. Record Audit Log
    await admin.from('user_audit_logs').insert({
      moh_division: caller.mohDivision,
      actor_id: caller.userId,
      target_user_id: targetId,
      action: isAreaReassigned ? 'REASSIGN_AREA' : 'UPDATE_USER',
      changes_json: {
        previous: {
          role: targetProfile.role,
          phmAreaId: targetProfile.phm_area_id,
          employeeId: targetProfile.employee_id,
        },
        updated: updates,
      },
    });

    return NextResponse.json({
      success: true,
      message: isAreaReassigned
        ? 'Staff area reassignment completed successfully.'
        : 'Staff profile updated successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
