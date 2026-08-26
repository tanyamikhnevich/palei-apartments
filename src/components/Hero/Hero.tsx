'use client';

import { useCallback, useEffect, useState } from 'react';
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
 * The reason someone books: the terrace, the rooms, and the sunset off them.
 * `position` keeps the subject in frame once the wide crop bites — the terrace
 * is anchored low so the ceiling drops out, and the sunset high enough to hold
 * the sun. The interiors are already 16:9 and sit flush.
 */
const SLIDES = [
  { src: '/hero/01-terrace-sea.webp', position: 'center 60%' },
  { src: '/hero/02-beach.webp', position: 'center 60%' },
  { src: '/hero/03-living-room.webp', position: 'center' },
  { src: '/hero/04-kitchen-blue.webp', position: 'center' },
  { src: '/hero/05-bedroom-yellow.webp', position: 'center' },
  { src: '/hero/06-sunset-sea.webp', position: 'center 45%' },
  { src: '/hero/07-blue-sofa.webp', position: 'center 55%' },
];

const SLIDE_MS = 3800;

export default function Hero() {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  /* Bumped when a dot is tapped, to restart the cycle from that slide. */
  const [cycle, setCycle] = useState(0);

  const go = useCallback((index: number) => {
    setActive((index + SLIDES.length) % SLIDES.length);
    setCycle((c) => c + 1);
  }, []);

  /*
    No pause on hover. It used to sit on the whole media block, which is the
    full height of the first screen — so on a desktop the pointer was almost
    always inside it and the slideshow simply never ran. On a phone it was
    worse: a tap fires mouseenter with no mouseleave to follow, so one touch
    stopped it for good. The photos are background, and nothing is lost by
    letting them carry on behind the cursor.
  */
  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const id = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [cycle]);

  return (
    <section className={styles.hero} id="top">
      <div className={styles.media}>
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
