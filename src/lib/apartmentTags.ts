import type { Apartment, ApartmentTagId } from '@/types/apartment';
import type { Locale } from '@/i18n/types';

export const APARTMENT_TAG_IDS: ApartmentTagId[] = [
  'seaView',
  'balcony',
  'family',
  'nearBeach',
  'terrace',
  'premium',
  'garden',
  'central',
  'design',
  'nightlife',
  'equipped',
];

export const TAG_LABELS_EN: Record<ApartmentTagId, string> = {
  seaView: 'Sea view',
  balcony: 'Balcony',
  family: 'Family friendly',
  nearBeach: 'Near beach',
  terrace: 'Terrace',
  premium: 'Premium',
  garden: 'Garden',
  central: 'Central',
  design: 'Design',
  nightlife: 'Nightlife',
  equipped: 'Fully equipped',
};

const PRESET_SET = new Set<string>(APARTMENT_TAG_IDS);

export function isPresetTagId(id: string): id is ApartmentTagId {
  return PRESET_SET.has(id);
}

export function formatTagLabel(id: string, t: (key: string) => string): string {
  if (!isPresetTagId(id)) return id;
  const key = `apartments.tags.${id}`;
  const translated = t(key);
  return translated !== key ? translated : TAG_LABELS_EN[id];
}

export function formatApartmentTagLine(
  apt: Apartment,
  locale: Locale,
  t: (key: string) => string
): string {
  if (!apt.tagIds.length) return '';
  return apt.tagIds.map((id) => formatTagLabel(id, t)).join(' · ');
}

/** First tag — caption on placeholder when there is no photo. */
export function getPrimaryTagLabel(
  apt: Apartment,
  _locale: Locale,
  t: (key: string) => string
): string {
  const first = apt.tagIds[0];
  if (!first) return '';
  return formatTagLabel(first, t);
}

export function normalizeCustomTagInput(raw: string): string | null {
  const label = raw.trim().replace(/\s+/g, ' ');
  if (!label || label.length > 48) return null;
  return label;
}

export function photoLabelFromTags(tagIds: string[]): string {
  if (!tagIds.length) return '';
  const first = tagIds[0];
  return isPresetTagId(first) ? TAG_LABELS_EN[first] : first;
}
