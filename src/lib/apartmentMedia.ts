import type { Apartment } from '@/types/apartment';
import type { Locale } from '@/i18n/types';
import { formatApartmentTagLine } from '@/lib/apartmentTags';

export { APARTMENT_TAG_IDS, TAG_LABELS_EN } from '@/lib/apartmentTags';

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

/** Tag line for listing cards (all tags, in order). */
export function formatApartmentTags(
  apt: Apartment,
  locale: Locale,
  t: (key: string) => string
): string {
  return formatApartmentTagLine(apt, locale, t);
}
