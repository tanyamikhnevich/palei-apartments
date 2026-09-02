import { Suspense } from 'react';
import type { Metadata } from 'next';
import { localizedPageMetadata } from '@/lib/seo';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import FlowersShop from '@/components/FlowersShop/FlowersShop';

export function generateMetadata(): Metadata {
  return localizedPageMetadata('flowers', '/flowers');
}

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
