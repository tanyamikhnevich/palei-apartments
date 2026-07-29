'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon/Icon';
import styles from './StarRating.module.scss';

interface StarRatingProps {
  /** Current rating (whole star for input; may be fractional for display). */
  value: number;
  /** Provide to make the control interactive. */
  onChange?: (value: number) => void;
  size?: number;
  /** aria label per star, with {n} replaced by the star number. */
  labelTemplate?: string;
  className?: string;
}

const STARS = [1, 2, 3, 4, 5];

export default function StarRating({
  value,
  onChange,
  size = 18,
  labelTemplate = '{n}',
  className,
}: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const interactive = Boolean(onChange);
  const shown = hover || value;

  const cls = [styles.stars, interactive ? styles.interactive : '', className]
    .filter(Boolean)
    .join(' ');

  if (!interactive) {
    return (
      <span className={cls} role="img" aria-label={`${value} / 5`}>
        {STARS.map((n) => (
          <Icon
            key={n}
            name="star"
            size={size}
            className={n <= Math.round(value) ? styles.on : styles.off}
          />
        ))}
      </span>
    );
  }

  return (
    <span className={cls}>
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          className={styles.starBtn}
          aria-label={labelTemplate.replace('{n}', String(n))}
          aria-pressed={value === n}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(0)}
          onClick={() => onChange?.(n)}
        >
          <Icon name="star" size={size} className={n <= shown ? styles.on : styles.off} />
        </button>
      ))}
    </span>
  );
}
