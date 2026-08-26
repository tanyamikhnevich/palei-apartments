'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Apartment } from '@/types/apartment';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import { useLanguage } from '@/i18n/LanguageProvider';
import type { Locale } from '@/i18n/types';
import { LOCALES } from '@/i18n/types';
import { fetchApartments } from '@/lib/api/client';
import { priceFrom } from '@/lib/pricing';
import styles from './AboutSection.module.scss';
import { formatMoney } from '@/lib/money';
import { apartmentsInCountry, currencyOf } from '@/lib/regions';

type Stat = { value: string; key: string };

/** Every figure here is read from the live listing — nothing is hard-coded. */
function buildStats(apartments: Apartment[], locale: Locale): Stat[] {
  const reviews = apartments.reduce((n, a) => n + a.reviews, 0);
  const rated = apartments.filter((a) => a.reviews > 0);

  const stats: Stat[] = [
    { value: String(apartments.length), key: 'about.stats.apartments' },
    {
      value: String(Math.max(...apartments.map((a) => a.guests))),
      key: 'about.stats.sleeps',
    },
    {
      // Cheapest across the whole collection, shown in its own region's currency.
      value: (() => {
        const cheapest = apartments.reduce((low, a) =>
          priceFrom(a) < priceFrom(low) ? a : low
        );
        return formatMoney(priceFrom(cheapest), currencyOf(cheapest), locale);
      })(),
      key: 'about.stats.from',
    },
  ];

  // A rating only means something once guests have actually left one.
  if (reviews > 0) {
    const weighted = rated.reduce((sum, a) => sum + a.rating * a.reviews, 0) / reviews;
    stats.push({ value: weighted.toFixed(1), key: 'about.stats.rating' });
  }

  stats.push({ value: String(LOCALES.length), key: 'about.stats.languages' });
  return stats;
}

export default function AboutSection() {
  const { locale, t } = useLanguage();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApartments({ publicOnly: true })
      .then(({ apartments: list }) => setApartments(apartmentsInCountry(list, 'IL')))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(
    () => (apartments.length ? buildStats(apartments, locale) : []),
    [apartments]
  );

  return (
    <section className={styles.section} id="about">
      <div className="wrap">
        <div className={styles.band}>
          <span className={styles.badge}>{t('about.badge')}</span>
          <h2 className={styles.h2}>{t('about.title')}</h2>
          <p className={styles.desc}>{t('about.desc')}</p>

          <div className={styles.stats}>
            {loading
              ? [0, 1, 2, 3].map((i) => (
                  <div className={styles.stat} key={i}>
                    <Skeleton width={64} height={40} className={styles.statSkeleton} />
                    <Skeleton width={96} height={14} className={styles.statSkeleton} />
                  </div>
                ))
              : stats.map(({ value, key }) => (
                  <div className={styles.stat} key={key}>
                    <div className={styles.n}>{value}</div>
                    <div className={styles.l}>{t(key)}</div>
                  </div>
                ))}
          </div>
        </div>
      </div>
    </section>
  );
}
