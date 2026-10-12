'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { splitLocale } from '@/i18n/routing';
import { DEFAULT_A11Y, readA11y, saveA11y, type A11ySettings } from '@/lib/a11y';
import styles from './AccessibilityMenu.module.scss';

const TEXT_STEPS: { value: A11ySettings['text']; key: string }[] = [
  { value: 0, key: 'a11y.textNormal' },
  { value: 1, key: 'a11y.textLarge' },
  { value: 2, key: 'a11y.textLarger' },
];

const TOGGLES: { field: 'contrast' | 'calm' | 'links'; key: string }[] = [
  { field: 'contrast', key: 'a11y.contrast' },
  { field: 'calm', key: 'a11y.calm' },
  { field: 'links', key: 'a11y.links' },
];

/**
 * The accessibility button in the corner, and the few settings behind it.
 *
 * Every one of them is a visitor's preference rather than a repair: the site
 * is meant to work with a keyboard and a screen reader as it stands, and this
 * is for the person who simply reads more easily with bigger type, harder
 * contrast or nothing moving. The choices are kept in this browser only.
 */
export default function AccessibilityMenu() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(DEFAULT_A11Y);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // The stored choices were already applied before paint; this only brings
  // the menu's own switches into line with them.
  useEffect(() => setSettings(readA11y()), []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  // The panel is the owner's tool, with its own layout and its own bottom bar.
  if (pathname.startsWith('/admin')) return null;

  const change = (next: A11ySettings) => {
    setSettings(next);
    saveA11y(next);
  };

  const changed = JSON.stringify(settings) !== JSON.stringify(DEFAULT_A11Y);

  /* An apartment's page pins a booking bar to the bottom of a phone screen;
     the button has to sit above it rather than on it. */
  const overBar = /^\/apartments\/[^/]+$/.test(splitLocale(pathname).pathname);

  return (
    <div ref={rootRef} className={`${styles.root} ${overBar ? styles.overBar : ''}`}>
      {open && (
        <div id="a11y-panel" className={styles.panel} role="group" aria-label={t('a11y.title')}>
          <div className={styles.head}>
            <b>{t('a11y.title')}</b>
            <button
              type="button"
              className={styles.close}
              aria-label={t('a11y.close')}
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          <div className={styles.label} id="a11y-text-size">
            {t('a11y.textSize')}
          </div>
          <div className={styles.sizes} role="group" aria-labelledby="a11y-text-size">
            {TEXT_STEPS.map(({ value, key }, i) => (
              <button
                key={value}
                type="button"
                className={`${styles.size} ${settings.text === value ? styles.on : ''}`}
                aria-pressed={settings.text === value}
                aria-label={t(key)}
                title={t(key)}
                onClick={() => change({ ...settings, text: value })}
              >
                <span style={{ fontSize: `${14 + i * 4}px` }} aria-hidden="true">
                  A
                </span>
              </button>
            ))}
          </div>

          {TOGGLES.map(({ field, key }) => (
            <button
              key={field}
              type="button"
              className={`${styles.toggle} ${settings[field] ? styles.on : ''}`}
              aria-pressed={settings[field]}
              onClick={() => change({ ...settings, [field]: !settings[field] })}
            >
              {t(key)}
              <span className={styles.check} aria-hidden="true">
                {settings[field] && <Icon name="check" size={14} />}
              </span>
            </button>
          ))}

          <button
            type="button"
            className={styles.reset}
            disabled={!changed}
            onClick={() => change(DEFAULT_A11Y)}
          >
            {t('a11y.reset')}
          </button>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        aria-label={t('a11y.title')}
        aria-expanded={open}
        aria-controls="a11y-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="access" size={26} />
      </button>
    </div>
  );
}
