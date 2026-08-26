import type { Car } from '@/types/car';
import type { ApartmentArea } from '@/types/region';

type CarRow = {
  id: string;
  area: string;
  make: string;
  model: string;
  year: number;
  carClass: Car['carClass'];
  transmission: Car['transmission'];
  seats: number;
  bags: number;
  airConditioning: boolean;
  pricePerDay: number;
  rateTiers: Car['rateTiers'] | null;
  minDays: number;
  deposit: number;
  pickupPoints: string[];
  photos: string[] | null;
  status: Car['status'];
};

type BlockRow = { id: string; carId: string; from: string | Date; to: string | Date };

const day = (value: string | Date): string => String(value).slice(0, 10);

export function rowToCar(row: CarRow, blocks: BlockRow[] = []): Car {
  return {
    id: row.id,
    area: row.area as ApartmentArea,
    make: row.make,
    model: row.model,
    year: row.year,
    carClass: row.carClass,
    transmission: row.transmission,
    seats: row.seats,
    bags: row.bags,
    airConditioning: row.airConditioning,
    pricePerDay: row.pricePerDay,
    rateTiers: row.rateTiers ?? undefined,
    minDays: row.minDays,
    deposit: row.deposit,
    pickupPoints: row.pickupPoints,
    photos: row.photos ?? undefined,
    status: row.status,
    blocks: blocks
      .filter((b) => b.carId === row.id)
      .map((b) => ({ id: b.id, from: day(b.from), to: day(b.to) })),
  };
}

export function carToInsert(car: Car) {
  return {
    id: car.id,
    area: car.area,
    make: car.make,
    model: car.model,
    year: car.year,
    carClass: car.carClass,
    transmission: car.transmission,
    seats: car.seats,
    bags: car.bags,
    airConditioning: car.airConditioning,
    pricePerDay: car.pricePerDay,
    rateTiers: car.rateTiers ?? null,
    minDays: car.minDays,
    deposit: car.deposit,
    pickupPoints: car.pickupPoints,
    photos: car.photos ?? null,
    status: car.status,
  };
}
