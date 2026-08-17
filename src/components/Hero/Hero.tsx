'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ApartmentSearch from '@/components/ApartmentSearch/ApartmentSearch';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import styles from './Hero.module.scss';

const TRUST_KEYS = [
  { icon: 'wave' as const, key: 'hero.trust.beach' },
  { icon: 'sparkle' as const, key: 'hero.trust.equipped' },
  { icon: 'calendar' as const, key: 'hero.trust.flexible' },
  { icon: 'shield' as const, key: 'hero.trust.verified' },
];

/**
 * The reason someone books: sunset over the sea, a rooftop, a pool.
 * `position` keeps the subject in frame once the wide crop bites — the sunset
 * shot is a portrait photo, so it is anchored above centre.
 */
const SLIDES = [
  { src: '/hero/01-sunset.webp', position: 'center 38%' },
  { src: '/hero/02-terrace.webp', position: 'center 55%' },
  { src: '/hero/03-pool.webp', position: 'center' },
  { src: '/hero/04-living.webp', position: 'center' },
];

const SLIDE_MS = 3800;

export default function Hero() {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((index: number) => {
    setActive((index + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    timer.current = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused]);

  return (
    <section className={styles.hero} id="top">
      <div
        className={styles.media}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/*
          The slides are clipped by their own layer, not by the hero — the date
          picker opens past the bottom edge and must not be cut off.
        */}
        <div className={styles.slides} aria-hidden="true">
          {SLIDES.map(({ src, position }, i) => (
            <div
              key={src}
              className={`${styles.slide} ${i === active ? styles.slideOn : ''}`}
              style={{ backgroundImage: `url('${src}')`, backgroundPosition: position }}
            />
          ))}
          <div className={styles.scrim} />
        </div>

        <div className={`wrap ${styles.content}`}>
          <div className={styles.inner}>
            <span className={styles.pill}>
              <Icon name="pin" size={15} />
              {t('hero.pill')}
            </span>

            <h1 className={styles.h1}>{t('hero.title')}</h1>

            <p className={styles.sub}>{t('hero.sub')}</p>

            <ApartmentSearch variant="hero" />

            <div className={styles.cta}>
              <Button variant="light" as="a" href="/apartments" iconRight="arrow">
                {t('hero.viewApartments')}
              </Button>
              <Button
                variant="ghost"
                as="a"
                href="/contact"
                style={{
                  background: 'rgba(255,255,255,.12)',
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,.3)',
                }}
              >
                {t('hero.contactUs')}
              </Button>
            </div>
          </div>
        </div>

        <div className={styles.dots} role="tablist" aria-label={t('hero.slides')}>
          {SLIDES.map(({ src }, i) => (
            <button
              key={src}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={t('hero.slideN').replace('{n}', String(i + 1))}
              className={`${styles.dot} ${i === active ? styles.dotOn : ''}`}
              onClick={() => go(i)}
            />
          ))}
        </div>
      </div>

      <div className="wrap">
        <div className={styles.trust}>
          {TRUST_KEYS.map(({ icon, key }) => (
            <div className={styles.trustItem} key={key}>
              <span className={styles.trustIc}>
                <Icon name={icon} size={20} />
              </span>
              {t(key)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
