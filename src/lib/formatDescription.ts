/** Preserve line breaks and paragraph spacing from admin textarea. */
export function formatDescriptionText(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}
