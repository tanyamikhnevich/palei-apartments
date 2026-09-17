import type {
  Bouquet,
  BuilderExtra,
  Presentation,
  PresentationTier,
  RoseBuilder,
  RoseColor,
  RoseSelection,
  StemTier,
} from '@/types/flower';

/**
 * The arithmetic behind the made-to-order rose card.
 *
 * Written once and used twice: the browser shows the same total the server
 * charges. The browser's number is never sent — only what was chosen — and this
 * file turns a choice into a price, so the two cannot disagree.
 */

export function isBuilder(bouquet: Bouquet): bouquet is Bouquet & { builder: RoseBuilder } {
  return Boolean(bouquet.builder?.colors.length && bouquet.builder.tiers.length);
}

export function blankBuilder(): RoseBuilder {
  return {
    min: 11,
    max: 101,
    presets: [11, 25, 51, 101],
    tiers: [{ from: 11, pricePerStem: 14 }],
    colors: [{ id: 'red', label: 'Red', swatch: '#c0102a', leadDays: 0 }],
    presentations: [{ id: 'tied', label: 'Hand-tied', price: 0 }],
    extras: [],
  };
}

export function builderExtras(builder: RoseBuilder): BuilderExtra[] {
  return builder.extras ?? [];
}

/** The chosen extras, in the order the florist listed them. */
export function chosenExtras(builder: RoseBuilder, selection: RoseSelection): BuilderExtra[] {
  const picked = new Set(selection.extraIds ?? []);
  return builderExtras(builder).filter((extra) => picked.has(extra.id));
}

/** Tiers in the order they apply, whatever order they were typed in. */
export function sortedTiers(builder: RoseBuilder): StemTier[] {
  return [...builder.tiers].sort((a, b) => a.from - b.from);
}

/**
 * What one stem costs at this size. The last tier whose `from` has been reached
 * wins, so a bigger order never costs more per stem than a smaller one — as
 * long as the tiers are priced that way, which is the florist's call.
 */
export function pricePerStem(builder: RoseBuilder, count: number): number {
  const tiers = sortedTiers(builder);
  let price = tiers[0]?.pricePerStem ?? 0;
  for (const tier of tiers) {
    if (count >= tier.from) price = tier.pricePerStem;
  }
  return price;
}

export function findColor(builder: RoseBuilder, id: string): RoseColor | undefined {
  return builder.colors.find((c) => c.id === id);
}

export function isMixColor(builder: RoseBuilder, id: string): boolean {
  return Boolean(findColor(builder, id)?.mix);
}

/** The colours a mix can be made of — everything that is not itself a mix. */
export function mixableColors(builder: RoseBuilder): RoseColor[] {
  return builder.colors.filter((color) => !color.mix);
}

export function mixCount(mix: Record<string, number> | undefined): number {
  return Object.values(mix ?? {}).reduce((sum, n) => sum + (n > 0 ? n : 0), 0);
}

/** The colours actually used, in the florist's order, with their counts. */
export function mixParts(
  builder: RoseBuilder,
  mix: Record<string, number> | undefined
): { color: RoseColor; count: number }[] {
  return mixableColors(builder)
    .map((color) => ({ color, count: Math.max(0, Math.round(mix?.[color.id] ?? 0)) }))
    .filter((part) => part.count > 0);
}

export function findPresentation(builder: RoseBuilder, id: string): Presentation | undefined {
  return builder.presentations.find((p) => p.id === id);
}

export function presentationTiers(presentation: Presentation): PresentationTier[] {
  return [...(presentation.tiers ?? [])].sort((a, b) => a.from - b.from);
}

/**
 * What the wrapping or the basket costs at this size. The base price holds
 * until a tier says otherwise, so a presentation with no tiers is flat.
 */
export function presentationPrice(presentation: Presentation, count: number): number {
  let price = presentation.price;
  for (const tier of presentationTiers(presentation)) {
    if (count >= tier.from) price = tier.price;
  }
  return price;
}

export function clampCount(builder: RoseBuilder, count: number): number {
  if (!Number.isFinite(count)) return builder.min;
  return Math.min(builder.max, Math.max(builder.min, Math.round(count)));
}

export function builderTotal(builder: RoseBuilder, selection: RoseSelection): number {
  const count = clampCount(builder, selection.count);
  const presentation = findPresentation(builder, selection.presentationId);
  const extras = chosenExtras(builder, selection).reduce((sum, extra) => sum + extra.price, 0);
  const wrap = presentation ? presentationPrice(presentation, count) : 0;
  return count * pricePerStem(builder, count) + wrap + extras;
}

/** The "from ₪x" on the card: the smallest order, presented most simply. */
export function builderFromPrice(builder: RoseBuilder): number {
  const cheapest = builder.presentations.reduce(
    (low, p) => Math.min(low, presentationPrice(p, builder.min)),
    presentationPrice(builder.presentations[0] ?? { id: '', label: '', price: 0 }, builder.min)
  );
  return builder.min * pricePerStem(builder, builder.min) + cheapest;
}

/**
 * Days to wait for this choice — what decides the earliest delivery date. A mix
 * waits for its slowest colour: the bouquet leaves when the last stem in it
 * can, not when the first one could.
 */
export function colorLeadDays(
  builder: RoseBuilder,
  colorId: string,
  mix?: Record<string, number>
): number {
  if (isMixColor(builder, colorId)) {
    const parts = mixParts(builder, mix);
    const own = Math.max(0, findColor(builder, colorId)?.leadDays ?? 0);
    return parts.length ? Math.max(...parts.map((p) => Math.max(0, p.color.leadDays))) : own;
  }
  return Math.max(0, findColor(builder, colorId)?.leadDays ?? 0);
}

/** The first colour that can go out today, so the form opens on the fast one. */
export function defaultSelection(builder: RoseBuilder): RoseSelection {
  const inStock =
    builder.colors.find((c) => !c.mix && c.leadDays === 0) ??
    builder.colors.find((c) => !c.mix) ??
    builder.colors[0];
  const preset = builder.presets.find((n) => n >= builder.min && n <= builder.max);
  return {
    count: preset ?? builder.min,
    colorId: inStock?.id ?? '',
    presentationId: builder.presentations[0]?.id ?? '',
    extraIds: [],
  };
}

/** What the order is called once it is placed: "51 Red roses · In a basket". */
export function selectionName(builder: RoseBuilder, selection: RoseSelection): string {
  const color = findColor(builder, selection.colorId);
  const presentation = findPresentation(builder, selection.presentationId);
  const parts = [`${selection.count} ${color ? `${color.label} ` : ''}roses`];
  if (color?.mix) {
    const breakdown = mixParts(builder, selection.mix)
      .map((part) => `${part.count} ${part.color.label}`)
      .join(', ');
    if (breakdown) parts.push(breakdown);
  }
  if (presentation && presentation.price > 0) parts.push(presentation.label);
  for (const extra of chosenExtras(builder, selection)) parts.push(extra.label);
  return parts.join(' · ');
}

/**
 * How many stems of a mix are still unassigned. Zero means it adds up; a
 * negative number means too many were handed out. Not an error on its own —
 * the form uses it to say what is left rather than to refuse anything.
 */
export function mixRemaining(builder: RoseBuilder, selection: RoseSelection): number {
  if (!isMixColor(builder, selection.colorId)) return 0;
  return selection.count - mixCount(selection.mix);
}

export type SelectionProblem = 'count' | 'color' | 'presentation' | 'extra' | 'mix';

/**
 * A selection as it arrived from a browser, checked against the stored card.
 * Returns the problem rather than a message: the caller knows what language it
 * is answering in.
 */
export function validateSelection(
  builder: RoseBuilder,
  raw: Partial<RoseSelection> | undefined
): { ok: true; selection: RoseSelection } | { ok: false; problem: SelectionProblem } {
  const count = Number(raw?.count);
  if (!Number.isInteger(count) || count < builder.min || count > builder.max) {
    return { ok: false, problem: 'count' };
  }
  if (!raw?.colorId || !findColor(builder, raw.colorId)) return { ok: false, problem: 'color' };
  if (!raw?.presentationId || !findPresentation(builder, raw.presentationId)) {
    return { ok: false, problem: 'presentation' };
  }
  /*
    A mix has to add up: the stems are what is being paid for, so "51 roses"
    and the colours listed under it cannot disagree about how many there are.
  */
  let mix: Record<string, number> | undefined;
  if (isMixColor(builder, raw.colorId)) {
    const mixable = new Set(mixableColors(builder).map((color) => color.id));
    const entries = Object.entries(raw.mix ?? {});
    if (entries.some(([id, n]) => !mixable.has(id) || !Number.isInteger(n) || n < 0)) {
      return { ok: false, problem: 'mix' };
    }
    if (mixCount(raw.mix) !== count) return { ok: false, problem: 'mix' };
    mix = Object.fromEntries(entries.filter(([, n]) => n > 0));
  }

  const offered = new Set(builderExtras(builder).map((extra) => extra.id));
  const extraIds = Array.from(new Set(raw.extraIds ?? []));
  if (extraIds.some((id) => !offered.has(id))) return { ok: false, problem: 'extra' };

  return {
    ok: true,
    selection: {
      count,
      colorId: raw.colorId,
      presentationId: raw.presentationId,
      extraIds,
      ...(mix ? { mix } : {}),
    },
  };
}
