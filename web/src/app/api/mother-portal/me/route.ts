import { NextRequest, NextResponse } from 'next/server';
import { verifyMotherSessionToken } from '@/lib/motherAuthUtils';
import { getDemoMotherPortalData } from '@/lib/demoMothers';
import { getAdminClient, isAdminConfigured } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('daruneli_mother_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, message: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const session = verifyMotherSessionToken(sessionCookie);

    if (!session) {
      // Invalid or tampered or expired session
      const res = NextResponse.json(
        { success: false, message: 'Session expired or invalid. Please sign in again.' },
        { status: 401 }
      );
      // Clean invalid cookie
      res.cookies.delete('daruneli_mother_session');
      return res;
    }

    // 1. Demo Mode or Offline
    if (session.is_demo || !isAdminConfigured()) {
      const data = getDemoMotherPortalData(session.mother_id || session.nic);
      return NextResponse.json({
        success: true,
        data,
        session: {
          mother_id: session.mother_id,
          mother_name: session.mother_name,
          nic: session.nic,
          is_demo: true,
        },
      });
    }

    // 2. Supabase Production Mode
    const admin = getAdminClient();

    // Fetch mother record
    const { data: mother, error: mErr } = await admin
      .from('mothers')
      .select('*, phm_areas(phm_area_name, moh_division)')
      .eq('id', session.mother_id)
      .single();

    if (mErr || !mother) {
      return NextResponse.json(
        { success: false, message: 'Mother profile could not be retrieved.' },
        { status: 404 }
      );
    }

    // Fetch active pregnancy
    const { data: pregnancies } = await admin
      .from('pregnancies')
      .select('*')
      .eq('mother_id', mother.id)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1);

    const activePreg = pregnancies && pregnancies.length > 0 ? pregnancies[0] : null;

    // Fetch children
    const { data: children } = await admin
      .from('children')
      .select('*, child_growth_records(*), child_immunizations(*)')
      .eq('mother_id', mother.id)
      .order('created_at', { ascending: true });

    // Fetch recent kick logs
    let kickLogs: any[] = [];
    if (activePreg) {
      const { data: kData } = await admin
        .from('fetal_kick_logs')
        .select('*')
        .eq('pregnancy_id', activePreg.id)
        .order('log_date', { ascending: false })
        .limit(10);
      if (kData) kickLogs = kData;
    }

    // Assemble payload
    const phmArea = (mother as any).phm_areas;
    const portalData = {
      mother: {
        id: mother.id,
        qrToken: mother.qr_token || `MOTH-${mother.nic}`,
        fullName: mother.full_name,
        nic: mother.nic,
        phone: mother.phone,
        dob: mother.dob,
        bloodGroup: mother.blood_group || 'O+',
        phmAreaName: phmArea?.phm_area_name || 'Area Care',
        mohDivision: phmArea?.moh_division || 'MOH Division',
      },
      phmContact: {
        name: 'Area Public Health Midwife',
        phone: '0714567890',
        areaName: phmArea?.phm_area_name || 'PHM Division',
        mohDivision: phmArea?.moh_division || 'MOH Office',
      },
      pregnancy: {
        id: activePreg?.id || 'none',
        pogWeeks: 32,
        pogDays: 3,
        trimester: 3,
        edd: activePreg?.edd_date || '18/01/2027',
        lrmp: activePreg?.lrmp_date || '13/04/2026',
        riskTier: activePreg?.risk_level || 'GREEN',
        milestone: 'Clinical antenatal care managed by Family Health Bureau standards.',
      },
      latestVitals: {
        visitDate: '20/11/2026',
        bp: '120/80',
        weightKg: 64.0,
        sfhCm: 31.0,
        hb: 11.5,
      },
      upcomingSchedule: {
        nextVisitDate: '26/11/2026',
        nextVisitType: 'HOME_VISIT',
        daysRemaining: 2,
      },
      kickLogs: kickLogs.map((k) => ({
        id: k.id,
        logDate: k.log_date,
        startTime: k.start_time,
        tenthKickTime: k.tenth_kick_time,
        kickCount: k.kick_count,
        durationMinutes: k.duration_minutes,
        reducedMovementFlag: k.reduced_movement_flag,
        source: k.source,
      })),
      children: (children || []).map((c: any) => ({
        id: c.id,
        fullName: c.full_name,
        chdrNumber: c.chdr_number,
        dob: c.dob,
        gender: c.gender,
        birthWeightKg: c.birth_weight_kg,
        bloodGroup: c.blood_group,
        growthRecords: (c.child_growth_records || []).map((g: any) => ({
          monthAge: g.month_age,
          weightKg: g.weight_kg,
          recordedDate: g.recorded_date,
        })),
        immunizations: (c.child_immunizations || []).map((im: any) => ({
          id: im.id,
          vaccineCode: im.vaccine_code,
          vaccineName: im.vaccine_name,
          targetAgeMonths: im.target_age_months,
          status: im.status,
          dateAdministered: im.date_administered,
          dueDate: im.due_date,
        })),
      })),
    };

    return NextResponse.json({
      success: true,
      data: portalData,
      session: {
        mother_id: session.mother_id,
        mother_name: session.mother_name,
        nic: session.nic,
        is_demo: false,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/mother-portal/me:', err);
    return NextResponse.json(
      { success: false, message: 'Server error retrieving maternal profile.' },
      { status: 500 }
    );
  }
}
