'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FILTER_IDS, type FilterId } from '@/data/apartments';
import type { Apartment } from '@/types/apartment';
import ApartmentCard from '@/components/ApartmentCard/ApartmentCard';
import Button from '@/components/ui/Button/Button';
import { useLanguage } from '@/i18n/LanguageProvider';
import {
  filterApartmentsBySearch,
  parseApartmentSearchParams,
  searchParamsToChipFilter,
} from '@/lib/apartmentSearch';
import { fetchAllBookingAvailability, fetchApartments } from '@/lib/api/client';
import styles from './ApartmentGrid.module.scss';

export default function ApartmentGridFull() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const search = useMemo(
    () => parseApartmentSearchParams(searchParams),
    [searchParams]
  );
  const hasSearchQuery = Boolean(
    searchParams.get('where') ||
      searchParams.get('checkIn') ||
      searchParams.get('checkOut') ||
      searchParams.get('guests')
  );
  const [filter, setFilter] = useState<FilterId>(() => searchParamsToChipFilter(search.where));
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [blockedByApartment, setBlockedByApartment] = useState<
    Record<string, { checkIn: string; checkOut: string }[]>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setFilter(searchParamsToChipFilter(search.where));
  }, [search.where]);

  useEffect(() => {
    Promise.all([fetchApartments({ publicOnly: true }), fetchAllBookingAvailability()])
      .then(([{ apartments: list }, blocked]) => {
        setApartments(list);
        setBlockedByApartment(blocked);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterApartmentsBySearch(apartments, search, blockedByApartment, filter);
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

        <div className={styles.filters}>
          {FILTER_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`${styles.chip} ${filter === id ? styles.chipOn : ''}`}
              onClick={() => setFilter(id)}
            >
              {t(`apartments.filters.${id}`)}
            </button>
          ))}
        </div>

        <div className={styles.grid}>
          {loading ? (
            <p className={styles.empty}>{t('apartments.empty')}</p>
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
