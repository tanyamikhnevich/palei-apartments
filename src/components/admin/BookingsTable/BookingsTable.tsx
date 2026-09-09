'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { Booking, BookingStatus } from '@/types/apartment';
import Badge from '@/components/ui/Badge/Badge';
import type { BadgeTone } from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import AdminPager from '@/components/admin/ui/AdminPager';
import { pageOfIndex, pageSlice } from '@/lib/adminPaging';
import { fetchBookings, updateBookingStatus } from '@/lib/api/client';
import styles from './BookingsTable.module.scss';

function bookingTone(status: BookingStatus): BadgeTone {
  if (status === 'Confirmed') return 'ok';
  if (status === 'Declined') return 'booked';
  return 'accent';
}

interface BookingsTableProps {
  /** A booking arrived at from the calendar — scrolled to and marked. */
  focusId?: string;
  /** Opens this stay in the month calendar. Absent → the link is not offered. */
  onShowInCalendar?: (booking: Booking) => void;
}

export default function BookingsTable({ focusId, onShowInCalendar }: BookingsTableProps) {
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  /**
   * Refusals belong to the row that caused them.
   *
   * A clash reads "already confirmed for Elena" and means nothing at the top of
   * a table of thirty stays — the row it happened in is the only place it
   * identifies itself. The old code did not show it at all: every failure came
   * out as one guess about DATABASE_URL, which threw away the sentence the
   * server had gone to the trouble of writing.
   */
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [page, setPage] = useState(0);
  const focusRef = useRef<HTMLTableRowElement | null>(null);

  const load = useCallback(() => {
    fetchBookings(true)
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /*
    Arriving from the calendar should land on the stay itself. With the list cut
    into pages that means turning to its page first — a scroll into a row that
    is not rendered does nothing at all, which is the quiet way this feature
    would have stopped working the moment paging arrived.
  */
  useEffect(() => {
    if (!focusId || loading) return;
    const index = rows.findIndex((r) => r.id === focusId);
    if (index >= 0) setPage(pageOfIndex(index));
  }, [focusId, loading, rows]);

  useEffect(() => {
    if (!focusId || loading) return;
    focusRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focusId, loading, page]);

  const setStatus = async (booking: Booking, status: BookingStatus) => {
    setBusyId(booking.id);
    setRowError(null);
    try {
      const updated = await updateBookingStatus(booking.id, status);
      setRows((prev) => prev.map((r) => (r.id === booking.id ? updated : r)));
    } catch (e) {
      setRowError({
        id: booking.id,
        message: e instanceof Error ? e.message : 'Could not update this booking.',
      });
    } finally {
      setBusyId(null);
    }
  };

  /* Taking dates back off the calendar is not the same kind of act as saying
     yes to a request, and the confirm box is where that difference is felt. */
  const decline = (booking: Booking) => {
    if (booking.status === 'Confirmed') {
      const ok = confirm(
        `Decline the confirmed stay for ${booking.guest} (${booking.dates})?\n\n` +
          'The dates go back on the calendar and become bookable again.'
      );
      if (!ok) return;
    }
    void setStatus(booking, 'Declined');
  };

  if (loading) {
    return <p className={styles.loading}>Loading bookings…</p>;
  }

  if (rows.length === 0) {
    return <p className={styles.loading}>No booking requests yet.</p>;
  }

  const visible = pageSlice(rows, page);

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th>Guest</th>
            <th>Apartment</th>
            <th>Dates</th>
            <th>Guests</th>
            <th>Channel</th>
            <th>Status</th>
            <th className={styles.right}>Action</th>
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {visible.map((r) => {
            const busy = busyId === r.id;
            const failed = rowError?.id === r.id;

            return (
              <Fragment key={r.id}>
                <tr
                  ref={r.id === focusId ? focusRef : undefined}
                  className={r.id === focusId ? styles.focused : undefined}
                >
                  <td>
                    <div className={styles.guestName}>
                      {r.guest}
                      {r.guestContact && <span className={styles.contact}>{r.guestContact}</span>}
                    </div>
                  </td>
                  <td className={styles.muted}>{r.apt}</td>
                  <td className={styles.muted}>{r.dates}</td>
                  <td className={styles.muted}>{r.guests}</td>
                  <td>
                    <Badge>{r.channel}</Badge>
                  </td>
                  <td>
                    <Badge tone={bookingTone(r.status)} dot>
                      {r.status}
                    </Badge>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {onShowInCalendar && (
                        <button
                          type="button"
                          className={styles.calendarLink}
                          title="Show these dates in the calendar"
                          onClick={() => onShowInCalendar(r)}
                        >
                          <Icon name="calendar" size={15} />
                          Calendar
                        </button>
                      )}

                      {r.status === 'New request' && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={busy}
                            onClick={() => void setStatus(r, 'Confirmed')}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => decline(r)}
                          >
                            Decline
                          </Button>
                        </>
                      )}

                      {/* Confirmed too early, or the guest wrote back to cancel. */}
                      {r.status === 'Confirmed' && (
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => decline(r)}>
                          Decline
                        </Button>
                      )}

                      {/*
                        Declining used to be the end of a booking: the row kept
                        its dash and there was no way back from a misplaced
                        click. It goes back to being a request — not straight to
                        confirmed, because the dates may well have been given
                        away in the meantime and confirming re-checks that.
                      */}
                      {r.status === 'Declined' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="arrow"
                          disabled={busy}
                          onClick={() => void setStatus(r, 'New request')}
                        >
                          Restore
                        </Button>
                      )}

                      {r.status === 'Draft' && <span className={styles.dash}>—</span>}
                    </div>
                  </td>
                </tr>

                {failed && (
                  <tr className={styles.errorRow}>
                    <td colSpan={7}>
                      <div className={styles.errorBox}>
                        <Icon name="shield" size={16} />
                        <span>{rowError.message}</span>
                        <button
                          type="button"
                          className={styles.errorClose}
                          aria-label="Dismiss"
                          onClick={() => setRowError(null)}
                        >
                          <Icon name="x" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <AdminPager page={page} total={rows.length} onPage={setPage} noun="bookings" />
    </div>
  );
}
