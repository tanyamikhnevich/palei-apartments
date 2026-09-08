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
