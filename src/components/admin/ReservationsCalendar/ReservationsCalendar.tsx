'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Apartment, Booking } from '@/types/apartment';
import Icon from '@/components/ui/Icon/Icon';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { fetchBookings } from '@/lib/api/client';
import {
  addDaysISO,
  addMonths,
  daysInMonth,
  nightsBetween,
  startOfMonth,
  toISODate,
  todayISO,
} from '@/lib/dates';
import styles from './ReservationsCalendar.module.scss';

interface ReservationsCalendarProps {
  apartments: Apartment[];
}

/** Booking channels shown on the calendar, plus colours. Unknown → grey. */
const CHANNEL_COLOR: Record<string, string> = {
  Website: '#c8643c',
  WhatsApp: '#25a35a',
  Booking: '#2c4a64',
  Airbnb: '#e0565b',
  Vrbo: '#3b5bdb',
};

function channelColor(channel: string): string {
  return CHANNEL_COLOR[channel] ?? '#6d6655';
}

// Statuses that occupy the calendar. Declined/Draft never appear.
const OCCUPYING: Booking['status'][] = ['Confirmed', 'New request'];

interface Bar {
  booking: Booking;
  offset: number; // day columns from the 1st
  span: number; // day columns wide
  clippedStart: boolean;
  clippedEnd: boolean;
}

export default function ReservationsCalendar({ apartments }: ReservationsCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [aptFilter, setAptFilter] = useState<string>('all');
  const today = todayISO();

  useEffect(() => {
    fetchBookings(true)
      .then((all) => setBookings(all.filter((b) => OCCUPYING.includes(b.status))))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const totalDays = daysInMonth(year, monthIndex);
  const firstISO = toISODate(new Date(year, monthIndex, 1));
  const nextMonthISO = toISODate(new Date(year, monthIndex + 1, 1));
  const monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(month);

  const days = useMemo(
    () =>
      Array.from({ length: totalDays }, (_, i) => {
        const iso = toISODate(new Date(year, monthIndex, i + 1));
        const dow = new Date(year, monthIndex, i + 1).getDay();
        return { iso, day: i + 1, weekend: dow === 0 || dow === 6, isToday: iso === today };
      }),
    [year, monthIndex, totalDays, today]
  );

  const rows = useMemo(() => {
    const list = aptFilter === 'all' ? apartments : apartments.filter((a) => a.id === aptFilter);
    return list.map((apt) => {
      const bars: Bar[] = [];
      for (const b of bookings) {
        if (b.apartmentId !== apt.id) continue;
        // Clip the booking to the visible month (checkOut is exclusive).
        const start = b.checkIn > firstISO ? b.checkIn : firstISO;
        const endExcl = b.checkOut < nextMonthISO ? b.checkOut : nextMonthISO;
        if (start >= endExcl) continue;
        const offset = nightsBetween(firstISO, start);
        const span = nightsBetween(start, endExcl);
        bars.push({
          booking: b,
          offset,
          span,
          clippedStart: b.checkIn < firstISO,
          clippedEnd: b.checkOut > nextMonthISO,
        });
      }
      return { apt, bars };
    });
  }, [apartments, bookings, aptFilter, firstISO, nextMonthISO]);

  const channelsPresent = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookings) set.add(b.channel);
    return [...set];
  }, [bookings]);

  const pct = (n: number) => `${(n / totalDays) * 100}%`;

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Previous month"
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <Icon name="chevron" size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <span className={styles.monthLabel}>{monthLabel}</span>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Next month"
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <Icon name="chevron" size={18} />
          </button>
          <button type="button" className={styles.todayBtn} onClick={() => setMonth(startOfMonth(new Date()))}>
            Today
          </button>
        </div>

        <div className={styles.right}>
          <select
            className="select"
            value={aptFilter}
            onChange={(e) => setAptFilter(e.target.value)}
            aria-label="Filter by apartment"
          >
            <option value="all">All apartments</option>
            {apartments.map((a) => (
              <option key={a.id} value={a.id}>
                {getApartmentCopy(a, 'en').title}
              </option>
            ))}
          </select>

          {channelsPresent.length > 0 && (
            <div className={styles.legend}>
              {channelsPresent.map((c) => (
                <span key={c} className={styles.legendItem}>
                  <span className={styles.swatch} style={{ background: channelColor(c) }} />
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <p className={styles.empty}>Loading calendar…</p>
      ) : rows.length === 0 ? (
        <p className={styles.empty}>No apartments to show.</p>
      ) : (
        <div className={styles.grid}>
          {/* Header row: day numbers */}
          <div className={styles.headRow}>
            <div className={styles.aptHeadCell}>Apartment</div>
            <div className={styles.daysHead}>
              {days.map((d) => (
                <div
                  key={d.iso}
                  className={[styles.dayHead, d.weekend ? styles.weekend : '', d.isToday ? styles.today : '']
                    .filter(Boolean)
                    .join(' ')}
                >
                  {d.day}
                </div>
              ))}
            </div>
          </div>

          {/* One row per apartment */}
          {rows.map(({ apt, bars }) => (
            <div key={apt.id} className={styles.aptRow}>
              <div className={styles.aptCell} title={getApartmentCopy(apt, 'en').title}>
                {getApartmentCopy(apt, 'en').title}
              </div>
              <div className={styles.track}>
                {/* background day cells */}
                {days.map((d) => (
                  <div
                    key={d.iso}
                    className={[styles.cell, d.weekend ? styles.weekendCell : '', d.isToday ? styles.todayCell : '']
                      .filter(Boolean)
                      .join(' ')}
                  />
                ))}
                {/* booking bars */}
                {bars.map((bar) => {
                  const b = bar.booking;
                  const tentative = b.status === 'New request';
                  return (
                    <div
                      key={b.id}
                      className={[
                        styles.bar,
                        bar.clippedStart ? styles.clipStart : '',
                        bar.clippedEnd ? styles.clipEnd : '',
                        tentative ? styles.tentative : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{
                        left: `calc(${pct(bar.offset)} + 2px)`,
                        width: `calc(${pct(bar.span)} - 4px)`,
                        background: channelColor(b.channel),
                      }}
                      title={`${b.guest} · ${b.channel} · ${b.dates}${tentative ? ' · pending' : ''}`}
                    >
                      <span className={styles.barText}>{b.guest}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className={styles.note}>
        Showing confirmed and pending reservations from this website. Bars with a dashed outline are pending
        requests.
      </p>
    </div>
  );
}
