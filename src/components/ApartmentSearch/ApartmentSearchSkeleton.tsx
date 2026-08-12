import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './ApartmentSearchSkeleton.module.scss';

/** Placeholder for the search bar while the URL-driven form hydrates. */
export default function ApartmentSearchSkeleton() {
  return (
    <div className={styles.panel} aria-hidden="true">
      <div className={styles.bar}>
        <div className={styles.cell}>
          <Skeleton width={86} height={11} />
          <Skeleton width="72%" height={17} />
        </div>
        <div className={styles.cell}>
          <Skeleton width={64} height={11} />
          <Skeleton width="55%" height={17} />
        </div>
        <div className={styles.action}>
          <Skeleton width={132} height={48} radius={14} />
        </div>
      </div>
    </div>
  );
}
