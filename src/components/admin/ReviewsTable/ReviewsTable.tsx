'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Apartment } from '@/types/apartment';
import type { Review, ReviewStatus } from '@/types/review';
import Badge from '@/components/ui/Badge/Badge';
import type { BadgeTone } from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import StarRating from '@/components/ui/StarRating/StarRating';
import AdminPager from '@/components/admin/ui/AdminPager';
import { pageCountFor, pageSlice } from '@/lib/adminPaging';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { deleteReview, fetchReviews, updateReviewStatus } from '@/lib/api/client';
import styles from './ReviewsTable.module.scss';

interface ReviewsTableProps {
  apartments: Apartment[];
}

function reviewTone(status: ReviewStatus): BadgeTone {
  if (status === 'approved') return 'ok';
  if (status === 'rejected') return 'booked';
  return 'accent';
}

export default function ReviewsTable({ apartments }: ReviewsTableProps) {
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  /** Reviews whose full text is open — the rest are clamped to keep rows even. */
  const [openText, setOpenText] = useState<Set<string>>(new Set());

  const toggleText = (id: string) =>
    setOpenText((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const titles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const apt of apartments) map[apt.id] = getApartmentCopy(apt, 'en').title;
    return map;
  }, [apartments]);

  const load = useCallback(() => {
    fetchReviews()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: ReviewStatus) => {
    try {
      const updated = await updateReviewStatus(id, status);
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {
      alert('Could not update review. Is DATABASE_URL configured?');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this review permanently? This cannot be undone.')) return;
    try {
      await deleteReview(id);
      setRows((prev) => {
        const next = prev.filter((r) => r.id !== id);
        /* Removing the last row of the last page would otherwise leave the
           table looking empty until something else moved. */
        setPage((p) => Math.min(p, pageCountFor(next.length) - 1));
        return next;
      });
    } catch {
      alert('Could not delete review. Is DATABASE_URL configured?');
    }
  };

  if (loading) {
    return <p className={styles.loading}>Loading reviews…</p>;
  }

  if (rows.length === 0) {
    return <p className={styles.loading}>No reviews yet.</p>;
  }

  const visible = pageSlice(rows, page);

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        {/* Fixed layout, or the nowrap columns squeeze the review into a ribbon. */}
        <colgroup>
          <col className={styles.colGuest} />
          <col className={styles.colApartment} />
          <col className={styles.colRating} />
          <col />
          <col className={styles.colDate} />
          <col className={styles.colStatus} />
          <col className={styles.colAction} />
        </colgroup>
        <thead className={styles.thead}>
          <tr>
            <th>Guest</th>
            <th>Apartment</th>
            <th>Rating</th>
            <th>Review</th>
            <th>Date</th>
            <th>Status</th>
            <th className={styles.right}>Action</th>
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {visible.map((r) => (
            <tr key={r.id}>
              <td>
                <div className={styles.guestName}>
                  {r.guestName}
                  {r.contact && <span className={styles.contact}>{r.contact}</span>}
                  {r.source === 'airbnb' && <span className={styles.sourceTag}>from Airbnb</span>}
                </div>
              </td>
              <td className={styles.muted}>{titles[r.apartmentId] ?? r.apartmentId}</td>
              <td>
                <StarRating value={r.rating} size={14} />
              </td>
              <td className={styles.text}>
                {r.text ? (
                  <>
                    <p className={openText.has(r.id) ? styles.textBody : styles.textClamped}>
                      {r.text}
                    </p>
                    {r.text.length > 160 && (
                      <button
                        type="button"
                        className={styles.textToggle}
                        onClick={() => toggleText(r.id)}
                      >
                        {openText.has(r.id) ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </>
                ) : (
                  <span className={styles.dash}>— stars only</span>
                )}
              </td>
              <td className={`${styles.muted} ${styles.nowrap}`}>
                {new Date(r.createdAt).toLocaleDateString('en', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </td>
              <td>
                <Badge tone={reviewTone(r.status)} dot>
                  {r.status}
                </Badge>
              </td>
              <td>
                <div className={styles.actions}>
                  {r.status !== 'approved' && (
                    <Button size="sm" variant="primary" onClick={() => setStatus(r.id, 'approved')}>
                      Approve
                    </Button>
                  )}
                  {r.status !== 'rejected' && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, 'rejected')}>
                      Reject
                    </Button>
                  )}
                  {/* Icon only — the row is tight, and deleting still asks first. */}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="trash"
                    title="Delete review"
                    aria-label="Delete review"
                    onClick={() => remove(r.id)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <AdminPager page={page} total={rows.length} onPage={setPage} noun="reviews" />
    </div>
  );
}
