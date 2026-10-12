import Icon from '@/components/ui/Icon/Icon';
import type { IconName } from '@/components/ui/Icon/Icon';
import type { AdminView } from '@/components/admin/AdminSidebar/AdminSidebar';
import styles from './AdminTabBar.module.scss';

/** Short enough for six to sit side by side on the narrowest phone. */
const TABS: { id: AdminView; icon: IconName; label: string }[] = [
  { id: 'apartments', icon: 'grid', label: 'Flats' },
  { id: 'cars', icon: 'car', label: 'Cars' },
  { id: 'bookings', icon: 'inbox', label: 'Bookings' },
  { id: 'calendar', icon: 'calendar', label: 'Calendar' },
  { id: 'reviews', icon: 'star', label: 'Reviews' },
  { id: 'settings', icon: 'gear', label: 'Settings' },
];

interface AdminTabBarProps {
  view: AdminView;
  onViewChange: (view: AdminView) => void;
  /** New booking requests and reviews waiting — the two things worth a glance. */
  counts: Partial<Record<AdminView, number>>;
}

/**
 * The sections, along the bottom of a phone.
 *
 * The sidebar becomes a drawer on a small screen, which puts every section two
 * taps away and hides the count of new requests behind the first of them. Down
 * here they are one tap away, under the thumb, with the count always in view.
 * The drawer stays for what is not a section: the public site and signing out.
 */
export default function AdminTabBar({ view, onViewChange, counts }: AdminTabBarProps) {
  return (
    <nav className={styles.bar} aria-label="Sections">
      {TABS.map(({ id, icon, label }) => {
        const count = counts[id] ?? 0;
        return (
          <button
            key={id}
            type="button"
            className={`${styles.tab} ${view === id ? styles.on : ''}`}
            aria-current={view === id ? 'page' : undefined}
            onClick={() => onViewChange(id)}
          >
            <span className={styles.icon}>
              <Icon name={icon} size={21} />
              {count > 0 && <span className={styles.count}>{count > 99 ? '99+' : count}</span>}
            </span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}
