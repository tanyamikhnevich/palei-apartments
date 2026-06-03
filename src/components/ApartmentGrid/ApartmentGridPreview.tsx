'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { filterApartments, type FilterId } from '@/data/apartments';
import type { Apartment } from '@/types/apartment';
import ApartmentCard from '@/components/ApartmentCard/ApartmentCard';
import Button from '@/components/ui/Button/Button';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fetchApartments } from '@/lib/api/client';
import styles from './ApartmentGrid.module.scss';

const HOME_PREVIEW_LIMIT = 6;

export default function ApartmentGridPreview() {
  const { t } = useLanguage();
  const [filter] = useState<FilterId>('all');
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApartments({ publicOnly: true })
      .then(({ apartments: list }) => setApartments(list))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterApartments(apartments, filter);
  const displayed = filtered.slice(0, HOME_PREVIEW_LIMIT);

  return (
    <section className={styles.section} id="apartments">
      <div className="wrap">
        <div className={styles.header}>
          <div>
            <div className="eyebrow">{t('apartments.eyebrow')}</div>
            <h2 className="section-title">{t('apartments.title')}</h2>
            <p className="section-sub">{t('apartments.sub')}</p>
          </div>
          <Button variant="ghost" iconRight="arrow" as="a" href="/apartments">
            {t('apartments.seeAll')} {apartments.length}
          </Button>
        </div>

        <div className={styles.grid}>
          {loading ? (
            <p className={styles.empty}>{t('apartments.empty')}</p>
          ) : displayed.length === 0 ? (
            <p className={styles.empty}>{t('apartments.empty')}</p>
          ) : (
            displayed.map((apt) => <ApartmentCard key={apt.id} apt={apt} />)
          )}
        </div>

        {apartments.length > HOME_PREVIEW_LIMIT && (
          <div className={styles.more}>
            <Link href="/apartments" className={styles.moreLink}>
              {t('apartments.viewAll')} ({apartments.length})
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
