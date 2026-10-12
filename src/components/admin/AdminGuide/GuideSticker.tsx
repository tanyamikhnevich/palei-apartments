'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { t } from '@/i18n/getMessage';
import { LOCALES } from '@/i18n/types';
import {
  fetchApartments,
  fetchGuide,
  fetchStickerLink,
  renewStickerLink,
  type StickerLink,
} from '@/lib/api/client';
import { qrMatrix, qrSvgPath, wifiQrPayload } from '@/lib/qr';
import styles from './GuideSticker.module.scss';

/** One printed code: the square itself, and what it does, in every language. */
function Code({ payload, title, hintKey }: { payload: string; title: string; hintKey: string }) {
  const matrix = qrMatrix(payload);
  if (!matrix) return <p className={styles.problem}>Too long to fit in a QR code: {title}</p>;
  const { path, viewBox } = qrSvgPath(matrix);

  return (
    <div className={styles.code}>
      <svg className={styles.qr} viewBox={viewBox} role="img" aria-label={title}>
        <rect width="100%" height="100%" fill="#fff" />
        <path d={path} fill="#000" />
      </svg>
      <div className={styles.codeText}>
        <b>{title}</b>
        {LOCALES.map((locale) => (
          <span key={locale} dir={locale === 'he' ? 'rtl' : 'ltr'}>
            {t(locale, hintKey)}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The card that goes on the wall of an apartment: one code joins the Wi-Fi,
 * the other opens the house guide. Laid out for A6 and printed from the
 * browser — the screen-only controls drop out of the print.
 */
export default function GuideSticker({ apartmentId }: { apartmentId: string }) {
  const [title, setTitle] = useState('');
  const [wifi, setWifi] = useState<{ name: string; password: string } | null>(null);
  const [link, setLink] = useState<StickerLink | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchApartments(), fetchGuide(apartmentId), fetchStickerLink(apartmentId)])
      .then(([{ apartments }, { guide }, sticker]) => {
        const apartment = apartments.find((a) => a.id === apartmentId);
        setTitle(apartment ? getApartmentCopy(apartment, 'en').title : apartmentId);
        if (guide.wifiName) setWifi({ name: guide.wifiName, password: guide.wifiPassword });
        setLink(sticker);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the sticker'));
  }, [apartmentId]);

  const renew = async () => {
    const ok = confirm(
      'Make a new link for this sticker?\n\nThe sticker already printed stops working — print and replace it.'
    );
    if (!ok) return;
    try {
      setLink(await renewStickerLink(apartmentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not renew the link');
    }
  };

  const local = link ? /\/\/(localhost|127\.0\.0\.1)/.test(link.url) : false;

  return (
    <div className={styles.page}>
      <div className={styles.controls}>
        <div>
          <h1>Apartment sticker</h1>
          <p>
            Print it and put it somewhere a guest will see it — by the router or on the fridge. It
            shows the Wi-Fi, the house notes and the check-out steps, never a door code.
          </p>
        </div>
        <div className={styles.buttons}>
          <Button type="button" variant="primary" disabled={!link} onClick={() => window.print()}>
            Print
          </Button>
          <Button type="button" variant="ghost" disabled={!link} onClick={() => void renew()}>
            New link
          </Button>
        </div>
        {error && <p className={styles.problem}>{error}</p>}
        {local && (
          <p className={styles.problem}>
            This link points at {link?.url.split('/house/')[0]} — a phone cannot open that. Print
            the sticker from the live site, or set NEXT_PUBLIC_SITE_URL.
          </p>
        )}
        {link && !wifi && (
          <p className={styles.note}>
            No Wi-Fi network in this apartment’s guide yet, so the sticker has one code. Add the
            network name and password in the guide and reload.
          </p>
        )}
      </div>

      {link && (
        <article className={styles.card}>
          <header className={styles.head}>
            <Icon name="home" size={22} />
            <b>{title}</b>
          </header>

          {wifi && (
            <Code
              payload={wifiQrPayload(wifi.name, wifi.password)}
              title="Wi-Fi"
              hintKey="stay.stickerWifi"
            />
          )}
          {wifi && (
            <p className={styles.wifi} dir="ltr">
              <span>{wifi.name}</span>
              {wifi.password && <span>{wifi.password}</span>}
            </p>
          )}

          <Code payload={link.url} title="Info" hintKey="stay.stickerGuideHint" />

          <footer className={styles.foot}>Palei Apartments</footer>
        </article>
      )}
    </div>
  );
}
