/**
 * Which requests may be made without a session.
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

export function requiresAdminAuth(pathname: string, method: string, params: URLSearchParams) {
  if (pathname === '/admin/login') return false;
  if (pathname.startsWith('/admin')) return true;
  if (pathname.startsWith('/api/')) return !isPublicApiRequest(pathname, method.toUpperCase(), params);
  return false;
}
