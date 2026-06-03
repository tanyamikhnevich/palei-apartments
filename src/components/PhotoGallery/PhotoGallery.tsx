'use client';

import { useCallback, useEffect, useState } from 'react';
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
  /** Crossfade when the slide changes (e.g. booking modal). */
  smooth?: boolean;
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
  smooth = false,
  showDots = true,
  children,
}: PhotoGalleryProps) {
  const urls = photos.filter((p) => isPhotoUrl(p));
  const [index, setIndex] = useState(0);
  const count = urls.length;
  const hasMultiple = count > 1;

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count]
  );

  useEffect(() => {
    setIndex(0);
  }, [photos]);

  useEffect(() => {
    if (!hasMultiple || !autoPlayMs) return;
    const id = window.setInterval(() => go(1), autoPlayMs);
    return () => window.clearInterval(id);
  }, [hasMultiple, autoPlayMs, go]);

  const current = urls[index];

  return (
    <div className={`${styles.gallery} ${className}`.trim()}>
      <div className={styles.frame}>
        {current ? (
          <Image
            key={current}
            src={current}
            alt={alt}
            fill
            sizes={sizes}
            className={`${styles.img} ${smooth ? styles.imgFade : ''}`}
            unoptimized={isAvifImagePath(current)}
          />
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
                {urls.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.dot} ${i === index ? styles.dotOn : ''}`}
                    aria-label={`Photo ${i + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
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
