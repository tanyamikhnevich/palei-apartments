import Skeleton from '@/components/ui/Skeleton/Skeleton';
import BouquetCardSkeleton, { SKELETON_COUNT } from '@/components/FlowersShop/BouquetCardSkeleton';
import styles from '@/components/FlowersShop/FlowersShop.module.scss';

/**
 * What the shop shows while the next page is read from the database. Every
 * page here is rendered per request, so a tap on an aisle used to leave the
 * header and footer pressed together until the answer came; this holds the
 * shape of a shelf in between, so nothing jumps when it lands.
 */
export default function FlowersLoading() {
  return (
    <main aria-busy="true">
      <section className={styles.section}>
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
    </main>
  );
}
