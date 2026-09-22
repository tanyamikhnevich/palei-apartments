import { NextResponse } from 'next/server';
import { asc, eq, isNotNull } from 'drizzle-orm';
import {
  SHOP_MIGRATION_HINT,
  getFlowersDb,
  isFlowersDbConfigured,
  isShopSchemaOutdated,
  schema,
} from '@/db/flowers';
import { rowToCostItem } from '@/db/flowers/schema';
import { jsonError } from '@/lib/api/errors';
import { requireAdminAccess } from '@/lib/auth/guard';
import { lineFromItem } from '@/lib/costCatalog';
import { COST_GROUPS, type CostItem, type CostPricePoint } from '@/types/flower';

/**
 * The shop's price list. Admin-only in every method — supplier prices are the
 * florist's business, and this whole list is nothing but supplier prices.
 */
export async function GET(request: Request) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

  if (!isFlowersDbConfigured()) return NextResponse.json({ items: [], writable: false });

  try {
    const db = getFlowersDb();
    const rows = await db
      .select()
      .from(schema.costItems)
      .orderBy(asc(schema.costItems.group), asc(schema.costItems.name));
    const history = await loadHistory(db);
    return NextResponse.json({
      items: rows.map((row) => ({ ...rowToCostItem(row), history: history.get(row.id) ?? [] })),
      writable: true,
    });
  } catch (e) {
    console.error('GET /api/flowers/cost-items', e);
    if (isShopSchemaOutdated(e)) return NextResponse.json({ items: [], writable: false });
    return jsonError('Failed to load the price list', 500);
  }
}

/**
 * Adds or changes an entry, then re-costs every bouquet that uses it. That
 * second half is the point of the list: one price, changed once.
 */
export async function POST(request: Request) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

  if (!isFlowersDbConfigured()) return jsonError('Shop database not configured', 503);

  try {
    const body = (await request.json()) as Partial<CostItem>;
    const name = body.name?.trim() ?? '';
    const nameHe = body.nameHe?.trim() || null;
    const unitNet = Number(body.unitNet);
    if (!body.id || (!name && !nameHe)) return jsonError('The item needs a name');
    if (!Number.isFinite(unitNet) || unitNet < 0) return jsonError('The price must be 0 or more');
    if (!body.group || !COST_GROUPS.includes(body.group)) return jsonError('Unknown group');

    const values = {
      name,
      nameHe,
      group: body.group,
      unitNet: Math.round(unitNet * 100) / 100,
      vat: body.vat !== false,
      updatedAt: new Date(),
    };
    const db = getFlowersDb();
    const [before] = await db
      .select()
      .from(schema.costItems)
      .where(eq(schema.costItems.id, body.id))
      .limit(1);

    await db
      .insert(schema.costItems)
      .values({ id: body.id, ...values })
      .onConflictDoUpdate({ target: schema.costItems.id, set: values });

    const [row] = await db
      .select()
      .from(schema.costItems)
      .where(eq(schema.costItems.id, body.id))
      .limit(1);
    const item = rowToCostItem(row);

    /* A rename is not a price change; only what it costs goes into history. */
    if (!before || before.unitNet !== item.unitNet || before.vat !== item.vat) {
      await recordPrice(db, item, values.updatedAt);
    }

    const updated = await recostBouquets(new Map([[item.id, item]]));

    return NextResponse.json({ item, updated }, { status: 201 });
  } catch (e) {
    console.error('POST /api/flowers/cost-items', e);
    if (isShopSchemaOutdated(e)) return jsonError(SHOP_MIGRATION_HINT, 503);
    return jsonError('Failed to save the item', 500);
  }
}

/** Removes an entry. Sheets that used it keep its last price, unlinked. */
export async function DELETE(request: Request) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

  if (!isFlowersDbConfigured()) return jsonError('Shop database not configured', 503);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return jsonError('Missing item id');

  try {
    await getFlowersDb().delete(schema.costItems).where(eq(schema.costItems.id, id));
    const updated = await recostBouquets(new Map(), id);
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    console.error('DELETE /api/flowers/cost-items', e);
    if (isShopSchemaOutdated(e)) return jsonError(SHOP_MIGRATION_HINT, 503);
    return jsonError('Failed to delete the item', 500);
  }
}

/**
 * Rewrites the lines linked to these entries in every costed bouquet — or lets
 * go of the links to the one just deleted, keeping its last price. Lines linked
 * to anything else are left exactly as they are. Returns how many changed.
 *
 * Reads all costed rows and filters here rather than in SQL: the shop has tens
 * of bouquets, and a jsonb path query would buy nothing but a harder read.
 */
async function recostBouquets(items: Map<string, CostItem>, deletedId?: string) {
  const db = getFlowersDb();
  const rows = await db
    .select({ id: schema.bouquets.id, cost: schema.bouquets.cost })
    .from(schema.bouquets)
    .where(isNotNull(schema.bouquets.cost));

  let updated = 0;
  for (const row of rows) {
    if (!row.cost) continue;
    let changed = false;
    const lines = row.cost.lines.map((line) => {
      if (!line.itemId) return line;
      if (line.itemId === deletedId) {
        changed = true;
        const { itemId: _gone, ...rest } = line;
        return rest;
      }
      const item = items.get(line.itemId);
      if (!item) return line;
      const next = lineFromItem(line, item);
      if (next.name !== line.name || next.unitNet !== line.unitNet || next.vat !== line.vat) {
        changed = true;
      }
      return next;
    });
    if (!changed) continue;

    await db
      .update(schema.bouquets)
      .set({ cost: { ...row.cost, lines }, updatedAt: new Date() })
      .where(eq(schema.bouquets.id, row.id));
    updated += 1;
  }
  return updated;
}

/** Every entry's past prices, oldest first, keyed by entry. */
async function loadHistory(
  db: ReturnType<typeof getFlowersDb>
): Promise<Map<string, CostPricePoint[]>> {
  const out = new Map<string, CostPricePoint[]>();
  try {
    const rows = await db
      .select()
      .from(schema.costItemPrices)
      .orderBy(asc(schema.costItemPrices.changedAt));
    for (const row of rows) {
      const list = out.get(row.itemId) ?? [];
      list.push({ unitNet: row.unitNet, vat: row.vat, at: row.changedAt.toISOString() });
      out.set(row.itemId, list);
    }
  } catch (e) {
    /* The history table a migration behind: the list still loads, without it. */
    if (!isShopSchemaOutdated(e)) throw e;
  }
  return out;
}

/**
 * Notes the new price down. A history table a migration behind must not stop
 * the price itself from being saved — the price is what the sheets need.
 */
async function recordPrice(db: ReturnType<typeof getFlowersDb>, item: CostItem, at: Date) {
  try {
    await db.insert(schema.costItemPrices).values({
      id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      itemId: item.id,
      unitNet: item.unitNet,
      vat: item.vat,
      changedAt: at,
    });
  } catch (e) {
    if (!isShopSchemaOutdated(e)) throw e;
  }
}
