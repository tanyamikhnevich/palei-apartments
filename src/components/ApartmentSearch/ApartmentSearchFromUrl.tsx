'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import ApartmentSearch from '@/components/ApartmentSearch/ApartmentSearch';
import { parseApartmentSearchParams } from '@/lib/apartmentSearch';

export default function ApartmentSearchFromUrl() {
  const searchParams = useSearchParams();
  const initial = useMemo(() => parseApartmentSearchParams(searchParams), [searchParams]);

  return <ApartmentSearch variant="page" initial={initial} />;
}
