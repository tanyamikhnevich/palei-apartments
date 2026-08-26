'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import { AdminField, AdminInput } from '@/components/admin/ui/AdminField';
import { CURRENCY_SYMBOL } from '@/lib/money';
import { currencyForArea } from '@/lib/regions';
import { DEFAULT_AREA, REGIONS } from '@/types/region';
import type { Car, CarClass, Transmission } from '@/types/car';
import styles from './AdminCars.module.scss';

const CLASSES: CarClass[] = ['economy', 'compact', 'crossover', 'van', 'premium'];
const TRANSMISSIONS: Transmission[] = ['automatic', 'manual'];

function blankCar(): Car {
  return {
    id: `car-${Date.now()}`,
    area: DEFAULT_AREA,
    make: '',
    model: '',
    year: new Date().getFullYear(),
    carClass: 'economy',
    transmission: 'automatic',
    seats: 5,
    bags: 2,
    airConditioning: true,
    pricePerDay: 150,
    minDays: 1,
    deposit: 1000,
    pickupPoints: ['Bat Yam'],
    status: 'Available',
    blocks: [],
  };
}

interface AdminCarModalProps {
  /** An existing car to edit, or null to create one. */
  car: Car | null;
  onClose: () => void;
  onSave: (car: Car) => void;
}

export default function AdminCarModal({ car, onClose, onSave }: AdminCarModalProps) {
  const [form, setForm] = useState<Car>(() => car ?? blankCar());
  const symbol = CURRENCY_SYMBOL[currencyForArea(form.area)];

  const set = <K extends keyof Car>(key: K, value: Car[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const num = (key: 'year' | 'seats' | 'bags' | 'pricePerDay' | 'minDays' | 'deposit', raw: string) => {
    const parsed = parseInt(raw, 10);
    set(key, (Number.isFinite(parsed) ? parsed : 0) as Car[typeof key]);
  };

  const complete = form.make.trim() && form.model.trim() && form.pickupPoints.length > 0;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <h3>{car ? 'Edit car' : 'Add car'}</h3>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.grid}>
            <AdminInput
              label="Make"
              placeholder="Toyota"
              value={form.make}
              onChange={(e) => set('make', e.target.value)}
              autoFocus
            />
            <AdminInput
              label="Model"
              placeholder="Yaris"
              value={form.model}
              onChange={(e) => set('model', e.target.value)}
            />
          </div>

          <div className={styles.grid}>
            <AdminInput
              label="Year"
              type="number"
              value={form.year}
              onChange={(e) => num('year', e.target.value)}
            />
            <AdminField label="Region">
              <select
                className="select"
                value={form.area}
                onChange={(e) => set('area', e.target.value as Car['area'])}
              >
                {REGIONS.map((r) => (
                  <option key={r.area} value={r.area}>
                    {r.area} · {r.currency}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>

          <div className={styles.grid}>
            <AdminField label="Class">
              <select
                className="select"
                value={form.carClass}
                onChange={(e) => set('carClass', e.target.value as CarClass)}
              >
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Transmission">
              <select
                className="select"
                value={form.transmission}
                onChange={(e) => set('transmission', e.target.value as Transmission)}
              >
                {TRANSMISSIONS.map((tr) => (
                  <option key={tr} value={tr}>
                    {tr}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>

          <div className={styles.grid}>
            <AdminInput
              label="Seats"
              type="number"
              min={1}
              value={form.seats}
              onChange={(e) => num('seats', e.target.value)}
            />
            <AdminInput
              label="Suitcases"
              type="number"
              min={0}
              value={form.bags}
              onChange={(e) => num('bags', e.target.value)}
            />
          </div>

          <div className={styles.grid}>
            <AdminInput
              label={`Price per day (${symbol})`}
              type="number"
              min={0}
              value={form.pricePerDay}
              onChange={(e) => num('pricePerDay', e.target.value)}
            />
            <AdminInput
              label={`Deposit (${symbol})`}
              type="number"
              min={0}
              value={form.deposit}
              onChange={(e) => num('deposit', e.target.value)}
            />
          </div>

          <div className={styles.grid}>
            <AdminInput
              label="Minimum hire (days)"
              type="number"
              min={1}
              value={form.minDays}
              onChange={(e) => num('minDays', e.target.value)}
            />
            <AdminField label="Status">
              <select
                className="select"
                value={form.status}
                onChange={(e) => set('status', e.target.value as Car['status'])}
              >
                <option value="Available">Available</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </AdminField>
          </div>

          <AdminInput
            label="Pick-up points (comma separated)"
            placeholder="Bat Yam, Ben Gurion Airport"
            value={form.pickupPoints.join(', ')}
            onChange={(e) =>
              set(
                'pickupPoints',
                e.target.value
                  .split(',')
                  .map((p) => p.trim())
                  .filter(Boolean)
              )
            }
          />
        </div>

        <div className={styles.modalFoot}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!complete} onClick={() => onSave(form)}>
            {car ? 'Save' : 'Add car'}
          </Button>
        </div>
      </div>
    </div>
  );
}
