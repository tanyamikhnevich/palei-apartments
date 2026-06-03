'use client';

import type { ApartmentTagId } from '@/types/apartment';
import { APARTMENT_TAG_IDS, TAG_LABELS_EN } from '@/lib/apartmentMedia';
import { AdminField } from '@/components/admin/ui/AdminField';
import styles from './AdminTagPicker.module.scss';

interface AdminTagPickerProps {
  value: ApartmentTagId[];
  onChange: (tags: ApartmentTagId[]) => void;
}

export default function AdminTagPicker({ value, onChange }: AdminTagPickerProps) {
  const toggle = (id: ApartmentTagId) => {
    if (value.includes(id)) {
      onChange(value.filter((t) => t !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <AdminField label="Tags (shown on listing cards)">
      <div className={styles.chips}>
        {APARTMENT_TAG_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={`${styles.chip} ${value.includes(id) ? styles.on : ''}`}
            onClick={() => toggle(id)}
          >
            {TAG_LABELS_EN[id]}
          </button>
        ))}
      </div>
    </AdminField>
  );
}
