'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Booking, BookingStatus } from '@/types/apartment';
import Badge from '@/components/ui/Badge/Badge';
import type { BadgeTone } from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import { fetchBookings, updateBookingStatus } from '@/lib/api/client';
import styles from './BookingsTable.module.scss';

function bookingTone(status: BookingStatus): BadgeTone {
  if (status === 'Confirmed') return 'ok';
  if (status === 'Declined') return 'booked';
  return 'accent';
}

export default function BookingsTable() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetchBookings(true)
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: BookingStatus) => {
    try {
      const updated = await updateBookingStatus(id, status);
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {
      alert('Could not update booking. Is DATABASE_URL configured?');
    }
  };

  if (loading) {
    return <p className={styles.loading}>Loading bookings…</p>;
  }

  if (rows.length === 0) {
    return <p className={styles.loading}>No booking requests yet.</p>;
  }

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
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={styles.guestName}>
                {r.guest}
                {r.guestContact && <span className={styles.contact}>{r.guestContact}</span>}
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
                  {r.status === 'New request' ? (
                    <>
                      <Button size="sm" variant="primary" onClick={() => setStatus(r.id, 'Confirmed')}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, 'Declined')}>
                        Decline
                      </Button>
                    </>
                  ) : (
                    <span className={styles.dash}>—</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
