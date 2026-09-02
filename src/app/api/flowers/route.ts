import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import {
  SHOP_MIGRATION_HINT,
  getFlowersDb,
  isFlowersDbConfigured,
  isShopSchemaOutdated,
  schema,
} from '@/db/flowers';
import { bouquetToInsert, rowToBouquet } from '@/db/flowers/schema';
import { jsonError } from '@/lib/api/errors';
import type { Bouquet } from '@/types/flower';
import { requireAdmin } from '@/lib/auth/guard';

/**
 * The window — whatever is actually in it. There is no built-in sample: an
 * empty shop shows an empty shop, and the page says so rather than advertising
 * bouquets nobody can send.
 */
export async function GET() {
  if (!isFlowersDbConfigured()) {
    return NextResponse.json({ bouquets: [], source: 'database' as const, writable: false });
  }

  try {
    const rows = await getFlowersDb().select().from(schema.bouquets);
    return NextResponse.json({
      bouquets: rows.map(rowToBouquet),
      source: 'database' as const,
      writable: true,
    });
  } catch (e) {
    console.error('GET /api/flowers', e);
    // A migration behind: show an empty window rather than an error page.
    if (isShopSchemaOutdated(e)) {
      return NextResponse.json({ bouquets: [], source: 'database' as const, writable: false });
    }
    return jsonError('Failed to load the window', 500);
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isFlowersDbConfigured()) return jsonError('Shop database not configured', 503);

  try {
    const bouquet = (await request.json()) as Bouquet;
    if (!bouquet.id || !bouquet.locales?.en?.name) return jsonError('Invalid bouquet payload');

    const db = getFlowersDb();
    const now = new Date();
    await db
      .insert(schema.bouquets)
      .values({ ...bouquetToInsert(bouquet), createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: schema.bouquets.id,
        set: { ...bouquetToInsert(bouquet), updatedAt: now },
      });

    const saved = await db
      .select()
      .from(schema.bouquets)
      .where(eq(schema.bouquets.id, bouquet.id))
      .limit(1);
    return NextResponse.json({ bouquet: rowToBouquet(saved[0]) }, { status: 201 });
  } catch (e) {
    console.error('POST /api/flowers', e);
    if (isShopSchemaOutdated(e)) return jsonError(SHOP_MIGRATION_HINT, 503);
    return jsonError('Failed to save bouquet', 500);
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isFlowersDbConfigured()) return jsonError('Shop database not configured', 503);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return jsonError('Missing bouquet id');

  try {
    await getFlowersDb().delete(schema.bouquets).where(eq(schema.bouquets.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/flowers', e);
    if (isShopSchemaOutdated(e)) return jsonError(SHOP_MIGRATION_HINT, 503);
    return jsonError('Failed to delete bouquet', 500);
  }
}
