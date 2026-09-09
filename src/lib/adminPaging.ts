/**
 * Paging arithmetic for the admin tables.
 *
 * Kept apart from the component that renders the controls so it can be checked
 * on its own — the clamping in particular, which is what stops a table going
 * blank after the row you were looking at was deleted out from under the page.
 */

/** Rows per page. One number, so the tables agree with each other. */
export const ADMIN_PAGE_SIZE = 12;

/** Never zero: an empty table still has a first page to show its emptiness on. */
export function pageCountFor(total: number): number {
  return Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
}

/** The rows on a page, with the page clamped into the range that exists. */
export function pageSlice<T>(rows: T[], page: number): T[] {
  const safe = Math.min(Math.max(0, page), pageCountFor(rows.length) - 1);
  return rows.slice(safe * ADMIN_PAGE_SIZE, safe * ADMIN_PAGE_SIZE + ADMIN_PAGE_SIZE);
}

/** Which page a row sits on — how a table follows a link to one row. */
export function pageOfIndex(index: number): number {
  return Math.floor(index / ADMIN_PAGE_SIZE);
}

/**
 * The page buttons: first and last always, the current one and its neighbours,
 * and a marker wherever a run was left out. Rendered as a gap rather than as
 * numbers so a long table cannot grow a row of forty buttons.
 */
export function pageItems(page: number, count: number): (number | 'gap')[] {
  const wanted = new Set([0, count - 1, page - 1, page, page + 1]);
  const shown = [...wanted].filter((n) => n >= 0 && n < count).sort((a, b) => a - b);

  const out: (number | 'gap')[] = [];
  let previous: number | null = null;
  for (const n of shown) {
    if (previous !== null && n - previous > 1) out.push('gap');
    out.push(n);
    previous = n;
  }
  return out;
}
