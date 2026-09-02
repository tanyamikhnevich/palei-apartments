import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ACCESS_COOKIE } from '@/lib/auth/cookies';
import { readAccessToken } from '@/lib/auth/tokens';
import { requiresAdminAuth } from '@/lib/auth/policy';

/** The panel and its API must never end up in a search index or a shared cache. */
function markPrivate(response: NextResponse): NextResponse {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'no-store, private');
  return response;
}

/**
 * The gate. It checks the access token and nothing else — one HMAC, no database
 * round trip — so guarding every request stays cheap. Renewing an expired token
 * is the refresh endpoint's job, not the middleware's.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  if (!requiresAdminAuth(pathname, request.method, searchParams)) {
    // The login screen is public but still must not be indexed.
    if (pathname.startsWith('/admin')) return markPrivate(NextResponse.next());
    return NextResponse.next();
  }

  if (await readAccessToken(request.cookies.get(ACCESS_COOKIE)?.value)) {
    return markPrivate(NextResponse.next());
  }

  // The client answers this by spending its refresh token and retrying once.
  if (pathname.startsWith('/api/')) {
    return markPrivate(
      NextResponse.json({ error: 'Unauthorized', code: 'session_expired' }, { status: 401 })
    );
  }

  const login = request.nextUrl.clone();
  login.pathname = '/admin/login';
  login.search = '';
  // Come back to whatever was being opened once signed in.
  if (pathname !== '/admin') login.searchParams.set('next', `${pathname}${search}`);
  return markPrivate(NextResponse.redirect(login));
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
