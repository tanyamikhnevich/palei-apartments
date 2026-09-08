'use client';

import Icon from '@/components/ui/Icon/Icon';
import { blankCostLine, costMargin, costTotals, lineGross } from '@/lib/bouquetCost';
import { CURRENCY_SYMBOL, formatMoneyExact } from '@/lib/money';
import type { CurrencyCode } from '@/types/settings';
import type { BouquetCost, CostLine } from '@/types/flower';
import styles from './AdminFlowers.module.scss';

/**
 * The costing sheet: what went into the bouquet, and what the making of it was
 * worth.
 *
 * It is written the way it is kept on paper — a line per thing, quantity first,
 * supplier price net of VAT — because that is the shape the invoice arrives in
 * and re-typing it into anything else invites mistakes. Each line says for
 * itself whether VAT is added, since the roses and the ribbon rarely come from
 * the same kind of seller; the rate they share sits underneath, next to the
 * hours, because those do belong to the whole sheet.
 *
 * Nothing here is ever shown to a buyer.
 */

/** Blank instead of a stubborn 0 — a zero you have to delete first is a trap. */
function numberValue(value: number): string | number {
  return value ? value : '';
}

function toNumber(raw: string): number {
  const value = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

interface AdminBouquetCostProps {
  cost: BouquetCost;
  currency: CurrencyCode;
  /** The asking price, so the sheet can say what is left of it. */
  price: number;
  onChange: (cost: BouquetCost) => void;
}

export default function AdminBouquetCost({
  cost,
  currency,
  price,
  onChange,
}: AdminBouquetCostProps) {
  const symbol = CURRENCY_SYMBOL[currency];
  const totals = costTotals(cost);
  const margin = costMargin(price, totals.total);
  const money = (amount: number) => formatMoneyExact(amount, currency, 'en');

  const set = <K extends keyof BouquetCost>(key: K, value: BouquetCost[K]) =>
    onChange({ ...cost, [key]: value });

  const setLine = (id: string, patch: Partial<CostLine>) =>
    onChange({
      ...cost,
      lines: cost.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    });

  const addLine = () => onChange({ ...cost, lines: [...cost.lines, blankCostLine()] });

  /* One empty line always stays: a sheet with no rows has nowhere to type. */
  const removeLine = (id: string) => {
    const lines = cost.lines.filter((line) => line.id !== id);
    onChange({ ...cost, lines: lines.length ? lines : [blankCostLine()] });
  };

  return (
    <section className={styles.cost}>
      <div className={styles.costHead}>
        <h4>Cost price</h4>
        <span>Yours only — never shown in the shop</span>
      </div>

      <div className={styles.costTable} role="table" aria-label="What went into the bouquet">
        <div className={styles.costHeadRow} role="row">
          <span>Qty</span>
          <span>Item</span>
          <span>Price, no VAT ({symbol})</span>
          <span className={styles.costCentre}>+VAT</span>
          <span className={styles.costRight}>Line</span>
          <span />
        </div>

        {cost.lines.map((line) => (
          <div className={styles.costRow} role="row" key={line.id}>
            <input
              className="input"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              aria-label="Quantity"
              value={numberValue(line.qty)}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => setLine(line.id, { qty: toNumber(e.target.value) })}
            />
            <input
              className="input"
              placeholder="Roses, 50 cm"
              aria-label="Item"
              value={line.name}
              onChange={(e) => setLine(line.id, { name: e.target.value })}
            />
            <input
              className="input"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              aria-label="Price without VAT"
              value={numberValue(line.unitNet)}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => setLine(line.id, { unitNet: toNumber(e.target.value) })}
            />
            <label className={styles.costLineVat} title="Add VAT to this line">
              <input
                type="checkbox"
                aria-label="Add VAT to this line"
                checked={line.vat}
                onChange={(e) => setLine(line.id, { vat: e.target.checked })}
              />
            </label>
            <span className={`${styles.costRight} ${styles.costLineSum}`}>
              {money(lineGross(line, cost.vatRate))}
            </span>
            <button
              type="button"
              className={styles.costDrop}
              onClick={() => removeLine(line.id)}
              aria-label="Remove line"
            >
              <Icon name="x" size={15} />
            </button>
          </div>
        ))}
      </div>

      <button type="button" className={styles.costAdd} onClick={addLine}>
        <Icon name="plus" size={14} /> Add line
      </button>

      <div className={styles.costOptions}>
        <label className={styles.costRate}>
          <span>VAT rate, %</span>
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={numberValue(cost.vatRate)}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) => set('vatRate', toNumber(e.target.value))}
          />
        </label>
        <label className={styles.costRate}>
          <span>Hours on it</span>
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={numberValue(cost.hours)}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) => set('hours', toNumber(e.target.value))}
          />
        </label>
        <label className={styles.costRate}>
          <span>Your hour ({symbol})</span>
          <input
            className="input"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={numberValue(cost.hourlyRate)}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) => set('hourlyRate', toNumber(e.target.value))}
          />
        </label>
      </div>

      <dl className={styles.costSums}>
        <div>
          <dt>Materials, no VAT</dt>
          <dd>{money(totals.materialsNet)}</dd>
        </div>
        <div>
          <dt>VAT {cost.vatRate}% on the marked lines</dt>
          <dd>{money(totals.vat)}</dd>
        </div>
        <div>
          <dt>Your work</dt>
          <dd>{money(totals.labour)}</dd>
        </div>
        <div className={styles.costTotal}>
          <dt>Total</dt>
          <dd>{money(totals.total)}</dd>
        </div>
      </dl>

      {/* The point of the sheet: whether the shelf price actually covers it. */}
      <p className={`${styles.costMargin} ${margin.amount < 0 ? styles.costLoss : ''}`}>
        Sold at {formatMoneyExact(price, currency, 'en')} — leaves {money(margin.amount)}
        {price > 0 ? ` (${margin.percent}%)` : ''}
      </p>
    </section>
  );
}
