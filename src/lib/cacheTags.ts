/**
 * Names for the cached reads, so a write can drop exactly what it changed.
 *
 * They live here rather than beside the route that caches them: a Next route
 * file may only export the handlers and a fixed set of config fields, and
 * exporting anything else fails the production build (it type-checks and runs
 * in dev perfectly well, which is the trap).
 */
export const APARTMENTS_TAG = 'public-apartments';
