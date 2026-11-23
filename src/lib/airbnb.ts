/** `www.`, or a language subdomain such as `ru.airbnb.com`, on any country domain. */
const AIRBNB_HOST = /^(?:(?:www|[a-z]{2})\.)?airbnb\.(?:com|[a-z]{2}|com?\.[a-z]{2})$/i;
const ROOM_PATH = /^\/rooms\/(?:plus\/)?(\d+)(?:\/|$)/;
const BARE_LISTING_ID = /^\d{5,25}$/;

function roomUrl(listingId: string): string {
  return `https://www.airbnb.com/rooms/${listingId}`;
}

/**
 * The one clean address of a listing, from whatever was pasted: any Airbnb
 * country domain, with or without tracking parameters, or just the number.
 * `null` for an empty value and for anything that is not an Airbnb listing,
 * so that only this exact shape can ever become a link on the public page.
 */
export function normalizeAirbnbUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (BARE_LISTING_ID.test(value)) return roomUrl(value);

  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!AIRBNB_HOST.test(url.hostname)) return null;
    const listingId = url.pathname.match(ROOM_PATH)?.[1];
    return listingId ? roomUrl(listingId) : null;
  } catch {
    return null;
  }
}

/** Whether a value can be saved: blank clears the link, anything else must parse. */
export function isValidAirbnbInput(raw: string | null | undefined): boolean {
  return !raw?.trim() || normalizeAirbnbUrl(raw) !== null;
}
