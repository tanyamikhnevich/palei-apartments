import type { Locale } from '../types';
import { en, type Messages } from './en';
import { ru } from './ru';
import { he } from './he';
import { fr } from './fr';

export const messages: Record<Locale, Messages> = {
  en,
  ru: ru as Messages,
  he: he as Messages,
  fr: fr as Messages,
};

export type { Messages };
