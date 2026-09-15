import { ACCESS_TOKEN_TTL_MS } from './tokens';
import type { AdminRole } from './roles';

/*
  One pair per panel, so signing in to one never replaces the other's session.
  The owner's pair keeps its original names, and existing sign-ins with it.
*/
const ACCESS_COOKIES: Record<AdminRole, string> = { owner: 'palei_at', florist: 'palei_fl_at' };
const REFRESH_COOKIES: Record<AdminRole, string> = { owner: 'palei_rt', florist: 'palei_fl_rt' };

export function accessCookieName(panel: AdminRole): string {
  return ACCESS_COOKIES[panel];
}

export function refreshCookieName(panel: AdminRole): string {
  return REFRESH_COOKIES[panel];
}

/** How long a browser may stay signed in without typing the password again. */
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The refresh cookie is scoped to the only endpoints that spend it. A cookie
 * that is never sent anywhere else cannot leak from anywhere else.
 */
export const REFRESH_COOKIE_PATH = '/api/admin/session';

type CookieOptions = {
  httpOnly: true;
  sameSite: 'lax' | 'strict';
  secure: boolean;
  path: string;
  maxAge: number;
};

function options(maxAgeMs: number, path: string, sameSite: 'lax' | 'strict'): CookieOptions {
  return {
    httpOnly: true,
    sameSite,
    secure: process.env.NODE_ENV === 'production',
    path,
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

/**
 * Goes out with every admin request, so it is readable across the panel.
 * `lax` keeps it off cross-site form posts while surviving a normal link.
 */
export function accessCookieOptions(expired = false): CookieOptions {
  return options(expired ? 0 : ACCESS_TOKEN_TTL_MS, '/', 'lax');
}

/** `strict`: nothing on another site can cause this one to be sent at all. */
export function refreshCookieOptions(expired = false): CookieOptions {
  return options(expired ? 0 : REFRESH_TOKEN_TTL_MS, REFRESH_COOKIE_PATH, 'strict');
}
