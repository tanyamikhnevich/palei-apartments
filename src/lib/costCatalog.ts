import type { BouquetCost, CostGroup, CostItem, CostLine } from '@/types/flower';

/**
 * The price list and the sheets that point at it.
 *
 * A linked line keeps a copy of the list's name, price and VAT rather than
 * only the id. The copy is what the totals are worked out from, so everything
 * that already reads a sheet keeps working unchanged; the list simply rewrites
 * the copies whenever an entry changes. And an entry deleted from the list
 * leaves its sheets with the last price it had instead of a hole.
 */

export const COST_GROUP_TITLES: Record<CostGroup, string> = {
  flowers: 'Flowers',
  greenery: 'Greenery',
  balloons: 'Balloons',
  packaging: 'Packaging',
  wine: 'Wine',
  other: 'Other',
};

export function blankCostItem(group: CostGroup = 'flowers'): CostItem {
  return {
    id: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    group,
    unitNet: 0,
    /* Most of what a florist buys arrives on an invoice that charges it. */
    vat: true,
  };
}

/**
 * How an entry reads on a sheet: both names, so it can be found by either —
 * the florist thinks in Russian, the invoice is in Hebrew.
 */
export function costItemLabel(item: Pick<CostItem, 'name' | 'nameHe'>): string {
  const ru = item.name.trim();
  const he = item.nameHe?.trim();
  if (!he) return ru;
  if (!ru) return he;
  return `${ru} · ${he}`;
}

/** The line as the list says it should read. */
export function lineFromItem(line: CostLine, item: CostItem): CostLine {
  return {
    ...line,
    itemId: item.id,
    name: costItemLabel(item),
    unitNet: item.unitNet,
    vat: item.vat,
  };
}

/**
 * Brings every linked line of a sheet up to the list. A line pointing at an
 * entry that no longer exists is let go of — kept, with its last price, but
 * no longer linked. Returns the same object when nothing moved, so a caller
 * can tell whether there is anything to save.
 */
export function relinkCost(cost: BouquetCost, items: Map<string, CostItem>): BouquetCost {
  let changed = false;
  const lines = cost.lines.map((line) => {
    if (!line.itemId) return line;
    const item = items.get(line.itemId);
    if (!item) {
      changed = true;
      const { itemId: _gone, ...rest } = line;
      return rest;
    }
    const next = lineFromItem(line, item);
    if (next.name !== line.name || next.unitNet !== line.unitNet || next.vat !== line.vat) {
      changed = true;
      return next;
    }
    return line;
  });
  return changed ? { ...cost, lines } : cost;
}

export function itemsById(items: CostItem[]): Map<string, CostItem> {
  return new Map(items.map((item) => [item.id, item]));
}

/** How many sheets use each entry — so the list can say what an edit touches. */
export function itemUses(costs: (BouquetCost | undefined)[]): Map<string, number> {
  const uses = new Map<string, number>();
  for (const cost of costs) {
    const seen = new Set(cost?.lines.map((l) => l.itemId).filter(Boolean) as string[]);
    for (const id of seen) uses.set(id, (uses.get(id) ?? 0) + 1);
  }
  return uses;
}
