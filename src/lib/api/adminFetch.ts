/**
 * The browser side of the access/refresh pair.
 *
 * Access tokens last minutes, so any admin request can come back 401 simply
 * because time passed. That is not a sign-out — it is the moment to spend the
 * refresh token and try again. Everything in the panel goes through here so
 * that renewal is invisible and happens exactly once, however many requests
 * discover the expiry at the same instant.
 */
import { PANEL_HEADER } from '@/lib/auth/panel';

const REFRESH_URL = '/api/admin/session/refresh';

/**
 * Inside the shop's panel, every request names it, so the server reads the
 * shop's session rather than the owner's — both can be open in one browser.
 */
export function withPanel(init?: RequestInit): RequestInit | undefined {
  if (typeof window === 'undefined' || !window.location.pathname.startsWith('/admin/flowers')) {
    return init;
  }
  const headers = new Headers(init?.headers);
  headers.set(PANEL_HEADER, 'florist');
  return { ...init, headers };
}

/** Concurrent 401s share one renewal instead of racing to rotate the token. */
let inFlight: Promise<boolean> | null = null;

async function renew(): Promise<boolean> {
  const res = await fetch(REFRESH_URL, withPanel({ method: 'POST', cache: 'no-store' }));
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
  const { pathname, search } = window.location;
  // Each panel has its own sign-in screen.
  const login = pathname.startsWith('/admin/flowers') ? '/admin/flowers/login' : '/admin/login';
  if (pathname.startsWith(login)) return;

  window.location.href = `${login}?next=${encodeURIComponent(`${pathname}${search}`)}`;
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, withPanel(init));

  // A public endpoint never answers 401, so only admin traffic gets this far.
  if (res.status !== 401 || input.startsWith(REFRESH_URL)) return res;

  if (await refreshOnce()) return fetch(input, withPanel(init));

  // The refresh token is gone or was refused; there is nothing left to retry.
  toLogin();
  return res;
}
