import type { Apartment } from '@/types/apartment';
import { apartmentHasTag } from '@/lib/apartmentTags';
import { rangeHasBlockedNight } from '@/lib/dates';

export type ApartmentSearchParams = {
  checkIn: string | null;
  checkOut: string | null;
  guests: number;
};

export function parseApartmentSearchParams(
  params: URLSearchParams | Readonly<Record<string, string | string[] | undefined>>
): ApartmentSearchParams {
  const get = (key: string): string | null => {
    if (params instanceof URLSearchParams) return params.get(key);
    const v = params[key];
    if (Array.isArray(v)) return v[0] ?? null;
    return v ?? null;
  };

  const checkIn = get('checkIn');
  const checkOut = get('checkOut');
  const guestsRaw = parseInt(get('guests') ?? '2', 10);
  const guests = Number.isFinite(guestsRaw) ? Math.min(6, Math.max(1, guestsRaw)) : 2;

  return {
    checkIn: checkIn && /^\d{4}-\d{2}-\d{2}$/.test(checkIn) ? checkIn : null,
    checkOut: checkOut && /^\d{4}-\d{2}-\d{2}$/.test(checkOut) ? checkOut : null,
    guests,
  };
}

export function buildApartmentSearchQuery(search: ApartmentSearchParams): string {
  const qs = new URLSearchParams();
  if (search.checkIn) qs.set('checkIn', search.checkIn);
  if (search.checkOut) qs.set('checkOut', search.checkOut);
  if (search.guests !== 2) qs.set('guests', String(search.guests));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export function isApartmentAvailableForStay(
  blocked: { checkIn: string; checkOut: string }[],
  checkIn: string,
  checkOut: string
): boolean {
  if (checkOut <= checkIn) return false;
  return !rangeHasBlockedNight(checkIn, checkOut, blocked);
}

export function filterApartmentsBySearch(
  list: Apartment[],
  search: ApartmentSearchParams,
  blockedByApartment: Record<string, { checkIn: string; checkOut: string }[]>,
  /** Selected tag chip, or null for "all". */
  tagFilter: string | null
): Apartment[] {
  let result = tagFilter ? list.filter((a) => apartmentHasTag(a, tagFilter)) : list;

  result = result.filter((a) => a.guests >= search.guests);

  if (search.checkIn && search.checkOut && search.checkOut > search.checkIn) {
    result = result.filter((a) =>
      isApartmentAvailableForStay(blockedByApartment[a.id] ?? [], search.checkIn!, search.checkOut!)
    );
  }

  return result;
}
