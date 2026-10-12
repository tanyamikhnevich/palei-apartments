'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon/Icon';
import { t } from '@/i18n/getMessage';
import { localePath } from '@/i18n/routing';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/types';
import { whatsappLink } from '@/lib/phone';
import type { GuestPass } from '@/types/guide';
import styles from './GuestLinkBox.module.scss';

interface GuestLinkBoxProps {
  pass: GuestPass;
  /** The apartment's name in the language the message is written in. */
  titleFor: (locale: Locale) => string;
}

/**
 * A guest's link, ready to send: pick the guest's language, then copy the link,
 * copy a whole message, or open WhatsApp with the message already typed.
 *
 * The link opens in the language it was copied in; the guest can still switch
 * on the page, and one opened without a language follows their phone.
 */
export default function GuestLinkBox({ pass, titleFor }: GuestLinkBoxProps) {
  const [locale, setLocale] = useState<Locale>('en');
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);

  const url = `${window.location.origin}${localePath(pass.path, locale)}`;
  const message = t(locale, 'stay.shareMessage')
    .replace('{name}', pass.guestName)
    .replace('{apartment}', titleFor(locale))
    .replace('{url}', url);

  // With the guest's number the chat opens on them; without it WhatsApp asks
  // who to send to, which is still quicker than pasting.
  const chat = pass.guestContact ? whatsappLink(pass.guestContact) : null;
  const whatsapp = `${chat ?? 'https://wa.me/'}?text=${encodeURIComponent(message)}`;

  const copy = async (what: 'link' | 'message') => {
    try {
      await navigator.clipboard.writeText(what === 'link' ? url : message);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      window.prompt('Copy the link', what === 'link' ? url : message);
    }
  };

  return (
    <div className={styles.box}>
      <div className={styles.row}>
        <select
          className={styles.lang}
          aria-label="Language of the link"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {LOCALE_LABELS[l]}
            </option>
          ))}
        </select>
        <input
          className={styles.url}
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Guest link"
        />
      </div>
      <div className={styles.row}>
        <button type="button" className={styles.btn} onClick={() => void copy('link')}>
          <Icon name={copied === 'link' ? 'check' : 'copy'} size={14} />
          {copied === 'link' ? 'Copied' : 'Copy link'}
        </button>
        <button type="button" className={styles.btn} onClick={() => void copy('message')}>
          <Icon name={copied === 'message' ? 'check' : 'mail'} size={14} />
          {copied === 'message' ? 'Copied' : 'Copy message'}
        </button>
        <a className={styles.btn} href={whatsapp} target="_blank" rel="noopener noreferrer">
          <Icon name="phone" size={14} />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
