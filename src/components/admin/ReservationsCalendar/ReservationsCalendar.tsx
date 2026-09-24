'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  parseISODate,
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

/*
  One continuous strip of days rather than a month at a time, scrolled
  sideways the way Airbnb's host calendar is. A stay across the 31st used to be
  two clipped halves on two pages; now it is one bar. The strip grows at
  whichever end the scroll nears, so there is no last month to run into.
*/
/** Width of one day column, in pixels. Narrower on a phone. */
const DAY_WIDTH = 46;
const DAY_WIDTH_NARROW = 36;
/** Months added at an end each time the scroll gets close to it. */
const GROW_MONTHS = 3;
/** Past days kept in view to the left of the date being jumped to. */
const LEAD_DAYS = 2;

const MONTH_LABEL = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' });
const WEEKDAY_LABEL = new Intl.DateTimeFormat('en', { weekday: 'narrow' });

function monthKey(d: Date): string {
  return toISODate(startOfMonth(d)).slice(0, 7);
}

// Statuses that occupy the calendar. Declined/Draft never appear.
const OCCUPYING: Booking['status'][] = ['Confirmed', 'New request'];

interface Bar {
  key: string;
  label: string;
  title: string;
  /** The platform's own colour, worn as a dot rather than as the whole bar. */
  channelColor: string;
  offset: number; // day columns from the first day drawn
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
  /* The strip drawn so far: from the 1st of `from` up to, not including, the
     1st of `to`. Opens a month back so the recent past is a scroll away. */
  const [span, setSpan] = useState(() => {
    const now = startOfMonth(new Date());
    return { from: addMonths(now, -1), to: addMonths(now, 3) };
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [imported, setImported] = useState<ImportedBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [aptFilter, setAptFilter] = useState<string>('all');
  const [dayWidth, setDayWidth] = useState(DAY_WIDTH);
  /** The month under the left edge of the strip — what the toolbar names. */
  const [visibleMonth, setVisibleMonth] = useState(() => monthKey(new Date()));
  const today = todayISO();

  const scrollerRef = useRef<HTMLDivElement>(null);
  /* Work for the layout effect below, which is the first moment the widened
     strip exists to be scrolled: days added on the left (so the view does not
     jump), then a date to bring into view. */
  const pendingShift = useRef(0);
  const pendingTarget = useRef<{ iso: string; smooth: boolean } | null>(null);
  /* Set when a grow is requested, cleared once it has rendered, so a burst of
     scroll events asks for three more months once rather than forty times. */
  const growing = useRef(false);

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

  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 720px)');
    const apply = () => setDayWidth(narrow.matches ? DAY_WIDTH_NARROW : DAY_WIDTH);
    apply();
    narrow.addEventListener('change', apply);
    return () => narrow.removeEventListener('change', apply);
  }, []);

  const firstISO = toISODate(span.from);
  const endISO = toISODate(span.to);

  /* Read by the handlers below, so each grow is computed from the strip as it
     stands and the offset it causes is recorded exactly once. */
  const spanRef = useRef(span);
  spanRef.current = span;

  /** Draw the strip from `from`, keeping what is on screen where it is. */
  const growLeft = useCallback((from: Date) => {
    const cur = spanRef.current;
    if (from >= cur.from) return cur;
    pendingShift.current += nightsBetween(toISODate(from), toISODate(cur.from));
    return { ...cur, from };
  }, []);

  /** Bring `iso` to the left edge, widening the strip first if it is not drawn. */
  const goTo = useCallback(
    (iso: string, smooth: boolean) => {
      pendingTarget.current = { iso, smooth };
      const month = startOfMonth(parseISODate(iso));
      const next = growLeft(addMonths(month, -1));
      // Room to the right as well, so the target can actually reach the edge.
      const after = addMonths(month, 2);
      // A fresh object even when nothing grew: the layout effect has to run.
      setSpan({ from: next.from, to: after > next.to ? after : next.to });
    },
    [growLeft]
  );

  /* Arriving from a booking: scroll to its check-in, and narrow to its
     apartment so the stay is not one stripe among forty rows. */
  useEffect(() => {
    if (!focus) return;
    setAptFilter(focus.apartmentId);
    goTo(focus.checkIn, false);
  }, [focus, goTo]);

  /* Opening on today, the way the platforms do — unless the calendar was
     opened on a booking, which the effect above has already scrolled to. */
  const opened = useRef(false);
  useEffect(() => {
    if (loading || opened.current) return;
    opened.current = true;
    if (!focus) goTo(today, false);
  }, [loading, today, goTo, focus]);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    growing.current = false;
    if (!el) return;

    if (pendingShift.current) {
      el.scrollLeft += pendingShift.current * dayWidth;
      pendingShift.current = 0;
    }

    const target = pendingTarget.current;
    if (target) {
      pendingTarget.current = null;
      const index = Math.max(0, nightsBetween(firstISO, target.iso) - LEAD_DAYS);
      el.scrollTo({ left: index * dayWidth, behavior: target.smooth ? 'smooth' : 'auto' });
    }
  }, [span, dayWidth, firstISO, loading]);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const index = Math.floor(el.scrollLeft / dayWidth) + LEAD_DAYS;
    setVisibleMonth(monthKey(parseISODate(addDaysISO(firstISO, index))));

    if (growing.current) return;
    const monthPx = 31 * dayWidth;
    const left = el.scrollLeft;
    const right = el.scrollWidth - el.clientWidth - left;

    if (right < monthPx) {
      growing.current = true;
      const cur = spanRef.current;
      setSpan({ ...cur, to: addMonths(cur.to, GROW_MONTHS) });
    } else if (left < monthPx / 2) {
      growing.current = true;
      setSpan(growLeft(addMonths(spanRef.current.from, -GROW_MONTHS)));
    }
  }, [dayWidth, firstISO, growLeft]);

  const stepMonth = (delta: number) => {
    const [y, m] = visibleMonth.split('-').map(Number);
    goTo(toISODate(new Date(y, m - 1 + delta, 1)), true);
  };

  const totalDays = nightsBetween(firstISO, endISO);

  const days = useMemo(
    () =>
      Array.from({ length: totalDays }, (_, i) => {
        const date = new Date(span.from.getFullYear(), span.from.getMonth(), span.from.getDate() + i);
        const iso = toISODate(date);
        const dow = date.getDay();
        return {
          iso,
          day: date.getDate(),
          weekday: WEEKDAY_LABEL.format(date),
          weekend: dow === 0 || dow === 6,
          isToday: iso === today,
        };
      }),
    [span.from, totalDays, today]
  );

  const months = useMemo(() => {
    const list: { key: string; label: string; days: number }[] = [];
    for (let m = span.from; m < span.to; m = addMonths(m, 1)) {
      list.push({
        key: monthKey(m),
        label: MONTH_LABEL.format(m),
        days: daysInMonth(m.getFullYear(), m.getMonth()),
      });
    }
    return list;
  }, [span.from, span.to]);

  const todayIndex = nightsBetween(firstISO, today);
  const todayDrawn = today >= firstISO && today < endISO;

  /** Clip a stay to the drawn strip; null when it falls outside entirely. */
  const clip = useCallback(
    (checkIn: string, checkOut: string) => {
      const start = checkIn > firstISO ? checkIn : firstISO;
      const endExcl = checkOut < endISO ? checkOut : endISO;
      if (start >= endExcl) return null;
      return {
        offset: nightsBetween(firstISO, start),
        span: nightsBetween(start, endExcl),
        clippedStart: checkIn < firstISO,
        clippedEnd: checkOut > endISO,
      };
    },
    [firstISO, endISO]
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

  const px = (days: number) => days * dayWidth;

  /* Saturday's column in the first week drawn: where the weekend stripe that
     the rows paint as a background has to start repeating from. */
  const firstSaturday = (6 - span.from.getDay() + 7) % 7;
  const gridVars = {
    '--day-w': `${dayWidth}px`,
    '--weekend-x': `${px(firstSaturday)}px`,
  } as React.CSSProperties;

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Previous month"
            onClick={() => stepMonth(-1)}
          >
            <Icon name="chevron" size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <span className={styles.monthLabel}>
            {MONTH_LABEL.format(parseISODate(`${visibleMonth}-01`))}
          </span>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Next month"
            onClick={() => stepMonth(1)}
          >
            <Icon name="chevron" size={18} />
          </button>
          <button type="button" className={styles.todayBtn} onClick={() => goTo(today, true)}>
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
          <div
            ref={scrollerRef}
            className={styles.scroller}
            style={gridVars}
            onScroll={onScroll}
          >
            <div className={styles.canvas}>
              {/* Stays in place while the rows scroll under it. */}
              <div className={styles.headRow}>
                <div className={styles.aptHeadCell}>Apartment</div>
                <div className={styles.timeline} style={{ width: px(totalDays) }}>
                  <div className={styles.monthsHead}>
                    {months.map((m) => (
                      <div key={m.key} className={styles.monthHead} style={{ width: px(m.days) }}>
                        <span className={styles.monthName}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.daysHead}>
                    {days.map((d) => (
                      <div
                        key={d.iso}
                        className={[
                          styles.dayHead,
                          d.weekend ? styles.weekend : '',
                          d.isToday ? styles.today : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <span className={styles.weekday}>{d.weekday}</span>
                        <span className={styles.dayNum}>{d.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* One row per apartment */}
              {rows.map(({ apt, own, external, lanes }) => (
                <div key={apt.id} className={styles.aptRow}>
                  <div className={styles.aptCell} title={getApartmentCopy(apt, 'en').title}>
                    <span className={styles.aptName}>{getApartmentCopy(apt, 'en').title}</span>
                  </div>
                  {/* As tall as the stays that overlap here, and no taller. Day
                      lines and weekends are its background, not a div per day:
                      a year of days across every apartment is a lot of divs. */}
                  <div
                    className={styles.track}
                    style={{ width: px(totalDays), height: trackHeight(lanes) }}
                  >
                    {todayIndex > 0 && (
                      <div
                        className={styles.past}
                        style={{ width: px(Math.min(todayIndex, totalDays)) }}
                      />
                    )}
                    {todayDrawn && (
                      <div
                        className={styles.todayCol}
                        style={{ left: px(todayIndex), width: dayWidth }}
                      />
                    )}
                    {/* reservation bars: ours in the upper lanes, imported below */}
                    {[...own, ...external].map((bar) => {
                      const lit = Boolean(bar.bookingId && bar.bookingId === focus?.bookingId);

                      const look = bar.imported
                        ? BAR_STYLE.imported
                        : bar.tentative
                          ? BAR_STYLE.pending
                          : BAR_STYLE.confirmed;

                      const shape = {
                        left: px(bar.offset) + 2,
                        width: px(bar.span) - 4,
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
          </div>
        </div>
      )}

      <p className={styles.note}>
        Scroll sideways to move through the months — more are added as you reach either end.
        Dark bars are confirmed stays; amber ones are requests still waiting on an answer. Click
        either to open it in Bookings. Stays that share a night are stacked, so an overlap shows as
        two bars rather than one hiding the other. Grey striped bars are dates imported from a
        connected platform calendar — connect one under an apartment&rsquo;s Calendar sync.
      </p>
    </div>
  );
}
