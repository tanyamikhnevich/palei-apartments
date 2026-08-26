'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Icon from '@/components/ui/Icon/Icon';
import Placeholder from '@/components/ui/Placeholder/Placeholder';
import { AdminField } from '@/components/admin/ui/AdminField';
import { IMAGE_UPLOAD_ACCEPT, IMAGE_UPLOAD_MAX_FILES } from '@/lib/imageUpload';
import { isPhotoUrl } from '@/lib/apartmentMedia';
import { uploadApartmentPhotos } from '@/lib/api/client';
import styles from './PhotoManager.module.scss';

/**
 * Photos for anything that has them: drop files in, drag the thumbnails to
 * reorder, first one is the cover.
 *
 * `aspect` is the one thing callers differ on — apartments are photographed
 * wide, bouquets tall — so the thumbnails follow the shape of the real picture
 * instead of cropping every flower into a letterbox.
 */
export default function PhotoManager({
  photos,
  onChange,
  label = 'Photos',
  aspect = 'landscape',
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  label?: string;
  aspect?: 'landscape' | 'portrait';
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

  const ratio = aspect === 'portrait' ? '4 / 5' : '4 / 3';

  return (
    <AdminField label={label}>
      <div style={{ ['--thumb-ratio' as string]: ratio }}>
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
      </div>
    </AdminField>
  );
}
