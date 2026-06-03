'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button/Button';
import DateRangeCalendar from '@/components/DateRangeCalendar/DateRangeCalendar';
import { useLanguage } from '@/i18n/LanguageProvider';
import {
  buildApartmentSearchQuery,
  type ApartmentSearchParams,
  type SearchWhere,
} from '@/lib/apartmentSearch';
import { formatDateRange } from '@/lib/dates';
import styles from './ApartmentSearch.module.scss';

type ApartmentSearchProps = {
  variant?: 'hero' | 'page';
  /** When set (apartments page), form mirrors URL search params. */
  initial?: ApartmentSearchParams;
};

export default function ApartmentSearch({ variant = 'hero', initial }: ApartmentSearchProps) {
  const { locale, t } = useLanguage();
  const router = useRouter();

  const [where, setWhere] = useState<SearchWhere>(initial?.where ?? 'batYam');
  const [checkIn, setCheckIn] = useState<string | null>(initial?.checkIn ?? null);
  const [checkOut, setCheckOut] = useState<string | null>(initial?.checkOut ?? null);
  const [guests, setGuests] = useState(initial?.guests ?? 2);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const dateCellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initial) return;
    setWhere(initial.where);
    setCheckIn(initial.checkIn);
    setCheckOut(initial.checkOut);
    setGuests(initial.guests);
  }, [initial]);

  useEffect(() => {
    if (!calendarOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const root = dateCellRef.current;
      if (root && !root.contains(e.target as Node)) setCalendarOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [calendarOpen]);

  const calendarHint = useMemo(() => {
    if (checkIn && checkOut && checkOut > checkIn) {
      return t('booking.rangeSelected').replace(
        '{range}',
        formatDateRange(checkIn, checkOut, locale)
      );
    }
    if (checkIn && !checkOut) return t('booking.selectCheckOut');
    return t('booking.selectCheckIn');
  }, [checkIn, checkOut, locale, t]);

  const dateLabel =
    checkIn && checkOut && checkOut > checkIn
      ? formatDateRange(checkIn, checkOut, locale)
      : null;

  const onRangeChange = (range: { checkIn: string; checkOut: string | null }) => {
    setDateError(null);
    setCheckIn(range.checkIn);
    setCheckOut(range.checkOut);
    if (range.checkIn && range.checkOut && range.checkOut > range.checkIn) {
      setCalendarOpen(false);
    }
  };

  const runSearch = () => {
    const hasPartialDates = Boolean(checkIn) !== Boolean(checkOut);
    if (hasPartialDates || (checkIn && checkOut && checkOut <= checkIn)) {
      setDateError(t('search.completeDates'));
      setCalendarOpen(true);
      return;
    }

    const query = buildApartmentSearchQuery({ where, checkIn, checkOut, guests });
    router.push(`/apartments${query}`);
  };

  const rootClass = variant === 'hero' ? styles.hero : styles.page;

  return (
    <div className={rootClass}>
      <div className={styles.bar}>
        <div className={styles.cell}>
          <label htmlFor={`search-where-${variant}`}>{t('hero.where')}</label>
          <select
            id={`search-where-${variant}`}
            value={where}
            onChange={(e) => setWhere(e.target.value as SearchWhere)}
          >
            <option value="batYam">{t('hero.areas.batYam')}</option>
            <option value="telAviv">{t('hero.areas.telAviv')}</option>
            <option value="anywhere">{t('hero.areas.anywhere')}</option>
          </select>
        </div>

        <div className={styles.cell} ref={dateCellRef}>
          <label htmlFor={`search-dates-${variant}`}>{t('hero.checkIn')}</label>
          <button
            id={`search-dates-${variant}`}
            type="button"
            className={`${styles.dateBtn} ${dateLabel ? '' : styles.placeholder}`}
            onClick={() => setCalendarOpen((o) => !o)}
            aria-expanded={calendarOpen}
            aria-haspopup="dialog"
          >
            {dateLabel ?? t('hero.checkInPlaceholder')}
          </button>
          {calendarOpen && (
            <div className={styles.popover} ref={popoverRef} role="dialog" aria-label={t('hero.checkIn')}>
              <DateRangeCalendar
                locale={locale}
                hint={calendarHint}
                labels={{
                  prev: t('booking.prevMonth'),
                  next: t('booking.nextMonth'),
                  weekdays: [],
                }}
                blocked={[]}
                checkIn={checkIn}
                checkOut={checkOut}
                onChange={onRangeChange}
              />
            </div>
          )}
        </div>

        <div className={styles.cell}>
          <label htmlFor={`search-guests-${variant}`}>{t('hero.guests')}</label>
          <select
            id={`search-guests-${variant}`}
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value, 10))}
          >
            <option value={1}>{t('hero.guestOptions.one')}</option>
            <option value={2}>{t('hero.guestOptions.two')}</option>
            <option value={3}>{t('hero.guestOptions.three')}</option>
            <option value={4}>{t('hero.guestOptions.fourPlus')}</option>
          </select>
        </div>

        <Button className={styles.go} variant="primary" icon="search" onClick={runSearch}>
          {t('hero.search')}
        </Button>

        {dateError && <p className={styles.error}>{dateError}</p>}
      </div>
    </div>
  );
}
