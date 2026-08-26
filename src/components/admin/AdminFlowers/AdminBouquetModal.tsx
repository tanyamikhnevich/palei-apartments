'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import { AdminField, AdminInput } from '@/components/admin/ui/AdminField';
import PhotoManager from '@/components/admin/ui/PhotoManager';
import { CURRENCY_SYMBOL } from '@/lib/money';
import { currencyForArea } from '@/lib/regions';
import { DEFAULT_AREA, REGIONS } from '@/types/region';
import { LOCALES, type Locale } from '@/i18n/types';
import { ITEM_KINDS, type Bouquet, type BouquetCategory, type ItemKind } from '@/types/flower';
import styles from './AdminFlowers.module.scss';

/*
  Categories are grouped by what is being sold: a balloon is never "seasonal"
  and a bouquet is never a "number", so offering the wrong ones only invites
  mistakes.
*/
const CATEGORIES: Record<ItemKind, BouquetCategory[]> = {
  flowers: ['classic', 'seasonal', 'roses', 'boxed', 'plants'],
  balloons: ['numbers', 'birthday', 'baby'],
  mixed: ['classic', 'boxed', 'birthday', 'baby'],
};

function blankBouquet(): Bouquet {
  const empty = { name: '', note: '' };
  return {
    id: `bq-${Date.now()}`,
    area: DEFAULT_AREA,
    kind: 'flowers',
    category: 'classic',
    price: 200,
    sameDay: true,
    listed: true,
    locales: { en: { ...empty }, ru: { ...empty }, he: { ...empty }, fr: { ...empty } },
  };
}

interface AdminBouquetModalProps {
  bouquet: Bouquet | null;
  onClose: () => void;
  onSave: (bouquet: Bouquet) => void;
}

export default function AdminBouquetModal({ bouquet, onClose, onSave }: AdminBouquetModalProps) {
  const [form, setForm] = useState<Bouquet>(() => bouquet ?? blankBouquet());
  const [tab, setTab] = useState<Locale>('en');
  const symbol = CURRENCY_SYMBOL[currencyForArea(form.area)];

  const set = <K extends keyof Bouquet>(key: K, value: Bouquet[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /* Changing what it is can strand the category, so it moves with it. */
  const setKind = (kind: ItemKind) =>
    setForm((prev) => ({
      ...prev,
      kind,
      category: CATEGORIES[kind].includes(prev.category) ? prev.category : CATEGORIES[kind][0],
    }));

  const setCopy = (locale: Locale, patch: Partial<Bouquet['locales'][Locale]>) =>
    setForm((prev) => ({
      ...prev,
      locales: { ...prev.locales, [locale]: { ...prev.locales[locale], ...patch } },
    }));

  /* English is the fallback every other language falls back to, so it is the
     one that has to be filled in. */
  const complete = form.locales.en.name.trim().length > 0;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <h3>{bouquet ? 'Edit item' : 'Add item'}</h3>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.tabs} role="group" aria-label="Language">
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                className={`${styles.tab} ${tab === l ? styles.tabOn : ''}`}
                onClick={() => setTab(l)}
              >
                {l.toUpperCase()}
                {l === 'en' && !form.locales.en.name.trim() && <span aria-hidden="true"> •</span>}
              </button>
            ))}
          </div>

          <p className={styles.tabHint}>
            English is enough — any language left blank falls back to it, field by field.
          </p>

          <AdminInput
            label={`Name (${tab.toUpperCase()})`}
            placeholder="Peonies, 15 stems"
            value={form.locales[tab].name}
            onChange={(e) => setCopy(tab, { name: e.target.value })}
            autoFocus
          />
          <AdminInput
            label={`Note (${tab.toUpperCase()})`}
            placeholder="The classic. Opens over two or three days."
            value={form.locales[tab].note}
            onChange={(e) => setCopy(tab, { note: e.target.value })}
          />

          <div className={styles.grid}>
            <AdminField label="What is it">
              <select
                className="select"
                value={form.kind}
                onChange={(e) => setKind(e.target.value as ItemKind)}
              >
                {ITEM_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Category">
              <select
                className="select"
                value={form.category}
                onChange={(e) => set('category', e.target.value as BouquetCategory)}
              >
                {CATEGORIES[form.kind].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>

          <div className={styles.grid}>
            <AdminField label="Region">
              <select
                className="select"
                value={form.area}
                onChange={(e) => set('area', e.target.value as Bouquet['area'])}
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
            <AdminInput
              label={`Price (${symbol})`}
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => set('price', parseInt(e.target.value, 10) || 0)}
            />
            <AdminInput
              label={form.kind === 'balloons' ? 'Balloons (optional)' : 'Stems (optional)'}
              type="number"
              min={0}
              value={form.stems ?? ''}
              onChange={(e) =>
                set('stems', e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
            />
          </div>

          {/* Bouquets are shot tall, so the thumbnails are too. */}
          <PhotoManager
            photos={form.photos ?? []}
            onChange={(photos) => set('photos', photos.length ? photos : undefined)}
            aspect="portrait"
          />

          <div className={styles.checks}>
            <label>
              <input
                type="checkbox"
                checked={form.sameDay}
                onChange={(e) => set('sameDay', e.target.checked)}
              />
              Can go out the same day
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.listed}
                onChange={(e) => set('listed', e.target.checked)}
              />
              Show in the window
            </label>
          </div>
        </div>

        <div className={styles.modalFoot}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!complete} onClick={() => onSave(form)}>
            {bouquet ? 'Save' : 'Add item'}
          </Button>
        </div>
      </div>
    </div>
  );
}
