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
