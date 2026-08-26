import type { ApartmentArea } from './region';

/**
 * A car in our own fleet.
 *
 * Deliberately the same shape of thing as an apartment: a unit that sits in a
 * region, costs money per unit of time, and is either free or taken on a given
 * range of dates. That is why the calendar, the availability check and the
 * quote below are the apartment logic rewritten for days instead of nights, and
 * not a second system.
 *
 * Lives in code for now — see `src/data/cars.ts`. When the fleet moves to the
 * database this interface is what the table should look like.
 */

export type CarClass = 'economy' | 'compact' | 'crossover' | 'van' | 'premium';
export type Transmission = 'automatic' | 'manual';
export type CarStatus = 'Available' | 'Maintenance';

/** A cheaper daily rate that unlocks at `minDays` and then applies to every day. */
export interface CarRateTier {
  minDays: number;
  price: number;
}

export interface Car {
  id: string;
  /** Region the car is based in — decides its currency, like an apartment's. */
  area: ApartmentArea;
  make: string;
  model: string;
  year: number;
  carClass: CarClass;
  transmission: Transmission;
  seats: number;
  /** Large suitcases that actually fit. */
  bags: number;
  airConditioning: boolean;
  pricePerDay: number;
  rateTiers?: CarRateTier[];
  minDays: number;
  /** Refundable hold, shown up front so it is never a surprise at the desk. */
  deposit: number;
  /** Where the car can be handed over and taken back. */
  pickupPoints: string[];
  photos?: string[];
  status: CarStatus;
  /**
   * Taken ranges, end-exclusive — same convention as apartment bookings. `id`
   * comes from the fleet database and is what the calendar deletes by; the
   * built-in fleet has none, which is why it is read-only.
   */
  blocks: { id?: string; from: string; to: string }[];
}
