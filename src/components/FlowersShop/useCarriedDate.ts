'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * The delivery date a visitor arrived with — an apartment booking sends its
 * arrival day as `?date=` — and a way to keep it on every link deeper into the
 * shop. The front page only leads to the aisles now, so without this the date
 * would be dropped one click before the order form that wants it.
 */
export function useCarriedDate(): {
  date: string | null;
  withDate: (path: string) => string;
} {
  const params = useSearchParams();
  const wanted = params.get('date');
  const date = wanted && /^\d{4}-\d{2}-\d{2}$/.test(wanted) ? wanted : null;

  const withDate = useCallback(
    (path: string) => (date ? `${path}?date=${date}` : path),
    [date]
  );

  return { date, withDate };
}
