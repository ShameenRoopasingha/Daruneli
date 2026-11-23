import { NextRequest, NextResponse } from 'next/server';
import { verifyMotherSessionToken } from '@/lib/motherAuthUtils';
import { findDemoMother, getDemoMotherPortalData } from '@/lib/demoMothers';
import { getAdminClient, isAdminConfigured } from '@/lib/supabaseAdmin';
import { FetalKickLogSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// GET /api/mother-portal/kicks — Retrieve maternal kick logs
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
      return NextResponse.json(
        { success: false, message: 'Session expired or invalid. Please sign in again.' },
        { status: 401 }
      );
    }

    // Demo Mode or Offline
    if (session.is_demo || !isAdminConfigured()) {
      const data = getDemoMotherPortalData(session.mother_id || session.nic);
      return NextResponse.json({
        success: true,
        data: data.kickLogs || [],
      });
    }

    // Supabase Mode
    const admin = getAdminClient();
    const { data: pregnancies } = await admin
      .from('pregnancies')
      .select('id')
      .eq('mother_id', session.mother_id)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1);

    const activePreg = pregnancies && pregnancies.length > 0 ? pregnancies[0] : null;
    if (!activePreg) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const { data: kData, error: kErr } = await admin
      .from('fetal_kick_logs')
      .select('*')
      .eq('pregnancy_id', activePreg.id)
      .order('log_date', { ascending: false })
      .limit(30);

    if (kErr) {
      return NextResponse.json(
        { success: false, message: kErr.message },
        { status: 500 }
      );
    }

    const kickLogs = (kData || []).map((k: any) => ({
      id: k.id,
      pregnancyId: k.pregnancy_id,
      logDate: k.log_date,
      startTime: k.start_time,
      tenthKickTime: k.tenth_kick_time,
      kickCount: k.kick_count,
      durationMinutes: k.duration_minutes,
      reducedMovementFlag: k.reduced_movement_flag,
      source: k.source || 'MOTHER_PORTAL',
    }));

    return NextResponse.json({
      success: true,
      data: kickLogs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Server error loading kick logs.' },
      { status: 500 }
    );
  }
}

// POST /api/mother-portal/kicks — Validate and save a daily Cardiff kick log
export async function POST(req: NextRequest) {
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
      return NextResponse.json(
        { success: false, message: 'Session expired or invalid. Please sign in again.' },
        { status: 401 }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const parseResult = FetalKickLogSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          message: issue?.message || 'Invalid fetal kick log payload parameters.',
        },
        { status: 400 }
      );
    }

    const {
      pregnancyId,
      logDate,
      startTime,
      tenthKickTime,
      kickCount,
      durationMinutes,
      reducedMovementFlag,
    } = parseResult.data;

    // Demo Mode
    if (session.is_demo || !isAdminConfigured()) {
      const demoMother = findDemoMother(session.mother_id || session.nic);
      const newEntry = {
        id: `kick_${Date.now()}`,
        logDate,
        startTime,
        tenthKickTime: tenthKickTime || '',
        kickCount,
        durationMinutes: durationMinutes ?? 0,
        reducedMovementFlag: reducedMovementFlag ?? false,
        source: 'MOTHER_PORTAL' as const,
      };

      if (demoMother) {
        if (!demoMother.kickLogs) {
          demoMother.kickLogs = [];
        }
        demoMother.kickLogs = [
          newEntry,
          ...demoMother.kickLogs.filter((item) => item.logDate !== logDate),
        ];
      }

      return NextResponse.json({
        success: true,
        message: 'Kick log recorded successfully (Demo Mode).',
        data: newEntry,
      });
    }

    // Supabase Mode
    const admin = getAdminClient();
    let targetPregId = pregnancyId;

    if (!targetPregId) {
      const { data: pregnancies } = await admin
        .from('pregnancies')
        .select('id')
        .eq('mother_id', session.mother_id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1);

      if (pregnancies && pregnancies.length > 0) {
        targetPregId = pregnancies[0].id;
      }
    }

    if (!targetPregId) {
      return NextResponse.json(
        { success: false, message: 'No active pregnancy record found for this mother.' },
        { status: 400 }
      );
    }

    const { data: inserted, error: insErr } = await admin
      .from('fetal_kick_logs')
      .insert({
        pregnancy_id: targetPregId,
        log_date: logDate,
        start_time: startTime,
        tenth_kick_time: tenthKickTime || null,
        kick_count: kickCount,
        duration_minutes: durationMinutes ?? null,
        reduced_movement_flag: reducedMovementFlag ?? false,
        source: 'MOTHER_PORTAL',
      })
      .select('*')
      .single();

    if (insErr || !inserted) {
      return NextResponse.json(
        { success: false, message: insErr?.message || 'Failed to persist fetal kick log.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Fetal kick log recorded successfully.',
      data: inserted,
    });
  } catch (err: any) {
    console.error('Kick log API error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Server error recording kick log.' },
      { status: 500 }
    );
  }
}
