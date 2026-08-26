'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import AdminBouquetModal from './AdminBouquetModal';
import AdminFlowerOrders from './AdminFlowerOrders';
import { formatMoney } from '@/lib/money';
import { currencyOf } from '@/lib/regions';
import { deleteBouquet, fetchBouquets, saveBouquet } from '@/lib/api/client';
import type { Bouquet } from '@/types/flower';
import styles from './AdminFlowers.module.scss';

/**
 * The shop window. No stock and no orders to manage — by the owner's choice
 * flowers are a showcase, so this screen is only about what is on offer and
 * what it costs. Orders arrive in Telegram like every other request.
 */
export default function AdminFlowers() {
  const [list, setList] = useState<Bouquet[]>([]);
  const [loading, setLoading] = useState(true);
  const [writable, setWritable] = useState(false);
  const [editing, setEditing] = useState<Bouquet | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'window' | 'orders'>('window');

  const reload = () =>
    fetchBouquets()
      .then(({ bouquets, writable: canWrite }) => {
        setList(bouquets);
        setWritable(canWrite);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    void reload();
  }, []);

  const persist = async (action: () => Promise<void>) => {
    if (!writable) {
      alert('The shop is read-only until its tables exist.\n\nRun:  npm run db:flowers:migrate');
      return;
    }
    setBusy(true);
    try {
      await action();
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Shop database error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <div className={styles.tabsTop} role="group" aria-label="Section">
          <button
            type="button"
            className={`${styles.topTab} ${tab === 'window' ? styles.topTabOn : ''}`}
            onClick={() => setTab('window')}
          >
            Window <span className={styles.count}>{list.length}</span>
          </button>
          <button
            type="button"
            className={`${styles.topTab} ${tab === 'orders' ? styles.topTabOn : ''}`}
            onClick={() => setTab('orders')}
          >
            Orders
          </button>
        </div>
        {tab === 'window' && (
          <Button variant="primary" size="sm" icon="plus" onClick={() => setEditing(null)}>
            Add item
          </Button>
        )}
      </div>

      {tab === 'window' && !writable && !loading && (
        <p className={styles.notice}>
          <Icon name="shield" size={16} />
          The shop table does not exist yet, so nothing can be saved. Run:{' '}
          <code>npm run db:flowers:migrate</code>
        </p>
      )}

      {tab === 'orders' ? (
        <AdminFlowerOrders />
      ) : loading ? (
        <p className={styles.muted}>Loading…</p>
      ) : (
        <div className={styles.list}>
          {list.map((bouquet) => (
            <article className={styles.row} key={bouquet.id}>
              <div className={styles.name}>
                <b>{bouquet.locales.en.name}</b>
                <span>
                  {bouquet.kind} · {bouquet.category}
                  {bouquet.stems ? ` · ${bouquet.stems}` : ''} · {bouquet.area}
                </span>
              </div>

              <div className={styles.flags}>
                {bouquet.sameDay && <span className={styles.flagFast}>same day</span>}
                {!bouquet.listed && <span className={styles.flagOff}>hidden</span>}
              </div>

              <div className={styles.price}>{formatMoney(bouquet.price, currencyOf(bouquet), 'en')}</div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => setEditing(bouquet)}
                  aria-label="Edit"
                >
                  <Icon name="edit" size={16} />
                </button>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.danger}`}
                  onClick={() => {
                    if (confirm(`Delete ${bouquet.locales.en.name}?`)) {
                      void persist(() => deleteBouquet(bouquet.id));
                    }
                  }}
                  aria-label="Delete"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <AdminBouquetModal
          bouquet={editing}
          onClose={() => setEditing(undefined)}
          onSave={(bouquet) => {
            setEditing(undefined);
            void persist(async () => {
              await saveBouquet(bouquet);
            });
          }}
        />
      )}
    </div>
  );
}
