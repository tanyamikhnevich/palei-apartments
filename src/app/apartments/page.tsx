import { Suspense } from 'react';
import Header from '@/components/Header/Header';
import ApartmentGridFull from '@/components/ApartmentGrid/ApartmentGridFull';
import ApartmentGridSkeleton from '@/components/ApartmentGrid/ApartmentGridSkeleton';
import ApartmentSearchFromUrl from '@/components/ApartmentSearch/ApartmentSearchFromUrl';
import ApartmentSearchSkeleton from '@/components/ApartmentSearch/ApartmentSearchSkeleton';
import Footer from '@/components/Footer/Footer';

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
          <ApartmentGridFull />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
