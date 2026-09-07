'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/Icon/Icon';
import styles from './ExpandableText.module.scss';

interface ExpandableTextProps {
  text: string;
  /** Lines shown before the text is cut off. */
  lines?: number;
  moreLabel: string;
  lessLabel: string;
  className?: string;
}

/**
 * Text cut to a few lines, with a toggle that appears only when the cut
 * actually hides something.
 *
 * Whether it hides anything is measured, not guessed from the character count:
 * where the lines break depends on the column width and the font, so the same
 * sentence is clipped in one card and not in its neighbour. A short note that
 * grew a "show more" button doing nothing would be worse than no button.
 */
export default function ExpandableText({
  text,
  lines = 3,
  moreLabel,
  lessLabel,
  className = '',
}: ExpandableTextProps) {
  const [open, setOpen] = useState(false);
  const [clipped, setClipped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // Once expanded there is nothing left to measure, so the flag keeps its
    // value and the button stays put instead of flickering away.
    if (open) return;
    const el = ref.current;
    if (!el) return;

    const check = () => setClipped(el.scrollHeight - el.clientHeight > 4);
    check();
    // Web fonts land after the first paint and move where the lines break.
    void document.fonts?.ready.then(check);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [text, lines, open]);

  if (!text.trim()) return null;

  return (
    <div className={`${styles.wrap} ${className}`.trim()}>
      <p
        ref={ref}
        className={`${styles.text} ${open ? '' : styles.clamp}`}
        style={open ? undefined : ({ ['--lines' as string]: lines })}
      >
        {text}
      </p>

      {clipped && (
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? lessLabel : moreLabel}
          <Icon name="chevron" size={14} className={open ? styles.chevronUp : styles.chevron} />
        </button>
      )}
    </div>
  );
}
