import type { Apartment, Booking, BookingStatus } from '@/types/apartment';
import type { BusinessSettings } from '@/types/settings';
import type { Review, ReviewStatus } from '@/types/review';
import type { Car } from '@/types/car';
import type {
  Bouquet,
  FlowerOrder,
  FlowerOrderDraft,
  FlowerOrderStatus,
} from '@/types/flower';
import type {
  CalendarFeed,
  CalendarFeedInput,
  CalendarFeedSource,
  CalendarSyncOutcome,
} from '@/types/calendar';
import { apartments as fallbackApartments } from '@/data/apartments';
import { apiFetch } from '@/lib/api/adminFetch';

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
    const res = await apiFetch(`/api/apartments${qs}`, { cache: 'no-store' });
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
  const res = await apiFetch('/api/apartments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apt),
  });
  const data = await parseJson<{ apartment: Apartment }>(res);
  return data.apartment;
}

export async function updateApartment(apt: Apartment): Promise<Apartment> {
  const res = await apiFetch(`/api/apartments/${apt.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apt),
  });
  const data = await parseJson<{ apartment: Apartment }>(res);
  return data.apartment;
}

export async function deleteApartment(id: string): Promise<void> {
  const res = await apiFetch(`/api/apartments/${id}`, { method: 'DELETE' });
  await parseJson<{ ok: boolean }>(res);
}

export type SettingsLoadResult = {
  settings: BusinessSettings;
  fromDb: boolean;
};

export async function fetchSettings(): Promise<SettingsLoadResult> {
  const res = await apiFetch('/api/settings', { cache: 'no-store' });
  const data = await parseJson<{ settings: BusinessSettings; source?: 'database' | 'mock' }>(res);
  return {
    settings: data.settings,
    fromDb: data.source === 'database',
  };
}

export async function saveSettings(settings: BusinessSettings): Promise<BusinessSettings> {
  const res = await apiFetch('/api/settings', {
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

  const res = await apiFetch('/api/upload', { method: 'POST', body: formData });
  const data = await parseJson<{ url?: string; urls: string[] }>(res);
  return { urls: data.urls ?? (data.url ? [data.url] : []) };
}

export async function fetchBookingAvailability(
  apartmentId: string
): Promise<{ checkIn: string; checkOut: string }[]> {
  const res = await apiFetch(`/api/bookings/availability?apartmentId=${apartmentId}`, {
    cache: 'no-store',
  });
  const data = await parseJson<{ blocked: { checkIn: string; checkOut: string }[] }>(res);
  return data.blocked;
}

export async function fetchAllBookingAvailability(): Promise<
  Record<string, { checkIn: string; checkOut: string }[]>
> {
  const res = await apiFetch('/api/bookings/availability?all=1', { cache: 'no-store' });
  const data = await parseJson<{
    byApartment: Record<string, { checkIn: string; checkOut: string }[]>;
  }>(res);
  return data.byApartment;
}

export async function fetchBookings(admin = false): Promise<Booking[]> {
  const res = await apiFetch(`/api/bookings?admin=${admin ? '1' : '0'}`, { cache: 'no-store' });
  const data = await parseJson<{ bookings: Booking[] }>(res);
  return data.bookings;
}

export async function saveBookingDraft(booking: Booking): Promise<Booking> {
  const res = await apiFetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...booking, status: 'Draft' as const }),
  });
  const data = await parseJson<{ booking: Booking }>(res);
  return data.booking;
}

export async function submitBookingRequest(booking: Booking): Promise<Booking> {
  const res = await apiFetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...booking, status: 'New request' as const }),
  });
  const data = await parseJson<{ booking: Booking }>(res);
  return data.booking;
}

export type CarsLoadResult = {
  cars: Car[];
  /** The list came from the fleet database, not the built-in sample. */
  fromDb: boolean;
  /** The fleet tables exist, so admin edits will stick. */
  writable: boolean;
};

export async function fetchCars(): Promise<CarsLoadResult> {
  try {
    const res = await apiFetch('/api/cars', { cache: 'no-store' });
    const data = await parseJson<{
      cars: Car[];
      source?: 'database' | 'mock';
      writable?: boolean;
    }>(res);
    return {
      cars: data.cars,
      fromDb: data.source === 'database',
      writable: data.writable === true,
    };
  } catch (e) {
    console.warn('fetchCars fallback', e);
    const { cars } = await import('@/data/cars');
    return { cars, fromDb: false, writable: false };
  }
}

export async function saveCar(car: Car): Promise<Car> {
  const res = await apiFetch('/api/cars', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(car),
  });
  const data = await parseJson<{ car: Car }>(res);
  return data.car;
}

export async function deleteCar(id: string): Promise<void> {
  const res = await apiFetch(`/api/cars?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  await parseJson<{ ok: true }>(res);
}

export async function blockCarDates(payload: {
  carId: string;
  from: string;
  to: string;
  note?: string;
}): Promise<void> {
  const res = await apiFetch('/api/cars/blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await parseJson<{ blocks: unknown[] }>(res);
}

export async function freeCarDates(carId: string, id: string): Promise<void> {
  const res = await apiFetch(
    `/api/cars/blocks?carId=${encodeURIComponent(carId)}&id=${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
  await parseJson<{ ok: true }>(res);
}

export type BouquetsLoadResult = { bouquets: Bouquet[]; fromDb: boolean; writable: boolean };

export async function fetchBouquets(): Promise<BouquetsLoadResult> {
  try {
    const res = await apiFetch('/api/flowers', { cache: 'no-store' });
    const data = await parseJson<{
      bouquets: Bouquet[];
      source?: 'database' | 'mock';
      writable?: boolean;
    }>(res);
    return {
      bouquets: data.bouquets,
      fromDb: data.source === 'database',
      writable: data.writable === true,
    };
  } catch (e) {
    console.warn('fetchBouquets failed', e);
    return { bouquets: [], fromDb: false, writable: false };
  }
}

export async function fetchFlowerOrders(): Promise<FlowerOrder[]> {
  const res = await apiFetch('/api/flowers/orders', { cache: 'no-store' });
  const data = await parseJson<{ orders: FlowerOrder[] }>(res);
  return data.orders;
}

export async function updateFlowerOrderStatus(
  id: string,
  status: FlowerOrderStatus
): Promise<FlowerOrder> {
  const res = await apiFetch('/api/flowers/orders', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status }),
  });
  const data = await parseJson<{ order: FlowerOrder }>(res);
  return data.order;
}

export async function saveBouquet(bouquet: Bouquet): Promise<Bouquet> {
  const res = await apiFetch('/api/flowers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bouquet),
  });
  const data = await parseJson<{ bouquet: Bouquet }>(res);
  return data.bouquet;
}

export async function deleteBouquet(id: string): Promise<void> {
  const res = await apiFetch(`/api/flowers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  await parseJson<{ ok: true }>(res);
}

/** Sends a flower delivery order to the team's Telegram chat. */
export async function submitFlowerOrder(payload: FlowerOrderDraft & { honeypot?: string }) {
  const res = await apiFetch('/api/flowers/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await parseJson<{ ok: true }>(res);
}

export type CarRequest = {
  carId: string;
  from: string;
  to: string;
  pickup: string;
  name: string;
  contact: string;
  /** Hidden anti-bot field — must stay empty. */
  honeypot?: string;
};

/** Sends a car hire request to the team's Telegram chat. */
export async function submitCarRequest(payload: CarRequest): Promise<void> {
  const res = await apiFetch('/api/cars/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await parseJson<{ ok: true }>(res);
}

export type ContactRequest = {
  name: string;
  contact: string;
  message?: string;
  /** Hidden anti-bot field — must stay empty. */
  honeypot?: string;
  /** Where the form was submitted from, for context in the chat. */
  page?: string;
};

/** Sends a contact-form message to the team's Telegram chat. */
export async function submitContactRequest(payload: ContactRequest): Promise<void> {
  const res = await apiFetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await parseJson<{ ok: true }>(res);
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<Booking> {
  const res = await apiFetch(`/api/bookings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await parseJson<{ booking: Booking }>(res);
  return data.booking;
}

export async function fetchCalendarFeeds(apartmentId: string): Promise<CalendarFeed[]> {
  const res = await apiFetch(`/api/calendar/feeds?apartmentId=${encodeURIComponent(apartmentId)}`, {
    cache: 'no-store',
  });
  const data = await parseJson<{ feeds: CalendarFeed[] }>(res);
  return data.feeds;
}

export async function createCalendarFeed(input: CalendarFeedInput): Promise<CalendarFeed> {
  const res = await apiFetch('/api/calendar/feeds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ feed: CalendarFeed }>(res);
  return data.feed;
}

export async function updateCalendarFeed(
  id: string,
  patch: { url?: string; label?: string }
): Promise<CalendarFeed> {
  const res = await apiFetch(`/api/calendar/feeds/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = await parseJson<{ feed: CalendarFeed }>(res);
  return data.feed;
}

export async function deleteCalendarFeed(id: string): Promise<void> {
  const res = await apiFetch(`/api/calendar/feeds/${id}`, { method: 'DELETE' });
  await parseJson<{ ok: boolean }>(res);
}

export type CalendarSyncResponse = {
  synced: number;
  failed: number;
  results: CalendarSyncOutcome[];
};

export async function syncCalendars(
  target: { apartmentId?: string; feedId?: string } = {}
): Promise<CalendarSyncResponse> {
  const res = await apiFetch('/api/calendar/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(target),
  });
  return parseJson<CalendarSyncResponse>(res);
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
    const res = await apiFetch(`/api/reviews?apartmentId=${encodeURIComponent(apartmentId)}`, {
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
  const res = await apiFetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review),
  });
  await parseJson<{ ok: boolean }>(res);
}

/** Every review, newest first, with contact — admin moderation only. */
export async function fetchReviews(): Promise<Review[]> {
  const res = await apiFetch('/api/reviews?admin=1', { cache: 'no-store' });
  const data = await parseJson<{ reviews: Review[] }>(res);
  return data.reviews;
}

export async function updateReviewStatus(id: string, status: ReviewStatus): Promise<Review> {
  const res = await apiFetch(`/api/reviews/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await parseJson<{ review: Review }>(res);
  return data.review;
}

export async function deleteReview(id: string): Promise<void> {
  const res = await apiFetch(`/api/reviews/${id}`, { method: 'DELETE' });
  await parseJson<{ ok: boolean }>(res);
}

export type AdminSessionInfo = {
  familyId: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
};

export type AdminAccount = {
  login: string;
  passwordChangedAt: string;
  sessions: AdminSessionInfo[];
};

export async function fetchAdminAccount(): Promise<AdminAccount> {
  const res = await apiFetch('/api/admin/account', { cache: 'no-store' });
  return parseJson<AdminAccount>(res);
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await apiFetch('/api/admin/account/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  await parseJson<{ ok: true }>(res);
}

/** Sign out every other browser, keeping this one. */
export async function revokeOtherAdminSessions(): Promise<void> {
  const res = await apiFetch('/api/admin/account', { method: 'DELETE' });
  await parseJson<{ ok: true }>(res);
}

export type ImportedBlock = {
  id: string;
  apartmentId: string;
  checkIn: string;
  checkOut: string;
  source: CalendarFeedSource;
  feedLabel: string;
  summary: string | null;
};

/** Reservations pulled in from Airbnb and the other platforms — admin only. */
export async function fetchImportedBlocks(): Promise<ImportedBlock[]> {
  const res = await apiFetch('/api/calendar/blocks', { cache: 'no-store' });
  const data = await parseJson<{ blocks: ImportedBlock[] }>(res);
  return data.blocks;
}
