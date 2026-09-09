import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ACCESS_COOKIE } from '@/lib/auth/cookies';
import { readAccessToken } from '@/lib/auth/tokens';
import { requiresAdminAuth, roleMayReach } from '@/lib/auth/policy';
import { ROLE_HOME } from '@/lib/auth/roles';
import {
  DEFAULT_LOCALE,
  LOCALE_CHOICE_COOKIE,
  LOCALE_HEADER,
  localeForHost,
  localePath,
  PATHNAME_HEADER,
  splitLocale,
} from '@/i18n/routing';

/** The panel and its API must never end up in a search index or a shared cache. */
function markPrivate(response: NextResponse): NextResponse {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'no-store, private');
  return response;
}

/**
 * Paths that are not translatable pages: the panel, the API, Next's own
 * assets, and anything with a file extension.
 */
function isInternal(pathname: string): boolean {
  return (
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

/**
 * Two jobs: put the page in the right language, and keep the panel shut.
 *
 * The order matters and is the point of this comment. The language prefix is
 * stripped FIRST, and every later decision — including the authorisation one —
 * is made on the bare path. Checking authorisation against the raw path let
 * `/ru/admin` through: the policy saw a path that did not begin with `/admin`,
 * waved it past, and the rewrite then rendered the panel to anyone who asked.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const { locale, pathname: bare } = splitLocale(pathname);
  const prefixed = bare !== pathname;

  // The panel and the API have one address each, in no language.
  if (isInternal(bare)) {
    if (prefixed) {
      const url = request.nextUrl.clone();
      url.pathname = bare;
      return NextResponse.redirect(url, 308);
    }

    if (requiresAdminAuth(bare, request.method, searchParams)) {
      const claims = await readAccessToken(request.cookies.get(ACCESS_COOKIE)?.value);

      if (claims) {
        if (roleMayReach(claims.rol, bare, request.method)) {
          return markPrivate(NextResponse.next());
        }

        /*
          Signed in, but not for this. Answering 404 would be tidier against a
          stranger mapping the panel; it is the wrong answer to a florist who
          followed a stale bookmark, and the honest 403 is what the API needs
          in order to say anything useful. A page request is simply walked back
          to the part of the panel that is theirs.
        */
        if (bare.startsWith('/api/')) {
          return markPrivate(
            NextResponse.json({ error: 'Not allowed for this account' }, { status: 403 })
          );
        }

        const home = request.nextUrl.clone();
        home.pathname = ROLE_HOME[claims.rol];
        home.search = '';
        return markPrivate(NextResponse.redirect(home));
      }

      // The client answers this by spending its refresh token and retrying.
      if (bare.startsWith('/api/')) {
        return markPrivate(
          NextResponse.json({ error: 'Unauthorized', code: 'session_expired' }, { status: 401 })
        );
      }

      /* Knock on the shop's door and the shop's sign-in answers. */
      const shop = bare === '/admin/flowers' || bare.startsWith('/admin/flowers/');
      const home = shop ? '/admin/flowers' : '/admin';

      const login = request.nextUrl.clone();
      login.pathname = shop ? '/admin/flowers/login' : '/admin/login';
      login.search = '';
      // Come back to whatever was being opened once signed in.
      if (bare !== home) login.searchParams.set('next', `${bare}${search}`);
      return markPrivate(NextResponse.redirect(login));
    }

    // Public API, static file, or the login screen — which stays out of the index.
    if (bare.startsWith('/admin')) return markPrivate(NextResponse.next());
    return NextResponse.next();
  }

  // `/en/...` is a second address for a page that already lives at `/...`.
  // One canonical address per page, so send it home for good.
  const [, first] = pathname.split('/');
  if (first === DEFAULT_LOCALE) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(`/${DEFAULT_LOCALE}`.length) || '/';
    return NextResponse.redirect(url, 308);
  }

  /*
    The domain is the front door: paleiapartments.co.il opens in Hebrew, .com
    in English. Only unprefixed addresses are sent on — `/ru/about` was asked
    for in Russian and stays Russian, whichever domain it came through.

    Temporary on purpose. A 308 would be cached by the browser for good, and
    the visitor who then switches to English would be bounced back to Hebrew
    by their own cache, with no request reaching us to say otherwise.
  */
  const hostLocale = localeForHost(request.headers.get('host'));
  const chose = request.cookies.get(LOCALE_CHOICE_COOKIE);

  if (!prefixed && hostLocale !== DEFAULT_LOCALE && !chose) {
    const url = request.nextUrl.clone();
    url.pathname = localePath(bare, hostLocale);
    return NextResponse.redirect(url, 307);
  }

  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  headers.set(PATHNAME_HEADER, bare);

  if (locale === DEFAULT_LOCALE) {
    return NextResponse.next({ request: { headers } });
  }

  const url = request.nextUrl.clone();
  url.pathname = bare;
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  // Everything except Next's own assets — the language rewrite has to see
  // ordinary page requests, which an admin-only matcher never did.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
