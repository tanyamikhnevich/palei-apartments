import type { Locale } from './types';
import { messages, type Messages } from './messages';

type Path = string;

function getByPath(obj: unknown, path: Path): string | undefined {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function t(locale: Locale, path: Path): string {
  const value = getByPath(messages[locale], path) ?? getByPath(messages.en, path);
  return value ?? path;
}

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}
