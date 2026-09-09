/**
 * What an account is allowed to be.
 *
 * Two jobs share one building. The owner lets apartments and hires out cars;
 * the florist makes bouquets and never needs to see a booking, a guest's phone
 * number or what a flat earns. Until now there was one kind of account and it
 * saw everything, which was honest while one person did both jobs and stops
 * being honest the moment a second person signs in.
 *
 * Kept free of imports on purpose: the middleware decides on this in the edge
 * runtime, before any database is reachable.
 */

export type AdminRole = 'owner' | 'florist';

export const ADMIN_ROLES: AdminRole[] = ['owner', 'florist'];

/**
 * The safe reading of a role that came out of a token or a database row.
 *
 * Anything unrecognised is not a role. It is never quietly promoted to owner:
 * a column that arrives empty from an older row, a token minted by a build
 * that spelled it differently — none of those should open the whole panel.
 */
export function isAdminRole(value: unknown): value is AdminRole {
  return value === 'owner' || value === 'florist';
}

/** Where signing in lands, and where a role is sent when it overreaches. */
export const ROLE_HOME: Record<AdminRole, string> = {
  owner: '/admin',
  florist: '/admin/flowers',
};

/** The sign-in screen each role belongs to. */
export const ROLE_LOGIN: Record<AdminRole, string> = {
  owner: '/admin/login',
  florist: '/admin/flowers/login',
};

/** What the panel calls the role out loud. */
export const ROLE_LABEL: Record<AdminRole, string> = {
  owner: 'Owner',
  florist: 'Florist',
};
