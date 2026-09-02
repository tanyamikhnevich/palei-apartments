import type { GeoPoint } from '@/data/apartmentGeo';

/**
 * How precisely a guest is allowed to know where a building stands.
 *
 * Hiding the house number in the text achieves nothing while the map drops a
 * pin on the door — the pin can be read straight back into a street address.
 * So the published coordinates are snapped to a grid and the map draws an area
 * rather than a point.
 *
 * Snapping, not jittering: a random offset would differ between requests, and
 * averaging a few responses would recover the true position. A grid gives the
 * same answer every time and cannot be averaged away.
 */
export const APPROX_GRID_DEG = 0.0015;

/**
 * The circle drawn on the map. Comfortably larger than half a grid cell (~85 m
 * at this latitude), so the real building is always somewhere inside it.
 */
export const APPROX_RADIUS_M = 250;

function snap(value: number): number {
  return Number((Math.round(value / APPROX_GRID_DEG) * APPROX_GRID_DEG).toFixed(6));
}

/** Roughly 150 m of granularity — the block, not the entrance. */
export function approximateCoords(point: GeoPoint): GeoPoint {
  return { lat: snap(point.lat), lng: snap(point.lng) };
}
