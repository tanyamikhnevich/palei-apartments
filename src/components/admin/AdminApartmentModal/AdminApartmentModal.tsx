'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import type { Apartment, ApartmentLocaleCopy, ApartmentStatus } from '@/types/apartment';
import { DEFAULT_AVAILABILITY } from '@/lib/availability';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import Placeholder from '@/components/ui/Placeholder/Placeholder';
import AdminAvailabilityCalendar from '@/components/admin/AdminAvailabilityCalendar/AdminAvailabilityCalendar';
// import AdminCalendarSync from '@/components/admin/AdminCalendarSync/AdminCalendarSync';
import AdminTagPicker from '@/components/admin/AdminTagPicker/AdminTagPicker';
import { isPhotoUrl } from '@/lib/apartmentMedia';
import { photoLabelFromTags } from '@/lib/apartmentTags';
import { AdminField, AdminInput, AdminTextarea } from '@/components/admin/ui/AdminField';
import AdminPriceTiers from '@/components/admin/AdminPricing/AdminPriceTiers';
import AdminServices from '@/components/admin/AdminPricing/AdminServices';
import { uploadApartmentPhotos } from '@/lib/api/client';
import { IMAGE_UPLOAD_ACCEPT, IMAGE_UPLOAD_MAX_FILES } from '@/lib/imageUpload';
import styles from './AdminApartmentModal.module.scss';

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

function PhotoManager({
  photos,
  onChange,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const del = (i: number) => onChange(photos.filter((_, idx) => idx !== i));

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= photos.length || to >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const uploadFiles = async (fileList: FileList | File[] | null) => {
    if (!fileList?.length) return;

    const files = Array.from(fileList).slice(0, IMAGE_UPLOAD_MAX_FILES);
    if (!files.length) return;

    setUploading(true);
    setUploadError(null);
    setUploadProgress(
      files.length === 1 ? '1 photo' : `${files.length} photos`
    );

    try {
      const { urls } = await uploadApartmentPhotos(files);
      onChange([...photos, ...urls]);
      setUploadProgress(null);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
      setUploadProgress(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void uploadFiles(e.target.files);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    void uploadFiles(e.dataTransfer.files);
  };

  return (
    <AdminField label="Photos">
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT}
        multiple
        className={styles.fileInput}
        onChange={onInputChange}
      />

      <div
        className={`${styles.dropzone} ${dragOver ? styles.dropzoneOver : ''} ${uploading ? styles.dropzoneBusy : ''}`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (e.currentTarget === e.target) setDragOver(false);
        }}
        onDrop={onDrop}
      >
        <button
          type="button"
          className={styles.dropzoneBtn}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Icon name="image" size={22} />
          <span className={styles.dropzoneTitle}>
            {uploading ? 'Uploading photos…' : 'Add photos'}
          </span>
          <span className={styles.dropzoneHint}>
            Select or drop files here · JPEG, PNG, WebP, AVIF · up to 5 MB each
          </span>
          <span className={styles.dropzoneHint}>Drag photos below to change order (first = cover)</span>
          {uploadProgress && <span className={styles.dropzoneProgress}>{uploadProgress}</span>}
        </button>
      </div>

      {photos.length > 0 && (
        <div className={styles.photos}>
          {photos.map((p, i) => (
            <div
              key={p}
              className={`${styles.photo} ${dragIndex === i ? styles.photoDragging : ''} ${dropIndex === i ? styles.photoDropTarget : ''}`}
              draggable
              onDragStart={(e) => {
                setDragIndex(i);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(i));
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setDropIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDropIndex(i);
              }}
              onDragLeave={() => setDropIndex((prev) => (prev === i ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                const from = dragIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10);
                if (!Number.isNaN(from)) reorder(from, i);
                setDragIndex(null);
                setDropIndex(null);
              }}
            >
              {isPhotoUrl(p) ? (
                <Image src={p} alt="" fill sizes="120px" className={styles.photoImg} unoptimized draggable={false} />
              ) : (
                <Placeholder className={styles.photoImg} label={p} />
              )}
              <span className={styles.photoDrag} aria-hidden>
                ⋮⋮
              </span>
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
            aria-label="Add more photos"
          >
            <Icon name="plus" size={20} />
            More
          </button>
        </div>
      )}

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
      area: 'Bat Yam',
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

          <div className={styles.grid}>
            <AdminField label="Price per night (₪)">
              <input
                className="input"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setNum('price', e.target.value)}
              />
            </AdminField>
            <AdminField label="Minimum nights">
              <input
                className="input"
                type="number"
                min={1}
                value={form.minNights}
                onChange={(e) => setNum('minNights', e.target.value)}
              />
            </AdminField>
          </div>

          <AdminPriceTiers
            basePrice={form.price}
            tiers={form.priceTiers ?? []}
            onChange={(priceTiers) => setField('priceTiers', priceTiers)}
          />

          <AdminServices
            services={form.services ?? []}
            onChange={(services) => setField('services', services)}
          />

          <div className={styles.grid}>
            <AdminField label="Latitude">
              <input
                className="input"
                type="number"
                step="any"
                placeholder="32.0227269"
                value={form.lat ?? ''}
                onChange={(e) => setCoord('lat', e.target.value)}
              />
            </AdminField>
            <AdminField label="Longitude">
              <input
                className="input"
                type="number"
                step="any"
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
            <AdminField label="Beds">
              <input
                className="input"
                type="number"
                min={1}
                value={form.beds}
                onChange={(e) => setNum('beds', e.target.value)}
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

          {/* Calendar sync (Airbnb/Booking iCal) is parked until we decide how
              it should work. The component and its API routes are untouched —
              drop the comment markers to bring the block back. */}
          {/* {editing && (
            <AdminCalendarSync apartmentId={form.id} icalToken={form.icalToken} />
          )} */}

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
