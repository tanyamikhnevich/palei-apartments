import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import {
  FLEET_MIGRATION_HINT,
  getCarsDb,
  isCarsDbConfigured,
  isMissingFleetTables,
  schema,
} from '@/db/cars';
import { jsonError } from '@/lib/api/errors';
import { requireAdmin } from '@/lib/auth/guard';

/** One blocked range on the fleet calendar: a hire, a service, a trip. */
type BlockBody = { carId?: string; from?: string; to?: string; note?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isCarsDbConfigured()) return jsonError('Fleet database not configured', 503);

  try {
    const body = (await request.json()) as BlockBody;
    if (!body.carId || !ISO.test(body.from ?? '') || !ISO.test(body.to ?? '')) {
      return jsonError('Invalid block payload');
    }
    if (body.to! <= body.from!) return jsonError('Return date must be after pick-up');

    const db = getCarsDb();
    await db.insert(schema.carBlocks).values({
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      carId: body.carId,
      from: body.from!,
      to: body.to!,
      note: body.note?.trim() || null,
    });

    const blocks = await db
      .select()
      .from(schema.carBlocks)
      .where(eq(schema.carBlocks.carId, body.carId));
    return NextResponse.json({ blocks }, { status: 201 });
  } catch (e) {
    console.error('POST /api/cars/blocks', e);
    if (isMissingFleetTables(e)) return jsonError(FLEET_MIGRATION_HINT, 503);
    return jsonError('Failed to block dates', 500);
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isCarsDbConfigured()) return jsonError('Fleet database not configured', 503);

  const params = new URL(request.url).searchParams;
  const carId = params.get('carId');
  const id = params.get('id');
  if (!carId || !id) return jsonError('Missing block id');

  try {
    const db = getCarsDb();
    await db
      .delete(schema.carBlocks)
      .where(and(eq(schema.carBlocks.id, id), eq(schema.carBlocks.carId, carId)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/cars/blocks', e);
    if (isMissingFleetTables(e)) return jsonError(FLEET_MIGRATION_HINT, 503);
    return jsonError('Failed to free dates', 500);
  }
}
