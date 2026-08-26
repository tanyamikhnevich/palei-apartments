'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import CarCard from '@/components/CarCard/CarCard';
import DateRangeCalendar from '@/components/DateRangeCalendar/DateRangeCalendar';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatDateRange } from '@/lib/dates';
import { cars as builtInFleet } from '@/data/cars';
import { fetchCars } from '@/lib/api/client';
import type { Car } from '@/types/car';
import { carsInCountry, filterCars, pickupPoints, type CarSearch } from '@/lib/cars';
import styles from './CarsGrid.module.scss';

const SEAT_OPTIONS = [2, 5, 7];

/**
 * The fleet, with the search that matters for a car: when you need it, where
 * you pick it up, and how many people it has to carry. Everything reads from
 * `src/data/cars.ts` until the fleet gets a table.
 */
export default function CarsGrid() {
  const { locale, t } = useLanguage();
  const params = useSearchParams();

  /* Dates can arrive from an apartment booking — open on that week. */
  const [search, setSearch] = useState<CarSearch>(() => {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    const from = params.get('from');
    const to = params.get('to');
    return {
      from: from && iso.test(from) ? from : null,
      to: to && iso.test(to) ? to : null,
      seats: null,
      pickup: null,
    };
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const dateCell = useRef<HTMLDivElement>(null);

  /* Starts from the built-in fleet so the page has content on first paint. */
  const [fleet, setFleet] = useState<Car[]>(builtInFleet);

  useEffect(() => {
    fetchCars()
      .then(({ cars }) => setFleet(cars))
      .catch(() => setFleet(builtInFleet));
  }, []);

  const list = useMemo(() => carsInCountry(fleet, 'IL'), [fleet]);
  const points = useMemo(() => pickupPoints(list), [list]);
  const filtered = useMemo(() => filterCars(list, search), [list, search]);

  const rangeReady = Boolean(search.from && search.to && search.to > search.from);
  const dateLabel = rangeReady ? formatDateRange(search.from!, search.to!, locale) : null;
  const searching = rangeReady || search.seats !== null || search.pickup !== null;

  return (
    <section className={styles.section} id="cars">
      <div className="wrap">
        <div className={styles.header}>
          <div className="eyebrow">{t('cars.eyebrow')}</div>
          <h1 className="section-title">{t('cars.title')}</h1>
          <p className="section-sub">{t('cars.sub')}</p>
        </div>

        <div className={styles.bar}>
          <div className={styles.cell} ref={dateCell}>
            <label htmlFor="car-dates">{t('cars.hireTitle')}</label>
            <button
              id="car-dates"
              type="button"
              className={`${styles.cellBtn} ${dateLabel ? '' : styles.placeholder}`}
              onClick={() => setCalendarOpen((o) => !o)}
              aria-expanded={calendarOpen}
            >
              <Icon name="calendar" size={17} className={styles.cellIcon} />
              <span className={styles.cellText}>
                {dateLabel ?? t('hero.checkInPlaceholder')}
              </span>
            </button>
            {calendarOpen && (
              <div className={styles.popover} role="dialog" aria-label={t('cars.hireTitle')}>
                <DateRangeCalendar
                  locale={locale}
                  hint={dateLabel ?? t('booking.selectCheckIn')}
                  blocked={[]}
                  checkIn={search.from}
                  checkOut={search.to}
                  onChange={(range) => {
                    setSearch((s) => ({ ...s, from: range.checkIn, to: range.checkOut }));
                    if (range.checkOut && range.checkOut > range.checkIn) setCalendarOpen(false);
                  }}
                />
              </div>
            )}
          </div>

          <div className={styles.cell}>
            <label htmlFor="car-pickup">{t('cars.pickup')}</label>
            <Icon name="pin" size={17} className={styles.cellIcon} />
            <select
              id="car-pickup"
              value={search.pickup ?? ''}
              onChange={(e) =>
                setSearch((s) => ({ ...s, pickup: e.target.value || null }))
              }
            >
              <option value="">{t('cars.anyPickup')}</option>
              {points.map((point) => (
                <option key={point} value={point}>
                  {point}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.cell}>
            <label htmlFor="car-seats">{t('cars.seats')}</label>
            <Icon name="guest" size={17} className={styles.cellIcon} />
            <select
              id="car-seats"
              value={search.seats ?? ''}
              onChange={(e) =>
                setSearch((s) => ({ ...s, seats: e.target.value ? Number(e.target.value) : null }))
              }
            >
              <option value="">{t('cars.anySeats')}</option>
              {SEAT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {t('cars.seatsPlus').replace('{n}', String(n))}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className={styles.grid}>
            {filtered.map((car) => (
              <CarCard car={car} key={car.id} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <p>{searching ? t('cars.emptySearch') : t('cars.empty')}</p>
            {searching && (
              <Button
                variant="ghost"
                onClick={() => setSearch({ from: null, to: null, seats: null, pickup: null })}
              >
                {t('apartments.filterAll')}
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
