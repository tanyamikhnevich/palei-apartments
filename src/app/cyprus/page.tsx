import { Suspense } from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Header/Header';
import ApartmentGridFull from '@/components/ApartmentGrid/ApartmentGridFull';
import ApartmentGridSkeleton from '@/components/ApartmentGrid/ApartmentGridSkeleton';
import ApartmentSearchFromUrl from '@/components/ApartmentSearch/ApartmentSearchFromUrl';
import ApartmentSearchSkeleton from '@/components/ApartmentSearch/ApartmentSearchSkeleton';
import Footer from '@/components/Footer/Footer';

export const metadata: Metadata = {
  title: 'Apartments in Cyprus — Palei Apartments',
  description:
    'Short-term apartment rentals in Limassol, Paphos and Ayia Napa. Hosted personally, priced in euro.',
};

/**
 * The Cyprus listing. Same page as `/apartments`, scoped to one country — the
 * two never show each other's apartments, and neither needs its own copy of the
 * grid, the search or the booking flow.
 */
export default function CyprusPage() {
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
          <ApartmentGridFull
            country="CY"
            eyebrowKey="apartments.cyprus.eyebrow"
            titleKey="apartments.cyprus.title"
            subKey="apartments.cyprus.sub"
          />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
