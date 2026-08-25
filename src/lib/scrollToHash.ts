/**
 * Smooth-scrolls to an in-page target, honouring the element's `scroll-margin`.
 *
 * The document deliberately has no `scroll-behavior: smooth` — that setting
 * also animates the router's scroll-to-top between pages and leaves you halfway
 * down the new one — so the few links that want a glide ask for it here.
 * Falls back to the browser's own jump when the target is not on this page.
 */
export function scrollToHash(event: { preventDefault: () => void }, hash: string): void {
  const target = document.querySelector(hash);
  if (!target) return;

  event.preventDefault();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}
