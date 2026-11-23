import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from './supabase/server';

export function isAdminConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    url &&
    key &&
    url !== 'https://your-project.supabase.co' &&
    key !== 'your-service-role-key'
  );
}

export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase admin service role key or URL is not configured.');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface CallerContext {
  userId: string;
  email: string;
  fullName: string;
  role: 'MOH' | 'PHNS';
  mohDivision: string;
}

export async function requireSupervisorSession(): Promise<CallerContext> {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    // When Supabase credentials are missing, running in demo mode
    return {
      userId: 'usr_moh_001',
      email: 'moh.walasmulla@health.gov.lk',
      fullName: 'Dr. Anuradha Jayawardena',
      role: 'MOH',
      mohDivision: 'Walasmulla MOH Division',
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Response(JSON.stringify({ success: false, message: 'Unauthorized: Valid supervisor session required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role, moh_division, is_active, phm_areas(moh_division)')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Response(JSON.stringify({ success: false, message: 'Forbidden: Profile record not found.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (profile.is_active === false) {
    throw new Response(
      JSON.stringify({ success: false, message: 'Account deactivated: Contact the Ministry of Health administration.' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (profile.role !== 'MOH' && profile.role !== 'PHNS') {
    throw new Response(
      JSON.stringify({ success: false, message: 'Forbidden: Restricted to MOH and PHNS supervisory roles.' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const areaInfo = (profile as any).phm_areas;
  const division = profile.moh_division || areaInfo?.moh_division || 'Walasmulla MOH Division';

  return {
    userId: user.id,
    email: user.email || '',
    fullName: profile.full_name,
    role: profile.role as 'MOH' | 'PHNS',
    mohDivision: division,
  };
}

export async function requireMohSession(): Promise<CallerContext> {
  const caller = await requireSupervisorSession();
  if (caller.role !== 'MOH') {
    throw new Response(
      JSON.stringify({
        success: false,
        message: 'Forbidden: User creation, editing, and deactivation require Medical Officer of Health (MOH) privileges.',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
  return caller;
}
