import { NextRequest, NextResponse } from 'next/server';
import {
  isAdminConfigured,
  getAdminClient,
  requireSupervisorSession,
  requireMohSession,
} from '@/lib/supabaseAdmin';
import { MOCK_STAFF, MOCK_AUDIT_LOGS } from '@/lib/mockData';
import { StaffMember, UserAuditLogItem } from '@/lib/types';

// GET /api/admin/users — List all staff in caller's MOH division
export async function GET(req: NextRequest) {
  try {
    let caller;
    try {
      caller = await requireSupervisorSession();
    } catch (responseErr) {
      if (responseErr instanceof Response) return responseErr;
      throw responseErr;
    }

    if (!isAdminConfigured()) {
      return NextResponse.json({
        success: true,
        data: MOCK_STAFF,
        auditLogs: MOCK_AUDIT_LOGS,
        isDemo: true,
      });
    }

    const admin = getAdminClient();

    // 1. Fetch profiles joined with phm_areas
    const { data: profiles, error: pError } = await admin
      .from('profiles')
      .select('*, phm_areas(id, phm_area_code, phm_area_name, moh_division)')
      .order('created_at', { ascending: false });

    if (pError) {
      return NextResponse.json({ success: false, message: pError.message }, { status: 500 });
    }

    // 2. Fetch auth user emails and metadata
    const { data: usersData, error: uError } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const authMap = new Map<string, { email?: string; last_sign_in_at?: string }>();
    if (!uError && usersData?.users) {
      usersData.users.forEach((u) => {
        authMap.set(u.id, {
          email: u.email,
          last_sign_in_at: u.last_sign_in_at,
        });
      });
    }

    // 3. Merge profiles with auth details
    const staffList: StaffMember[] = (profiles || []).map((p: any) => {
      const authInfo = authMap.get(p.id);
      const area = p.phm_areas;
      return {
        id: p.id,
        fullName: p.full_name,
        email: authInfo?.email || '',
        phone: p.phone || '',
        employeeId: p.employee_id || '',
        role: p.role,
        phmAreaId: p.phm_area_id,
        phmAreaCode: area?.phm_area_code || null,
        phmAreaName: area?.phm_area_name || null,
        mohDivision: p.moh_division || area?.moh_division || caller.mohDivision,
        preferredLang: p.preferred_lang || 'si',
        isActive: p.is_active !== false,
        deactivatedAt: p.deactivated_at,
        lastSignInAt: authInfo?.last_sign_in_at || null,
        createdAt: p.created_at,
      };
    });

    // 4. Fetch recent audit logs for the division
    const { data: auditLogs } = await admin
      .from('user_audit_logs')
      .select('*')
      .eq('moh_division', caller.mohDivision)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      success: true,
      data: staffList,
      auditLogs: auditLogs || [],
      isDemo: false,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/admin/users — Create new staff member (MOH only)
export async function POST(req: NextRequest) {
  try {
    let caller;
    try {
      caller = await requireMohSession();
    } catch (responseErr) {
      if (responseErr instanceof Response) return responseErr;
      throw responseErr;
    }

    const body = await req.json();
    const {
      fullName,
      email,
      phone,
      employeeId,
      role,
      phmAreaId,
      preferredLang = 'si',
      tempPassword,
      sendInvite = false,
    } = body;

    // Validation
    if (!fullName || !email || !role) {
      return NextResponse.json(
        { success: false, message: 'Full name, email, and role are required.' },
        { status: 400 }
      );
    }

    if (role === 'PHM' && !phmAreaId) {
      return NextResponse.json(
        { success: false, message: 'Assigned PHM Area is required for Field Midwife (PHM) staff.' },
        { status: 400 }
      );
    }

    if (!isAdminConfigured()) {
      // In-Memory Demo Mode Creation
      const newStaffId = `usr_staff_${Date.now()}`;
      const newStaffItem: StaffMember = {
        id: newStaffId,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || '',
        employeeId: employeeId?.trim() || `EMP-${Date.now().toString().slice(-4)}`,
        role,
        phmAreaId: phmAreaId || null,
        phmAreaCode: phmAreaId ? 'PHM-XX' : null,
        phmAreaName: phmAreaId ? 'Assigned Area' : null,
        mohDivision: caller.mohDivision,
        preferredLang,
        isActive: true,
        deactivatedAt: null,
        lastSignInAt: null,
        createdAt: new Date().toISOString(),
      };

      const auditItem: UserAuditLogItem = {
        id: `aud_${Date.now()}`,
        mohDivision: caller.mohDivision,
        actorId: caller.userId,
        actorName: caller.fullName,
        targetUserId: newStaffId,
        targetUserName: fullName.trim(),
        action: 'CREATE_USER',
        changes: {
          role,
          email: email.trim().toLowerCase(),
          employeeId: newStaffItem.employeeId,
          phmAreaId,
        },
        createdAt: new Date().toISOString(),
      };

      MOCK_STAFF.unshift(newStaffItem);
      MOCK_AUDIT_LOGS.unshift(auditItem);

      return NextResponse.json({
        success: true,
        message: `Staff member ${fullName} registered successfully (Offline Demo Mode).`,
        data: newStaffItem,
      });
    }

    const admin = getAdminClient();

    // Verify phmAreaId belongs to caller's mohDivision if provided
    if (phmAreaId) {
      const { data: area } = await admin
        .from('phm_areas')
        .select('moh_division')
        .eq('id', phmAreaId)
        .single();

      if (area && area.moh_division !== caller.mohDivision) {
        return NextResponse.json(
          { success: false, message: 'Assigned PHM Area does not belong to your MOH division.' },
          { status: 403 }
        );
      }
    }

    // 1. Create Auth User
    let authUserId: string;
    if (sendInvite) {
      const { data: invData, error: invError } = await admin.auth.admin.inviteUserByEmail(
        email.trim().toLowerCase(),
        { data: { full_name: fullName.trim() } }
      );
      if (invError || !invData.user) {
        return NextResponse.json({ success: false, message: invError?.message || 'Failed to send invite email' }, { status: 400 });
      }
      authUserId = invData.user.id;
    } else {
      const finalPassword = tempPassword || 'SuwaPHM@2026';
      const { data: usrData, error: usrError } = await admin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: finalPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName.trim() },
      });
      if (usrError || !usrData.user) {
        return NextResponse.json({ success: false, message: usrError?.message || 'Failed to create auth user' }, { status: 400 });
      }
      authUserId = usrData.user.id;
    }

    // 2. Upsert Profile
    const { error: profError } = await admin.from('profiles').upsert({
      id: authUserId,
      full_name: fullName.trim(),
      phone: phone?.trim() || null,
      employee_id: employeeId?.trim() || null,
      role,
      phm_area_id: phmAreaId || null,
      moh_division: caller.mohDivision,
      preferred_lang: preferredLang,
      is_active: true,
      deactivated_at: null,
    });

    if (profError) {
      // Rollback Auth user if profile insert failed
      await admin.auth.admin.deleteUser(authUserId);
      return NextResponse.json(
        { success: false, message: `Profile creation failed: ${profError.message}` },
        { status: 500 }
      );
    }

    // 3. Log Audit Record
    await admin.from('user_audit_logs').insert({
      moh_division: caller.mohDivision,
      actor_id: caller.userId,
      target_user_id: authUserId,
      action: 'CREATE_USER',
      changes_json: {
        role,
        email: email.trim().toLowerCase(),
        employeeId: employeeId?.trim() || null,
        phmAreaId: phmAreaId || null,
        preferredLang,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Staff member ${fullName} created successfully.`,
      userId: authUserId,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
