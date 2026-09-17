'use client';

import { useLanguage } from '@/i18n/LanguageProvider';
import { formatMoney } from '@/lib/money';
import { useState } from 'react';
import {
  builderExtras,
  clampCount,
  findColor,
  mixRemaining,
  mixableColors,
  presentationPrice,
} from '@/lib/roseBuilder';
import type { RoseColor } from '@/types/flower';
import type { CurrencyCode } from '@/types/settings';
import type { RoseBuilder, RoseSelection } from '@/types/flower';
import styles from './FlowersShop.module.scss';

/**
 * The questions, in the order someone actually decides them: how many, which
 * colour, what to add, how it is presented. Everything is a tap — the free
 * number field is there for the person who wants exactly 33, not for everyone
 * else, and the add-ons only appear when the florist offers any.
 */

interface RoseBuilderFieldsProps {
  builder: RoseBuilder;
  selection: RoseSelection;
  currency: CurrencyCode;
  /** Whether the card itself can still go out today — decides "today" vs "tomorrow". */
  sameDay: boolean;
  onChange: (selection: RoseSelection) => void;
}

export default function RoseBuilderFields({
  builder,
  selection,
  currency,
  sameDay,
  onChange,
}: RoseBuilderFieldsProps) {
  const { locale, t } = useLanguage();
  const presets = builder.presets.filter((n) => n >= builder.min && n <= builder.max);
  const color = findColor(builder, selection.colorId);
  const extras = builderExtras(builder);
  const chosen = selection.extraIds ?? [];

  const set = (patch: Partial<RoseSelection>) => onChange({ ...selection, ...patch });

  /*
    The free field is kept as text so it can be empty while being typed —
    a controlled number input would snap back to the minimum after one
    backspace, and the placeholder would never be seen.
  */
  const [typed, setTyped] = useState('');

  const toggleExtra = (id: string, on: boolean) =>
    set({ extraIds: on ? [...chosen, id] : chosen.filter((x) => x !== id) });

  const mixing = Boolean(color?.mix);
  const left = mixRemaining(builder, selection);

  const setMixCount = (id: string, value: number) =>
    set({ mix: { ...(selection.mix ?? {}), [id]: Math.max(0, Math.round(value) || 0) } });

  /*
    What the buyer is promised, in the same words the calendar will keep:
    something in stock goes out on the card's own earliest day, a colour with a
    wait says how long, and everything else is honestly "we will confirm it".
  */
  const colorLabel = (color: Pick<RoseColor, 'leadDays' | 'onRequest'>) => {
    if (color.leadDays > 0) return t('flowers.builder.inDays').replace('{n}', String(color.leadDays));
    if (color.onRequest) return t('flowers.builder.onRequest');
    return sameDay ? t('flowers.builder.today') : t('flowers.builder.tomorrow');
  };

  return (
    <div className={styles.builder}>
      <div className="field">
        <span>{t('flowers.builder.count')}</span>
        <div className={styles.presets}>
          {presets.map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.preset} ${selection.count === n ? styles.presetOn : ''}`}
              aria-pressed={selection.count === n}
              onClick={() => {
                setTyped('');
                set({ count: n });
              }}
            >
              {n}
            </button>
          ))}
          <input
            className={`input ${styles.presetInput}`}
            type="number"
            inputMode="numeric"
            min={builder.min}
            max={builder.max}
            value={typed}
            placeholder={t('flowers.builder.ownCount')}
            aria-label={t('flowers.builder.ownCount')}
            onChange={(e) => {
              setTyped(e.target.value);
              const n = parseInt(e.target.value, 10);
              if (Number.isInteger(n)) set({ count: n });
            }}
            onBlur={() => {
              if (!typed.trim()) return;
              const n = clampCount(builder, parseInt(typed, 10));
              setTyped(String(n));
              set({ count: n });
            }}
          />
        </div>
        <p className={styles.hint}>
          {t('flowers.builder.range')
            .replace('{min}', String(builder.min))
            .replace('{max}', String(builder.max))}
        </p>
      </div>

      <div className="field">
        <span>{t('flowers.builder.color')}</span>
        <div className={styles.swatches}>
          {builder.colors.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`${styles.swatch} ${selection.colorId === c.id ? styles.swatchOn : ''}`}
              aria-pressed={selection.colorId === c.id}
              onClick={() => set({ colorId: c.id })}
            >
              <span
                className={styles.swatchDot}
                style={{
                  /* A mixed colour is one choice with two hues, split down the middle. */
                  background: c.swatch2
                    ? `linear-gradient(90deg, ${c.swatch} 0 50%, ${c.swatch2} 50% 100%)`
                    : c.swatch,
                }}
                aria-hidden
              />
              <span className={styles.swatchLabel}>{c.label}</span>
              <span className={styles.swatchLead}>{colorLabel(c)}</span>
            </button>
          ))}
        </div>
        {color && color.leadDays > 0 && (
          <p className={styles.hint}>
            {t('flowers.builder.leadNote')
              .replace('{color}', color.label)
              .replace('{n}', String(color.leadDays))}
          </p>
        )}
        {color && color.leadDays === 0 && color.onRequest && (
          <p className={styles.hint}>
            {t('flowers.builder.onRequestNote').replace('{color}', color.label)}
          </p>
        )}
      </div>

      {mixing && (
        <div className="field">
          <span>{t('flowers.builder.mixTitle')}</span>
          <div className={styles.extras}>
            {mixableColors(builder).map((c) => (
              <label key={c.id} className={styles.mixRow}>
                <span className={styles.swatchDot} style={{ background: c.swatch }} aria-hidden />
                <span className={styles.mixLabel}>{c.label}</span>
                <span className={styles.swatchLead}>{colorLabel(c)}</span>
                <input
                  className={`input ${styles.mixInput}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={builder.max}
                  value={selection.mix?.[c.id] ?? 0}
                  aria-label={c.label}
                  onChange={(e) => setMixCount(c.id, parseInt(e.target.value, 10))}
                />
              </label>
            ))}
          </div>
          <p className={`${styles.hint} ${left === 0 ? '' : styles.mixOff}`}>
            {left === 0
              ? t('flowers.builder.mixDone').replace('{n}', String(selection.count))
              : left > 0
                ? t('flowers.builder.mixLeft').replace('{n}', String(left))
                : t('flowers.builder.mixOver').replace('{n}', String(-left))}
          </p>
        </div>
      )}

      {extras.length > 0 && (
        <div className="field">
          <span>{t('flowers.builder.extras')}</span>
          <div className={styles.extras}>
            {extras.map((extra) => (
              <label key={extra.id} className={styles.wrapping}>
                <input
                  type="checkbox"
                  checked={chosen.includes(extra.id)}
                  onChange={(e) => toggleExtra(extra.id, e.target.checked)}
                />
                <span>{extra.label}</span>
                <b>{extra.price > 0 ? `+${formatMoney(extra.price, currency, locale)}` : ''}</b>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <span>{t('flowers.builder.presentation')}</span>
        <div className={styles.presets}>
          {builder.presentations.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`${styles.preset} ${selection.presentationId === p.id ? styles.presetOn : ''}`}
              aria-pressed={selection.presentationId === p.id}
              onClick={() => set({ presentationId: p.id })}
            >
              {p.label}
              {presentationPrice(p, selection.count) > 0 && (
                <b> +{formatMoney(presentationPrice(p, selection.count), currency, locale)}</b>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
