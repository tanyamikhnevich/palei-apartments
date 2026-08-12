/**
 * Admin sign-in. Credentials live in the environment, the browser only ever
 * holds a signed cookie, and nothing is written to the database — the token
 * carries its own expiry and is verified with an HMAC on every request.
 *
 * Web Crypto only: this module runs in the Edge middleware as well as in a
 * Node route handler.
 */
export const ADMIN_COOKIE = 'palei_admin';
export const SESSION_DAYS = 7;

const encoder = new TextEncoder();

function secret(): string | null {
  const value = process.env.ADMIN_SECRET || process.env.PASSWORD;
  return value ? value : null;
}

/** Credentials are unset until the deployment provides them. */
export function adminAuthConfigured(): boolean {
  return Boolean(process.env.LOGIN && process.env.PASSWORD);
}

async function sign(payload: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Compare without leaking which character differed. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function credentialsValid(login: string, password: string): boolean {
  const expectedLogin = process.env.LOGIN ?? '';
  const expectedPassword = process.env.PASSWORD ?? '';
  if (!expectedLogin || !expectedPassword) return false;
  // Both comparisons always run so a wrong login costs the same as a wrong password.
  const okLogin = timingSafeEqual(login, expectedLogin);
  const okPassword = timingSafeEqual(password, expectedPassword);
  return okLogin && okPassword;
}

export async function createAdminToken(): Promise<string | null> {
  const key = secret();
  if (!key) return null;
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return `${expiresAt}.${await sign(String(expiresAt), key)}`;
}

export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  const key = secret();
  if (!token || !key) return false;

  const [expiresAt, signature] = token.split('.');
  if (!expiresAt || !signature) return false;
  if (Number(expiresAt) < Date.now()) return false;

  return timingSafeEqual(signature, await sign(expiresAt, key));
}

/**
 * Which requests the middleware guards. Everything a guest touches stays open:
 * browsing apartments, checking free dates, sending a booking request or a
 * review, and the iCal feed other platforms subscribe to.
 */
export function requiresAdminAuth(pathname: string, method: string): boolean {
  if (pathname === '/admin/login') return false;
  if (pathname.startsWith('/admin')) return true;

  if (pathname.startsWith('/api/upload')) return true;
  if (pathname.startsWith('/api/ical/')) return false;

  if (pathname.startsWith('/api/apartments')) return method !== 'GET';
  if (pathname.startsWith('/api/settings')) return method !== 'GET';

  if (pathname === '/api/bookings/availability') return false;
  // The full booking list is guest data; only submitting a request is public.
  if (pathname.startsWith('/api/bookings')) return !(pathname === '/api/bookings' && method === 'POST');

  if (pathname === '/api/reviews') return method !== 'GET' && method !== 'POST';
  if (pathname.startsWith('/api/reviews/')) return true;

  // The scheduled sync arrives from Vercel Cron with its own secret.
  if (pathname === '/api/calendar/sync') return method !== 'GET';
  if (pathname.startsWith('/api/calendar')) return true;

  return false;
}
