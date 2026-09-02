/**
 * Addresses shown to guests.
 *
 * Admin holds the full address — it is needed to meet a guest at the door and
 * to place the pin. The public site gets the street without the house number:
 * enough to say which block and how far the sea is, not enough to walk up to
 * a specific door.
 *
 * Stripping happens on the server, in `stripPrivateFields`, so the number is
 * absent from the API response and the page source — not merely hidden in the
 * markup, where anyone could read it back out.
 */

/**
 * A house number at the end of the street segment: `16`, `12a`, `12-14`, `3/5`.
 * Anchored to the end so a number inside a street name survives.
 */
const TRAILING_NUMBER = /[\s,-]*\d+\s*[\p{L}]?(?:\s*[-/]\s*\d+\s*[\p{L}]?)?\s*$/u;

/** The English habit of leading with the number: `16 HaRav Kukis St`. */
const LEADING_NUMBER = /^\s*\d+\s*[\p{L}]?(?:\s*[-/]\s*\d+\s*[\p{L}]?)?[\s,]+(?=\p{L})/u;

/**
 * `HaRav Kukis St 16, Bat Yam` → `HaRav Kukis St, Bat Yam`
 * `ул. ха-Рав Кукис 16, Бат-Ям` → `ул. ха-Рав Кукис, Бат-Ям`
 * `בת ים` → `בת ים` (nothing to remove)
 *
 * Only the segment before the first comma is touched — that is where the
 * number lives in every language we publish, and the city must stay.
 */
export function hideHouseNumber(location: string): string {
  const value = location.trim();
  if (!value) return value;

  const comma = value.indexOf(',');
  const street = comma === -1 ? value : value.slice(0, comma);
  const rest = comma === -1 ? '' : value.slice(comma);

  let stripped = street.replace(LEADING_NUMBER, '');
  stripped = stripped.replace(TRAILING_NUMBER, '');
  stripped = stripped.trim();

  // An address that is nothing but a number tells the guest less than the
  // original does; leave it alone rather than publish an empty street.
  if (!stripped) return value;

  return `${stripped}${rest}`;
}
