import FlowersHeader from '@/components/FlowersHeader/FlowersHeader';
import FlowersFooter from '@/components/FlowersFooter/FlowersFooter';
import { loadPublicBouquets } from '@/lib/server/bouquets';
import { stockedCategories } from '@/lib/flowerCategories';
import styles from './layout.module.scss';

/**
 * Every page of the flower shop wears the shop's own header and footer — it
 * trades under its own name on its own domain, and the apartments' navigation
 * has nothing to offer someone choosing a bouquet.
 *
 * The window is read here to know which aisles have anything on them. It is
 * the same read the page makes, memoised per request, so it costs nothing twice.
 */
export default async function FlowersLayout({ children }: { children: React.ReactNode }) {
  const aisles = stockedCategories(await loadPublicBouquets());

  return (
    <>
      <FlowersHeader aisles={aisles} />
      {/* Holds the footer down while a page is loading or has little on it. */}
      <div className={styles.page}>{children}</div>
      <FlowersFooter aisles={aisles} />
    </>
  );
}
