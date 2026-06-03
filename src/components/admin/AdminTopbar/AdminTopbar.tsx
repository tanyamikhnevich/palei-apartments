import Icon from '@/components/ui/Icon/Icon';
import Button from '@/components/ui/Button/Button';
import type { AdminView } from '@/components/admin/AdminSidebar/AdminSidebar';
import styles from './AdminTopbar.module.scss';

const TITLES: Record<AdminView, { title: string; sub: string }> = {
  apartments: {
    title: 'Apartments',
    sub: 'Manage availability, pricing and photos',
  },
  bookings: {
    title: 'Bookings & requests',
    sub: 'Confirm or decline guest enquiries',
  },
  settings: {
    title: 'Settings',
    sub: 'Business profile and preferences',
  },
};

interface AdminTopbarProps {
  view: AdminView;
  query: string;
  onQueryChange: (q: string) => void;
  onAddApartment: () => void;
  onMenuToggle: () => void;
  totalApartments: number;
}

export default function AdminTopbar({
  view,
  query,
  onQueryChange,
  onAddApartment,
  onMenuToggle,
  totalApartments,
}: AdminTopbarProps) {
  const { title, sub } = TITLES[view];

  return (
    <div className={styles.topbar}>
      <button
        type="button"
        className={styles.burger}
        aria-label="Toggle menu"
        onClick={onMenuToggle}
      >
        <Icon name="menu" size={20} />
      </button>

      <div className={styles.titleBlock}>
        <h1>{title}</h1>
        <div className={styles.sub}>
          {view === 'apartments' ? `${totalApartments} listings · ${sub}` : sub}
        </div>
      </div>

      {view === 'apartments' && (
        <>
          <div className={styles.search}>
            <Icon name="search" size={17} />
            <input
              placeholder="Search apartments…"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              aria-label="Search apartments"
            />
          </div>
          <Button
            variant="primary"
            icon="plus"
            className={styles.addBtn}
            onClick={onAddApartment}
          >
            Add apartment
          </Button>
        </>
      )}
    </div>
  );
}
