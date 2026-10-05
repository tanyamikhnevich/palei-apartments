import ScrollToTop from '@/components/FlowersShop/ScrollToTop';
import ShelfSkeleton from '@/components/FlowersShop/ShelfSkeleton';

/**
 * What the shop shows while the next page is read from the database. Every
 * page here is rendered per request, so a tap on an aisle used to leave the
 * header and footer pressed together until the answer came; this holds the
 * shape of a shelf in between, so nothing jumps when it lands.
 */
export default function FlowersLoading() {
  return (
    <main>
      <ScrollToTop />
      <ShelfSkeleton />
    </main>
  );
}
