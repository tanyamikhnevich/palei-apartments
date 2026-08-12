import ApartmentCardSkeleton from '@/components/ApartmentCard/ApartmentCardSkeleton';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './ApartmentGrid.module.scss';

type ApartmentGridSkeletonProps = {
  count?: number;
  /** Tag filter chips only exist on the full listing. */
  withFilters?: boolean;
};

/** Whole-section placeholder: heading, filters and a grid of card skeletons. */
export default function ApartmentGridSkeleton({
  count = 6,
  withFilters = false,
}: ApartmentGridSkeletonProps) {
  return (
    <section className={styles.section} aria-hidden="true">
      <div className="wrap">
        <div className={styles.header}>
          <div>
            <Skeleton width={104} height={12} />
            <Skeleton width={280} height={34} style={{ marginTop: 14, maxWidth: '100%' }} />
            <Skeleton width={360} height={15} style={{ marginTop: 12, maxWidth: '100%' }} />
          </div>
          <Skeleton width={150} height={40} radius={999} />
        </div>

        {withFilters && (
          <div className={styles.filters}>
            {[72, 108, 92, 86].map((w, i) => (
              <Skeleton key={i} width={w} height={38} radius={999} />
            ))}
          </div>
        )}

        <div className={styles.grid}>
          {Array.from({ length: count }, (_, i) => (
            <ApartmentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
