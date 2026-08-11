'use client';

import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import { AdminField } from '@/components/admin/ui/AdminField';
import {
  createCalendarFeed,
  deleteCalendarFeed,
  fetchCalendarFeeds,
  syncCalendars,
} from '@/lib/api/client';
import {
  CALENDAR_FEED_SOURCES,
  CALENDAR_SOURCE_LABELS,
  type CalendarFeed,
  type CalendarFeedSource,
} from '@/types/calendar';
import styles from './AdminCalendarSync.module.scss';

interface AdminCalendarSyncProps {
  apartmentId: string;
  icalToken?: string;
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'never';

  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString();
}

function CopyField({ value, hint }: { value: string; hint?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <div className={styles.copyRow}>
        <input className="input" value={value} readOnly onFocus={(e) => e.target.select()} />
        <Button type="button" variant="ghost" size="sm" onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
    </>
  );
}

/**
 * Two-way iCal sync for one apartment: the feeds we import from the platforms,
 * and the export link they subscribe to. Feeds are saved immediately — they are
 * not part of the apartment form.
 */
export default function AdminCalendarSync({ apartmentId, icalToken }: AdminCalendarSyncProps) {
  const [feeds, setFeeds] = useState<CalendarFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [source, setSource] = useState<CalendarFeedSource>('airbnb');
  const [url, setUrl] = useState('');

  const exportUrl =
    icalToken && typeof window !== 'undefined'
      ? `${window.location.origin}/api/ical/${icalToken}.ics`
      : null;

  const load = useCallback(async () => {
    try {
      setFeeds(await fetchCalendarFeeds(apartmentId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load calendar feeds');
    } finally {
      setLoading(false);
    }
  }, [apartmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addFeed = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createCalendarFeed({ apartmentId, source, url: url.trim() });
      setUrl('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the calendar');
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async (feedId?: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await syncCalendars(feedId ? { feedId } : { apartmentId });
      const failure = result.results.find((r) => !r.ok);
      if (failure?.error) setError(failure.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  };

  const removeFeed = async (feed: CalendarFeed) => {
    if (!confirm(`Disconnect "${feed.label}"? Its imported dates will be freed up.`)) return;
    setBusy(true);
    try {
      await deleteCalendarFeed(feed.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove the calendar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminField label="Calendar sync">
      <div className={styles.wrap}>
        <div className={styles.block}>
          <h5 className={styles.blockTitle}>Import — dates booked elsewhere</h5>
          <p className={styles.hint}>
            Airbnb: Listings → the listing → Calendar → Availability → Connect calendars → Export
            calendar. Paste that link here.
          </p>

          {loading ? (
            <p className={styles.hint}>Loading…</p>
          ) : feeds.length === 0 ? (
            <p className={styles.hint}>No calendars connected yet.</p>
          ) : (
            <ul className={styles.feeds}>
              {feeds.map((feed) => (
                <li key={feed.id} className={styles.feed}>
                  <div className={styles.feedMain}>
                    <span className={styles.feedLabel}>{feed.label}</span>
                    <span className={styles.feedUrl} title={feed.url}>
                      {feed.url}
                    </span>
                    <span
                      className={`${styles.status} ${
                        feed.lastStatus === 'error' ? styles.statusError : styles.statusOk
                      }`}
                    >
                      {feed.lastStatus === 'error'
                        ? `Error: ${feed.lastError ?? 'sync failed'}`
                        : `${feed.eventCount} blocked ranges · synced ${formatSyncTime(feed.lastSyncAt)}`}
                    </span>
                  </div>
                  <div className={styles.feedActions}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => void syncNow(feed.id)}
                    >
                      Sync
                    </Button>
                    <button
                      type="button"
                      className={styles.remove}
                      aria-label={`Disconnect ${feed.label}`}
                      disabled={busy}
                      onClick={() => void removeFeed(feed)}
                    >
                      <Icon name="x" size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className={styles.addRow}>
            <select
              className="select"
              value={source}
              onChange={(e) => setSource(e.target.value as CalendarFeedSource)}
            >
              {CALENDAR_FEED_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {CALENDAR_SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="https://www.airbnb.com/calendar/ical/12345678.ics?s=…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon="plus"
              disabled={busy || !url.trim()}
              onClick={() => void addFeed()}
            >
              Add
            </Button>
          </div>

          {feeds.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void syncNow()}
            >
              {busy ? 'Syncing…' : 'Sync all calendars for this apartment'}
            </Button>
          )}
        </div>

        <div className={styles.block}>
          <h5 className={styles.blockTitle}>Export — dates booked here</h5>
          {exportUrl ? (
            <CopyField
              value={exportUrl}
              hint="Paste into Airbnb → Calendar → Availability → Connect calendars → Import calendar. Keep it private: anyone with the link can see when this apartment is busy."
            />
          ) : (
            <p className={styles.hint}>
              Save the apartment once — the export link is created with it.
            </p>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </AdminField>
  );
}
