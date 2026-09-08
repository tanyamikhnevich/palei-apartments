'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import { AdminField, AdminInput } from '@/components/admin/ui/AdminField';
import PhotoManager from '@/components/admin/ui/PhotoManager';
import AdminBouquetCost from './AdminBouquetCost';
import { blankCost, hasCost } from '@/lib/bouquetCost';
import { DEFAULT_FLOWER_AREA, FLOWER_REGIONS, sellsHere } from '@/lib/flowers';
import { CURRENCY_SYMBOL } from '@/lib/money';
import { currencyForArea } from '@/lib/regions';
import { LOCALES, type Locale } from '@/i18n/types';
import {
  ITEM_KINDS,
  type Bouquet,
  type BouquetCost,
  type BouquetCategory,
  type ItemKind,
} from '@/types/flower';
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
    area: DEFAULT_FLOWER_AREA,
    kind: 'flowers',
    category: 'classic',
    price: 200,
    sameDay: false,
    listed: true,
    locales: { en: { ...empty }, ru: { ...empty }, he: { ...empty }, fr: { ...empty } },
  };
}

interface AdminBouquetModalProps {
  bouquet: Bouquet | null;
  /** The save is in flight — the form waits rather than closing on hope. */
  saving?: boolean;
  onClose: () => void;
  onSave: (bouquet: Bouquet) => void;
}

export default function AdminBouquetModal({
  bouquet,
  saving = false,
  onClose,
  onSave,
}: AdminBouquetModalProps) {
  /* The sheet is built once, on open. Building it during render would hand the
     rows a fresh id on every keystroke and pull the focus out of the field. */
  const [form, setForm] = useState<Bouquet>(() => {
    const base = bouquet ?? blankBouquet();
    /* A row left over from when the shop offered Cyprus cannot be sold and can
       no longer be re-pointed by hand, so opening it brings it home. */
    const area = sellsHere(base) ? base.area : DEFAULT_FLOWER_AREA;
    return { ...base, area, cost: base.cost ?? blankCost() };
  });
  const [tab, setTab] = useState<Locale>('en');
  const symbol = CURRENCY_SYMBOL[currencyForArea(form.area)];

  /* Always present in the form — `save` is what decides whether it is kept. */
  const cost: BouquetCost = form.cost ?? blankCost();

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

  /* A sheet nobody filled in is not worth storing — it would only make every
     bouquet look costed when none of them are. */
  const save = () =>
    onSave({
      ...form,
      cost: hasCost(cost)
        ? { ...cost, lines: cost.lines.filter((l) => l.name.trim() || l.unitNet > 0) }
        : undefined,
    });

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

          {/* One region, no choice to make — the select appears if that changes. */}
          {FLOWER_REGIONS.length > 1 && (
            <div className={styles.grid}>
              <AdminField label="Region">
                <select
                  className="select"
                  value={form.area}
                  onChange={(e) => set('area', e.target.value as Bouquet['area'])}
                >
                  {FLOWER_REGIONS.map((r) => (
                    <option key={r.area} value={r.area}>
                      {r.area} · {r.currency}
                    </option>
                  ))}
                </select>
              </AdminField>
            </div>
          )}

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

          <AdminBouquetCost
            cost={cost}
            currency={currencyForArea(form.area)}
            price={form.price}
            onChange={(next) => set('cost', next)}
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
              Published in the shop
            </label>
          </div>
          <p className={styles.tabHint}>
            Unpublished items stay here with everything filled in, but disappear from the shop
            pages — for flowers that are out of season rather than gone.
          </p>
        </div>

        <div className={styles.modalFoot}>
          <Button variant="ghost" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!complete || saving} onClick={save}>
            {saving ? 'Saving…' : bouquet ? 'Save' : 'Add item'}
          </Button>
        </div>
      </div>
    </div>
  );
}
