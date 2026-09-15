import { todayISO } from '@/lib/dates';

/*
  What a guest typed into an apartment booking, kept so the flower shop does
  not ask for it all again: the flat is the delivery address, the arrival day
  is the delivery day, and the guest is the one ordering. Stored in the browser
  only — it never leaves the device until the guest submits the flower order.
*/
export interface BookingHandoff {
  apartmentId: string;
  /** Ready to drop into the delivery address field. */
  address: string;
  checkIn: string;
  name: string;
  contact: string;
}

const KEY = 'palei.lastBooking';

export function saveBookingHandoff(handoff: BookingHandoff): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(handoff));
  } catch {
    // Private mode or a full quota — the shop simply starts blank.
  }
}

/** The last booking, or null once its arrival day has passed. */
export function loadBookingHandoff(): BookingHandoff | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<BookingHandoff>;
    if (
      typeof data.checkIn !== 'string' ||
      typeof data.address !== 'string' ||
      typeof data.name !== 'string' ||
      typeof data.contact !== 'string'
    ) {
      return null;
    }
    if (data.checkIn < todayISO()) {
      localStorage.removeItem(KEY);
      return null;
    }
    return data as BookingHandoff;
  } catch {
    return null;
  }
}
