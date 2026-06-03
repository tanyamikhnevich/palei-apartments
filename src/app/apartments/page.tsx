import { Suspense } from 'react';
import Header from '@/components/Header/Header';
import ApartmentGridFull from '@/components/ApartmentGrid/ApartmentGridFull';
import ApartmentSearchFromUrl from '@/components/ApartmentSearch/ApartmentSearchFromUrl';
import Footer from '@/components/Footer/Footer';

export default function ApartmentsPage() {
  return (
    <>
      <Header />
      <main>
        <div className="wrap">
          <Suspense fallback={null}>
            <ApartmentSearchFromUrl />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <ApartmentGridFull />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
