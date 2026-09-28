'use client';

import { useEffect } from 'react';

/**
 * Holds the page still while a dialog is open, so a scroll inside the dialog
 * never carries on into the page behind it.
 *
 * Both `html` and `body` are locked: which of the two actually scrolls depends
 * on the browser, and iOS Safari ignores a lock on `body` alone. The scrollbar
 * that disappears is replaced by the same width of padding, or the page would
 * jump sideways the moment the dialog opens.
 */
export function useScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    const { documentElement: html, body } = document;
    const gap = window.innerWidth - html.clientWidth;
    const before = {
      html: html.style.overflow,
      body: body.style.overflow,
      padding: body.style.paddingRight,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    return () => {
      html.style.overflow = before.html;
      body.style.overflow = before.body;
      body.style.paddingRight = before.padding;
    };
  }, [active]);
}
