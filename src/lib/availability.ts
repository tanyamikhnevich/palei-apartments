import { addDaysISO, compareISO } from '@/lib/dates';
import type { ApartmentAvailability } from '@/types/apartment';

export const DEFAULT_AVAILABILITY: ApartmentAvailability = {
  mode: 'always',
  blocked: [],
};

export function rangesToBlockedNights(ranges: { checkIn: string; checkOut: string }[]): string[] {
  const nights: string[] = [];
  for (const r of ranges) {
    for (let d = r.checkIn; compareISO(d, r.checkOut) < 0; d = addDaysISO(d, 1)) {
      nights.push(d);
    }
  }
  return nights;
}

export function blockedNightsToRanges(nights: string[]): { checkIn: string; checkOut: string }[] {
  if (!nights.length) return [];
  const sorted = [...new Set(nights)].sort();
  const ranges: { checkIn: string; checkOut: string }[] = [];
  let start = sorted[0];
  let end = addDaysISO(sorted[0], 1);

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end) {
      end = addDaysISO(sorted[i], 1);
    } else {
      ranges.push({ checkIn: start, checkOut: end });
      start = sorted[i];
      end = addDaysISO(sorted[i], 1);
    }
  }
  ranges.push({ checkIn: start, checkOut: end });
  return ranges;
}

export function mergeBlockedRanges(
  ...lists: { checkIn: string; checkOut: string }[][]
): { checkIn: string; checkOut: string }[] {
  return lists.flat();
}
