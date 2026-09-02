import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import {
  FLEET_MIGRATION_HINT,
  getCarsDb,
  isCarsDbConfigured,
  isMissingFleetTables,
  schema,
} from '@/db/cars';
import { carToInsert, rowToCar } from '@/db/cars/map';
import { cars as mockCars } from '@/data/cars';
import { jsonError } from '@/lib/api/errors';
import type { Car } from '@/types/car';
import { requireAdmin } from '@/lib/auth/guard';

/**
 * The fleet, from its own database — and from `src/data/cars.ts` when that
 * database is not configured, so the site works on a fresh checkout with no
 * connection string.
 */
export async function GET() {
  if (!isCarsDbConfigured()) {
    return NextResponse.json({ cars: mockCars, source: 'mock' as const, writable: false });
  }

  try {
    const db = getCarsDb();
    const [rows, blocks] = await Promise.all([
      db.select().from(schema.cars),
      db.select().from(schema.carBlocks),
    ]);

    /*
      An empty table is not an empty fleet — it is a fleet nobody has filled in
      yet. Handing back nothing would blank the public page the moment the
      tables are created, so the built-in fleet stands in until a real car is
      saved. `writable` stays true: the tables are there, admin can edit.
    */
    if (rows.length === 0) {
      return NextResponse.json({ cars: mockCars, source: 'mock' as const, writable: true });
    }

    return NextResponse.json({
      cars: rows.map((row) => rowToCar(row, blocks)),
      source: 'database' as const,
      writable: true,
    });
  } catch (e) {
    console.error('GET /api/cars', e);
    // Usually the tables are missing — keep the site standing and say so.
    return NextResponse.json({ cars: mockCars, source: 'mock' as const, writable: false });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isCarsDbConfigured()) return jsonError('Fleet database not configured', 503);

  try {
    const car = (await request.json()) as Car;
    if (!car.id || !car.make || !car.model) return jsonError('Invalid car payload');

    const db = getCarsDb();
    const now = new Date();
    await db
      .insert(schema.cars)
      .values({ ...carToInsert(car), createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: schema.cars.id,
        set: { ...carToInsert(car), updatedAt: now },
      });

    const saved = await db.select().from(schema.cars).where(eq(schema.cars.id, car.id)).limit(1);
    const blocks = await db.select().from(schema.carBlocks).where(eq(schema.carBlocks.carId, car.id));
    return NextResponse.json({ car: rowToCar(saved[0], blocks) }, { status: 201 });
  } catch (e) {
    console.error('POST /api/cars', e);
    if (isMissingFleetTables(e)) return jsonError(FLEET_MIGRATION_HINT, 503);
    return jsonError('Failed to save car', 500);
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isCarsDbConfigured()) return jsonError('Fleet database not configured', 503);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return jsonError('Missing car id');

  try {
    const db = getCarsDb();
    await db.delete(schema.carBlocks).where(eq(schema.carBlocks.carId, id));
    await db.delete(schema.cars).where(eq(schema.cars.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/cars', e);
    if (isMissingFleetTables(e)) return jsonError(FLEET_MIGRATION_HINT, 503);
    return jsonError('Failed to delete car', 500);
  }
}
