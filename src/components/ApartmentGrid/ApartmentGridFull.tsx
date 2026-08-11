'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Apartment } from '@/types/apartment';
import ApartmentCard from '@/components/ApartmentCard/ApartmentCard';
import ApartmentCardSkeleton from '@/components/ApartmentCard/ApartmentCardSkeleton';
import Button from '@/components/ui/Button/Button';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import { useLanguage } from '@/i18n/LanguageProvider';
import { filterApartmentsBySearch, parseApartmentSearchParams } from '@/lib/apartmentSearch';
import { collectApartmentTags, formatTagLabel } from '@/lib/apartmentTags';
import { fetchAllBookingAvailability, fetchApartments } from '@/lib/api/client';
import styles from './ApartmentGrid.module.scss';

const SKELETON_COUNT = 6;

export default function ApartmentGridFull() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const search = useMemo(
    () => parseApartmentSearchParams(searchParams),
    [searchParams]
  );
  const hasSearchQuery = Boolean(
    searchParams.get('checkIn') || searchParams.get('checkOut') || searchParams.get('guests')
  );
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [blockedByApartment, setBlockedByApartment] = useState<
    Record<string, { checkIn: string; checkOut: string }[]>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchApartments({ publicOnly: true }), fetchAllBookingAvailability()])
      .then(([{ apartments: list }, blocked]) => {
        setApartments(list);
        setBlockedByApartment(blocked);
      })
      .finally(() => setLoading(false));
  }, []);

  const tags = useMemo(() => collectApartmentTags(apartments), [apartments]);

  // A tag can disappear while it is selected (admin edit, reload) — fall back to "all".
  const activeTag = tagFilter && tags.includes(tagFilter) ? tagFilter : null;

  const filtered = filterApartmentsBySearch(apartments, search, blockedByApartment, activeTag);
  const emptyMessage = hasSearchQuery ? t('apartments.emptySearch') : t('apartments.empty');

  return (
    <section className={styles.section} id="apartments">
      <div className="wrap">
        <div className={styles.header}>
          <div>
            <div className="eyebrow">{t('apartments.eyebrow')}</div>
            <h2 className="section-title">{t('apartments.allTitle')}</h2>
            <p className="section-sub">{t('apartments.allSub')}</p>
          </div>
          <Button variant="ghost" iconRight="arrow" as="a" href="/">
            {t('apartments.backHome')}
          </Button>
        </div>

        {loading && (
          <div className={styles.filters} aria-hidden="true">
            {[72, 108, 92, 86].map((w, i) => (
              <Skeleton key={i} width={w} height={38} radius={999} />
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <div className={styles.filters}>
            <button
              type="button"
              className={`${styles.chip} ${activeTag === null ? styles.chipOn : ''}`}
              onClick={() => setTagFilter(null)}
              aria-pressed={activeTag === null}
            >
              {t('apartments.filterAll')}
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`${styles.chip} ${activeTag === tag ? styles.chipOn : ''}`}
                onClick={() => setTagFilter(tag)}
                aria-pressed={activeTag === tag}
              >
                {formatTagLabel(tag, t)}
              </button>
            ))}
          </div>
        )}

        <div className={styles.grid}>
          {loading ? (
            Array.from({ length: SKELETON_COUNT }, (_, i) => <ApartmentCardSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <p className={styles.empty}>{emptyMessage}</p>
          ) : (
            filtered.map((apt) => <ApartmentCard key={apt.id} apt={apt} />)
          )}
        </div>
      </div>
    </section>
  );
}
