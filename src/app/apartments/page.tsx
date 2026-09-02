import { Suspense } from 'react';
import type { Metadata } from 'next';
import { localizedPageMetadata } from '@/lib/seo';
import Header from '@/components/Header/Header';
import ApartmentGridFull from '@/components/ApartmentGrid/ApartmentGridFull';
import ApartmentGridSkeleton from '@/components/ApartmentGrid/ApartmentGridSkeleton';
import ApartmentSearchFromUrl from '@/components/ApartmentSearch/ApartmentSearchFromUrl';
import ApartmentSearchSkeleton from '@/components/ApartmentSearch/ApartmentSearchSkeleton';
import Footer from '@/components/Footer/Footer';

export function generateMetadata(): Metadata {
  return localizedPageMetadata('apartments', '/apartments');
}

export default function ApartmentsPage() {
  return (
    <>
      <Header />
      <main>
        <div className="wrap">
          <Suspense fallback={<ApartmentSearchSkeleton />}>
            <ApartmentSearchFromUrl />
          </Suspense>
        </div>
        <Suspense fallback={<ApartmentGridSkeleton withFilters />}>
          <ApartmentGridFull country="IL" />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
