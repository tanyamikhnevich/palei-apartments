'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Apartment } from '@/types/apartment';
import ApartmentCard from '@/components/ApartmentCard/ApartmentCard';
import ApartmentCardSkeleton from '@/components/ApartmentCard/ApartmentCardSkeleton';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fetchApartments } from '@/lib/api/client';
import styles from './ApartmentCarousel.module.scss';

const CAROUSEL_LIMIT = 8;
const SKELETON_COUNT = 3;

export default function ApartmentCarousel() {
  const { t } = useLanguage();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchApartments({ publicOnly: true })
      .then(({ apartments: list }) => setApartments(list))
      .finally(() => setLoading(false));
  }, []);

  const displayed = apartments.slice(0, CAROUSEL_LIMIT);

  /** One card plus its gap — the distance a single arrow click travels. */
  const step = () => {
    const track = trackRef.current;
    if (!track) return 0;
    const card = track.firstElementChild as HTMLElement | null;
    if (!card) return track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap || '0') || 0;
    return card.offsetWidth + gap;
  };

  const syncPosition = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    // RTL browsers report a negative scrollLeft; the maths is the same on |x|.
    const offset = Math.abs(track.scrollLeft);
    const max = track.scrollWidth - track.clientWidth;
    const width = step();
    setIndex(width ? Math.round(offset / width) : 0);
    setAtStart(offset < 8);
    setAtEnd(offset >= max - 8);
  }, []);

  useEffect(() => {
    syncPosition();
  }, [displayed.length, syncPosition]);

  const scrollBySteps = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const rtl = getComputedStyle(track).direction === 'rtl';
    track.scrollBy({ left: step() * direction * (rtl ? -1 : 1), behavior: 'smooth' });
  };

  const scrollTo = (target: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rtl = getComputedStyle(track).direction === 'rtl';
    track.scrollTo({ left: step() * target * (rtl ? -1 : 1), behavior: 'smooth' });
  };

  return (
    <section className={styles.section} id="apartments">
      <div className="wrap">
        <div className={styles.header}>
          <div>
            <div className="eyebrow">{t('apartments.eyebrow')}</div>
            <h2 className="section-title">{t('apartments.title')}</h2>
            <p className="section-sub">{t('apartments.sub')}</p>
          </div>
          <div className={styles.headerSide}>
            <div className={styles.arrows}>
              <button
                type="button"
                className={styles.arrow}
                onClick={() => scrollBySteps(-1)}
                disabled={atStart}
                aria-label={t('booking.prevMonth')}
              >
                <Icon name="chevron" size={18} className={styles.arrowBack} />
              </button>
              <button
                type="button"
                className={styles.arrow}
                onClick={() => scrollBySteps(1)}
                disabled={atEnd}
                aria-label={t('booking.nextMonth')}
              >
                <Icon name="chevron" size={18} />
              </button>
            </div>
            <Button variant="ghost" iconRight="arrow" as="a" href="/apartments">
              {t('apartments.seeAll')} {loading ? '' : apartments.length}
            </Button>
          </div>
        </div>
      </div>

      {/*
        The track bleeds to the window edges so the next card is always half
        visible — the strongest hint that this row scrolls.
      */}
      <div className={styles.viewport}>
        <div className={styles.track} ref={trackRef} onScroll={syncPosition}>
          {loading ? (
            Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <div className={styles.slide} key={i}>
                <ApartmentCardSkeleton />
              </div>
            ))
          ) : displayed.length === 0 ? (
            <p className={styles.empty}>{t('apartments.empty')}</p>
          ) : (
            displayed.map((apt) => (
              <div className={styles.slide} key={apt.id}>
                <ApartmentCard apt={apt} />
              </div>
            ))
          )}
        </div>
      </div>

      {displayed.length > 1 && (
        <div className={styles.dots}>
          {displayed.map((apt, i) => (
            <button
              key={apt.id}
              type="button"
              className={`${styles.dot} ${i === index ? styles.dotOn : ''}`}
              aria-label={t('hero.slideN').replace('{n}', String(i + 1))}
              aria-current={i === index}
              onClick={() => scrollTo(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
