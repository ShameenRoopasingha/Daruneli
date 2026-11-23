import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({
    success: true,
    message: 'Signed out of Daruneli Mother Portal.',
  });

  // Expire session and role cookies immediately
  res.cookies.set('daruneli_mother_session', '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
  });

  res.cookies.set('daruneli_user_role', '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  });

  return res;
}
