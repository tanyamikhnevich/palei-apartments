'use client';

import Icon from '@/components/ui/Icon/Icon';
import { AdminField, AdminInput } from '@/components/admin/ui/AdminField';
import {
  builderExtras,
  builderFromPrice,
  presentationTiers,
  pricePerStem,
  sortedTiers,
} from '@/lib/roseBuilder';
import { CURRENCY_SYMBOL, formatMoneyExact } from '@/lib/money';
import type { CurrencyCode } from '@/types/settings';
import type {
  BuilderExtra,
  Presentation,
  RoseBuilder,
  RoseColor,
  StemTier,
} from '@/types/flower';
import styles from './AdminFlowers.module.scss';

/**
 * The made-to-order rose card, as the florist sets it up: what a stem costs at
 * each size, which colours can be had and how long each takes to get in, and
 * what the wrapping or the basket adds.
 *
 * Deliberately plain rows rather than a wizard — this is a price list, it is
 * edited rarely, and a price list is easiest to check when it looks like one.
 */

function toInt(raw: string): number {
  const value = parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function toPrice(raw: string): number {
  const value = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/** Blank instead of a stubborn 0 — a zero you have to delete first is a trap. */
function numberValue(value: number): string | number {
  return value ? value : '';
}

function slug(label: string, taken: string[]): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'option';
  let id = base;
  for (let n = 2; taken.includes(id); n += 1) id = `${base}-${n}`;
  return id;
}

interface AdminBouquetBuilderProps {
  builder: RoseBuilder;
  currency: CurrencyCode;
  onChange: (builder: RoseBuilder) => void;
}

export default function AdminBouquetBuilder({
  builder,
  currency,
  onChange,
}: AdminBouquetBuilderProps) {
  const symbol = CURRENCY_SYMBOL[currency];
  const set = <K extends keyof RoseBuilder>(key: K, value: RoseBuilder[K]) =>
    onChange({ ...builder, [key]: value });

  const setTier = (index: number, patch: Partial<StemTier>) =>
    set(
      'tiers',
      builder.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier))
    );

  const setColor = (index: number, patch: Partial<RoseColor>) =>
    set(
      'colors',
      builder.colors.map((color, i) => (i === index ? { ...color, ...patch } : color))
    );

  const setPresentation = (index: number, patch: Partial<Presentation>) =>
    set(
      'presentations',
      builder.presentations.map((p, i) => (i === index ? { ...p, ...patch } : p))
    );

  const extras = builderExtras(builder);
  const setExtra = (index: number, patch: Partial<BuilderExtra>) =>
    set(
      'extras',
      extras.map((extra, i) => (i === index ? { ...extra, ...patch } : extra))
    );

  /* What the shop will say on the card, so a wrong tier is visible here. */
  const preview = sortedTiers(builder).map((tier) => ({
    from: tier.from,
    each: tier.pricePerStem,
    total: tier.from * pricePerStem(builder, tier.from),
  }));

  return (
    <div className={styles.builder}>
      <div className={styles.grid}>
        <AdminInput
          label="Fewest roses"
          type="number"
          min={1}
          value={numberValue(builder.min)}
          onChange={(e) => set('min', toInt(e.target.value))}
        />
        <AdminInput
          label="Most roses"
          type="number"
          min={1}
          value={numberValue(builder.max)}
          onChange={(e) => set('max', toInt(e.target.value))}
        />
      </div>

      <AdminInput
        label="One-tap counts"
        placeholder="11, 25, 51, 101"
        value={builder.presets.join(', ')}
        onChange={(e) =>
          set(
            'presets',
            e.target.value
              .split(',')
              .map((n) => parseInt(n.trim(), 10))
              .filter((n) => Number.isInteger(n) && n > 0)
          )
        }
      />

      <AdminField label={`Price per stem (${symbol})`}>
        <div className={styles.builderRows}>
          {builder.tiers.map((tier, i) => (
            <div className={styles.builderRow} key={i}>
              <span className={styles.builderFrom}>from</span>
              <input
                className="input"
                type="number"
                min={1}
                value={numberValue(tier.from)}
                onChange={(e) => setTier(i, { from: toInt(e.target.value) })}
                aria-label="From this many roses"
              />
              <input
                className="input"
                type="number"
                min={0}
                step="0.5"
                value={numberValue(tier.pricePerStem)}
                onChange={(e) => setTier(i, { pricePerStem: toPrice(e.target.value) })}
                aria-label={`Price per stem in ${currency}`}
              />
              <button
                type="button"
                className={styles.builderDel}
                aria-label="Remove tier"
                disabled={builder.tiers.length === 1}
                onClick={() => set('tiers', builder.tiers.filter((_, idx) => idx !== i))}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.builderAdd}
            onClick={() =>
              set('tiers', [
                ...builder.tiers,
                { from: (builder.tiers.at(-1)?.from ?? builder.min) + 10, pricePerStem: 0 },
              ])
            }
          >
            <Icon name="plus" size={14} /> Add a tier
          </button>
        </div>
      </AdminField>

      <AdminField label="Colours">
        <div className={styles.builderRows}>
          {builder.colors.map((color, i) => (
            <div className={styles.builderRow} key={color.id}>
              <input
                className={styles.builderSwatch}
                type="color"
                value={color.swatch}
                onChange={(e) => setColor(i, { swatch: e.target.value })}
                aria-label={`${color.label} swatch`}
              />
              {/* A second hue paints a fixed pair — "red and white". */}
              <input
                className={styles.builderSwatch}
                type="color"
                value={color.swatch2 ?? color.swatch}
                onChange={(e) => setColor(i, { swatch2: e.target.value })}
                aria-label={`${color.label} second swatch`}
                title="Second colour of a fixed pair"
              />
              <button
                type="button"
                className={`${styles.builderDel} ${color.mix ? styles.builderOn : ''}`}
                aria-pressed={Boolean(color.mix)}
                onClick={() => setColor(i, { mix: !color.mix })}
                title="Buyer chooses how many of each colour"
              >
                mix
              </button>
              <button
                type="button"
                className={`${styles.builderDel} ${color.onRequest ? styles.builderOn : ''}`}
                aria-pressed={Boolean(color.onRequest)}
                onClick={() => setColor(i, { onRequest: !color.onRequest })}
                title="Shown as “on request” — availability confirmed with the order"
              >
                ?
              </button>
              <input
                className="input"
                value={color.label}
                placeholder="Light pink"
                onChange={(e) => setColor(i, { label: e.target.value })}
                aria-label="Colour name, in English"
              />
              <input
                className="input"
                type="number"
                min={0}
                max={30}
                value={numberValue(color.leadDays)}
                onChange={(e) => setColor(i, { leadDays: toInt(e.target.value) })}
                aria-label="Days needed to get it in"
              />
              <button
                type="button"
                className={styles.builderDel}
                aria-label="Remove colour"
                disabled={builder.colors.length === 1}
                onClick={() => set('colors', builder.colors.filter((_, idx) => idx !== i))}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.builderAdd}
            onClick={() =>
              set('colors', [
                ...builder.colors,
                {
                  id: slug('colour', builder.colors.map((c) => c.id)),
                  label: '',
                  swatch: '#e8a0b4',
                  leadDays: 2,
                },
              ])
            }
          >
            <Icon name="plus" size={14} /> Add a colour
          </button>
        </div>
      </AdminField>
      <p className={styles.tabHint}>
        <b>mix</b> makes that entry the made-up one: picking it asks the buyer how many of each
        of the other colours, and the bouquet waits for the slowest colour they choose.
      </p>
      <p className={styles.tabHint}>
        Days are a wait the calendar keeps: 0 for what is always in the bucket, 2 for what has to
        be brought in. <b>?</b> is the softer answer — the colour shows as &ldquo;on request&rdquo;,
        no dates move, and you confirm it when you take the order.
      </p>

      <AdminField label={`Presentation (${symbol} on top)`}>
        <div className={styles.builderRows}>
          {builder.presentations.map((presentation, i) => (
            <div key={presentation.id}>
            <div className={styles.builderRow}>
              <input
                className="input"
                value={presentation.label}
                placeholder="In a basket"
                onChange={(e) => setPresentation(i, { label: e.target.value })}
                aria-label="What it is called, in English"
              />
              <input
                className="input"
                type="number"
                min={0}
                value={numberValue(presentation.price)}
                onChange={(e) => setPresentation(i, { price: toPrice(e.target.value) })}
                aria-label={`Surcharge in ${currency}`}
              />
              <button
                type="button"
                className={styles.builderDel}
                aria-label="Add a size price"
                title="Another price from a bigger bouquet"
                onClick={() =>
                  setPresentation(i, {
                    tiers: [
                      ...presentationTiers(presentation),
                      {
                        from: (presentationTiers(presentation).at(-1)?.from ?? builder.min) + 40,
                        price: presentation.price,
                      },
                    ],
                  })
                }
              >
                <Icon name="plus" size={14} />
              </button>
              <button
                type="button"
                className={styles.builderDel}
                aria-label="Remove option"
                disabled={builder.presentations.length === 1}
                onClick={() =>
                  set('presentations', builder.presentations.filter((_, idx) => idx !== i))
                }
              >
                <Icon name="x" size={14} />
              </button>
            </div>
            {presentationTiers(presentation).map((tier, ti) => (
              <div className={`${styles.builderRow} ${styles.builderSub}`} key={ti}>
                <span className={styles.builderFrom}>from</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={numberValue(tier.from)}
                  onChange={(e) =>
                    setPresentation(i, {
                      tiers: presentationTiers(presentation).map((t, idx) =>
                        idx === ti ? { ...t, from: toInt(e.target.value) } : t
                      ),
                    })
                  }
                  aria-label="From this many roses"
                />
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={numberValue(tier.price)}
                  onChange={(e) =>
                    setPresentation(i, {
                      tiers: presentationTiers(presentation).map((t, idx) =>
                        idx === ti ? { ...t, price: toPrice(e.target.value) } : t
                      ),
                    })
                  }
                  aria-label={`Price in ${currency}`}
                />
                <button
                  type="button"
                  className={styles.builderDel}
                  aria-label="Remove size price"
                  onClick={() =>
                    setPresentation(i, {
                      tiers: presentationTiers(presentation).filter((_, idx) => idx !== ti),
                    })
                  }
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
            </div>
          ))}
          <button
            type="button"
            className={styles.builderAdd}
            onClick={() =>
              set('presentations', [
                ...builder.presentations,
                {
                  id: slug('option', builder.presentations.map((p) => p.id)),
                  label: '',
                  price: 0,
                },
              ])
            }
          >
            <Icon name="plus" size={14} /> Add an option
          </button>
        </div>
      </AdminField>
      <p className={styles.tabHint}>
        The first one is what the form opens on, so put the plainest first — stem-tied at 0. The
        <b> +</b> adds a price for bigger bouquets: a basket for 101 roses is not the basket for
        11. Above your largest size the buyer is told the price is a minimum and you settle it
        when confirming.
      </p>

      <AdminField label={`Add-ons (${symbol} on top)`}>
        <div className={styles.builderRows}>
          {extras.map((extra, i) => (
            <div className={styles.builderRow} key={extra.id}>
              <input
                className="input"
                value={extra.label}
                placeholder="Greenery"
                onChange={(e) => setExtra(i, { label: e.target.value })}
                aria-label="What it is called, in English"
              />
              <input
                className="input"
                type="number"
                min={0}
                value={numberValue(extra.price)}
                onChange={(e) => setExtra(i, { price: toPrice(e.target.value) })}
                aria-label={`Price in ${currency}`}
              />
              <button
                type="button"
                className={styles.builderDel}
                aria-label="Remove add-on"
                onClick={() => set('extras', extras.filter((_, idx) => idx !== i))}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.builderAdd}
            onClick={() =>
              set('extras', [
                ...extras,
                { id: slug('extra', extras.map((e) => e.id)), label: '', price: 0 },
              ])
            }
          >
            <Icon name="plus" size={14} /> Add an add-on
          </button>
        </div>
      </AdminField>
      <p className={styles.tabHint}>
        Tick-boxes for the buyer: greenery, a vase, a card. Leave the list empty and nothing is
        asked.
      </p>

      <div className={styles.builderPreview}>
        <b>
          Card shows: from {formatMoneyExact(builderFromPrice(builder), currency, 'en')}
        </b>
        {preview.map((row) => (
          <span key={row.from}>
            {row.from}+ · {formatMoneyExact(row.each, currency, 'en')} each ·{' '}
            {row.from} = {formatMoneyExact(row.total, currency, 'en')}
          </span>
        ))}
      </div>
    </div>
  );
}
