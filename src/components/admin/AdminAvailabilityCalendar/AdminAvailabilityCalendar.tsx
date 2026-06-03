'use client';

import { useMemo, useState } from 'react';
import {
  addMonths,
  daysInMonth,
  startOfMonth,
  todayISO,
  toISODate,
} from '@/lib/dates';
import type { ApartmentAvailability } from '@/types/apartment';
import { DEFAULT_AVAILABILITY, blockedNightsToRanges, rangesToBlockedNights } from '@/lib/availability';
import styles from './AdminAvailabilityCalendar.module.scss';

interface AdminAvailabilityCalendarProps {
  value: ApartmentAvailability;
  onChange: (value: ApartmentAvailability) => void;
}

export default function AdminAvailabilityCalendar({
  value = DEFAULT_AVAILABILITY,
  onChange,
}: AdminAvailabilityCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const today = todayISO();

  const blockedNights = useMemo(
    () => new Set(rangesToBlockedNights(value.blocked)),
    [value.blocked]
  );

  const toggleNight = (iso: string) => {
    if (iso < today) return;
    const next = new Set(blockedNights);
    if (next.has(iso)) next.delete(iso);
    else next.add(iso);
    onChange({ mode: 'calendar', blocked: blockedNightsToRanges([...next]) });
  };

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const totalDays = daysInMonth(year, monthIndex);
  const monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(month);

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= totalDays; day++) {
    cells.push(toISODate(new Date(year, monthIndex, day)));
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.modeRow}>
        <button
          type="button"
          className={`${styles.modeBtn} ${value.mode === 'always' ? styles.on : ''}`}
          onClick={() => onChange({ mode: 'always', blocked: [] })}
        >
          Always available
        </button>
        <button
          type="button"
          className={`${styles.modeBtn} ${value.mode === 'calendar' ? styles.on : ''}`}
          onClick={() => onChange({ mode: 'calendar', blocked: value.blocked })}
        >
          Calendar
        </button>
      </div>

      {value.mode === 'calendar' && (
        <>
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.free}`} /> Free
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.blocked}`} /> Blocked
            </span>
          </div>
          <p className={styles.hint}>
            Click a day to mark it blocked or free. Guest bookings also block dates on the public site.
          </p>
          <div className={styles.cal}>
            <div className={styles.nav}>
              <button type="button" className={styles.navBtn} onClick={() => setMonth(addMonths(month, -1))}>
                Prev
              </button>
              <span className={styles.month}>{monthLabel}</span>
              <button type="button" className={styles.navBtn} onClick={() => setMonth(addMonths(month, 1))}>
                Next
              </button>
            </div>
            <div className={styles.grid}>
              {cells.map((iso, idx) => {
                if (!iso) return <span key={`e-${idx}`} className={styles.empty} />;
                const isPast = iso < today;
                const isBlocked = blockedNights.has(iso);
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={isPast}
                    className={[
                      styles.day,
                      isPast ? styles.past : '',
                      isBlocked ? styles.blockedDay : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => toggleNight(iso)}
                  >
                    {parseInt(iso.slice(8), 10)}
                  </button>
                );
              })}
            </div>
            {blockedNights.size > 0 && (
              <p className={styles.hint}>{blockedNights.size} manually blocked night(s)</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
