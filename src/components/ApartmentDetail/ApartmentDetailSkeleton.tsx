import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './ApartmentDetailSkeleton.module.scss';

/** Placeholder that mirrors ApartmentDetail while the apartment is fetched. */
export default function ApartmentDetailSkeleton() {
  return (
    <div className={`wrap ${styles.page}`} aria-hidden="true">
      <Skeleton width={140} height={15} />

      <div className={styles.head}>
        <div className={styles.headMain}>
          <Skeleton width="55%" height={38} />
          <div className={styles.meta}>
            <Skeleton width={130} height={14} />
            <Skeleton width={80} height={14} />
            <Skeleton width={110} height={14} />
          </div>
        </div>
        <Skeleton width={130} height={34} />
      </div>

      <Skeleton className={styles.gallery} height="auto" />

      <div className={styles.layout}>
        <section className={styles.about}>
          <div className={styles.specs}>
            {[92, 108, 84, 96].map((w, i) => (
              <Skeleton key={i} width={w} height={20} />
            ))}
          </div>
          <div className={styles.desc}>
            <Skeleton height={14} />
            <Skeleton height={14} />
            <Skeleton height={14} />
            <Skeleton width="80%" height={14} />
            <Skeleton width="45%" height={14} />
          </div>
        </section>

        <aside>
          <div className={styles.booking}>
            <Skeleton width={120} height={12} />
            <Skeleton height={70} radius="var(--r-md)" />
            <div className={styles.fields}>
              <Skeleton height={54} radius="var(--r-md)" />
              <Skeleton height={54} radius="var(--r-md)" />
            </div>
            <Skeleton height={54} radius="var(--r-md)" />
            <Skeleton height={48} radius={999} />
          </div>
        </aside>
      </div>
    </div>
  );
}
