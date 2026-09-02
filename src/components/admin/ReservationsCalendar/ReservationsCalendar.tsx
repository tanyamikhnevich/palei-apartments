'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Apartment, Booking } from '@/types/apartment';
import Icon from '@/components/ui/Icon/Icon';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { fetchBookings, fetchImportedBlocks, type ImportedBlock } from '@/lib/api/client';
import { CALENDAR_SOURCE_LABELS, type CalendarFeedSource } from '@/types/calendar';
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
  Website: '#1b6ca8',
  WhatsApp: '#25a35a',
  Booking: '#2c4a64',
  Airbnb: '#e0565b',
  Vrbo: '#3b5bdb',
};

function channelColor(channel: string): string {
  return CHANNEL_COLOR[channel] ?? '#6b7683';
}

/** Imported feeds are coloured by platform, matching the channel palette. */
const SOURCE_COLOR: Record<CalendarFeedSource, string> = {
  airbnb: CHANNEL_COLOR.Airbnb,
  booking: CHANNEL_COLOR.Booking,
  vrbo: CHANNEL_COLOR.Vrbo,
  other: '#6b7683',
};

// Statuses that occupy the calendar. Declined/Draft never appear.
const OCCUPYING: Booking['status'][] = ['Confirmed', 'New request'];

interface Bar {
  key: string;
  label: string;
  title: string;
  color: string;
  offset: number; // day columns from the 1st
  span: number; // day columns wide
  clippedStart: boolean;
  clippedEnd: boolean;
  /** A request we have not confirmed yet — drawn with a dashed outline. */
  tentative: boolean;
  /** Came from a platform's calendar rather than from our own bookings. */
  imported: boolean;
}

export default function ReservationsCalendar({ apartments }: ReservationsCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [imported, setImported] = useState<ImportedBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [aptFilter, setAptFilter] = useState<string>('all');
  const today = todayISO();

  useEffect(() => {
    // The two sides are independent: a broken Airbnb feed must not blank out
    // the reservations we hold ourselves, and vice versa.
    Promise.allSettled([fetchBookings(true), fetchImportedBlocks()])
      .then(([own, external]) => {
        if (own.status === 'fulfilled') {
          setBookings(own.value.filter((b) => OCCUPYING.includes(b.status)));
        }
        if (external.status === 'fulfilled') setImported(external.value);
      })
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

  /** Clip a stay to the visible month; null when it falls outside entirely. */
  const clip = useCallback(
    (checkIn: string, checkOut: string) => {
      const start = checkIn > firstISO ? checkIn : firstISO;
      const endExcl = checkOut < nextMonthISO ? checkOut : nextMonthISO;
      if (start >= endExcl) return null;
      return {
        offset: nightsBetween(firstISO, start),
        span: nightsBetween(start, endExcl),
        clippedStart: checkIn < firstISO,
        clippedEnd: checkOut > nextMonthISO,
      };
    },
    [firstISO, nextMonthISO]
  );

  const rows = useMemo(() => {
    const list = aptFilter === 'all' ? apartments : apartments.filter((a) => a.id === aptFilter);

    return list.map((apt) => {
      const own: Bar[] = [];
      for (const b of bookings) {
        if (b.apartmentId !== apt.id) continue;
        const box = clip(b.checkIn, b.checkOut);
        if (!box) continue;

        const tentative = b.status === 'New request';
        own.push({
          ...box,
          key: `booking-${b.id}`,
          label: b.guest,
          title: `${b.guest} · ${b.channel} · ${b.dates}${tentative ? ' · pending' : ''}`,
          color: channelColor(b.channel),
          tentative,
          imported: false,
        });
      }

      const external: Bar[] = [];
      for (const block of imported) {
        if (block.apartmentId !== apt.id) continue;
        const box = clip(block.checkIn, block.checkOut);
        if (!box) continue;

        const platform = CALENDAR_SOURCE_LABELS[block.source];
        external.push({
          ...box,
          key: `imported-${block.id}`,
          label: platform,
          // The platforms mostly send "Reserved"; anything more specific is
          // worth surfacing, but only in the tooltip.
          title: `${platform} · ${block.checkIn} → ${block.checkOut}${
            block.summary ? ` · ${block.summary}` : ''
          } · imported from ${block.feedLabel}`,
          color: SOURCE_COLOR[block.source],
          tentative: false,
          imported: true,
        });
      }

      return { apt, own, external };
    });
  }, [apartments, bookings, imported, aptFilter, clip]);

  /** Imported stays get their own lane, but only on months that have any. */
  const dualLane = useMemo(() => rows.some((r) => r.external.length > 0), [rows]);

  const channelsPresent = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookings) set.add(b.channel);
    return [...set];
  }, [bookings]);

  const sourcesPresent = useMemo(() => {
    const set = new Set<CalendarFeedSource>();
    for (const b of imported) set.add(b.source);
    return [...set];
  }, [imported]);

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

          {(channelsPresent.length > 0 || sourcesPresent.length > 0) && (
            <div className={styles.legend}>
              {channelsPresent.map((c) => (
                <span key={c} className={styles.legendItem}>
                  <span className={styles.swatch} style={{ background: channelColor(c) }} />
                  {c}
                </span>
              ))}
              {sourcesPresent.map((src) => (
                <span key={`imported-${src}`} className={styles.legendItem}>
                  <span
                    className={`${styles.swatch} ${styles.swatchImported}`}
                    style={{ background: SOURCE_COLOR[src] }}
                  />
                  {CALENDAR_SOURCE_LABELS[src]} (imported)
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
        <div className={`${styles.grid} ${dualLane ? styles.dual : ''}`}>
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
          {rows.map(({ apt, own, external }) => (
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
                {/* reservation bars: ours on the upper lane, imported below */}
                {[...own, ...external].map((bar) => (
                  <div
                    key={bar.key}
                    className={[
                      styles.bar,
                      bar.imported ? styles.imported : '',
                      bar.clippedStart ? styles.clipStart : '',
                      bar.clippedEnd ? styles.clipEnd : '',
                      bar.tentative ? styles.tentative : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      left: `calc(${pct(bar.offset)} + 2px)`,
                      width: `calc(${pct(bar.span)} - 4px)`,
                      background: bar.color,
                    }}
                    title={bar.title}
                  >
                    <span className={styles.barText}>{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className={styles.note}>
        Upper bars are reservations taken through this website; a dashed outline means the request is
        still pending. Striped bars underneath are dates imported from a connected platform calendar —
        connect one under an apartment&rsquo;s Calendar sync.
      </p>
    </div>
  );
}
