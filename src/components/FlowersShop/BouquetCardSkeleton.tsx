import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './FlowersShop.module.scss';

/**
 * The shape of a card before its bouquet arrives. Built from the card's own
 * classes rather than from guessed pixel sizes, so the two states line up and
 * the grid does not jump when the photos land.
 */
export default function BouquetCardSkeleton() {
  return (
    <article className={styles.card} aria-hidden="true">
      <Skeleton className={styles.media} height="auto" radius={0} />

      <div className={styles.body}>
        <Skeleton width="70%" height={17} />
        <div className={styles.skeletonNote}>
          <Skeleton width="100%" height={11} />
          <Skeleton width="92%" height={11} />
          <Skeleton width="60%" height={11} />
        </div>

        <div className={styles.tags}>
          <Skeleton width={82} height={24} radius={999} />
          <Skeleton width={104} height={24} radius={999} />
        </div>

        <div className={styles.foot}>
          <Skeleton width={72} height={20} />
          <Skeleton width={96} height={34} radius={999} />
        </div>
      </div>
    </article>
  );
}
