import Image from 'next/image';
import Icon from '@/components/ui/Icon/Icon';
import type { IconName } from '@/components/ui/Icon/Icon';
import styles from './AdminSidebar.module.scss';

export type AdminView = 'apartments' | 'bookings' | 'calendar' | 'reviews' | 'settings';

interface NavItem {
  id: AdminView;
  icon: IconName;
  label: string;
  count?: number;
}

interface AdminSidebarProps {
  view: AdminView;
  open: boolean;
  onViewChange: (v: AdminView) => void;
  requestCount: number;
  reviewCount?: number;
  apartmentCount?: number;
}

export default function AdminSidebar({
  view,
  open,
  onViewChange,
  requestCount,
  reviewCount = 0,
  apartmentCount = 0,
}: AdminSidebarProps) {
  const items: NavItem[] = [
    { id: 'apartments', icon: 'grid', label: 'Apartments', count: apartmentCount },
    { id: 'bookings', icon: 'inbox', label: 'Bookings', count: requestCount },
    { id: 'calendar', icon: 'calendar', label: 'Calendar' },
    { id: 'reviews', icon: 'star', label: 'Reviews', count: reviewCount },
    { id: 'settings', icon: 'gear', label: 'Settings' },
  ];

  return (
    <aside className={`${styles.side} ${open ? styles.open : ''}`}>
      <a href="/" className={styles.logoLink} title="View public site">
        <Image src="/palei-logo.png" alt="Palei Apartments" width={100} height={32} />
      </a>

      <div className={styles.label}>Manage</div>

      <nav className={styles.nav}>
        {items.map(({ id, icon, label, count }) => (
          <button
            key={id}
            type="button"
            className={`${styles.item} ${view === id ? styles.active : ''}`}
            onClick={() => onViewChange(id)}
          >
            <Icon name={icon} size={19} />
            {label}
            {count != null && count > 0 && <span className={styles.count}>{count}</span>}
          </button>
        ))}
      </nav>

      <div className={styles.foot}>
        <a href="/" className={styles.item}>
          <Icon name="home" size={19} />
          View website
        </a>

        <div className={styles.user}>
          <div className={styles.avatar}>PA</div>
          <div>
            <div className={styles.userName}>Palei Admin</div>
            <div className={styles.userRole}>Owner · Bat Yam</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
