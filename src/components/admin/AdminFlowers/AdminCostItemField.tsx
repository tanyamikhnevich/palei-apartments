'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon/Icon';
import type { CostSuggestion } from '@/lib/bouquetCost';
import styles from './AdminFlowers.module.scss';

/**
 * The Item cell of the costing sheet: a plain text field, with the things the
 * shop has bought before hanging under it.
 *
 * Written by hand rather than handed to `<datalist>`, which was the obvious
 * first answer and the wrong one. Safari will not show a price beside a name
 * and neither browser opens the list dependably on a click — and a florist
 * reaching for a price she typed last week should not have to guess the
 * opening letters of a name that starts in Hebrew.
 *
 * Typing is only ever typing: a price arrives when one is picked from the
 * list, never because a name happened to match. Guessing at that is how a
 * corrected price quietly goes back to the old one.
 */

interface AdminCostItemFieldProps {
  value: string;
  /** May be empty — the first bouquet ever costed has nothing to offer. */
  suggestions: CostSuggestion[];
  /** Formats a price in the sheet's own currency. */
  money: (amount: number) => string;
  onType: (name: string) => void;
  onPick: (suggestion: CostSuggestion) => void;
}

export default function AdminCostItemField({
  value,
  suggestions,
  money,
  onType,
  onPick,
}: AdminCostItemFieldProps) {
  const [open, setOpen] = useState(false);

  const typed = value.trim().toLowerCase();
  /* Matching anywhere in the name, not just at the front: half these names
     open in Hebrew and are looked for by the Russian word further along. */
  const narrowed = suggestions.filter((s) => s.name.toLowerCase().includes(typed));
  /* A name already chosen in full stops narrowing the list — otherwise picking
     a thing hides every alternative to it, exactly when you want to swap. */
  const exact = suggestions.some((s) => s.name.toLowerCase() === typed);
  const shown = typed && !exact ? narrowed : suggestions;

  const field = (
    <input
      className={`input ${styles.pickInput}`}
      placeholder="Roses, 50 cm"
      aria-label="Item"
      /* The browser's own form history would talk over the shop's list. */
      autoComplete="off"
      value={value}
      onChange={(e) => {
        onType(e.target.value);
        setOpen(true);
      }}
      onFocus={() => setOpen(true)}
    />
  );

  /* Nothing bought yet: no arrow, no menu, just a field to type the first one. */
  if (!suggestions.length) return field;

  return (
    <div
      className={styles.pick}
      /* Focus landing on the menu's own buttons is not leaving the field. */
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      {field}
      <button
        type="button"
        className={styles.pickToggle}
        /* Tab belongs to the next price field; the arrow is for the mouse. */
        tabIndex={-1}
        aria-label="Show things bought before"
        onClick={() => setOpen((was) => !was)}
      >
        <Icon name="chevron" size={13} />
      </button>

      {open && (
        <ul className={styles.pickMenu}>
          {shown.length === 0 ? (
            <li className={styles.pickEmpty}>Nothing bought under that name yet</li>
          ) : (
            shown.map((s) => (
              <li key={s.name}>
                <button
                  type="button"
                  className={styles.pickOption}
                  onClick={() => {
                    onPick(s);
                    setOpen(false);
                  }}
                >
                  <span className={styles.pickName}>{s.name}</span>
                  <span className={styles.pickPrice}>
                    {s.unitNet > 0 ? money(s.unitNet) : '—'}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
