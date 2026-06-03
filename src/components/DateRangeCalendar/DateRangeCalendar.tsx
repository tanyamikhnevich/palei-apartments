'use client';

import { useMemo, useState } from 'react';
import {
  addMonths,
  compareISO,
  daysInMonth,
  isNightBlocked,
  rangeHasBlockedNight,
  startOfMonth,
  todayISO,
  toISODate,
} from '@/lib/dates';
import styles from './DateRangeCalendar.module.scss';

export type DateRange = { checkIn: string; checkOut: string };

interface DateRangeCalendarProps {
  locale: string;
  labels: {
    prev: string;
    next: string;
    weekdays: string[];
  };
  hint?: string;
  blocked: DateRange[];
  checkIn: string | null;
  checkOut: string | null;
  onChange: (range: { checkIn: string; checkOut: string | null }) => void;
}

export default function DateRangeCalendar({
  locale,
  labels,
  hint,
  blocked,
  checkIn,
  checkOut,
  onChange,
}: DateRangeCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const today = todayISO();

  const weekdayLabels = useMemo(() => {
    const base = new Date(2024, 0, 1);
    return labels.weekdays.length === 7
      ? labels.weekdays
      : Array.from({ length: 7 }, (_, i) => {
          const d = new Date(base);
          d.setDate(base.getDate() + i);
          return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
        });
  }, [labels.weekdays, locale]);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const totalDays = daysInMonth(year, monthIndex);

  const rangeComplete = Boolean(checkIn && checkOut && checkOut > checkIn);

  const pick = (iso: string) => {
    if (isNightBlocked(iso, blocked) || iso < today) return;

    // Start a new range (nothing selected, or range already complete)
    if (!checkIn || rangeComplete) {
      onChange({ checkIn: iso, checkOut: null });
      return;
    }

    // Second click — set check-out
    if (iso <= checkIn) {
      onChange({ checkIn: iso, checkOut: null });
      return;
    }

    if (rangeHasBlockedNight(checkIn, iso, blocked)) {
      onChange({ checkIn: iso, checkOut: null });
      return;
    }

    onChange({ checkIn, checkOut: iso });
  };

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= totalDays; day++) {
    cells.push(toISODate(new Date(year, monthIndex, day)));
  }

  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month);

  return (
    <div className={styles.cal}>
      <div className={styles.nav}>
        <button type="button" className={styles.navBtn} onClick={() => setMonth(addMonths(month, -1))}>
          {labels.prev}
        </button>
        <span className={styles.month}>{monthLabel}</span>
        <button type="button" className={styles.navBtn} onClick={() => setMonth(addMonths(month, 1))}>
          {labels.next}
        </button>
      </div>
      <div className={styles.weekdays}>
        {weekdayLabels.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className={styles.grid}>
        {cells.map((iso, idx) => {
          if (!iso) return <span key={`e-${idx}`} className={styles.empty} />;
          const disabled = iso < today || isNightBlocked(iso, blocked);
          const rangeDone = checkIn && checkOut && checkOut > checkIn;
          const inRange =
            rangeDone &&
            compareISO(checkIn, iso) <= 0 &&
            compareISO(iso, checkOut!) < 0;
          const isStart = checkIn === iso;
          const isEnd = rangeDone && checkOut === iso;
          const isPendingEnd = checkIn === iso && !checkOut;
          const isToday = iso === today;

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              className={[
                styles.day,
                disabled ? styles.disabled : '',
                inRange ? styles.inRange : '',
                isStart || isPendingEnd ? styles.start : '',
                isEnd ? styles.end : '',
                isToday ? styles.today : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => pick(iso)}
            >
              {parseInt(iso.slice(8), 10)}
            </button>
          );
        })}
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
