'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon/Icon';
import type { IconName } from '@/components/ui/Icon/Icon';
import AdminFlowers, { type FlowersTab } from '@/components/admin/AdminFlowers/AdminFlowers';
import AdminAccount from '@/components/admin/AdminAccount/AdminAccount';
import { GROUP_BRAND, serviceFor } from '@/lib/services';
import styles from './FlowersAdmin.module.scss';

/**
 * The florist's panel.
 *
 * A shop is not a section of a letting business, and running it out of one was
 * only ever true while the same person did both jobs. This is the whole of what
 * a florist needs and nothing else: the window, the orders placed from it, and
 * their own password. There is no way from here to a booking, a guest's phone
 * number or what a flat earns — not because the links are hidden, but because
 * the account signed in cannot reach them (see `floristMayReach` in the auth
 * policy). Hiding a door the key still opens is decoration, not access control.
 *
 * The owner sees this same panel, at the same address, and is simply not
 * stopped from leaving it.
 */

/* The shop's own mark, from the same registry the public header reads. */
const SHOP = serviceFor('/flowers');

const SECTIONS = ['window', 'orders', 'account'] as const;
export type ShopSection = (typeof SECTIONS)[number];

const NAV: { id: ShopSection; icon: IconName; label: string; sub: string }[] = [
  { id: 'window', icon: 'flower', label: 'Window', sub: 'Bouquets and balloons on offer, and what each one costs to make.' },
  { id: 'orders', icon: 'inbox', label: 'Orders', sub: 'Deliveries placed from the shop, and where each one has got to.' },
  { id: 'account', icon: 'shield', label: 'Account', sub: 'Your password and the devices you are signed in on.' },
];

function sectionFromSearch(search: string): ShopSection {
  const asked = new URLSearchParams(search).get('section');
  return SECTIONS.find((s) => s === asked) ?? 'window';
}

/** The default section owns the bare address, so the tidy URL stays tidy. */
function pathForSection(section: ShopSection): string {
  return section === 'window' ? '/admin/flowers' : `/admin/flowers?section=${section}`;
}

export default function FlowersAdmin() {
  const router = useRouter();
  const [section, setSection] = useState<ShopSection>('window');
  const [navOpen, setNavOpen] = useState(false);

  /* Which section is open lives in the URL, so a refresh — or a bookmark, or
     the back button — lands where it left off. Same bargain as the owner's
     dashboard next door. */
  useEffect(() => {
    const sync = () => setSection(sectionFromSearch(window.location.search));
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const go = (next: ShopSection) => {
    setSection(next);
    setNavOpen(false);
    window.history.pushState(null, '', pathForSection(next));
  };

  const signOut = async () => {
    await fetch('/api/admin/session', { method: 'DELETE' });
    router.replace('/admin/flowers/login');
    router.refresh();
  };

  const current = NAV.find((n) => n.id === section) ?? NAV[0];

  return (
    <div
      className={`${styles.shell} ${navOpen ? styles.navOpen : ''}`}
      onClick={(e) => {
        if (navOpen && e.target === e.currentTarget) setNavOpen(false);
      }}
    >
      <aside className={`${styles.side} ${navOpen ? styles.open : ''}`}>
        <div className={styles.brand}>
          <Image
            className={styles.mark}
            src={SHOP.logo ?? GROUP_BRAND.logo}
            alt=""
            width={40}
            height={40}
          />
          <div>
            <div className={styles.brandName}>Flower shop</div>
            <div className={styles.brandSub}>Bat Yam</div>
          </div>
        </div>

        <div className={styles.label}>Manage</div>

        <nav className={styles.nav}>
          {NAV.map(({ id, icon, label }) => (
            <button
              key={id}
              type="button"
              className={`${styles.item} ${section === id ? styles.active : ''}`}
              onClick={() => go(id)}
            >
              <Icon name={icon} size={19} />
              {label}
            </button>
          ))}
        </nav>

        <div className={styles.foot}>
          <a href={SHOP.href} className={styles.item}>
            <Icon name="home" size={19} />
            View the shop
          </a>
          <button type="button" className={styles.item} onClick={signOut}>
            <Icon name="x" size={19} />
            Sign out
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <div className={styles.topbar}>
          <button
            type="button"
            className={styles.burger}
            aria-label="Toggle menu"
            onClick={() => setNavOpen((o) => !o)}
          >
            <Icon name="menu" size={20} />
          </button>
          <div>
            <h1>{current.label}</h1>
            <div className={styles.sub}>{current.sub}</div>
          </div>
        </div>

        <div className={styles.content}>
          {section === 'account' ? (
            <AdminAccount />
          ) : (
            <AdminFlowers
              tab={section as FlowersTab}
              onTabChange={(t) => go(t)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
