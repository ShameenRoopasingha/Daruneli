import { NextRequest, NextResponse } from 'next/server';

const SUPERVISOR_ROUTES = ['/escalations', '/reports', '/supervision', '/areas', '/users'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Bypass static assets, API routes, manifest, and images
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/images') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.webmanifest'
  ) {
    return NextResponse.next();
  }

  // Check demo mode setting or cookies
  const isDemo =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co';

  const motherSessionCookie = req.cookies.get('daruneli_mother_session')?.value;
  const supervisorSessionCookie = req.cookies.get('daruneli_supervisor_session')?.value;
  const userRoleCookie = req.cookies.get('daruneli_user_role')?.value;

  // 2. Role Isolation: If user is MOTHER, block from MOH/PHNS supervisor routes
  const isSupervisorRoute =
    pathname === '/' || SUPERVISOR_ROUTES.some((route) => pathname.startsWith(route));

  if (isSupervisorRoute) {
    if (userRoleCookie === 'MOTHER' || (motherSessionCookie && !supervisorSessionCookie)) {
      const url = req.nextUrl.clone();
      url.pathname = '/mother-portal';
      return NextResponse.redirect(url);
    }
  }

  // 3. Mother Portal Protected Routes
  if (pathname.startsWith('/mother-portal')) {
    const isPublicPortalRoute =
      pathname === '/mother-portal/join' ||
      pathname === '/mother-portal/login';

    if (!isPublicPortalRoute && !isDemo) {
      // In production mode with Supabase configured, ensure mother session exists
      const hasAuth =
        motherSessionCookie ||
        req.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));

      if (!hasAuth) {
        const url = req.nextUrl.clone();
        url.pathname = '/mother-portal/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
