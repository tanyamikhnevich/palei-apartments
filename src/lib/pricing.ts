import type { Apartment, ApartmentService, PriceTier, ServiceUnit } from '@/types/apartment';

/** Translation key describing how a service is multiplied out. */
export const SERVICE_UNIT_KEYS: Record<ServiceUnit, string> = {
  stay: 'booking.perStay',
  night: 'booking.perNightUnit',
  guest: 'booking.perGuest',
};

export type ServiceCharge = {
  service: ApartmentService;
  amount: number;
};

export type StayQuote = {
  nights: number;
  /** Nightly rate the length of stay qualifies for. */
  rate: number;
  /** Base rate, when a longer stay earns a cheaper one. */
  baseRate: number;
  nightsTotal: number;
  charges: ServiceCharge[];
  servicesTotal: number;
  total: number;
};

/** Base price first, then every tier, ascending by length of stay. */
export function priceTiers(apt: Apartment): PriceTier[] {
  const tiers = (apt.priceTiers ?? [])
    .filter((tier) => tier.minNights > 1 && tier.price > 0)
    .sort((a, b) => a.minNights - b.minNights);

  return [{ minNights: 1, price: apt.price }, ...tiers];
}

/**
 * The last tier the stay is long enough for wins, and it prices every night —
 * a 10-night stay under a 7-night tier is 10 nights at the tier's rate.
 */
export function nightlyRate(apt: Apartment, nights: number): number {
  const tiers = priceTiers(apt);
  let rate = tiers[0].price;
  for (const tier of tiers) {
    if (nights >= tier.minNights) rate = tier.price;
  }
  return rate;
}

/** Cheapest nightly rate on offer — what "from ₪450" refers to. */
export function priceFrom(apt: Apartment): number {
  return Math.min(...priceTiers(apt).map((tier) => tier.price));
}

/** True when a longer stay is cheaper, i.e. the price needs a "from". */
export function hasPriceTiers(apt: Apartment): boolean {
  return priceTiers(apt).length > 1;
}

export function serviceAmount(
  service: ApartmentService,
  nights: number,
  guests: number
): number {
  if (service.unit === 'night') return service.price * Math.max(1, nights);
  if (service.unit === 'guest') return service.price * Math.max(1, guests);
  return service.price;
}

/** Extras the guest cannot decline are always part of the quote. */
export function requiredServices(apt: Apartment): ApartmentService[] {
  return (apt.services ?? []).filter((s) => s.required);
}

export function optionalServices(apt: Apartment): ApartmentService[] {
  return (apt.services ?? []).filter((s) => !s.required);
}

export function quoteStay(
  apt: Apartment,
  nights: number,
  guests: number,
  selectedServiceIds: string[] = []
): StayQuote {
  const rate = nightlyRate(apt, nights);
  const nightsTotal = rate * nights;
  const selected = new Set(selectedServiceIds);

  const charges = (apt.services ?? [])
    .filter((s) => s.required || selected.has(s.id))
    .map((service) => ({ service, amount: serviceAmount(service, nights, guests) }));

  const servicesTotal = charges.reduce((sum, c) => sum + c.amount, 0);

  return {
    nights,
    rate,
    baseRate: apt.price,
    nightsTotal,
    charges,
    servicesTotal,
    total: nightsTotal + servicesTotal,
  };
}
