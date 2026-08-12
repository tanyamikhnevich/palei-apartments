import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './ApartmentCardSkeleton.module.scss';

/** Placeholder that mirrors ApartmentCard's layout while apartments load. */
export default function ApartmentCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <Skeleton className={styles.media} height="auto" />

      <div className={styles.body}>
        <div className={styles.top}>
          <div className={styles.titleBlock}>
            <Skeleton width="70%" height={19} />
            <Skeleton width="45%" height={13} />
          </div>
          <Skeleton width={54} height={20} radius={999} />
        </div>

        <div className={styles.desc}>
          <Skeleton height={12} />
          <Skeleton height={12} />
          <Skeleton width="60%" height={12} />
        </div>

        <div className={styles.specs}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className={styles.spec} height={30} />
          ))}
        </div>

        <div className={styles.foot}>
          <Skeleton width={92} height={24} />
          <Skeleton width={124} height={36} radius={999} />
        </div>
      </div>
    </div>
  );
}
