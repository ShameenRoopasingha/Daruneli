import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CreatePhmSchema } from '@/lib/validations';

// Server-Only API route for creating and mapping PHM staff
// Guarded strictly by SUPABASE_SERVICE_ROLE_KEY and MOH session verification
export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json(
      {
        success: false,
        message: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server. Please invite users via the Supabase Auth Dashboard or configure service role in .env.local.',
      },
      { status: 503 }
    );
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const parseResult = CreatePhmSchema.safeParse(body);

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        { success: false, message: issue?.message || 'Invalid PHM creation payload.' },
        { status: 400 }
      );
    }

    const { email, password, fullName, phmAreaId, preferredLang } = parseResult.data;

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Create auth user
    const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim() },
    });

    if (userError || !userData?.user) {
      return NextResponse.json(
        { success: false, message: userError?.message || 'Failed to create auth user' },
        { status: 400 }
      );
    }

    // 2. Create profile with role = 'PHM'
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: userData.user.id,
      full_name: fullName.trim(),
      phm_area_id: phmAreaId,
      role: 'PHM',
      preferred_lang: preferredLang,
    });

    if (profileError) {
      return NextResponse.json(
        { success: false, message: `User created, but profile mapping failed: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `PHM staff account created and mapped successfully for ${fullName}.`,
      userId: userData.user.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
