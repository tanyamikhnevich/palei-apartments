import type { DeliverySlot } from '@/types/flower';

/*
  The delivery of an order just placed, carried to the next one. The shop has
  no basket: a bottle or a balloon set added "to this delivery" is a second
  order, placed from its own aisle, and this is what spares the buyer typing
  the address, the recipient and themselves in again.

  Session storage, not local: it belongs to this visit, in this tab. It also
  goes stale on its own — two hours on, "the same delivery" is not a promise
  anyone remembers making — and is used up by the order it was kept for.
*/
export interface DeliveryDraft {
  /** What the first order was, for the "same delivery as …" note. */
  after: string;
  date: string;
  slot: DeliverySlot;
  address: string;
  recipient: string;
  recipientPhone: string;
  name: string;
  contact: string;
  savedAt: number;
}

const KEY = 'palei.deliveryDraft';
const TTL_MS = 2 * 60 * 60 * 1000;

export function saveDeliveryDraft(draft: Omit<DeliveryDraft, 'savedAt'>): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Private mode or a full quota — the next form simply starts blank.
  }
}

export function loadDeliveryDraft(): DeliveryDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<DeliveryDraft>;
    const fields = ['after', 'date', 'slot', 'address', 'recipient', 'recipientPhone', 'name', 'contact'] as const;
    if (fields.some((f) => typeof data[f] !== 'string') || typeof data.savedAt !== 'number') {
      return null;
    }
    if (Date.now() - data.savedAt > TTL_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return data as DeliveryDraft;
  } catch {
    return null;
  }
}

export function clearDeliveryDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
