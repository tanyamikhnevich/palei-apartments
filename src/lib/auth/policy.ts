import { type AdminRole } from './roles';

/**
 * Which requests may be made without a session, and which of them each role
 * may make with one.
 *
 * The list is deny-by-default on purpose: a route that nobody has thought about
 * yet is closed, not open. Everything a guest actually touches is named here —
 * browsing apartments, cars and bouquets, checking free dates, sending a
 * booking, hire, order, review or contact message, and the iCal feed the
 * booking platforms subscribe to.
 */

/** A guest never sends anything but these. */
function isRead(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}

function isPublicApiRequest(pathname: string, method: string, params: URLSearchParams): boolean {
  // Signing in has to work while signed out; signing out is harmless.
  if (pathname === '/api/admin/session') return method === 'POST' || method === 'DELETE';

  // Renewing a session authenticates itself with the refresh cookie, which the
  // middleware cannot check without a database round trip on every request.
  if (pathname === '/api/admin/session/refresh') return method === 'POST';

  // Without ?public=1 the list also carries unlisted drafts, so that shape
  // stays behind the session.
  if (pathname === '/api/apartments') return isRead(method) && params.get('public') === '1';

  // The public business profile. Editing it is admin-only.
  if (pathname === '/api/settings') return isRead(method);

  // Free dates, and submitting an enquiry. Reading the enquiries is not public.
  if (pathname === '/api/bookings/availability') return isRead(method);
  if (pathname === '/api/bookings') return method === 'POST';

  // Approved reviews and leaving one. ?admin=1 returns contact details.
  if (pathname === '/api/reviews') {
    return method === 'POST' || (isRead(method) && params.get('admin') !== '1');
  }

  // The fleet window and a hire request.
  if (pathname === '/api/cars') return isRead(method);
  if (pathname === '/api/cars/request') return method === 'POST';

  // The flower window and an order. The order list is customer data.
  if (pathname === '/api/flowers') return isRead(method);
  if (pathname === '/api/flowers/request') return method === 'POST';

  if (pathname === '/api/contact') return method === 'POST';

  // The token in the path is the credential for these feeds.
  if (pathname.startsWith('/api/ical/')) return isRead(method);

  // Vercel Cron calls this one; the handler checks CRON_SECRET itself.
  if (pathname === '/api/calendar/sync') return isRead(method);

  return false;
}

/** The sign-in screens, which have to be reachable while signed out. */
const LOGIN_PATHS = ['/admin/login', '/admin/flowers/login'];

export function requiresAdminAuth(pathname: string, method: string, params: URLSearchParams) {
  if (LOGIN_PATHS.includes(pathname)) return false;
  if (pathname.startsWith('/admin')) return true;
  if (pathname.startsWith('/api/')) return !isPublicApiRequest(pathname, method.toUpperCase(), params);
  return false;
}

/**
 * What a florist may touch — an allowlist, for the same reason the public
 * routes above are one. The shop is a small, well-known set of screens and
 * endpoints; everything else in the panel belongs to whoever lets the flats.
 *
 * The reasoning behind the entries that are not obviously about flowers:
 *
 *  - `/api/upload` puts a photograph of a bouquet into blob storage. Without
 *    it the shop can be edited but not illustrated.
 *  - `/api/admin/session*` is signing out and the fifteen-minute renewal. A
 *    role that cannot renew is a role that is thrown out every quarter hour.
 *  - `/api/admin/account*` is the florist's own password. Nobody else's — the
 *    handler behind it only ever reads the account in the caller's own token.
 *  - `/api/settings` on GET is the shop's currency and contact details, which
 *    the bouquet screens render. Writing them stays with the owner.
 */
function floristMayReach(pathname: string, method: string): boolean {
  if (pathname === '/admin/flowers' || pathname.startsWith('/admin/flowers/')) return true;
  if (pathname.startsWith('/admin')) return false;

  if (pathname === '/api/flowers' || pathname.startsWith('/api/flowers/')) return true;
  if (pathname === '/api/upload') return true;
  if (pathname === '/api/admin/session' || pathname.startsWith('/api/admin/session/')) return true;
  if (pathname === '/api/admin/account' || pathname.startsWith('/api/admin/account/')) return true;
  if (pathname === '/api/settings') return isRead(method);

  return false;
}

/**
 * Whether a signed-in account of this role may reach this path at all.
 *
 * Deliberately separate from {@link requiresAdminAuth}: one asks whether a
 * session is needed, this asks whether *this* session is the right one. Both
 * run in the middleware, and both are repeated inside the handlers, because a
 * gate nobody locks behind is only a suggestion.
 */
export function roleMayReach(role: AdminRole, pathname: string, method: string): boolean {
  if (role === 'owner') return true;
  return floristMayReach(pathname, method.toUpperCase());
}
