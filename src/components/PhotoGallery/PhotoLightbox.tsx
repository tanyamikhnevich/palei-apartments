'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { isAvifImagePath } from '@/lib/imageUpload';
import { useScrollLock } from '@/lib/useScrollLock';
import styles from './PhotoLightbox.module.scss';

type PhotoLightboxProps = {
  photos: string[];
  alt: string;
  startIndex: number;
  /** Receives the photo the guest stopped on, so the page can pick up there. */
  onClose: (index: number) => void;
};

/** How long the track has to sit still before a scroll counts as finished. */
const SETTLE_MS = 140;

export default function PhotoLightbox({ photos, alt, startIndex, onClose }: PhotoLightboxProps) {
  const { t } = useLanguage();
  const count = photos.length;
  const [index, setIndex] = useState(startIndex);
  // Photos stay mounted once shown: paging back never blanks the screen, and
  // we still never ask for all 35 at once.
  const [seen, setSeen] = useState<Set<number>>(() => new Set([startIndex]));
  const trackRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Where an arrow press is heading. Read instead of `index` while a smooth
  // scroll is still under way, so quick presses add up rather than aim at the
  // same photo twice.
  const headingRef = useRef<number | null>(null);
  const settleRef = useRef<number>();

  useScrollLock();

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = startIndex * track.clientWidth;
  }, [startIndex]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      window.clearTimeout(settleRef.current);
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    setSeen((prev) => {
      const next = new Set(prev);
      for (const d of [-1, 0, 1]) next.add((index + d + count) % count);
      return next.size === prev.size ? prev : next;
    });
  }, [index, count]);

  const armSettle = () => {
    window.clearTimeout(settleRef.current);
    settleRef.current = window.setTimeout(() => {
      headingRef.current = null;
    }, SETTLE_MS);
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    const at = Math.round(track.scrollLeft / track.clientWidth);
    setIndex(Math.min(count - 1, Math.max(0, at)));
    armSettle();
  };

  const go = useCallback(
    (delta: number) => {
      const track = trackRef.current;
      if (!track || count < 2) return;
      const from = headingRef.current ?? index;
      const to = (from + delta + count) % count;
      headingRef.current = to;
      // Going round from the last photo to the first would otherwise rewind
      // through every photo in between.
      const wraps = Math.abs(to - from) > 1;
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      track.scrollTo({
        left: to * track.clientWidth,
        behavior: wraps || calm ? 'auto' : 'smooth',
      });
      armSettle();
    },
    [count, index]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose(index);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        go(e.key === 'ArrowRight' ? 1 : -1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, onClose]);

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={alt}>
      <div className={styles.bar}>
        <span className={styles.counter}>
          {index + 1} / {count}
        </span>
        <button
          ref={closeRef}
          type="button"
          className={styles.close}
          aria-label={t('a11y.closeGallery')}
          onClick={() => onClose(index)}
        >
          <Icon name="x" size={20} />
        </button>
      </div>

      {/* A native scroller, so a swipe on a phone pages the photos by itself. */}
      <div className={styles.track} ref={trackRef} onScroll={onScroll}>
        {photos.map((url, i) => (
          <div className={styles.slide} key={url} aria-hidden={i !== index}>
            <div className={styles.photo}>
              {seen.has(i) && (
                <Image
                  src={url}
                  alt={i === index ? alt : ''}
                  fill
                  sizes="100vw"
                  className={styles.img}
                  draggable={false}
                  unoptimized={isAvifImagePath(url)}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            className={`${styles.nav} ${styles.navPrev}`}
            aria-label={t('a11y.prevPhoto')}
            onClick={() => go(-1)}
          >
            <Icon name="chevron" size={22} className={styles.chevPrev} />
          </button>
          <button
            type="button"
            className={`${styles.nav} ${styles.navNext}`}
            aria-label={t('a11y.nextPhoto')}
            onClick={() => go(1)}
          >
            <Icon name="chevron" size={22} />
          </button>
        </>
      )}
    </div>,
    document.body
  );
}
