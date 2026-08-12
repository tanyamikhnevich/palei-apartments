import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, requiresAdminAuth, verifyAdminToken } from '@/lib/auth/adminAuth';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!requiresAdminAuth(pathname, request.method)) {
    return NextResponse.next();
  }

  if (await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const login = request.nextUrl.clone();
  login.pathname = '/admin/login';
  login.search = '';
  // Come back to whatever was being opened once signed in.
  if (pathname !== '/admin') login.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
