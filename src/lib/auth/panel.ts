import type { AdminRole } from './roles';

/**
 * The two panels keep separate sessions — separate cookies — so the owner and
 * the florist can both be signed in in one browser without either account
 * opening the other's panel.
 *
 * Most requests say which panel they belong to by their path. A few endpoints
 * serve both (photo upload, signing in and out, renewal, the account screen),
 * and for those the browser names its panel in this header. The header only
 * picks which of the browser's own cookies is read; the token inside still has
 * to carry the role the policy asks for, so claiming the other panel gains
 * nothing.
 *
 * Kept free of server imports: the middleware and the browser both use it.
 */
export const PANEL_HEADER = 'x-admin-panel';

/** The shop's panel and the endpoints behind it. */
export function isShopPath(pathname: string): boolean {
  return (
    pathname === '/admin/flowers' ||
    pathname.startsWith('/admin/flowers/') ||
    pathname === '/api/flowers' ||
    pathname.startsWith('/api/flowers/')
  );
}

/** Which panel's session a request is made under. */
export function panelForRequest(pathname: string, claimed: string | null | undefined): AdminRole {
  if (isShopPath(pathname)) return 'florist';
  if (pathname.startsWith('/admin')) return 'owner';
  return claimed === 'florist' ? 'florist' : 'owner';
}
