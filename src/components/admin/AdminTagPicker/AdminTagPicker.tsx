'use client';

import { useState } from 'react';
import type { ApartmentTagId } from '@/types/apartment';
import { APARTMENT_TAG_IDS, TAG_LABELS_EN } from '@/lib/apartmentMedia';
import { isPresetTagId, normalizeCustomTagInput } from '@/lib/apartmentTags';
import { AdminField } from '@/components/admin/ui/AdminField';
import Icon from '@/components/ui/Icon/Icon';
import styles from './AdminTagPicker.module.scss';

interface AdminTagPickerProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

function reorderList<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function AdminTagPicker({ value, onChange }: AdminTagPickerProps) {
  const [customDraft, setCustomDraft] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const togglePreset = (id: ApartmentTagId) => {
    if (value.includes(id)) {
      onChange(value.filter((t) => t !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const addCustom = () => {
    const label = normalizeCustomTagInput(customDraft);
    if (!label) {
      setCustomError('Enter a short tag name (up to 48 characters)');
      return;
    }
    const duplicate = value.some(
      (t) => t.toLowerCase() === label.toLowerCase() || (isPresetTagId(t) && TAG_LABELS_EN[t].toLowerCase() === label.toLowerCase())
    );
    if (duplicate) {
      setCustomError('This tag is already added');
      return;
    }
    setCustomError(null);
    onChange([...value, label]);
    setCustomDraft('');
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <AdminField label="Tags (shown on listing cards)">
      <p className={styles.hint}>
        First tag is the caption when there is no photo. Drag to reorder.
      </p>

      <div className={styles.chips}>
        {APARTMENT_TAG_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={`${styles.chip} ${value.includes(id) ? styles.on : ''}`}
            onClick={() => togglePreset(id)}
          >
            {TAG_LABELS_EN[id]}
          </button>
        ))}
      </div>

      <div className={styles.customRow}>
        <input
          className="input"
          type="text"
          placeholder="Your own tag, e.g. Rooftop pool"
          value={customDraft}
          onChange={(e) => {
            setCustomDraft(e.target.value);
            setCustomError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <button type="button" className={styles.addBtn} onClick={addCustom}>
          <Icon name="plus" size={16} />
          Add tag
        </button>
      </div>
      {customError && <p className={styles.error}>{customError}</p>}

      {value.length > 0 && (
        <ol className={styles.ordered}>
          {value.map((tag, i) => (
            <li
              key={`${tag}-${i}`}
              className={`${styles.orderedItem} ${dragIndex === i ? styles.orderedDragging : ''}`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) onChange(reorderList(value, dragIndex, i));
                setDragIndex(null);
              }}
            >
              <span className={styles.grip} aria-hidden>
                ⋮⋮
              </span>
              <span className={styles.orderedLabel}>
                {isPresetTagId(tag) ? TAG_LABELS_EN[tag] : tag}
                {i === 0 && <span className={styles.primaryBadge}>primary</span>}
              </span>
              <button
                type="button"
                className={styles.removeBtn}
                aria-label="Remove tag"
                onClick={() => removeAt(i)}
              >
                <Icon name="x" size={14} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </AdminField>
  );
}
