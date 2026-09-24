import type { Metadata } from 'next';
import { localeAlternates, localePath, splitLocale } from '@/i18n/routing';
import { LOCALES, type Locale } from '@/i18n/types';
import { currentLocale } from '@/i18n/server';
import { t as translate } from '@/i18n/getMessage';
import { MAIN_SITE_URL, sectionForPath } from '@/lib/sites';

/**
 * Everything a search engine or a chat app needs to know about a page.
 *
 * One helper rather than metadata hand-written per route: a canonical URL that
 * is missing on three pages out of ten is worse than none at all, because the
 * three become duplicates of whatever else matches.
 */

/** The main site's address; see `MAIN_SITE_URL`. */
export const SITE_URL = MAIN_SITE_URL;

export const SITE_NAME = 'Palei Apartments';

/** The flower shop trades under its own name, on its own domain. */
export const FLOWERS_BRAND = 'Palei Flowers';

/**
 * The name a page is published under. A bouquet titled "… — Palei Apartments"
 * in a search result reads as a mistake, and the shop has a brand of its own.
 */
export function brandForPath(path: string): string {
  const clean = splitLocale(path.split('?')[0]).pathname;
  return clean === '/flowers' || clean.startsWith('/flowers/') ? FLOWERS_BRAND : SITE_NAME;
}

/** The default preview card image — 1200×630, the size every chat app crops to. */
export const DEFAULT_OG_IMAGE = '/og-apartments.png';

/**
 * The card a pasted link shows, by the part of the business it belongs to.
 *
 * A flower link that previews a sunset over Bat Yam tells the reader nothing
 * about flowers, and the three businesses share one deployment — so the section
 * in the path is what picks the logo. Built by `scripts/buildOgCards.ts`.
 */
const OG_IMAGE_BY_SECTION: [prefix: string, image: string][] = [
  ['/flowers', '/og-flowers.png'],
  ['/cars', '/og-cars.png'],
];

export function sectionOgImage(path: string): string {
  const clean = path.split('?')[0];
  const match = OG_IMAGE_BY_SECTION.find(
    ([prefix]) => clean === prefix || clean.startsWith(`${prefix}/`)
  );
  return match ? match[1] : DEFAULT_OG_IMAGE;
}

/**
 * `path` on whichever domain it lives on: a section with a domain of its own
 * (`/flowers` on paleiflowers.co.il) gets that one, everything else the main
 * site. Canonicals, `hreflang`, the sitemap and the bot's links all go through
 * here, so none of them points at the address that only redirects.
 */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  const section = sectionForPath(splitLocale(clean.split('?')[0]).pathname);
  return `${section?.origin ?? SITE_URL}${clean}`;
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
  const preview = absoluteUrl(image ?? sectionOgImage(path));
  const brand = brandForPath(path);

  // Dimensions are only declared for the cards we build ourselves, whose size
  // we control.
  // Stating 1200×630 for an uploaded photo that is nothing of the kind makes
  // the preview render wrong in exactly the apps that trust the numbers.
  const previewImage = custom
    ? { url: preview, alt: title }
    : { url: preview, width: 1200, height: 630, alt: title };

  return {
    // The layout appends the apartments' name to every title; a section with a
    // brand of its own says so itself instead.
    title: brand === SITE_NAME ? title : { absolute: `${title} — ${brand}` },
    description,
    applicationName: brand,
    alternates: { canonical: url, languages: languageAlternates(path) },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type,
      url,
      siteName: brand,
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
