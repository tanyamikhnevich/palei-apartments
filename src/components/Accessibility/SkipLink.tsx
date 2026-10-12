'use client';

import { useLanguage } from '@/i18n/LanguageProvider';

/**
 * The first thing the Tab key reaches: a way past the header and its menu,
 * straight to what the page is about. Invisible until it has focus.
 *
 * It finds the page's `<main>` itself rather than pointing at an id, so no
 * page has to remember to carry one — and falls back to the first heading on
 * the few pages that are built without a `<main>`.
 */
export default function SkipLink() {
  const { t } = useLanguage();

  const skip = (event: React.MouseEvent) => {
    const target = document.querySelector<HTMLElement>('main') ?? document.querySelector('h1');
    if (!target) return;
    event.preventDefault();
    // Focusable just for this: screen readers start reading from the focus.
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
  };

  return (
    <a href="#main" className="skip-link" onClick={skip}>
      {t('a11y.skip')}
    </a>
  );
}
