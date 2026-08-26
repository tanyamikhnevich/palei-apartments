import { Suspense } from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import FlowersShop from '@/components/FlowersShop/FlowersShop';

export const metadata: Metadata = {
  title: 'Flower delivery — Palei Flowers',
  description:
    'Bouquets made up the morning they go out and delivered in Bat Yam — or left in the apartment before you arrive.',
};

export default function FlowersPage() {
  return (
    <>
      <Header />
      <main>
        <Suspense>
          <FlowersShop />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
