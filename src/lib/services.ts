/**
 * The four Palei directions in one place: the home-page strip and each section
 * read from here, so a name or a colour is changed once.
 *
 * Stand-in for what the expansion plan turns into four separate domains.
 */
/**
 * The umbrella brand: what the header shows anywhere that is not one of the
 * sections below — the home page, contact, about.
 */
export const GROUP_BRAND = {
  logo: '/palei-group-logo.png',
  alt: 'Palei Group',
} as const;

export interface ServiceEntry {
  href: string;
  /**
   * The section's own logo, shown in the header while inside it. Sections
   * without one yet fall back to the group's.
   */
  logo?: string;
  /** Copy lives in the dictionaries, under `group.services.<key>`. */
  key: 'apartmentsIl' | 'apartmentsCy' | 'cars' | 'flowers';
  /** Per-service accent — the palette swap each future site would get. */
  accent: string;
  accentDeep: string;
  /** False while the section is not open to guests yet. */
  live: boolean;
}

export const SERVICES: ServiceEntry[] = [
  {
    href: '/apartments',
    key: 'apartmentsIl',
    logo: '/palei-apartments-logo.png',
    accent: '#1b6ca8',
    accentDeep: '#155a8a',
    live: true,
  },
  {
    href: '/cyprus',
    key: 'apartmentsCy',
    // Same product, same brand — only the country differs.
    logo: '/palei-apartments-logo.png',
    accent: '#1b6ca8',
    accentDeep: '#155a8a',
    live: true,
  },
  {
    href: '/cars',
    key: 'cars',
    logo: '/palei-cars-logo.png',
    accent: '#26707c',
    accentDeep: '#1f6b76',
    live: true,
  },
  {
    href: '/flowers',
    key: 'flowers',
    logo: '/palei-flowers-logo.png',
    accent: '#a04a64',
    accentDeep: '#8f4a63',
    live: true,
  },
];

export function serviceFor(href: string): ServiceEntry {
  const found = SERVICES.find((s) => s.href === href);
  if (!found) throw new Error(`No service registered for ${href}`);
  return found;
}

/**
 * Which brand a page belongs to. Longest match wins, so `/apartments/<id>`
 * stays with the apartments rather than falling back to the group.
 */
export function brandForPath(pathname: string): { logo: string; alt: string } {
  const section = [...SERVICES]
    .sort((a, b) => b.href.length - a.href.length)
    .find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));

  if (section?.logo) return { logo: section.logo, alt: section.href };
  return { logo: GROUP_BRAND.logo, alt: GROUP_BRAND.alt };
}
