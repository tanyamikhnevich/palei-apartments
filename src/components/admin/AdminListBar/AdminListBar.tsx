import Icon from '@/components/ui/Icon/Icon';
import type { Region } from '@/types/region';
import styles from './AdminListBar.module.scss';

export type AdminListMode = 'grid' | 'table';

/*
  One list, filtered by country, rather than a separate screen per site. The
  apartments are the same shape wherever they are, and splitting the screen
  would mean two of everything below it.
*/
const COUNTRIES: { value: Region['country'] | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'IL', label: 'Israel' },
  { value: 'CY', label: 'Cyprus' },
];

interface AdminListBarProps {
  mode: AdminListMode;
  onModeChange: (mode: AdminListMode) => void;
  country: Region['country'] | null;
  onCountryChange: (country: Region['country'] | null) => void;
  /** Shown next to the title so the filter's effect is visible. */
  count: number;
}

export default function AdminListBar({
  mode,
  onModeChange,
  country,
  onCountryChange,
  count,
}: AdminListBarProps) {
  return (
    <div className={styles.bar}>
      <h2 className={styles.title}>
        Apartments <span className={styles.count}>{count}</span>
      </h2>

      <div className={styles.countries} role="group" aria-label="Region">
        {COUNTRIES.map(({ value, label }) => (
          <button
            key={label}
            type="button"
            className={`${styles.countryBtn} ${country === value ? styles.on : ''}`}
            onClick={() => onCountryChange(value)}
            aria-pressed={country === value}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.toggle} role="group" aria-label="View mode">
        <button
          type="button"
          className={`${styles.toggleBtn} ${mode === 'grid' ? styles.on : ''}`}
          onClick={() => onModeChange('grid')}
          aria-label="Grid view"
          aria-pressed={mode === 'grid'}
        >
          <Icon name="grid" size={17} />
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${mode === 'table' ? styles.on : ''}`}
          onClick={() => onModeChange('table')}
          aria-label="Table view"
          aria-pressed={mode === 'table'}
        >
          <Icon name="menu" size={17} />
        </button>
      </div>
    </div>
  );
}
