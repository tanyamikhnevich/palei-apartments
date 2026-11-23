'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Apartment } from '@/types/apartment';
import Button from '@/components/ui/Button/Button';
import { AdminSelect } from '@/components/admin/ui/AdminField';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { saveHomeFeatured } from '@/lib/api/client';
import { isApartmentListedOnSite } from '@/lib/apartmentVisibility';
import { HOME_FEATURED_LIMIT } from '@/lib/homeFeatured';
import { apartmentsInCountry } from '@/lib/regions';
import styles from './AdminSettings.module.scss';

const AUTOMATIC = '';

function toSlots(ids: string[]): string[] {
  return Array.from({ length: HOME_FEATURED_LIMIT }, (_, i) => ids[i] ?? AUTOMATIC);
}

function optionLabel(apt: Apartment): string {
  const { title, location } = getApartmentCopy(apt, 'en');
  const hidden = isApartmentListedOnSite(apt) ? '' : ' (hidden from site)';
  return `${title.trim()} · ${location}${hidden}`;
}

type AdminHomeFeaturedProps = {
  apartments: Apartment[];
  featuredIds: string[];
  /** False until the list has loaded, and without a database to save to. */
  ready: boolean;
  onSaved: (ids: string[]) => void;
};

export default function AdminHomeFeatured({
  apartments,
  featuredIds,
  ready,
  onSaved,
}: AdminHomeFeaturedProps) {
  const [slots, setSlots] = useState(() => toSlots(featuredIds));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => setSlots(toSlots(featuredIds)), [featuredIds]);

  // The home row only ever shows Israel, so nothing else can be picked for it.
  const candidates = useMemo(() => apartmentsInCountry(apartments, 'IL'), [apartments]);
  const known = new Set(candidates.map((apt) => apt.id));

  // A pick that has since been deleted reads as an empty slot.
  const shown = slots.map((id) => (known.has(id) ? id : AUTOMATIC));
  const chosen = shown.filter((id) => id !== AUTOMATIC);
  const dirty = chosen.join() !== featuredIds.filter((id) => known.has(id)).join();

  const optionsFor = (slot: number) => [
    { value: AUTOMATIC, label: 'Automatic: next apartment' },
    ...candidates
      .filter((apt) => apt.id === shown[slot] || isApartmentListedOnSite(apt))
      .filter((apt) => apt.id === shown[slot] || !shown.includes(apt.id))
      .map((apt) => ({ value: apt.id, label: optionLabel(apt) })),
  ];

  const choose = (slot: number, id: string) => {
    setSlots(shown.map((current, i) => (i === slot ? id : current)));
    setStatus(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      onSaved(await saveHomeFeatured(chosen));
      setStatus('Home page saved.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Could not save the home page');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.panel}>
      <h3>Home page</h3>
      <p className={styles.desc}>
        Which apartments guests see first, in this order. A hidden apartment is skipped and the
        next one takes its place.
      </p>
      <div className={styles.stack}>
        {shown.map((id, slot) => (
          <AdminSelect
            key={slot}
            label={`Position ${slot + 1}`}
            options={optionsFor(slot)}
            value={id}
            disabled={!ready || saving}
            onChange={(e) => choose(slot, e.target.value)}
          />
        ))}
        <div className={styles.foot}>
          {status && <p className={styles.status}>{status}</p>}
          <Button
            variant="primary"
            icon="check"
            onClick={handleSave}
            disabled={!ready || saving || !dirty}
          >
            {saving ? 'Saving…' : 'Save home page'}
          </Button>
        </div>
      </div>
    </div>
  );
}
