'use client';

import Icon from '@/components/ui/Icon/Icon';
import { AdminField } from '@/components/admin/ui/AdminField';
import type { ApartmentService, ServiceUnit } from '@/types/apartment';
import styles from './AdminPricing.module.scss';

type AdminServicesProps = {
  services: ApartmentService[];
  onChange: (services: ApartmentService[]) => void;
};

const UNIT_LABELS: Record<ServiceUnit, string> = {
  stay: 'per stay',
  night: 'per night',
  guest: 'per guest',
};

const newId = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Cleaning, transfer and anything else charged on top of the nights. */
export default function AdminServices({ services, onChange }: AdminServicesProps) {
  const patch = (id: string, next: Partial<ApartmentService>) =>
    onChange(services.map((s) => (s.id === id ? { ...s, ...next } : s)));

  const add = () =>
    onChange([
      ...services,
      { id: newId(), name: '', price: 0, unit: 'stay', required: false },
    ]);

  return (
    <AdminField label="Extra services">
      <div className={styles.block}>
        <p className={styles.hint}>
          Required extras are always in the guest&apos;s total. The rest are shown as
          tick boxes on the apartment page.
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
                  <span className={styles.cellLabel}>Price (₪)</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={service.price}
                    onChange={(e) =>
                      patch(service.id, {
                        price: Math.max(0, parseInt(e.target.value || '0', 10)),
                      })
                    }
                  />
                </label>
                <label>
                  <span className={styles.cellLabel}>Charged</span>
                  <select
                    className="input"
                    value={service.unit}
                    onChange={(e) =>
                      patch(service.id, { unit: e.target.value as ServiceUnit })
                    }
                  >
                    {(Object.keys(UNIT_LABELS) as ServiceUnit[]).map((unit) => (
                      <option key={unit} value={unit}>
                        {UNIT_LABELS[unit]}
                      </option>
                    ))}
                  </select>
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
