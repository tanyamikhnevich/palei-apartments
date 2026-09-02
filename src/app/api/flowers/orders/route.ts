import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import {
  SHOP_MIGRATION_HINT,
  getFlowersDb,
  isFlowersDbConfigured,
  isShopSchemaOutdated,
  schema,
} from '@/db/flowers';
import { rowToOrder } from '@/db/flowers/schema';
import { jsonError } from '@/lib/api/errors';
import { FLOWER_ORDER_STATUSES, type FlowerOrderStatus } from '@/types/flower';
import { requireAdmin } from '@/lib/auth/guard';

/** Placed orders, newest first — the shop's own inbox. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isFlowersDbConfigured()) return NextResponse.json({ orders: [] });

  try {
    const rows = await getFlowersDb()
      .select()
      .from(schema.flowerOrders)
      .orderBy(desc(schema.flowerOrders.createdAt));
    return NextResponse.json({ orders: rows.map(rowToOrder) });
  } catch (e) {
    console.error('GET /api/flowers/orders', e);
    if (isShopSchemaOutdated(e)) return NextResponse.json({ orders: [] });
    return jsonError('Failed to load orders', 500);
  }
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isFlowersDbConfigured()) return jsonError('Shop database not configured', 503);

  try {
    const body = (await request.json()) as { id?: string; status?: FlowerOrderStatus };
    if (!body.id || !body.status || !FLOWER_ORDER_STATUSES.includes(body.status)) {
      return jsonError('Invalid status payload');
    }

    const db = getFlowersDb();
    await db
      .update(schema.flowerOrders)
      .set({ status: body.status })
      .where(eq(schema.flowerOrders.id, body.id));

    const saved = await db
      .select()
      .from(schema.flowerOrders)
      .where(eq(schema.flowerOrders.id, body.id))
      .limit(1);
    if (!saved.length) return jsonError('Unknown order', 404);

    return NextResponse.json({ order: rowToOrder(saved[0]) });
  } catch (e) {
    console.error('PATCH /api/flowers/orders', e);
    if (isShopSchemaOutdated(e)) return jsonError(SHOP_MIGRATION_HINT, 503);
    return jsonError('Failed to update the order', 500);
  }
}
