'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import type { Apartment, ApartmentLocaleCopy, ApartmentStatus } from '@/types/apartment';
import { DEFAULT_AVAILABILITY } from '@/lib/availability';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import Placeholder from '@/components/ui/Placeholder/Placeholder';
import AdminAvailabilityCalendar from '@/components/admin/AdminAvailabilityCalendar/AdminAvailabilityCalendar';
import AdminTagPicker from '@/components/admin/AdminTagPicker/AdminTagPicker';
import { isPhotoUrl } from '@/lib/apartmentMedia';
import { AdminField, AdminInput, AdminSelect, AdminTextarea } from '@/components/admin/ui/AdminField';
import { uploadApartmentPhoto } from '@/lib/api/client';
import styles from './AdminApartmentModal.module.scss';

const STATUSES: ApartmentStatus[] = ['Available', 'Booked', 'Maintenance'];

function emptyEnCopy(): ApartmentLocaleCopy {
  return {
    title: '',
    location: '',
    description: '',
    photoLabel: 'main photo',
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

function PhotoManager({
  photos,
  onChange,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const del = (i: number) => onChange(photos.filter((_, idx) => idx !== i));

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setUploadError(null);
    const added: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const { url } = await uploadApartmentPhoto(file);
        added.push(url);
      }
      onChange([...photos, ...added]);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <AdminField label="Photos">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className={styles.fileInput}
        onChange={(e) => void onFiles(e.target.files)}
      />
      <div className={styles.photos}>
        {photos.map((p, i) => (
          <div key={`${p}-${i}`} className={styles.photo}>
            {isPhotoUrl(p) ? (
              <Image src={p} alt="" fill sizes="120px" className={styles.photoImg} />
            ) : (
              <Placeholder className={styles.photoImg} label={p} />
            )}
            <span className={styles.photoTag}>{i === 0 ? 'cover' : `#${i + 1}`}</span>
            <button
              type="button"
              className={styles.photoDel}
              aria-label="Remove photo"
              onClick={() => del(i)}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.photoAdd}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Icon name="image" size={20} />
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      {uploadError && <p className={styles.uploadError}>{uploadError}</p>}
    </AdminField>
  );
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
        photos: initial.photos?.length ? initial.photos : undefined,
        availability: initial.availability ?? DEFAULT_AVAILABILITY,
      };
    }
    const en = emptyEnCopy();
    return {
      id: `a${Date.now()}`,
      area: 'Bat Yam',
      guests: 2,
      bedrooms: 1,
      bathrooms: 1,
      price: 500,
      status: 'Available',
      tagIds: [],
      rating: 5,
      reviews: 0,
      photos: [],
      availability: DEFAULT_AVAILABILITY,
      locales: { en, ru: { ...en }, he: { ...en } },
    };
  });

  const en = form.locales.en;

  const setEn = (patch: Partial<ApartmentLocaleCopy>) => {
    setForm((prev) => ({
      ...prev,
      locales: { ...prev.locales, en: { ...prev.locales.en, ...patch } },
    }));
  };

  const setField = <K extends keyof Apartment>(key: K, value: Apartment[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setNum = (key: 'guests' | 'bedrooms' | 'bathrooms' | 'price', raw: string) => {
    setField(key, Math.max(key === 'guests' ? 1 : 0, parseInt(raw || '0', 10)) as Apartment[typeof key]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!en.title.trim() || !en.location.trim()) return;
    const enCopy = {
      ...en,
      photoLabel: en.photoLabel && !isPhotoUrl(en.photoLabel) ? en.photoLabel : 'main photo',
    };
    onSave({
      ...form,
      photos: form.photos?.length ? form.photos : undefined,
      locales: {
        en: enCopy,
        ru: editing
          ? { ...form.locales.ru, photoLabel: form.locales.ru.photoLabel && !isPhotoUrl(form.locales.ru.photoLabel) ? form.locales.ru.photoLabel : enCopy.photoLabel }
          : { ...enCopy },
        he: editing
          ? { ...form.locales.he, photoLabel: form.locales.he.photoLabel && !isPhotoUrl(form.locales.he.photoLabel) ? form.locales.he.photoLabel : enCopy.photoLabel }
          : { ...enCopy },
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

          <div className={styles.grid}>
            <AdminSelect
              label="Area"
              options={['Bat Yam', 'Tel Aviv']}
              value={form.area}
              onChange={(e) => setField('area', e.target.value as Apartment['area'])}
            />
            <AdminField label="Price per night (₪)">
              <input
                className="input"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setNum('price', e.target.value)}
              />
            </AdminField>
          </div>

          <AdminTextarea
            label="Description"
            placeholder="Sun-filled studio one block from the promenade…"
            value={en.description}
            onChange={(e) => setEn({ description: e.target.value })}
          />

          <div className={styles.grid3}>
            <AdminField label="Guests">
              <input
                className="input"
                type="number"
                min={1}
                value={form.guests}
                onChange={(e) => setNum('guests', e.target.value)}
              />
            </AdminField>
            <AdminField label="Bedrooms">
              <input
                className="input"
                type="number"
                min={0}
                value={form.bedrooms}
                onChange={(e) => setNum('bedrooms', e.target.value)}
              />
            </AdminField>
            <AdminField label="Bathrooms">
              <input
                className="input"
                type="number"
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

          <AdminInput
            label="Placeholder caption (if no photo)"
            placeholder="studio · balcony · sea"
            value={en.photoLabel && !isPhotoUrl(en.photoLabel) ? en.photoLabel : ''}
            onChange={(e) => setEn({ photoLabel: e.target.value })}
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
