import Skeleton from '@/components/ui/Skeleton/Skeleton';
import BouquetCardSkeleton, { SKELETON_COUNT } from './BouquetCardSkeleton';
import styles from './FlowersShop.module.scss';

/**
 * The shape of a shelf before it is there: a heading and a grid of cards.
 *
 * Shown twice on the way to a page, which is why it is one component. First by
 * `loading.tsx`, while the server reads the window; then by the page's own
 * Suspense, in the moment between the answer arriving and the script that
 * draws it. Without the second, that moment was an empty page — the footer
 * came up to meet the header and went away again.
 */
export default function ShelfSkeleton() {
  return (
    <section className={styles.section} aria-busy="true">
      <div className="wrap">
        <div className={styles.header}>
          <Skeleton width={110} height={12} />
          <Skeleton width="55%" height={34} style={{ marginTop: 14 }} />
          <Skeleton width="80%" height={14} style={{ marginTop: 14 }} />
        </div>
        <div className={styles.grid}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <BouquetCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
