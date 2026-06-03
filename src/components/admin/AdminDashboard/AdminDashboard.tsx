'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Apartment } from '@/types/apartment';
import AdminSidebar, { type AdminView } from '@/components/admin/AdminSidebar/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar/AdminTopbar';
import AdminStats from '@/components/admin/AdminStats/AdminStats';
import AdminApartmentTable from '@/components/admin/AdminApartmentTable/AdminApartmentTable';
import AdminApartmentCard, {
  AdminApartmentCardGrid,
} from '@/components/admin/AdminApartmentCard/AdminApartmentCard';
import AdminListBar, { type AdminListMode } from '@/components/admin/AdminListBar/AdminListBar';
import AdminApartmentModal from '@/components/admin/AdminApartmentModal/AdminApartmentModal';
import AdminSettings from '@/components/admin/AdminSettings/AdminSettings';
import BookingsTable from '@/components/admin/BookingsTable/BookingsTable';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import {
  createApartment,
  deleteApartment,
  fetchApartments,
  fetchBookings,
  updateApartment,
} from '@/lib/api/client';
import { toggleApartmentListing } from '@/lib/apartmentVisibility';
import styles from './AdminDashboard.module.scss';

export default function AdminDashboard() {
  const [view, setView] = useState<AdminView>('apartments');
  const [listMode, setListMode] = useState<AdminListMode>('grid');
  const [query, setQuery] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [list, setList] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDb, setFromDb] = useState(false);
  const [modalApt, setModalApt] = useState<Apartment | null | undefined>(undefined);
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    fetchApartments()
      .then(({ apartments, fromDb: db }) => {
        setList(apartments);
        setFromDb(db);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchBookings(true)
      .then((b) => setRequestCount(b.filter((x) => x.status === 'New request').length))
      .catch(() => setRequestCount(0));
  }, [view]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => {
      const text = Object.values(a.locales)
        .map((loc) => `${loc.title} ${loc.location} ${loc.description}`)
        .join(' ')
        .toLowerCase();
      return text.includes(q) || a.area.toLowerCase().includes(q);
    });
  }, [list, query]);

  const persist = async (action: () => Promise<void>) => {
    if (!fromDb) return;
    try {
      await action();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Database error');
    }
  };

  const handleToggle = (apt: Apartment) => {
    const next = toggleApartmentListing(apt);
    setList((prev) => prev.map((a) => (a.id === apt.id ? next : a)));
    void (async () => {
      try {
        if (fromDb) {
          const saved = await updateApartment(next);
          setList((prev) => prev.map((a) => (a.id === apt.id ? saved : a)));
        }
      } catch (e) {
        setList((prev) => prev.map((a) => (a.id === apt.id ? apt : a)));
        alert(e instanceof Error ? e.message : 'Could not update listing visibility');
      }
    })();
  };

  const handleDelete = (apt: Apartment) => {
    if (!confirm(`Delete "${getApartmentCopy(apt, 'en').title}"? This cannot be undone.`)) return;
    setList((prev) => prev.filter((a) => a.id !== apt.id));
    void persist(async () => {
      await deleteApartment(apt.id);
    });
  };

  const handleSave = (apt: Apartment) => {
    const isNew = !list.some((p) => p.id === apt.id);
    setList((prev) =>
      isNew ? [apt, ...prev] : prev.map((p) => (p.id === apt.id ? apt : p))
    );
    setModalApt(undefined);
    void persist(async () => {
      if (isNew) await createApartment(apt);
      else await updateApartment(apt);
    });
  };

  const openEdit = (apt: Apartment) => setModalApt(apt);
  const openAdd = () => setModalApt(null);

  const shellClass = [styles.shell, navOpen ? styles.navOpen : ''].filter(Boolean).join(' ');

  return (
    <div
      className={shellClass}
      onClick={(e) => {
        if (navOpen && e.target === e.currentTarget) setNavOpen(false);
      }}
    >
      <AdminSidebar
        view={view}
        open={navOpen}
        onViewChange={(v) => {
          setView(v);
          setNavOpen(false);
        }}
        requestCount={requestCount}
        apartmentCount={list.length}
      />

      <div className={styles.main}>
        <AdminTopbar
          view={view}
          query={query}
          onQueryChange={setQuery}
          onAddApartment={openAdd}
          onMenuToggle={() => setNavOpen((o) => !o)}
          totalApartments={list.length}
        />

        <div className={styles.content}>
          {view === 'apartments' && (
            <>
              {!fromDb && !loading && (
                <p className={styles.dbHint}>
                  Using local mock data. Connect Neon in Settings → load mock data, or set{' '}
                  <code>DATABASE_URL</code>.
                </p>
              )}
              <AdminStats apartments={list} />
              <AdminListBar mode={listMode} onModeChange={setListMode} />
              {loading ? (
                <p className={styles.empty}>Loading apartments…</p>
              ) : filtered.length === 0 ? (
                <p className={styles.empty}>No apartments match &ldquo;{query}&rdquo;.</p>
              ) : listMode === 'grid' ? (
                <AdminApartmentCardGrid>
                  {filtered.map((apt) => (
                    <AdminApartmentCard
                      key={apt.id}
                      apt={apt}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onToggle={handleToggle}
                    />
                  ))}
                </AdminApartmentCardGrid>
              ) : (
                <AdminApartmentTable
                  apartments={filtered}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              )}
            </>
          )}

          {view === 'bookings' && <BookingsTable />}

          {view === 'settings' && <AdminSettings />}
        </div>
      </div>

      {modalApt !== undefined && (
        <AdminApartmentModal
          initial={modalApt}
          onClose={() => setModalApt(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
