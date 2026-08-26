import type { Car } from '@/types/car';
import type { CurrencyCode } from '@/types/settings';
import type { Region } from '@/types/region';
import { countryOf, currencyOf } from '@/lib/regions';
import { rangesOverlap } from '@/lib/dates';

/** Whole days between two ISO dates — pick-up day counts, return day does not. */
export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function carCurrency(car: Car): CurrencyCode {
  return currencyOf(car);
}

export function carsInCountry(list: Car[], country: Region['country'] | undefined): Car[] {
  if (!country) return list;
  return list.filter((car) => countryOf(car) === country);
}

/**
 * The daily rate the stay qualifies for. Like the apartment tiers, the cheaper
 * rate applies to every day of the hire, not just the days past the threshold —
 * that is how rental desks quote, and anything else reads as a trick.
 */
export function dailyRate(car: Car, days: number): number {
  const tiers = [...(car.rateTiers ?? [])].sort((a, b) => b.minDays - a.minDays);
  return tiers.find((tier) => days >= tier.minDays)?.price ?? car.pricePerDay;
}

export function cheapestRate(car: Car): number {
  const tiers = car.rateTiers ?? [];
  return tiers.reduce((low, tier) => Math.min(low, tier.price), car.pricePerDay);
}

export function hasRateTiers(car: Car): boolean {
  return (car.rateTiers ?? []).length > 0;
}

export interface CarQuote {
  days: number;
  rate: number;
  total: number;
  deposit: number;
}

export function quoteHire(car: Car, from: string | null, to: string | null): CarQuote | null {
  if (!from || !to || to <= from) return null;
  const days = daysBetween(from, to);
  if (days < car.minDays) return null;
  const rate = dailyRate(car, days);
  return { days, rate, total: days * rate, deposit: car.deposit };
}

/** Free for the whole range, and not in the workshop. */
export function isCarAvailable(car: Car, from: string, to: string): boolean {
  if (car.status !== 'Available') return false;
  if (to <= from) return false;
  return !car.blocks.some((b) => rangesOverlap(from, to, b.from, b.to));
}

export interface CarSearch {
  from: string | null;
  to: string | null;
  seats: number | null;
  pickup: string | null;
}

export function filterCars(list: Car[], search: CarSearch): Car[] {
  return list.filter((car) => {
    if (search.seats && car.seats < search.seats) return false;
    if (search.pickup && !car.pickupPoints.includes(search.pickup)) return false;
    if (search.from && search.to && search.to > search.from) {
      if (!isCarAvailable(car, search.from, search.to)) return false;
      if (daysBetween(search.from, search.to) < car.minDays) return false;
    }
    return true;
  });
}

/** Every pick-up point offered across the fleet, for the search dropdown. */
export function pickupPoints(list: Car[]): string[] {
  return [...new Set(list.flatMap((car) => car.pickupPoints))].sort();
}
