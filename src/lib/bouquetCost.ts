import type { Bouquet, BouquetCost, CostLine } from '@/types/flower';

/**
 * What a bouquet cost to make, worked out the way a florist works it out on
 * paper: the stems and the wrapping at supplier prices, VAT on top of those,
 * and then the hours spent standing at the table.
 *
 * Money here is kept to the cent rather than the whole shekel the window shows.
 * A stem is bought for 4.30 and thirty of them are the difference between a
 * bouquet that pays for itself and one that does not, so rounding early would
 * throw away the very thing this sheet exists to see.
 */

/**
 * The rate where the shop sells — Israel, and only Israel. It is a starting
 * value, not a rule: the field stays editable, because a rate that changes by
 * law should not need a deploy.
 */
export const SHOP_VAT_RATE = 18;

export function blankCostLine(): CostLine {
  return {
    id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    qty: 1,
    name: '',
    unitNet: 0,
    /* Most of what a florist buys arrives on an invoice that charges it. */
    vat: true,
  };
}

export function blankCost(): BouquetCost {
  return {
    lines: [blankCostLine()],
    vatRate: SHOP_VAT_RATE,
    hours: 0,
    hourlyRate: 0,
  };
}

/** Cents, so that repeated addition cannot drift. */
function round(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function lineNet(line: CostLine): number {
  return round((line.qty || 0) * (line.unitNet || 0));
}

/** What this line adds in tax — nothing at all when it is not marked. */
export function lineVat(line: CostLine, rate: number): number {
  return line.vat ? round((lineNet(line) * (rate || 0)) / 100) : 0;
}

/** The line as it is actually paid for. */
export function lineGross(line: CostLine, rate: number): number {
  return round(lineNet(line) + lineVat(line, rate));
}

export interface CostTotals {
  /** The lines added up, before VAT. */
  materialsNet: number;
  /** Only from the lines that carry it — zero when none of them do. */
  vat: number;
  materialsGross: number;
  /** Hours × rate: what the making of it was worth. */
  labour: number;
  /** ИТОГО — materials with VAT, plus the work. */
  total: number;
}

export function costTotals(cost: BouquetCost | undefined): CostTotals {
  const lines = cost?.lines ?? [];
  const rate = cost?.vatRate || 0;
  const materialsNet = round(lines.reduce((sum, line) => sum + lineNet(line), 0));
  const vat = round(lines.reduce((sum, line) => sum + lineVat(line, rate), 0));
  const labour = round((cost?.hours || 0) * (cost?.hourlyRate || 0));

  return {
    materialsNet,
    vat,
    materialsGross: round(materialsNet + vat),
    labour,
    total: round(materialsNet + vat + labour),
  };
}

/**
 * What is left of the asking price once the bouquet has paid for itself.
 *
 * Deliberately blunt: the shelf price minus everything the sheet counted, work
 * included. A bouquet priced below that is not a thin margin, it is a bouquet
 * sold at a loss, and the number should say so.
 */
export function costMargin(price: number, total: number): { amount: number; percent: number } {
  const amount = round(price - total);
  return { amount, percent: price > 0 ? Math.round((amount / price) * 100) : 0 };
}

/** Whether anything was actually filled in — an empty sheet is not a cost. */
export function hasCost(cost: BouquetCost | undefined): boolean {
  if (!cost) return false;
  const { materialsNet, labour } = costTotals(cost);
  return materialsNet > 0 || labour > 0;
}

/**
 * The bouquet as the public may see it. Supplier prices and the margin they
 * give away stay in admin, and this is the one place that decides so — both
 * the API and the server-rendered page go through it.
 */
export function withoutCost(bouquet: Bouquet): Bouquet {
  if (!bouquet.cost) return bouquet;
  const { cost: _cost, ...rest } = bouquet;
  return rest;
}

/**
 * One thing the florist has bought before, as the costing sheet offers it back.
 *
 * There is no catalogue of stems anywhere and there should not be one: a shop
 * that has to maintain a price list alongside its bouquets ends up with two
 * versions of the truth. The sheets themselves are the list — roses typed into
 * six bouquets are simply a thing bought six times, and the sixth spelling and
 * price are as good a suggestion as any register could give.
 */
export interface CostSuggestion {
  /** As it was last spelled — that spelling is what the list offers. */
  name: string;
  unitNet: number;
  vat: boolean;
  /** How many sheets it appears on, so the everyday things sort to the top. */
  uses: number;
}

/**
 * The price to offer for a thing bought at several prices: the one paid most
 * often, and the dearer of two paid equally often.
 *
 * The tie-break leans high on purpose. A suggestion is a starting point that
 * gets corrected when it is wrong, and of the two ways to be wrong, quoting a
 * bouquet too cheaply is the one that costs money.
 */
function usualPrice(prices: Map<number, number>): number {
  let best = 0;
  let bestCount = 0;
  for (const [price, count] of prices) {
    if (count > bestCount || (count === bestCount && price > best)) {
      best = price;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Everything the sheets have ever been charged for, gathered into one list.
 *
 * Names are matched case-insensitively, because "Roses" and "roses" are the
 * same flower and offering both would defeat the point of offering anything.
 */
export function costSuggestions(bouquets: Bouquet[]): CostSuggestion[] {
  const seen = new Map<
    string,
    { name: string; uses: number; withVat: number; prices: Map<number, number> }
  >();

  for (const bouquet of bouquets) {
    for (const line of bouquet.cost?.lines ?? []) {
      const name = line.name.trim();
      if (!name) continue;

      const key = name.toLowerCase();
      const entry = seen.get(key) ?? { name, uses: 0, withVat: 0, prices: new Map() };
      entry.name = name;
      entry.uses += 1;
      if (line.vat) entry.withVat += 1;
      /* A line typed but not yet priced says nothing about what it costs. */
      if (line.unitNet > 0) {
        entry.prices.set(line.unitNet, (entry.prices.get(line.unitNet) ?? 0) + 1);
      }
      seen.set(key, entry);
    }
  }

  return [...seen.values()]
    .map((entry) => ({
      name: entry.name,
      unitNet: usualPrice(entry.prices),
      /* However it is usually bought — the market stall or the invoice. */
      vat: entry.withVat * 2 >= entry.uses,
      uses: entry.uses,
    }))
    .sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));
}
