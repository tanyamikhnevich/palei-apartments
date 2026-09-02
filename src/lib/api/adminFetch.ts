/**
 * The browser side of the access/refresh pair.
 *
 * Access tokens last minutes, so any admin request can come back 401 simply
 * because time passed. That is not a sign-out — it is the moment to spend the
 * refresh token and try again. Everything in the panel goes through here so
 * that renewal is invisible and happens exactly once, however many requests
 * discover the expiry at the same instant.
 */
const REFRESH_URL = '/api/admin/session/refresh';

/** Concurrent 401s share one renewal instead of racing to rotate the token. */
let inFlight: Promise<boolean> | null = null;

async function renew(): Promise<boolean> {
  const res = await fetch(REFRESH_URL, { method: 'POST', cache: 'no-store' });
  return res.ok;
}

function refreshOnce(): Promise<boolean> {
  if (!inFlight) {
    inFlight = renew()
      .catch(() => false)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** Send the browser to the login screen, remembering where it was. */
function toLogin(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/admin/login')) return;

  const next = `${window.location.pathname}${window.location.search}`;
  window.location.href = `/admin/login?next=${encodeURIComponent(next)}`;
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);

  // A public endpoint never answers 401, so only admin traffic gets this far.
  if (res.status !== 401 || input.startsWith(REFRESH_URL)) return res;

  if (await refreshOnce()) return fetch(input, init);

  // The refresh token is gone or was refused; there is nothing left to retry.
  toLogin();
  return res;
}
