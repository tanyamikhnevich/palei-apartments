import type { Apartment, ApartmentTagId } from '@/types/apartment';
import type { Locale } from '@/i18n/types';
import { getApartmentCopy } from '@/i18n/apartmentLocale';

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

export function isPhotoUrl(src: string): boolean {
  return (
    src.startsWith('/') ||
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:image/')
  );
}

export function getCoverPhoto(apt: Apartment): string | undefined {
  const photos = apt.photos ?? [];
  const cover = photos.find((p) => isPhotoUrl(p));
  return cover;
}

export function getApartmentPhotos(apt: Apartment): string[] {
  return (apt.photos ?? []).filter((p) => isPhotoUrl(p));
}

/** Tag line for cards — never shows image URLs. */
export function formatApartmentTags(
  apt: Apartment,
  locale: Locale,
  t: (key: string) => string
): string {
  if (apt.tagIds.length > 0) {
    return apt.tagIds.map((id) => t(`apartments.tags.${id}`)).join(' · ');
  }
  const label = getApartmentCopy(apt, locale).photoLabel;
  if (label && !isPhotoUrl(label)) return label;
  return '';
}
