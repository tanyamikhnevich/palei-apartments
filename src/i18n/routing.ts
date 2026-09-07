import { LOCALES, isLocale, type Locale } from './types';

/**
 * How the four languages live in the URL.
 *
 * English keeps the bare paths it already has — `/apartments`, not
 * `/en/apartments` — because those are the addresses search engines have
 * indexed and guests have bookmarked. The other three take a prefix. This is
 * the "as needed" shape: no redirects for what already works, real addresses
 * for what previously had none.
 *
 * The prefix is stripped by the middleware, which rewrites `/ru/apartments`
 * onto the `/apartments` route and passes the language along in a header. That
 * is why no page file has to know which language it is rendering — only the
 * layout and the metadata do.
 */
export const DEFAULT_LOCALE: Locale = 'en';

/** The header the middleware speaks to the server components through. */
export const LOCALE_HEADER = 'x-palei-locale';

/** The path as it was requested, prefix and all — for canonical URLs. */
export const PATHNAME_HEADER = 'x-palei-pathname';

/**
 * Which language a domain is the front door for. The Israeli domain opens in
 * Hebrew; every other host keeps English, which is what `.com` already does.
 *
 * Both domains are served by one deployment, so the host is the only thing
 * that tells them apart.
 */
const DEFAULT_HOST_LOCALES: readonly { host: string; locale: Locale }[] = [
  { host: 'co.il', locale: 'he' },
];

/**
 * `LOCALE_HOSTS` overrides the table above: comma-separated `locale:host`
 * pairs, e.g. `he:paleiapartaments.co.il`. A host also covers its subdomains,
 * so one entry answers for both the apex and `www.`.
 *
 * Unset — which is the normal case — the built-in `.co.il` rule stands. That
 * fallback is the point: a variable missing or mistyped in one deployment
 * would otherwise silently serve the Israeli domain in English, and nothing
 * would look broken enough to notice.
 */
function hostLocaleTable(): readonly { host: string; locale: Locale }[] {
  const raw = process.env.LOCALE_HOSTS?.trim();
  if (!raw) return DEFAULT_HOST_LOCALES;

  const parsed = raw.split(',').flatMap((pair) => {
    const [locale = '', host = ''] = pair.split(':').map((part) => part.trim().toLowerCase());
    return isLocale(locale) && host ? [{ host, locale }] : [];
  });

  return parsed.length ? parsed : DEFAULT_HOST_LOCALES;
}

/**
 * Cookie set the moment a visitor picks a language by hand. Nothing reads it
 * to *choose* a language — the address still does that. It exists only to stop
 * the domain redirect below from overruling a choice the visitor just made,
 * which would otherwise make English unreachable on the Israeli domain.
 */
export const LOCALE_CHOICE_COOKIE = 'palei-lang';

/** The language `host` implies, ignoring any port. */
export function localeForHost(host: string | null | undefined): Locale {
  const name = (host ?? '').split(':')[0].toLowerCase();

  // Longest host first: a rule for one subdomain has to beat the domain's own.
  const match = [...hostLocaleTable()]
    .sort((a, b) => b.host.length - a.host.length)
    .find(({ host: h }) => name === h || name.endsWith(`.${h}`));

  return match?.locale ?? DEFAULT_LOCALE;
}

export const RTL_LOCALES: readonly Locale[] = ['he'];

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

/**
 * `/ru/apartments` → `{ locale: 'ru', pathname: '/apartments' }`
 * `/apartments`    → `{ locale: 'en', pathname: '/apartments' }`
 */
export function splitLocale(pathname: string): { locale: Locale; pathname: string } {
  const [, first = '', ...rest] = pathname.split('/');

  if (isLocale(first) && first !== DEFAULT_LOCALE) {
    return { locale: first, pathname: `/${rest.join('/')}` || '/' };
  }
  return { locale: DEFAULT_LOCALE, pathname };
}

/**
 * The address of `path` in `locale`. `path` is always the unprefixed form, so
 * a component can link to `/apartments` and let this decide the rest.
 */
export function localePath(path: string, locale: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
}

/** Every language's address for one page — what `hreflang` is built from. */
export function localeAlternates(path: string): Record<Locale, string> {
  return Object.fromEntries(LOCALES.map((l) => [l, localePath(path, l)])) as Record<
    Locale,
    string
  >;
}
