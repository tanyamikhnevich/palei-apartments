'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Apartment } from '@/types/apartment';
import ApartmentCard from '@/components/ApartmentCard/ApartmentCard';
import ApartmentCardSkeleton from '@/components/ApartmentCard/ApartmentCardSkeleton';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import { useLanguage } from '@/i18n/LanguageProvider';
import {
  buildApartmentSearchQuery,
  filterApartmentsBySearch,
  parseApartmentSearchParams,
} from '@/lib/apartmentSearch';
import { collectApartmentTags, formatTagLabel } from '@/lib/apartmentTags';
import { fetchAllBookingAvailability, fetchApartments } from '@/lib/api/client';
import { apartmentsInCountry } from '@/lib/regions';
import type { Region } from '@/types/region';
import styles from './ApartmentGrid.module.scss';

// Leaflet touches `window` on import, so the map is client-only and is not
// downloaded at all until a visitor asks to see it.
const ApartmentMap = dynamic(() => import('@/components/ApartmentMap/ApartmentMap'), {
  ssr: false,
  loading: () => <Skeleton height={440} radius="var(--r-lg)" style={{ marginTop: 24 }} />,
});

const SKELETON_COUNT = 6;

/*
  Filtering is instant, so without a beat of skeleton a new search looks like
  nothing happened. Long enough to register, short enough not to feel slow.
*/
const REFRESH_MS = 450;

type ApartmentGridFullProps = {
  /** Scopes the grid to one country's listings; omit to show every region. */
  country?: Region['country'];
  /** Copy keys, so the Cyprus page can title itself. */
  eyebrowKey?: string;
  titleKey?: string;
  subKey?: string;
};

export default function ApartmentGridFull({
  country,
  eyebrowKey = 'apartments.eyebrow',
  titleKey = 'apartments.allTitle',
  subKey = 'apartments.allSub',
}: ApartmentGridFullProps = {}) {
  const { t, href } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = useMemo(
    () => parseApartmentSearchParams(searchParams),
    [searchParams]
  );
  const hasSearchQuery = Boolean(
    searchParams.get('checkIn') || searchParams.get('checkOut') || searchParams.get('guests')
  );
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [blockedByApartment, setBlockedByApartment] = useState<
    Record<string, { checkIn: string; checkOut: string }[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    Promise.all([fetchApartments({ publicOnly: true }), fetchAllBookingAvailability()])
      .then(([{ apartments: list }, blocked]) => {
        setApartments(apartmentsInCountry(list, country));
        setBlockedByApartment(blocked);
      })
      .finally(() => setLoading(false));
  }, [country]);

  const tags = useMemo(() => collectApartmentTags(apartments), [apartments]);

  // A tag can disappear while it is selected (admin edit, reload) — fall back to "all".
  const activeTag = tagFilter && tags.includes(tagFilter) ? tagFilter : null;

  const filterKey = `${searchParams.toString()}|${activeTag ?? ''}`;
  const prevFilterKey = useRef(filterKey);

  useEffect(() => {
    if (prevFilterKey.current === filterKey) return;
    prevFilterKey.current = filterKey;
    if (loading) return;
    setRefreshing(true);
    const timer = setTimeout(() => setRefreshing(false), REFRESH_MS);
    return () => clearTimeout(timer);
  }, [filterKey, loading]);

  const hasActiveFilters = hasSearchQuery || activeTag !== null;
  const clearFilters = () => {
    setTagFilter(null);
    if (hasSearchQuery) router.replace(pathname, { scroll: false });
  };

  const showSkeleton = loading || refreshing;
  const filtered = filterApartmentsBySearch(apartments, search, blockedByApartment, activeTag);
  // The apartment page picks these up, so the dates a guest searched for are
  // already marked in its booking calendar.
  const searchQuery = hasSearchQuery ? buildApartmentSearchQuery(search) : '';
  const emptyMessage = hasSearchQuery ? t('apartments.emptySearch') : t('apartments.empty');

  return (
    <section className={styles.section} id="apartments">
      <div className="wrap">
        <div className={styles.header}>
          <div>
            <div className="eyebrow">{t(eyebrowKey)}</div>
            <h2 className="section-title">{t(titleKey)}</h2>
            <p className="section-sub">{t(subKey)}</p>
          </div>
          <Button variant="ghost" icon="arrowBack" as="a" href={href('/')}>
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

        {!loading && (hasActiveFilters || filtered.length > 0) && (
          <div className={styles.mapBar}>
            {hasActiveFilters && (
              <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                <Icon name="x" size={14} />
                {t('apartments.clearFilters')}
              </button>
            )}
            {filtered.length > 0 && (
              <button
                type="button"
                className={`${styles.mapToggle} ${mapOpen ? styles.mapToggleOn : ''}`}
                onClick={() => setMapOpen((open) => !open)}
                aria-expanded={mapOpen}
              >
                <Icon name="pin" size={16} />
                {mapOpen ? t('apartments.hideMap') : t('apartments.showMap')}
              </button>
            )}
          </div>
        )}

        {/* Pins follow the search and tag filters, not the whole listing. */}
        {mapOpen && !showSkeleton && filtered.length > 0 && <ApartmentMap apartments={filtered} />}

        <div className={styles.grid} aria-busy={showSkeleton}>
          {showSkeleton ? (
            Array.from({ length: SKELETON_COUNT }, (_, i) => <ApartmentCardSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <p>{emptyMessage}</p>
              {hasActiveFilters && (
                <Button variant="ghost" icon="x" onClick={clearFilters}>
                  {t('apartments.clearFilters')}
                </Button>
              )}
            </div>
          ) : (
            filtered.map((apt) => (
              <ApartmentCard key={apt.id} apt={apt} to={`/apartments/${apt.id}${searchQuery}`} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
