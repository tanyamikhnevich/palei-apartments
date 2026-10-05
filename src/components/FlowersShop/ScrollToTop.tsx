'use client';

import { useLayoutEffect } from 'react';

/**
 * Puts the reader at the top the moment the loading shelf appears.
 *
 * Next scrolls up only once the new page has arrived. Until then the skeleton
 * — far shorter than a full aisle — stood in for it at the old scroll offset,
 * which the browser clamps to the end of the page: someone who tapped a
 * bouquet half-way down the wine list was left looking at the footer, pressed
 * up under the header, for as long as the answer took.
 */
export default function ScrollToTop() {
  // Before paint, so the footer is never drawn there in the first place.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return null;
}
