import Icon from '@/components/ui/Icon/Icon';
import styles from './AdminListBar.module.scss';

export type AdminListMode = 'grid' | 'table';

interface AdminListBarProps {
  mode: AdminListMode;
  onModeChange: (mode: AdminListMode) => void;
}

export default function AdminListBar({ mode, onModeChange }: AdminListBarProps) {
  return (
    <div className={styles.bar}>
      <h2 className={styles.title}>All apartments</h2>
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
