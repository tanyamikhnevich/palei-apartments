import type { Apartment } from '@/types/apartment';

/** How many apartments the home page shows. */
export const HOME_FEATURED_LIMIT = 3;

/**
 * The home row: the chosen apartments in their order, then the rest of the list.
 * A pick that is hidden or deleted is not in `list`, so the next apartment takes
 * its place and the row stays full.
 */
export function pickHomeFeatured(list: Apartment[], featuredIds: string[]): Apartment[] {
  const chosen = featuredIds.flatMap((id) => list.filter((apt) => apt.id === id));
  const rest = list.filter((apt) => !featuredIds.includes(apt.id));
  return [...chosen, ...rest].slice(0, HOME_FEATURED_LIMIT);
}
