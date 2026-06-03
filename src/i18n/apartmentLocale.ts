import type { Apartment, ApartmentLocaleCopy, ApartmentTagId } from '@/types/apartment';
import type { Locale } from './types';
import { t } from './getMessage';

export function getApartmentCopy(apt: Apartment, locale: Locale): ApartmentLocaleCopy {
  return apt.locales[locale] ?? apt.locales.en;
}

export function getTagLabel(locale: Locale, tagId: ApartmentTagId): string {
  return t(locale, `apartments.tags.${tagId}`);
}
