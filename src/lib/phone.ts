/**
 * Turning a stored phone number into something to show or to tap.
 *
 * Numbers reach here in E.164 as `validatePhone` normalises them. These are
 * pure string helpers on purpose: the footer needs them in the browser and
 * the notifier needs them on the server, and a `'use client'` module cannot
 * hand a real function to server code.
 */

/**
 * `wa.me` wants digits and nothing else — no plus, no spaces — and it needs the
 * country code: handed `0523211155` it opens a chat with nobody rather than
 * failing loudly. So only an international number earns a link, and everything
 * else returns null for the caller to print as plain text.
 *
 * Every number the site stores has been through `normalizePhone`, which puts it
 * in E.164. This guard is for the caller that one day forgets to.
 */
export function whatsappLink(number: string): string | null {
  const trimmed = number.trim();
  if (!trimmed.startsWith('+')) return null;

  const digits = trimmed.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

/**
 * Numbers are stored the way the panel normalises them — `+972523211155`, no
 * spaces — which is right for storage and hard to read in a footer. Israeli
 * mobiles get their usual grouping; anything else is printed as saved rather
 * than grouped by a rule that may not be its country's.
 */
export function displayPhone(number: string): string {
  const digits = number.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('972')) {
    return `+972 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return number.trim();
}

/** `tel:` keeps the plus — it is what tells the dialler the code is international. */
export function telLink(number: string): string {
  const trimmed = number.trim();
  const digits = trimmed.replace(/\D/g, '');
  return `tel:${trimmed.startsWith('+') ? '+' : ''}${digits}`;
}
