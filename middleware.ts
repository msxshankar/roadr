import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'roadr_session';

export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/api/admin/')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = '/';
  redirectUrl.searchParams.set('auth', 'required');
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
