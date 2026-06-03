import type { Apartment, Booking, BookingStatus } from '@/types/apartment';
import type { BusinessSettings } from '@/types/settings';
import { apartments as fallbackApartments } from '@/data/apartments';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? res.statusText, res.status);
  }
  return data as T;
}

export type ApartmentsLoadResult = {
  apartments: Apartment[];
  fromDb: boolean;
};

export type FetchApartmentsOptions = {
  /** When true, only apartments with status Available (public site). */
  publicOnly?: boolean;
};

export async function fetchApartments(
  options: FetchApartmentsOptions = {}
): Promise<ApartmentsLoadResult> {
  const qs = options.publicOnly ? '?public=1' : '';
  try {
    const res = await fetch(`/api/apartments${qs}`, { cache: 'no-store' });
    const data = await parseJson<{ apartments: Apartment[]; source?: 'database' | 'mock' }>(res);
    return {
      apartments: data.apartments,
      fromDb: data.source === 'database',
    };
  } catch (e) {
    console.warn('fetchApartments fallback', e);
    const { filterListedApartments } = await import('@/lib/apartmentVisibility');
    const list = options.publicOnly ? filterListedApartments(fallbackApartments) : fallbackApartments;
    return { apartments: list, fromDb: false };
  }
}

export async function createApartment(apt: Apartment): Promise<Apartment> {
  const res = await fetch('/api/apartments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apt),
  });
  const data = await parseJson<{ apartment: Apartment }>(res);
  return data.apartment;
}

export async function updateApartment(apt: Apartment): Promise<Apartment> {
  const res = await fetch(`/api/apartments/${apt.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apt),
  });
  const data = await parseJson<{ apartment: Apartment }>(res);
  return data.apartment;
}

export async function deleteApartment(id: string): Promise<void> {
  const res = await fetch(`/api/apartments/${id}`, { method: 'DELETE' });
  await parseJson<{ ok: boolean }>(res);
}

export type SettingsLoadResult = {
  settings: BusinessSettings;
  fromDb: boolean;
};

export async function fetchSettings(): Promise<SettingsLoadResult> {
  const res = await fetch('/api/settings', { cache: 'no-store' });
  const data = await parseJson<{ settings: BusinessSettings; source?: 'database' | 'mock' }>(res);
  return {
    settings: data.settings,
    fromDb: data.source === 'database',
  };
}

export async function saveSettings(settings: BusinessSettings): Promise<BusinessSettings> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const data = await parseJson<{ settings: BusinessSettings }>(res);
  return data.settings;
}

export async function uploadApartmentPhoto(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  return parseJson(res);
}

export async function seedDatabase(): Promise<{ count: number; message: string }> {
  const res = await fetch('/api/seed', { method: 'POST' });
  return parseJson(res);
}

export async function fetchBookingAvailability(
  apartmentId: string
): Promise<{ checkIn: string; checkOut: string }[]> {
  const res = await fetch(`/api/bookings/availability?apartmentId=${apartmentId}`, {
    cache: 'no-store',
  });
  const data = await parseJson<{ blocked: { checkIn: string; checkOut: string }[] }>(res);
  return data.blocked;
}

export async function fetchAllBookingAvailability(): Promise<
  Record<string, { checkIn: string; checkOut: string }[]>
> {
  const res = await fetch('/api/bookings/availability?all=1', { cache: 'no-store' });
  const data = await parseJson<{
    byApartment: Record<string, { checkIn: string; checkOut: string }[]>;
  }>(res);
  return data.byApartment;
}

export async function fetchBookings(admin = false): Promise<Booking[]> {
  const res = await fetch(`/api/bookings?admin=${admin ? '1' : '0'}`, { cache: 'no-store' });
  const data = await parseJson<{ bookings: Booking[] }>(res);
  return data.bookings;
}

export async function saveBookingDraft(booking: Booking): Promise<Booking> {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...booking, status: 'Draft' as const }),
  });
  const data = await parseJson<{ booking: Booking }>(res);
  return data.booking;
}

export async function submitBookingRequest(booking: Booking): Promise<Booking> {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...booking, status: 'New request' as const }),
  });
  const data = await parseJson<{ booking: Booking }>(res);
  return data.booking;
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
  const res = await fetch(`/api/bookings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await parseJson<{ booking: Booking }>(res);
  return data.booking;
}
