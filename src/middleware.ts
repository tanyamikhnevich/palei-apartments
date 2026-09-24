import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { accessCookieName } from '@/lib/auth/cookies';
import { PANEL_HEADER, panelForRequest } from '@/lib/auth/panel';
import { readAccessToken } from '@/lib/auth/tokens';
import { requiresAdminAuth, roleMayReach } from '@/lib/auth/policy';
import { panelRoleFor, ROLE_HOME, ROLE_LOGIN } from '@/lib/auth/roles';
import {
  DEFAULT_LOCALE,
  LOCALE_CHOICE_COOKIE,
  LOCALE_HEADER,
  localeForHost,
  localePath,
  PATHNAME_HEADER,
  splitLocale,
} from '@/i18n/routing';
import { isLocale, type Locale } from '@/i18n/types';
import { isScratchHost, isUnder, MAIN_SITE_URL, sectionForHost, sectionForPath } from '@/lib/sites';

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

/** Query parameter that carries the visitor's language from one of our domains to another. */
const LANG_PARAM = 'lang';

/**
 * The same address on another of our domains, in the language being read.
 *
 * A prefixed path carries its language already. An unprefixed one means
 * English — or the domain's own language — and the next domain may open in a
 * different one: an English reader on paleiapartments.co.il following the
 * flowers link would land on paleiflowers.co.il in Hebrew. So the language
 * goes along as `?lang=`, for the other side to turn into its own cookie.
 */
function handOver(request: NextRequest, origin: string, reading: Locale): NextResponse {
  const { pathname, search } = request.nextUrl;
  const url = new URL(`${pathname}${search}`, origin);
  const prefixed = splitLocale(pathname).pathname !== pathname;
  if (!prefixed && reading !== localeForHost(url.host)) url.searchParams.set(LANG_PARAM, reading);
  return NextResponse.redirect(url, 307);
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

    /*
      Decided once here and handed on, so the handler reads the same panel's
      cookie the gate did. Whatever the browser sent is overwritten.
    */
    const panel = panelForRequest(bare, request.headers.get(PANEL_HEADER));
    const forwarded = new Headers(request.headers);
    forwarded.set(PANEL_HEADER, panel);
    const pass = () => NextResponse.next({ request: { headers: forwarded } });

    if (requiresAdminAuth(bare, request.method, searchParams)) {
      const token = await readAccessToken(request.cookies.get(accessCookieName(panel))?.value);
      const claims = token && token.rol === panel ? token : null;

      if (claims) {
        if (roleMayReach(claims.rol, bare, request.method)) {
          return markPrivate(pass());
        }

        /*
          Signed in, but not for this. Answering 404 would be tidier against a
          stranger mapping the panel; the honest 403 is what the API needs in
          order to say anything useful.
        */
        if (bare.startsWith('/api/')) {
          return markPrivate(
            NextResponse.json({ error: 'Not allowed for this account' }, { status: 403 })
          );
        }

        /*
          A page in the other panel asks for the other account. The owner and
          the florist sign in separately, so the answer is that panel's own
          sign-in screen — not a quiet walk back home, which read as though
          the door simply did not exist.
        */
        const pagePanel = panelRoleFor(bare);
        const login = request.nextUrl.clone();
        login.pathname = ROLE_LOGIN[pagePanel];
        login.search = '';
        if (bare !== ROLE_HOME[pagePanel]) login.searchParams.set('next', `${bare}${search}`);
        return markPrivate(NextResponse.redirect(login));
      }

      // The client answers this by spending its refresh token and retrying.
      if (bare.startsWith('/api/')) {
        return markPrivate(
          NextResponse.json({ error: 'Unauthorized', code: 'session_expired' }, { status: 401 })
        );
      }

      /* Knock on the shop's door and the shop's sign-in answers. */
      const pagePanel = panelRoleFor(bare);
      const home = ROLE_HOME[pagePanel];

      const login = request.nextUrl.clone();
      login.pathname = ROLE_LOGIN[pagePanel];
      login.search = '';
      // Come back to whatever was being opened once signed in.
      if (bare !== home) login.searchParams.set('next', `${bare}${search}`);
      return markPrivate(NextResponse.redirect(login));
    }

    // Public API, static file, or the login screen — which stays out of the index.
    if (bare.startsWith('/admin')) return markPrivate(pass());
    return pass();
  }

  // `/en/...` is a second address for a page that already lives at `/...`.
  // One canonical address per page, so send it home for good.
  const [, first] = pathname.split('/');
  if (first === DEFAULT_LOCALE) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(`/${DEFAULT_LOCALE}`.length) || '/';
    return NextResponse.redirect(url, 308);
  }

  const host = request.headers.get('host');
  const hostLocale = localeForHost(host);
  const chose = request.cookies.get(LOCALE_CHOICE_COOKIE);

  /*
    Arriving from another of our domains with the language to keep. The cookie
    is set as though the visitor had picked it by hand — which, on the domain
    they came from, they had — and the address is cleaned of the parameter.
  */
  const carried = searchParams.get(LANG_PARAM);
  if (carried !== null) {
    const url = request.nextUrl.clone();
    url.searchParams.delete(LANG_PARAM);
    if (!isLocale(carried)) return NextResponse.redirect(url, 307);

    url.pathname = localePath(bare, carried);
    const response = NextResponse.redirect(url, 307);
    response.cookies.set(LOCALE_CHOICE_COOKIE, carried, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return response;
  }

  /** The language this request would be answered in, prefix or not. */
  const reading: Locale = prefixed || chose ? locale : hostLocale;

  /*
    A section with a domain of its own (flowers on paleiflowers.co.il) is only
    that section there: its front page is the section's, and any other page is
    sent to the main site. Everywhere else the section's paths are sent to its
    domain — except in development and preview builds, where the section has to
    stay reachable to be tried out before it ships.

    Temporary redirects, for the same reason as the language one below: where
    they lead depends on the visitor's cookie, and a cached 308 would not ask.
  */
  const ownSection = sectionForHost(host);
  if (ownSection && !isUnder(bare, ownSection.prefix)) {
    if (bare === '/') {
      const url = request.nextUrl.clone();
      url.pathname = localePath(ownSection.prefix, reading);
      return NextResponse.redirect(url, 307);
    }
    return handOver(request, MAIN_SITE_URL, reading);
  }

  const elsewhere = ownSection ? undefined : sectionForPath(bare);
  if (elsewhere && !isScratchHost(host)) return handOver(request, elsewhere.origin, reading);

  /*
    The domain is the front door: paleiapartments.co.il opens in Hebrew, .com
    in English. Only unprefixed addresses are sent on — `/ru/about` was asked
    for in Russian and stays Russian, whichever domain it came through.

    Temporary on purpose. A 308 would be cached by the browser for good, and
    the visitor who then switches to English would be bounced back to Hebrew
    by their own cache, with no request reaching us to say otherwise.
  */
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
