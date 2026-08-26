'use client';

import Icon from '@/components/ui/Icon/Icon';
import { AdminField, blurOnWheel } from '@/components/admin/ui/AdminField';
import type { ApartmentService, ServiceUnit } from '@/types/apartment';
import styles from './AdminPricing.module.scss';

type AdminServicesProps = {
  /** Currency symbol of the apartment's region, for the field labels. */
  currencySymbol: string;
  services: ApartmentService[];
  onChange: (services: ApartmentService[]) => void;
};

/*
  Every extra added here is a flat charge for the whole stay. The per-night and
  per-guest units still exist in the model and are still billed correctly for
  services saved before — this form simply stopped offering a choice nobody was
  making.
*/
const DEFAULT_UNIT: ServiceUnit = 'stay';

const newId = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Cleaning, transfer and anything else charged on top of the nights. */
export default function AdminServices({
  services,
  onChange,
  currencySymbol,
}: AdminServicesProps) {
  const patch = (id: string, next: Partial<ApartmentService>) =>
    onChange(services.map((s) => (s.id === id ? { ...s, ...next } : s)));

  const add = () =>
    onChange([
      ...services,
      { id: newId(), name: '', price: 0, unit: DEFAULT_UNIT, required: false },
    ]);

  return (
    <AdminField label="Extra services">
      <div className={styles.block}>
        <p className={styles.hint}>
          Charged once for the whole stay. Required extras are always in the guest&apos;s
          total; the rest are shown as tick boxes on the apartment page.
        </p>

        {services.length === 0 ? (
          <p className={styles.empty}>No extras yet.</p>
        ) : (
          <div className={styles.rows}>
            {services.map((service) => (
              <div className={styles.serviceRow} key={service.id}>
                <label>
                  <span className={styles.cellLabel}>Name</span>
                  <input
                    className="input"
                    placeholder="Final cleaning"
                    value={service.name}
                    onChange={(e) => patch(service.id, { name: e.target.value })}
                  />
                </label>
                <label>
                  <span className={styles.cellLabel}>Price ({currencySymbol})</span>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    step={1}
                    onWheel={blurOnWheel}
                    min={0}
                    value={service.price}
                    onChange={(e) =>
                      patch(service.id, {
                        price: Math.max(0, parseInt(e.target.value || '0', 10)),
                      })
                    }
                  />
                </label>
                <label className={styles.required}>
                  <input
                    type="checkbox"
                    checked={service.required}
                    onChange={(e) => patch(service.id, { required: e.target.checked })}
                  />
                  Required
                </label>
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => onChange(services.filter((s) => s.id !== service.id))}
                  aria-label="Remove service"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button type="button" className={styles.add} onClick={add}>
          <Icon name="plus" size={14} />
          Add service
        </button>
      </div>
    </AdminField>
  );
}
