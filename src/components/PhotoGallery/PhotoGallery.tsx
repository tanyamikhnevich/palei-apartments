'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Icon from '@/components/ui/Icon/Icon';
import Placeholder from '@/components/ui/Placeholder/Placeholder';
import { isPhotoUrl } from '@/lib/apartmentMedia';
import { isAvifImagePath } from '@/lib/imageUpload';
import styles from './PhotoGallery.module.scss';

type PhotoGalleryProps = {
  photos: string[];
  alt: string;
  className?: string;
  sizes?: string;
  placeholderLabel?: string;
  autoPlayMs?: number;
  showDots?: boolean;
  children?: React.ReactNode;
};

export default function PhotoGallery({
  photos,
  alt,
  className = '',
  sizes = '(max-width: 760px) 100vw, 33vw',
  placeholderLabel,
  autoPlayMs = 0,
  showDots = true,
  children,
}: PhotoGalleryProps) {
  const urls = useMemo(() => photos.filter((p) => isPhotoUrl(p)), [photos]);
  // Callers rebuild the photos array on every render, so reset on content
  // rather than on identity — otherwise any parent re-render would snap the
  // slider back to the first photo.
  const photoKey = urls.join('|');

  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set());
  // Neighbours are only fetched once the guest shows interest — hovering the
  // frame or pressing an arrow. A grid of 15 cards otherwise asks for 45 photos
  // on first paint instead of 15.
  const [engaged, setEngaged] = useState(autoPlayMs > 0);
  const count = urls.length;
  const hasMultiple = count > 1;

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      setEngaged(true);
      setIndex((i) => (i + delta + count) % count);
    },
    [count]
  );

  useEffect(() => {
    setIndex(0);
    setLoaded(new Set());
    setEngaged(autoPlayMs > 0);
  }, [photoKey, autoPlayMs]);

  useEffect(() => {
    if (!hasMultiple || !autoPlayMs) return;
    const id = window.setInterval(() => go(1), autoPlayMs);
    return () => window.clearInterval(id);
  }, [hasMultiple, autoPlayMs, go]);

  const current = urls[index];

  /**
   * Only the current slide and its two neighbours stay mounted: they are
   * already decoded when the guest clicks, so the swap is instant instead of
   * blanking the frame, and we still never request all 35 photos at once.
   */
  const isNear = (i: number) => {
    if (count < 2 || !engaged) return i === index;
    const forward = (i - index + count) % count;
    return Math.min(forward, count - forward) <= 1;
  };

  const markLoaded = (url: string) =>
    setLoaded((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));

  return (
    <div className={`${styles.gallery} ${className}`.trim()}>
      <div className={styles.frame} onPointerEnter={() => setEngaged(true)}>
        {current ? (
          <>
            {urls.map((url, i) =>
              isNear(i) ? (
                <Image
                  key={url}
                  src={url}
                  alt={i === index ? alt : ''}
                  fill
                  sizes={sizes}
                  className={`${styles.img} ${i === index ? styles.imgOn : ''}`}
                  onLoad={() => markLoaded(url)}
                  unoptimized={isAvifImagePath(url)}
                />
              ) : null
            )}
            {!loaded.has(current) && <span className={styles.loading} aria-hidden="true" />}
          </>
        ) : (
          <Placeholder className={styles.placeholder} label={placeholderLabel ?? ''} />
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              className={`${styles.nav} ${styles.navPrev}`}
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
            >
              <Icon name="chevron" size={18} className={styles.chevPrev} />
            </button>
            <button
              type="button"
              className={`${styles.nav} ${styles.navNext}`}
              aria-label="Next photo"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
            >
              <Icon name="chevron" size={18} className={styles.chevNext} />
            </button>
            {showDots && (
              <div className={styles.dots}>
                {urls.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    className={`${styles.dot} ${i === index ? styles.dotOn : ''}`}
                    aria-label={`Photo ${i + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEngaged(true);
                      setIndex(i);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
        {children}
      </div>
    </div>
  );
}
