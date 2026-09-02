import { headers } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_HEADER, PATHNAME_HEADER } from './routing';
import { isLocale, type Locale } from './types';

/**
 * The language and the path of the page being rendered, as the middleware
 * decided them.
 *
 * Server components cannot read the URL directly, and the language is not in
 * the route segment — it is stripped before the route is matched, which is what
 * keeps one set of page files serving all four languages. The middleware puts
 * both back into headers for exactly this.
 */
export function currentLocale(): Locale {
  const value = headers().get(LOCALE_HEADER);
  return value && isLocale(value) ? value : DEFAULT_LOCALE;
}

/** The unprefixed path, e.g. `/apartments` for `/ru/apartments`. */
export function currentPath(): string {
  return headers().get(PATHNAME_HEADER) ?? '/';
}
