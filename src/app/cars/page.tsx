import { Suspense } from 'react';
import type { Metadata } from 'next';
import { localizedPageMetadata } from '@/lib/seo';
import { notFound } from 'next/navigation';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import CarsGrid from '@/components/CarsGrid/CarsGrid';
import { isSectionLive } from '@/lib/services';

export function generateMetadata(): Metadata {
  return localizedPageMetadata('cars', '/cars');
}

export default function CarsPage() {
  // Parked in `SERVICES`; nothing links here, so nothing should answer either.
  if (!isSectionLive('/cars')) notFound();

  return (
    <>
      <Header />
      <main>
        <Suspense>
          <CarsGrid />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
