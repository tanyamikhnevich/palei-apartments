/**
 * The site's own address.
 *
 * Canonical URLs, the sitemap and preview images must all be absolute and must
 * all agree, so this is the one place the domain is decided. Set
 * `NEXT_PUBLIC_SITE_URL` in the deployment; Vercel's production domain is the
 * fallback, and localhost keeps development honest rather than silently
 * publishing `http://localhost:3000` into a sitemap.
 */
function withProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  // A bare domain is an easy thing to paste; it still means the https site.
  if (explicit) return withProtocol(explicit).replace(/\/+$/, '');

  // Not VERCEL_URL: that one changes with every deployment, and a canonical
  // pointing at a preview build teaches Google the wrong address.
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production.replace(/\/+$/, '')}`;

  return 'http://localhost:3000';
}

export const MAIN_SITE_URL = resolveSiteUrl();

/**
 * Sections that answer on a domain of their own.
 *
 * One deployment serves every domain, so this table is what tells them apart:
 * a section listed here lives at its own address, and the main site hands its
 * paths over with a redirect. A section whose variable is unset — local
 * development, a preview build — simply stays a path on the main site.
 *
 * Kept free of `next/headers` and the i18n server helpers: the middleware reads
 * it, and the middleware runs where those do not exist.
 */
export type SectionSite = {
  /** The section's path on the main site, e.g. `/flowers`. */
  prefix: string;
  /** Its own origin, e.g. `https://paleiflowers.co.il`. */
  origin: string;
  /** The host without `www.`, for matching requests against. */
  host: string;
};

function parseOrigin(raw: string | undefined): { origin: string; host: string } | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return { origin: url.origin, host: bareHost(url.host) };
  } catch {
    return null;
  }
}

/** `www.example.co.il:443` → `example.co.il`: both addresses are one site. */
export function bareHost(host: string | null | undefined): string {
  return (host ?? '').split(':')[0].toLowerCase().replace(/^www\./, '');
}

export const SECTION_SITES: readonly SectionSite[] = [
  { prefix: '/flowers', site: parseOrigin(process.env.FLOWERS_SITE_URL) },
].flatMap(({ prefix, site }) => (site ? [{ prefix, ...site }] : []));

export function isUnder(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** The section whose own domain `host` is, if any. */
export function sectionForHost(host: string | null | undefined): SectionSite | undefined {
  const name = bareHost(host);
  return SECTION_SITES.find((s) => s.host === name);
}

/** The section with a domain of its own that `path` (unprefixed) belongs to. */
export function sectionForPath(path: string): SectionSite | undefined {
  return SECTION_SITES.find((s) => isUnder(path, s.prefix));
}

/**
 * Hosts that must never be bounced to a production domain: development and
 * Vercel's preview addresses, where the section has to be reachable as a path
 * to be tested at all.
 */
export function isScratchHost(host: string | null | undefined): boolean {
  const name = bareHost(host);
  return (
    name === 'localhost' ||
    name === '127.0.0.1' ||
    name.endsWith('.local') ||
    name.endsWith('.vercel.app')
  );
}
