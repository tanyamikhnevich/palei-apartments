'use client';

import Icon from '@/components/ui/Icon/Icon';
import { AdminField, blurOnWheel } from '@/components/admin/ui/AdminField';
import type { PriceTier } from '@/types/apartment';
import styles from './AdminPricing.module.scss';

type AdminPriceTiersProps = {
  /** Currency symbol of the apartment's region, for the field labels. */
  currencySymbol: string;
  basePrice: number;
  tiers: PriceTier[];
  onChange: (tiers: PriceTier[]) => void;
};

/** Longer-stay rates. The base price covers everything below the first tier. */
export default function AdminPriceTiers({
  basePrice,
  tiers,
  onChange,
  currencySymbol,
}: AdminPriceTiersProps) {
  const patch = (index: number, next: Partial<PriceTier>) =>
    onChange(tiers.map((tier, i) => (i === index ? { ...tier, ...next } : tier)));

  const add = () => {
    const last = tiers[tiers.length - 1];
    onChange([
      ...tiers,
      {
        minNights: last ? last.minNights + 7 : 7,
        price: Math.max(1, Math.round((last?.price ?? basePrice) * 0.9)),
      },
    ]);
  };

  return (
    <AdminField label="Long-stay rates">
      <div className={styles.block}>
        <p className={styles.hint}>
          A stay of at least this many nights is billed entirely at that rate. Shorter stays
          use the price per night above.
        </p>

        {tiers.length > 0 && (
          <div className={styles.rows}>
            {tiers.map((tier, i) => (
              <div className={styles.tierRow} key={i}>
                <label>
                  <span className={styles.cellLabel}>From nights</span>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    step={1}
                    onWheel={blurOnWheel}
                    min={2}
                    value={tier.minNights}
                    onChange={(e) =>
                      patch(i, { minNights: Math.max(2, parseInt(e.target.value || '2', 10)) })
                    }
                  />
                </label>
                <label>
                  <span className={styles.cellLabel}>Price per night ({currencySymbol})</span>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    step={1}
                    onWheel={blurOnWheel}
                    min={0}
                    value={tier.price}
                    onChange={(e) =>
                      patch(i, { price: Math.max(0, parseInt(e.target.value || '0', 10)) })
                    }
                  />
                </label>
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => onChange(tiers.filter((_, idx) => idx !== i))}
                  aria-label="Remove rate"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button type="button" className={styles.add} onClick={add}>
          <Icon name="plus" size={14} />
          Add rate
        </button>
      </div>
    </AdminField>
  );
}
