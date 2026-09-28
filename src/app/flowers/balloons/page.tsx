import CategoryPage, { categoryMetadata } from '../categoryPage';

// Read per request, like the rest of the shop.
export const dynamic = 'force-dynamic';

export const generateMetadata = () => categoryMetadata('balloons');

export default function Page() {
  return <CategoryPage category="balloons" />;
}
