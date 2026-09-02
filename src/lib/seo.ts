import type { Metadata } from 'next';
import { localeAlternates, localePath } from '@/i18n/routing';
import { LOCALES, type Locale } from '@/i18n/types';
import { currentLocale } from '@/i18n/server';
import { t as translate } from '@/i18n/getMessage';

/**
 * Everything a search engine or a chat app needs to know about a page.
 *
 * One helper rather than metadata hand-written per route: a canonical URL that
 * is missing on three pages out of ten is worse than none at all, because the
 * three become duplicates of whatever else matches.
 */

/**
 * The site's own address.
 *
 * Canonical URLs, the sitemap and preview images must all be absolute and must
 * all agree, so this is the one place the domain is decided. Set
 * `NEXT_PUBLIC_SITE_URL` in the deployment; Vercel's production domain is the
 * fallback, and localhost keeps development honest rather than silently
 * publishing `http://localhost:3000` into a sitemap.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  // Not VERCEL_URL: that one changes with every deployment, and a canonical
  // pointing at a preview build teaches Google the wrong address.
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production.replace(/\/+$/, '')}`;

  return 'http://localhost:3000';
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = 'Palei Apartments';

/** The default preview card image — 1200×630, the size every chat app crops to. */
export const DEFAULT_OG_IMAGE = '/og-default.png';

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

type PageMetaInput = {
  title: string;
  description: string;
  /** Route path, e.g. `/apartments`. Becomes the canonical URL. */
  path: string;
  /** Absolute or site-relative; falls back to the shared preview image. */
  image?: string;
  /** A listing page is an article to nobody; only detail pages say otherwise. */
  type?: 'website' | 'article';
  /** Set for pages that exist but should not be indexed. */
  noIndex?: boolean;
  /** The language this page is being rendered in. */
  locale?: Locale;
};

/** Collapse the whitespace a hand-typed field tends to carry. */
function tidy(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * `hreflang` for one page: every language's address for it, plus `x-default`
 * for a reader whose language we do not publish. Google needs all of them on
 * all of them — a page that lists its siblings without being listed back is
 * ignored, which is why this is built from one shared function.
 */
function languageAlternates(path: string): Record<string, string> {
  const alternates = localeAlternates(path);
  const out: Record<string, string> = {};
  for (const locale of LOCALES) out[locale] = absoluteUrl(alternates[locale]);
  out['x-default'] = absoluteUrl(alternates.en);
  return out;
}

export function pageMetadata(input: PageMetaInput): Metadata {
  const { path, image, type = 'website', noIndex = false, locale = 'en' } = input;
  const title = tidy(input.title);
  const description = tidy(input.description);
  // Canonical is this language's own address, not the English one: each
  // translation is a page in its own right, tied to the others by hreflang.
  const url = absoluteUrl(localePath(path, locale));
  const custom = Boolean(image);
  const preview = absoluteUrl(image ?? DEFAULT_OG_IMAGE);

  // Dimensions are only declared for the shared card, whose size we control.
  // Stating 1200×630 for an uploaded photo that is nothing of the kind makes
  // the preview render wrong in exactly the apps that trust the numbers.
  const previewImage = custom
    ? { url: preview, alt: title }
    : { url: preview, width: 1200, height: 630, alt: title };

  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type,
      url,
      siteName: SITE_NAME,
      title,
      description,
      images: [previewImage],
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [preview],
    },
  };
}

/**
 * Metadata for a page whose copy lives in the dictionaries.
 *
 * Reads the language the middleware settled on, so one call gives the page its
 * title and description in that language, its own canonical address, and the
 * `hreflang` set tying all four together.
 */
export function localizedPageMetadata(key: string, path: string): Metadata {
  const locale = currentLocale();
  return pageMetadata({
    title: translate(locale, `seo.${key}.title`),
    description: translate(locale, `seo.${key}.description`),
    path,
    locale,
  });
}
