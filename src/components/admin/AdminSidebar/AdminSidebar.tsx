'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon/Icon';
import type { IconName } from '@/components/ui/Icon/Icon';
import { GROUP_BRAND } from '@/lib/services';
import styles from './AdminSidebar.module.scss';

/**
 * The dashboard's sections. Listed rather than declared as a union so the URL
 * can be checked against them: `?section=` is typed by whoever is in the
 * address bar, and anything unrecognised has to fall back to the default.
 */
export const ADMIN_VIEWS = [
  'apartments',
  'cars',
  'bookings',
  'calendar',
  'reviews',
  'settings',
] as const;

export type AdminView = (typeof ADMIN_VIEWS)[number];

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
  const router = useRouter();

  const signOut = async () => {
    await fetch('/api/admin/session', { method: 'DELETE' });
    router.replace('/admin/login');
    router.refresh();
  };

  const items: NavItem[] = [
    { id: 'apartments', icon: 'grid', label: 'Apartments', count: apartmentCount },
    { id: 'cars', icon: 'car', label: 'Cars' },
    { id: 'bookings', icon: 'inbox', label: 'Bookings', count: requestCount },
    { id: 'calendar', icon: 'calendar', label: 'Calendar' },
    { id: 'reviews', icon: 'star', label: 'Reviews', count: reviewCount },
    { id: 'settings', icon: 'gear', label: 'Settings' },
  ];

  return (
    <aside className={`${styles.side} ${open ? styles.open : ''}`}>
      <a href="/" className={styles.logoLink} title="View public site">
        <Image src={GROUP_BRAND.logo} alt={GROUP_BRAND.alt} width={200} height={210} />
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

        <button type="button" className={styles.item} onClick={signOut}>
          <Icon name="x" size={19} />
          Sign out
        </button>

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
