import type { Apartment, Booking, BookingStatus } from '@/types/apartment';
import type { BusinessSettings } from '@/types/settings';
import type { Review, ReviewStatus } from '@/types/review';
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
  const { urls } = await uploadApartmentPhotos([file]);
  return { url: urls[0] };
}

export async function uploadApartmentPhotos(files: File[]): Promise<{ urls: string[] }> {
  if (!files.length) return { urls: [] };

  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  const data = await parseJson<{ url?: string; urls: string[] }>(res);
  return { urls: data.urls ?? (data.url ? [data.url] : []) };
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

export type ReviewSubmission = {
  apartmentId: string;
  guestName: string;
  rating: number;
  text?: string;
  contact?: string;
  honeypot?: string;
};

/** Approved reviews for one apartment (public — no contact details). */
export async function fetchApartmentReviews(apartmentId: string): Promise<Review[]> {
  try {
    const res = await fetch(`/api/reviews?apartmentId=${encodeURIComponent(apartmentId)}`, {
      cache: 'no-store',
    });
    const data = await parseJson<{ reviews: Review[] }>(res);
    return data.reviews;
  } catch (e) {
    console.warn('fetchApartmentReviews fallback', e);
    return [];
  }
}

export async function submitReview(review: ReviewSubmission): Promise<void> {
  const res = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review),
  });
  await parseJson<{ ok: boolean }>(res);
}

/** Every review, newest first, with contact — admin moderation only. */
export async function fetchReviews(): Promise<Review[]> {
  const res = await fetch('/api/reviews?admin=1', { cache: 'no-store' });
  const data = await parseJson<{ reviews: Review[] }>(res);
  return data.reviews;
}

export async function updateReviewStatus(id: string, status: ReviewStatus): Promise<Review> {
  const res = await fetch(`/api/reviews/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await parseJson<{ review: Review }>(res);
  return data.review;
}

export async function deleteReview(id: string): Promise<void> {
  const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
  await parseJson<{ ok: boolean }>(res);
}
