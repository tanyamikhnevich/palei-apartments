'use client';

import { useEffect, useState } from 'react';
import { A11Y_EVENT } from '@/lib/a11y';

/**
 * Whether the visitor asked for stillness — through their system's "reduce
 * motion" setting, or through the accessibility menu on the site.
 *
 * CSS handles animations and transitions on its own; this is for what CSS
 * cannot stop: a slideshow on a timer.
 */
export function useCalmMotion(): boolean {
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setCalm(media.matches || 'a11yCalm' in document.documentElement.dataset);

    sync();
    media.addEventListener('change', sync);
    window.addEventListener(A11Y_EVENT, sync);
    return () => {
      media.removeEventListener('change', sync);
      window.removeEventListener(A11Y_EVENT, sync);
    };
  }, []);

  return calm;
}
