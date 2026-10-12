'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Icon from '@/components/ui/Icon/Icon';
import Placeholder from '@/components/ui/Placeholder/Placeholder';
import { isPhotoUrl } from '@/lib/apartmentMedia';
import { useLanguage } from '@/i18n/LanguageProvider';
import { isAvifImagePath } from '@/lib/imageUpload';
import { useCalmMotion } from '@/lib/useCalmMotion';
import PhotoLightbox from './PhotoLightbox';
import styles from './PhotoGallery.module.scss';

type PhotoGalleryProps = {
  photos: string[];
  alt: string;
  className?: string;
  sizes?: string;
  placeholderLabel?: string;
  autoPlayMs?: number;
  showDots?: boolean;
  /**
   * `contain` shows the whole photo on a white ground instead of cropping it
   * to the frame — for product shots like a wine bottle, which are far taller
   * than the frame and lose the label when cropped.
   */
  fit?: 'cover' | 'contain';
  /** Lets a click on the photo open it full screen, with swipe on phones. */
  lightbox?: boolean;
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
  fit = 'cover',
  lightbox = false,
  children,
}: PhotoGalleryProps) {
  const { t } = useLanguage();
  // A visitor who asked for no motion gets a gallery that waits to be turned.
  const calm = useCalmMotion();
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
  // The slideshow runs only until the guest pages by hand. Left running, its
  // timer would fire right after their own click and skip a photo.
  const [autoPlay, setAutoPlay] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const count = urls.length;
  const hasMultiple = count > 1;

  const step = useCallback(
    (delta: number) => {
      if (count < 2) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count]
  );

  /** A move the guest made themselves — arrows, dots or the full-screen view. */
  const takeOver = () => {
    setEngaged(true);
    setAutoPlay(false);
  };

  const go = (delta: number) => {
    takeOver();
    step(delta);
  };

  useEffect(() => {
    setIndex(0);
    setLoaded(new Set());
    setEngaged(autoPlayMs > 0);
    setAutoPlay(true);
    setZoomed(false);
  }, [photoKey, autoPlayMs]);

  useEffect(() => {
    if (!hasMultiple || !autoPlayMs || !autoPlay || calm) return;
    const id = window.setInterval(() => step(1), autoPlayMs);
    return () => window.clearInterval(id);
  }, [hasMultiple, autoPlayMs, autoPlay, calm, step]);

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

  const canZoom = lightbox && Boolean(current);
  const openLightbox = () => {
    takeOver();
    setZoomed(true);
  };

  return (
    <div className={`${styles.gallery} ${className}`.trim()}>
      <div
        className={[styles.frame, fit === 'contain' && styles.contain, canZoom && styles.zoomable]
          .filter(Boolean)
          .join(' ')}
        onPointerEnter={() => setEngaged(true)}
        onClick={canZoom ? openLightbox : undefined}
      >
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
              aria-label={t('a11y.prevPhoto')}
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
              aria-label={t('a11y.nextPhoto')}
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
                    aria-label={t('a11y.photoN').replace('{n}', String(i + 1))}
                    onClick={(e) => {
                      e.stopPropagation();
                      takeOver();
                      setIndex(i);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
        {canZoom && (
          <button
            type="button"
            className={styles.expand}
            aria-label={t('a11y.openGallery')}
            onClick={(e) => {
              e.stopPropagation();
              openLightbox();
            }}
          >
            <Icon name="expand" size={15} />
            {index + 1} / {count}
          </button>
        )}
        {children}
      </div>
      {zoomed && (
        <PhotoLightbox
          photos={urls}
          alt={alt}
          startIndex={index}
          onClose={(i) => {
            setIndex(i);
            setZoomed(false);
          }}
        />
      )}
    </div>
  );
}
