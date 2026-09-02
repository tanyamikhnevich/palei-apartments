'use client';

import { useState } from 'react';
import type { Apartment, ApartmentLocaleCopy, ApartmentStatus } from '@/types/apartment';
import { DEFAULT_AVAILABILITY } from '@/lib/availability';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import AdminAvailabilityCalendar from '@/components/admin/AdminAvailabilityCalendar/AdminAvailabilityCalendar';
import AdminCalendarSync from '@/components/admin/AdminCalendarSync/AdminCalendarSync';
import AdminTagPicker from '@/components/admin/AdminTagPicker/AdminTagPicker';
import { photoLabelFromTags } from '@/lib/apartmentTags';
import PhotoManager from '@/components/admin/ui/PhotoManager';
import { AdminField, AdminInput, AdminTextarea, blurOnWheel } from '@/components/admin/ui/AdminField';
import AdminPriceTiers from '@/components/admin/AdminPricing/AdminPriceTiers';
import AdminServices from '@/components/admin/AdminPricing/AdminServices';
import styles from './AdminApartmentModal.module.scss';
import { CURRENCY_SYMBOL } from '@/lib/money';
import { currencyForArea } from '@/lib/regions';
import { DEFAULT_AREA, REGIONS } from '@/types/region';

const STATUSES: ApartmentStatus[] = ['Available', 'Booked', 'Maintenance'];

function emptyEnCopy(): ApartmentLocaleCopy {
  return {
    title: '',
    location: '',
    description: '',
    photoLabel: '',
  };
}

function segClass(status: ApartmentStatus, active: ApartmentStatus): string {
  if (status !== active) return styles.segBtn;
  const map: Record<ApartmentStatus, string> = {
    Available: styles.onAvailable,
    Booked: styles.onBooked,
    Maintenance: styles.onMaintenance,
  };
  return `${styles.segBtn} ${styles.on} ${map[status]}`;
}


interface AdminApartmentModalProps {
  initial: Apartment | null;
  onClose: () => void;
  onSave: (apt: Apartment) => void;
}

export default function AdminApartmentModal({ initial, onClose, onSave }: AdminApartmentModalProps) {
  const editing = !!initial;
  const [form, setForm] = useState<Apartment>(() => {
    if (initial) {
      return {
        ...initial,
        beds: initial.beds ?? initial.bedrooms,
        minNights: initial.minNights ?? 1,
        photos: initial.photos?.length ? initial.photos : undefined,
        priceTiers: initial.priceTiers ?? [],
        services: initial.services ?? [],
        availability: initial.availability ?? DEFAULT_AVAILABILITY,
      };
    }
    const en = emptyEnCopy();
    return {
      id: `a${Date.now()}`,
      area: DEFAULT_AREA,
      guests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      price: 500,
      minNights: 1,
      status: 'Available',
      tagIds: [],
      rating: 5,
      reviews: 0,
      photos: [],
      priceTiers: [],
      services: [],
      availability: DEFAULT_AVAILABILITY,
      locales: { en, ru: { ...en }, he: { ...en }, fr: { ...en } },
    };
  });

  const en = form.locales.en;
  /* Prices are entered in the currency of the region the apartment sits in. */
  const currencySymbol = CURRENCY_SYMBOL[currencyForArea(form.area)];

  const setEn = (patch: Partial<ApartmentLocaleCopy>) => {
    setForm((prev) => ({
      ...prev,
      locales: { ...prev.locales, en: { ...prev.locales.en, ...patch } },
    }));
  };

  const setField = <K extends keyof Apartment>(key: K, value: Apartment[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /** Empty clears the pin; anything unparseable is ignored rather than saved as 0. */
  const setCoord = (key: 'lat' | 'lng', raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return setField(key, undefined);
    const value = Number(trimmed);
    if (Number.isFinite(value)) setField(key, value);
  };

  const setNum = (
    key: 'guests' | 'bedrooms' | 'beds' | 'bathrooms' | 'price' | 'minNights',
    raw: string
  ) => {
    const min = key === 'guests' || key === 'beds' || key === 'minNights' ? 1 : 0;
    setField(key, Math.max(min, parseInt(raw || '0', 10)) as Apartment[typeof key]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!en.title.trim() || !en.location.trim()) return;
    const photoLabel = photoLabelFromTags(form.tagIds);
    const enCopy = { ...en, photoLabel };
    onSave({
      ...form,
      photos: form.photos?.length ? form.photos : undefined,
      priceTiers: form.priceTiers?.length ? form.priceTiers : undefined,
      services: form.services?.filter((s) => s.name.trim()).length
        ? form.services.filter((s) => s.name.trim())
        : undefined,
      locales: {
        en: enCopy,
        ru: editing ? { ...form.locales.ru, photoLabel } : { ...enCopy },
        he: editing ? { ...form.locales.he, photoLabel } : { ...enCopy },
        // Listings saved before French existed have no `fr` copy — fall back to English.
        fr: editing ? { ...(form.locales.fr ?? enCopy), photoLabel } : { ...enCopy },
      },
    });
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className={styles.modal} onSubmit={submit}>
        <div className={styles.head}>
          <div>
            <h3>{editing ? 'Edit apartment' : 'Add new apartment'}</h3>
            <p>
              {editing
                ? 'Update the details guests will see on the website.'
                : 'Create a new listing for the public site.'}
            </p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.grid}>
            <AdminInput
              label="Title"
              placeholder="Sea Breeze Studio"
              value={en.title}
              onChange={(e) => setEn({ title: e.target.value })}
              autoFocus
            />
            <AdminInput
              label="Location"
              placeholder="Ben Gurion Blvd, Bat Yam"
              value={en.location}
              onChange={(e) => setEn({ location: e.target.value })}
            />
          </div>

          {/*
            Region is not decoration: it decides which currency the prices below
            are in, and which site the listing belongs to once the group splits
            across domains.
          */}
          <div className={styles.grid}>
            <AdminField label="Region">
              <select
                className="select"
                value={form.area}
                onChange={(e) => setField('area', e.target.value as Apartment['area'])}
              >
                {REGIONS.map((region) => (
                  <option key={region.area} value={region.area}>
                    {region.area} · {region.country} · {region.currency}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>

          <div className={styles.grid}>
            <AdminField label={`Price per night (${currencySymbol})`}>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                step={1}
                onWheel={blurOnWheel}
                min={0}
                value={form.price}
                onChange={(e) => setNum('price', e.target.value)}
              />
            </AdminField>
            <AdminField label="Minimum nights">
              <input
                className="input"
                type="number"
                inputMode="numeric"
                step={1}
                onWheel={blurOnWheel}
                min={1}
                value={form.minNights}
                onChange={(e) => setNum('minNights', e.target.value)}
              />
            </AdminField>
          </div>

          <AdminPriceTiers
            currencySymbol={currencySymbol}
            basePrice={form.price}
            tiers={form.priceTiers ?? []}
            onChange={(priceTiers) => setField('priceTiers', priceTiers)}
          />

          <AdminServices
            currencySymbol={currencySymbol}
            services={form.services ?? []}
            onChange={(services) => setField('services', services)}
          />

          <div className={styles.grid}>
            <AdminField label="Latitude">
              <input
                className="input"
                type="number"
                inputMode="decimal"
                step="any"
                onWheel={blurOnWheel}
                placeholder="32.0227269"
                value={form.lat ?? ''}
                onChange={(e) => setCoord('lat', e.target.value)}
              />
            </AdminField>
            <AdminField label="Longitude">
              <input
                className="input"
                type="number"
                inputMode="decimal"
                step="any"
                onWheel={blurOnWheel}
                placeholder="34.7439456"
                value={form.lng ?? ''}
                onChange={(e) => setCoord('lng', e.target.value)}
              />
            </AdminField>
          </div>
          <p className={styles.coordHint}>
            Puts the apartment on the listing map. In Google Maps, right-click the building
            and copy the pair of numbers — latitude first.
          </p>

          <AdminTextarea
            label="Description"
            placeholder="Sun-filled studio one block from the promenade…"
            value={en.description}
            onChange={(e) => setEn({ description: e.target.value })}
          />

          <div className={styles.grid4}>
            <AdminField label="Guests">
              <input
                className="input"
                type="number"
                inputMode="numeric"
                step={1}
                onWheel={blurOnWheel}
                min={1}
                value={form.guests}
                onChange={(e) => setNum('guests', e.target.value)}
              />
            </AdminField>
            <AdminField label="Bedrooms">
              <input
                className="input"
                type="number"
                inputMode="numeric"
                step={1}
                onWheel={blurOnWheel}
                min={0}
                value={form.bedrooms}
                onChange={(e) => setNum('bedrooms', e.target.value)}
              />
            </AdminField>
            <AdminField label="Beds">
              <input
                className="input"
                type="number"
                inputMode="numeric"
                step={1}
                onWheel={blurOnWheel}
                min={1}
                value={form.beds}
                onChange={(e) => setNum('beds', e.target.value)}
              />
            </AdminField>
            <AdminField label="Bathrooms">
              <input
                className="input"
                type="number"
                inputMode="numeric"
                step={1}
                onWheel={blurOnWheel}
                min={0}
                value={form.bathrooms}
                onChange={(e) => setNum('bathrooms', e.target.value)}
              />
            </AdminField>
          </div>

          <AdminTagPicker
            value={form.tagIds}
            onChange={(tagIds) => setField('tagIds', tagIds)}
          />

          <AdminField label="Listing status">
            <div className={styles.seg}>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={segClass(s, form.status)}
                  onClick={() => setField('status', s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </AdminField>

          <AdminField label="Availability calendar">
            <AdminAvailabilityCalendar
              value={form.availability ?? DEFAULT_AVAILABILITY}
              onChange={(availability) => setField('availability', availability)}
            />
          </AdminField>

          {/* Only for a saved apartment: the export link is minted on first save,
              and a feed has to hang off an id that already exists. */}
          {editing && (
            <AdminCalendarSync apartmentId={form.id} icalToken={form.icalToken} />
          )}

          <PhotoManager
            photos={form.photos ?? []}
            onChange={(photos) => setField('photos', photos)}
          />
        </div>

        <div className={styles.foot}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon={editing ? 'check' : 'plus'}>
            {editing ? 'Save changes' : 'Add apartment'}
          </Button>
        </div>
      </form>
    </div>
  );
}
