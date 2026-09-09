'use client';

import Icon from '@/components/ui/Icon/Icon';
import {
  ADMIN_PAGE_SIZE,
  pageCountFor,
  pageItems,
} from '@/lib/adminPaging';
import styles from './AdminPager.module.scss';

/**
 * Paging for the admin tables.
 *
 * Client-side on purpose. Both lists it serves are already fetched whole — the
 * bookings and the reviews of a dozen flats are hundreds of rows, not
 * hundreds of thousands — and cutting them into pages in the browser keeps
 * every filter, every optimistic update and the jump-to-a-row behaviour
 * working without a round trip. The day either table outgrows that, the shape
 * of this component is the same; only where the slice happens moves.
 *
 * The arithmetic lives in `@/lib/adminPaging`.
 */

interface AdminPagerProps {
  /** Zero-based. */
  page: number;
  /** How many rows there are altogether, before slicing. */
  total: number;
  onPage: (page: number) => void;
  /** What is being counted, for the "13–24 of 47 bookings" line. */
  noun: string;
}

export default function AdminPager({ page, total, onPage, noun }: AdminPagerProps) {
  const count = pageCountFor(total);
  /* One page is not worth a row of controls. */
  if (count <= 1) return null;

  const from = page * ADMIN_PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * ADMIN_PAGE_SIZE);

  return (
    <div className={styles.pager}>
      <span className={styles.count}>
        {from}–{to} of {total} {noun}
      </span>

      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.step}
          disabled={page === 0}
          aria-label="Previous page"
          onClick={() => onPage(page - 1)}
        >
          <Icon name="chevron" size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>

        {pageItems(page, count).map((item, i) =>
          item === 'gap' ? (
            <span key={`gap-${i}`} className={styles.gap}>
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`${styles.page} ${item === page ? styles.current : ''}`}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPage(item)}
            >
              {item + 1}
            </button>
          )
        )}

        <button
          type="button"
          className={styles.step}
          disabled={page === count - 1}
          aria-label="Next page"
          onClick={() => onPage(page + 1)}
        >
          <Icon name="chevron" size={16} />
        </button>
      </div>
    </div>
  );
}
