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
import { LANE_HEIGHT, laneTop, packIntoLanes, trackHeight } from '@/lib/calendarLanes';
import styles from './ReservationsCalendar.module.scss';

/** A stay the bookings table asked the calendar to show. */
export interface CalendarFocus {
  bookingId: string;
  apartmentId: string;
  /** Decides which month opens. */
  checkIn: string;
}

interface ReservationsCalendarProps {
  apartments: Apartment[];
  /** Arrive on a particular stay: its month, its apartment, its bar lit up. */
  focus?: CalendarFocus;
  /** Take a booking back to the table that can confirm or decline it. */
  onOpenBooking?: (bookingId: string) => void;
}

/**
 * What a bar looks like, decided by its state rather than by where it came
 * from.
 *
 * The first version of this coloured every bar by channel and left the status
 * to an outline. It read badly, and the reason is in the data: nearly every
 * stay arrives through the website, so channel-as-colour painted the whole
 * month one shade of blue and then asked a dashed border to carry the one
 * distinction that actually matters — settled, or still waiting on you.
 *
 * So state owns the colour now. Confirmed is solid and dark, a request is
 * light amber with dark text, an imported block is quiet grey. Three fills
 * that cannot be mistaken for each other at a glance, all of them dark-on-
 * light or light-on-dark rather than mid-tone-on-mid-tone.
 *
 * Channel keeps its palette, in a dot at the head of the bar — and only in
 * months that actually have more than one channel, because a legend explaining
 * a single colour is furniture.
 */
const BAR_STYLE = {
  /* Text ≥ 6.5:1 on its own fill, and each fill ≥ 8:1 from the confirmed one.
     The borders carry ≥ 3:1 against the white grid, which is what actually
     draws the edge of a light bar sitting on an empty day. */
  confirmed: { background: '#1e3a52', color: '#ffffff', border: '#1e3a52' },
  pending: { background: '#fbe9c8', color: '#6f4a17', border: '#a9701c' },
  imported: { background: '#d8e0e9', color: '#3d4c5c', border: '#7d92a8' },
} as const;

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
  /** The platform's own colour, worn as a dot rather than as the whole bar. */
  channelColor: string;
  offset: number; // day columns from the 1st
  span: number; // day columns wide
  clippedStart: boolean;
  clippedEnd: boolean;
  /** A request we have not confirmed yet — drawn hollow rather than filled. */
  tentative: boolean;
  /** Came from a platform's calendar rather than from our own bookings. */
  imported: boolean;
  /** Ours, and therefore something the bookings table can act on. */
  bookingId?: string;
  /** Which stacked row within the apartment's track — see packIntoLanes. */
  lane: number;
}

export default function ReservationsCalendar({
  apartments,
  focus,
  onOpenBooking,
}: ReservationsCalendarProps) {
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

  /* Arriving from a booking: open its month, and narrow to its apartment so
     the stay is not one stripe among forty rows. */
  useEffect(() => {
    if (!focus) return;
    setMonth(startOfMonth(new Date(`${focus.checkIn}T00:00:00`)));
    setAptFilter(focus.apartmentId);
  }, [focus]);

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
          title: `${b.guest} · ${b.channel} · ${b.dates} · ${
            tentative ? 'request, not yet confirmed' : 'confirmed'
          }`,
          channelColor: channelColor(b.channel),
          tentative,
          imported: false,
          bookingId: b.id,
          lane: 0,
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
          channelColor: SOURCE_COLOR[block.source],
          tentative: false,
          imported: true,
          lane: 0,
        });
      }

      /* Ours on top, the platforms' underneath, each packed among its own
         kind so an imported block never pushes a reservation out of sight. */
      const ownLanes = packIntoLanes(own);
      const externalLanes = packIntoLanes(external);
      for (const bar of external) bar.lane += ownLanes;

      return { apt, own, external, lanes: ownLanes + externalLanes };
    });
  }, [apartments, bookings, imported, aptFilter, clip]);

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

  /* One channel in the whole month explains nothing; two or more do. */
  const showChannelDots = channelsPresent.length + sourcesPresent.length > 1;

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
              {/* The fills first: they are what the eye sorts the month by. */}
              <span className={styles.legendItem}>
                <span
                  className={styles.swatch}
                  style={{
                    background: BAR_STYLE.confirmed.background,
                    boxShadow: `inset 0 0 0 1px ${BAR_STYLE.confirmed.border}`,
                  }}
                />
                Confirmed
              </span>
              <span className={styles.legendItem}>
                <span
                  className={styles.swatch}
                  style={{
                    background: BAR_STYLE.pending.background,
                    boxShadow: `inset 0 0 0 1px ${BAR_STYLE.pending.border}`,
                  }}
                />
                Request
              </span>
              {sourcesPresent.length > 0 && (
                <span className={styles.legendItem}>
                  <span
                    className={`${styles.swatch} ${styles.swatchImported}`}
                    style={{
                      background: BAR_STYLE.imported.background,
                      boxShadow: `inset 0 0 0 1px ${BAR_STYLE.imported.border}`,
                    }}
                  />
                  Imported
                </span>
              )}

              {/* Then the dots, and only where they distinguish anything. */}
              {showChannelDots && (
                <>
                  {channelsPresent.map((c) => (
                    <span key={c} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: channelColor(c) }} />
                      {c}
                    </span>
                  ))}
                  {sourcesPresent.map((src) => (
                    <span key={`imported-${src}`} className={styles.legendItem}>
                      <span
                        className={styles.legendDot}
                        style={{ background: SOURCE_COLOR[src] }}
                      />
                      {CALENDAR_SOURCE_LABELS[src]}
                    </span>
                  ))}
                </>
              )}
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
          {rows.map(({ apt, own, external, lanes }) => (
            <div key={apt.id} className={styles.aptRow}>
              <div className={styles.aptCell} title={getApartmentCopy(apt, 'en').title}>
                {getApartmentCopy(apt, 'en').title}
              </div>
              {/* As tall as the stays that overlap here, and no taller. */}
              <div className={styles.track} style={{ height: trackHeight(lanes) }}>
                {/* background day cells */}
                {days.map((d) => (
                  <div
                    key={d.iso}
                    className={[styles.cell, d.weekend ? styles.weekendCell : '', d.isToday ? styles.todayCell : '']
                      .filter(Boolean)
                      .join(' ')}
                  />
                ))}
                {/* reservation bars: ours in the upper lanes, imported below */}
                {[...own, ...external].map((bar) => {
                  const lit = Boolean(bar.bookingId && bar.bookingId === focus?.bookingId);

                  const look = bar.imported
                    ? BAR_STYLE.imported
                    : bar.tentative
                      ? BAR_STYLE.pending
                      : BAR_STYLE.confirmed;

                  const shape = {
                    left: `calc(${pct(bar.offset)} + 2px)`,
                    width: `calc(${pct(bar.span)} - 4px)`,
                    top: laneTop(bar.lane),
                    height: LANE_HEIGHT,
                    background: look.background,
                    color: look.color,
                    boxShadow: `inset 0 0 0 1px ${look.border}`,
                  };

                  const classes = [
                    styles.bar,
                    bar.imported ? styles.imported : '',
                    bar.clippedStart ? styles.clipStart : '',
                    bar.clippedEnd ? styles.clipEnd : '',
                    bar.tentative ? styles.tentative : '',
                    lit ? styles.lit : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  /* Imported dates are somebody else's record: there is nothing
                     here that can confirm or decline them. */
                  /* Only worth carrying when there is more than one to tell
                     apart — otherwise it is a dot that says "website" forty
                     times over. */
                  const inside = (
                    <>
                      {showChannelDots && (
                        <span
                          className={styles.channelDot}
                          style={{ background: bar.channelColor }}
                        />
                      )}
                      <span className={styles.barText}>{bar.label}</span>
                    </>
                  );

                  if (!bar.bookingId || !onOpenBooking) {
                    return (
                      <div key={bar.key} className={classes} style={shape} title={bar.title}>
                        {inside}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={bar.key}
                      type="button"
                      className={`${classes} ${styles.barButton}`}
                      style={shape}
                      title={`${bar.title} — open in bookings`}
                      onClick={() => onOpenBooking(bar.bookingId!)}
                    >
                      {inside}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className={styles.note}>
        Dark bars are confirmed stays; amber ones are requests still waiting on an answer. Click
        either to open it in Bookings. Stays that share a night are stacked, so an overlap shows as
        two bars rather than one hiding the other. Grey striped bars are dates imported from a
        connected platform calendar — connect one under an apartment&rsquo;s Calendar sync.
      </p>
    </div>
  );
}
