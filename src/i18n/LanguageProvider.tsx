'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { t as translate } from './getMessage';
import { DEFAULT_LOCALE, localePath, splitLocale } from './routing';
import type { Locale } from './types';

/**
 * The chosen language, and how to change it.
 *
 * The language is a property of the address now, not of this browser: it
 * arrives from the server, already decided by the URL.
 *
 * Switching is a full document navigation, not a client-side one. The locale,
 * `<html lang>` and `dir="rtl"` all come from the root layout, and Next never
 * re-renders the root layout on a client-side navigation — it is shared by
 * every route and built once. A `router.push` therefore changed the address
 * and left the page in the old language. A real navigation re-renders
 * everything from the server, which is the only way `lang` and `dir` change
 * too.
 *
 * The choice is deliberately not remembered. Sending a returning visitor to
 * their last language would mean redirecting `/`, and a redirect there is read
 * by crawlers too — Google requests pages from the United States asking for
 * English, and would be bounced away from the English page it came for.
 * Whether returning visitors should land in their own language is a product
 * decision with that cost attached, not an oversight.
 */
type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string) => string;
  /**
   * An internal path in the current language. Every in-site link goes through
   * it, so following one never silently drops the reader back into English.
   */
  href: (path: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;

      // Read the address straight from the document rather than from
      // `usePathname`: the middleware rewrites `/ru/about` onto `/about`, and
      // this has to work off what is actually in the address bar.
      const { pathname: bare } = splitLocale(window.location.pathname);
      const { search, hash } = window.location;
      window.location.assign(`${localePath(bare, next)}${search}${hash}`);
    },
    [locale]
  );

  const t = useCallback((path: string) => translate(locale, path), [locale]);
  const href = useCallback((path: string) => localePath(path, locale), [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t, href }),
    [locale, setLocale, t, href]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside a LanguageProvider');
  return ctx;
}

export { DEFAULT_LOCALE };
