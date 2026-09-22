'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import Placeholder from '@/components/ui/Placeholder/Placeholder';
import AdminBouquetModal from './AdminBouquetModal';
import AdminFlowerOrders from './AdminFlowerOrders';
import AdminPager from '@/components/admin/ui/AdminPager';
import { pageCountFor, pageOfIndex, pageSlice } from '@/lib/adminPaging';
import { adminSorted, SECTION_ORDER, type PriceOrder } from '@/lib/flowers';
import { isPhotoUrl } from '@/lib/apartmentMedia';
import { formatMoney } from '@/lib/money';
import { currencyOf } from '@/lib/regions';
import { deleteBouquet, fetchBouquets, fetchCostItems, saveBouquet } from '@/lib/api/client';
import type { Bouquet, CostItem, ItemKind } from '@/types/flower';
import styles from './AdminFlowers.module.scss';

/*
  One name reads much like another once there are twenty of them, so the cover
  picture is what actually tells them apart. First photo is the cover, the same
  rule the shop window follows.
*/
function Thumb({ bouquet }: { bouquet: Bouquet }) {
  const photo = (bouquet.photos ?? []).find(isPhotoUrl);

  return (
    <div className={styles.thumb}>
      {photo ? (
        <Image src={photo} alt="" fill sizes="48px" className={styles.thumbImg} unoptimized />
      ) : (
        <Placeholder className={styles.thumbImg} />
      )}
    </div>
  );
}

export type FlowersTab = 'window' | 'orders';

type KindTab = 'all' | ItemKind;

/**
 * What the admin search looks through: the name in every language (a florist
 * may remember the Hebrew one), the category and the kind. Lower-cased and
 * with accents dropped, so "moet" finds "Moët".
 */
function searchText(b: Bouquet): string {
  const names = Object.values(b.locales).map((c) => c?.name ?? '');
  return fold([...names, b.category, b.kind, b.id].join(' '));
}

function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const KIND_TITLES: Record<ItemKind, string> = {
  flowers: 'Flowers',
  balloons: 'Balloons',
  mixed: 'Flowers and balloons',
  wine: 'Wine',
};

/** What the last save or delete came to — said out loud, never left to guess. */
interface Notice {
  tone: 'ok' | 'error';
  text: string;
}

/* Success fades on its own; an error stays until it has been read. */
const NOTICE_MS = 4000;

interface AdminFlowersProps {
  /**
   * Which half to show, when something outside is doing the choosing — the
   * shop panel puts these in its own sidebar and the tab strip below would
   * then be a second set of controls for one decision. Left out, the screen
   * keeps its own strip and works standalone.
   */
  tab?: FlowersTab;
  onTabChange?: (tab: FlowersTab) => void;
}

/**
 * The shop window. No stock and no orders to manage — by the owner's choice
 * flowers are a showcase, so this screen is only about what is on offer and
 * what it costs. Orders arrive in Telegram like every other request.
 */
export default function AdminFlowers({ tab: outerTab, onTabChange }: AdminFlowersProps = {}) {
  const [list, setList] = useState<Bouquet[]>([]);
  const [loading, setLoading] = useState(true);
  const [writable, setWritable] = useState(false);
  const [editing, setEditing] = useState<Bouquet | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [ownTab, setOwnTab] = useState<FlowersTab>('window');
  const [kind, setKind] = useState<KindTab>('all');
  const [page, setPage] = useState(0);
  const [priceOrder, setPriceOrder] = useState<PriceOrder>('asc');
  const [query, setQuery] = useState('');
  const [priceList, setPriceList] = useState<CostItem[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  /* Controlled when the panel around it says so, self-driving otherwise. */
  const driven = outerTab !== undefined;
  const tab = outerTab ?? ownTab;
  const setTab = (next: FlowersTab) => (onTabChange ? onTabChange(next) : setOwnTab(next));

  const reload = () =>
    fetchBouquets()
      .then(({ bouquets, writable: canWrite }) => {
        setList(bouquets);
        setWritable(canWrite);
        return bouquets;
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    void reload();
  }, []);

  /* Fetched afresh each time a card opens: the list may have been edited on
     the Cost prices screen since. A list that cannot load leaves the sheet
     with its old typed-in suggestions rather than blocking the edit. */
  useEffect(() => {
    if (editing === undefined) return;
    fetchCostItems()
      .then(({ items }) => setPriceList(items))
      .catch(() => setPriceList([]));
  }, [editing]);

  useEffect(() => {
    if (notice?.tone !== 'ok') return;
    const id = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(id);
  }, [notice]);

  const sorted = useMemo(() => adminSorted(list, priceOrder), [list, priceOrder]);
  const counts = useMemo(() => {
    const out: Partial<Record<ItemKind, number>> = {};
    for (const b of list) out[b.kind] = (out[b.kind] ?? 0) + 1;
    return out;
  }, [list]);
  /* A kind with nothing in it gets no tab — "Flowers and balloons" is empty today. */
  const kindTabs: KindTab[] = ['all', ...SECTION_ORDER.filter((k) => counts[k])];
  /* Deleting the last of a kind removes its tab; fall back to everything. */
  const shownKind: KindTab = kind !== 'all' && !counts[kind] ? 'all' : kind;
  const filtered = useMemo(() => {
    const ofKind = shownKind === 'all' ? sorted : sorted.filter((b) => b.kind === shownKind);
    const words = fold(query.trim()).split(/\s+/).filter(Boolean);
    if (!words.length) return ofKind;
    /* Every word has to match somewhere — "krug rose" finds the one bottle. */
    return ofKind.filter((b) => {
      const hay = searchText(b);
      return words.every((w) => hay.includes(w));
    });
  }, [sorted, shownKind, query]);
  /* Likewise the last row of the last page: step back rather than show nothing. */
  const shownPage = Math.min(page, pageCountFor(filtered.length) - 1);
  const rows = pageSlice(filtered, shownPage);

  const chooseKind = (next: KindTab) => {
    setKind(next);
    setPage(0);
  };

  /**
   * Runs a write and says how it went. `done` is the success line; a failure
   * shows the server's own reason, whatever it was.
   */
  const persist = async (action: () => Promise<void>, done: string, failed: string) => {
    if (!writable) {
      setNotice({
        tone: 'error',
        text: 'The shop is read-only until its tables exist. Run: npm run db:flowers:migrate',
      });
      return false;
    }
    setBusy(true);
    setNotice(null);
    try {
      await action();
    } catch (e) {
      setNotice({
        tone: 'error',
        text: `${failed}: ${e instanceof Error ? e.message : 'unknown error'}`,
      });
      setBusy(false);
      return false;
    }
    setNotice({ tone: 'ok', text: done });
    setBusy(false);
    return true;
  };

  /* After a save, open the list where the item now is, so it can be seen. */
  const showItem = (fresh: Bouquet[], id: string) => {
    const item = fresh.find((b) => b.id === id);
    if (!item) return;
    const inKind = adminSorted(fresh, priceOrder).filter((b) => b.kind === item.kind);
    setKind(item.kind);
    setPage(pageOfIndex(inKind.findIndex((b) => b.id === id)));
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        {driven ? (
          <div className={styles.barSpacer} />
        ) : (
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
        )}
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

      {notice && (
        <div
          className={`${styles.toast} ${notice.tone === 'ok' ? styles.toastOk : styles.toastError}`}
          role={notice.tone === 'ok' ? 'status' : 'alert'}
        >
          <Icon name={notice.tone === 'ok' ? 'check' : 'x'} size={16} />
          <span>{notice.text}</span>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      {tab === 'window' && !loading && list.length > 0 && (
        <div className={styles.kindTabs} role="group" aria-label="Kind">
          {kindTabs.map((k) => (
            <button
              key={k}
              type="button"
              className={`${styles.kindTab} ${shownKind === k ? styles.kindTabOn : ''}`}
              onClick={() => chooseKind(k)}
              aria-pressed={shownKind === k}
            >
              {k === 'all' ? 'All' : KIND_TITLES[k]}
              <span className={styles.count}>{k === 'all' ? list.length : counts[k]}</span>
            </button>
          ))}
          <input
            type="search"
            className={`input ${styles.search}`}
            placeholder="Search by name…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            aria-label="Search items"
          />
          <select
            className={`select ${styles.sort}`}
            value={priceOrder}
            onChange={(e) => {
              setPriceOrder(e.target.value as PriceOrder);
              setPage(0);
            }}
            aria-label="Sort by price"
          >
            <option value="asc">Price: low to high</option>
            <option value="desc">Price: high to low</option>
          </select>
        </div>
      )}

      {tab === 'orders' ? (
        <AdminFlowerOrders />
      ) : loading ? (
        <p className={styles.muted}>Loading…</p>
      ) : (
        <div className={styles.list}>
          {query.trim() && filtered.length === 0 && (
            <p className={styles.muted}>Nothing matches “{query.trim()}”.</p>
          )}
          {rows.map((bouquet, i) => (
            <div key={bouquet.id} className={styles.rowWrap}>
              {/* A heading wherever the kind changes — including at the top of a page. */}
              {shownKind === 'all' && (i === 0 || rows[i - 1].kind !== bouquet.kind) && (
                <h3 className={styles.section}>
                  {KIND_TITLES[bouquet.kind]}{' '}
                  <span className={styles.count}>{counts[bouquet.kind]}</span>
                </h3>
              )}
              <article className={styles.row}>
                <Thumb bouquet={bouquet} />

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

                <div className={styles.price}>
                  {formatMoney(bouquet.price, currencyOf(bouquet), 'en')}
                </div>

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
                      const name = bouquet.locales.en.name.trim();
                      if (confirm(`Delete ${name}?`)) {
                        void persist(
                          async () => {
                            await deleteBouquet(bouquet.id);
                            await reload();
                          },
                          `“${name}” deleted`,
                          `Could not delete “${name}”`
                        );
                      }
                    }}
                    aria-label="Delete"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </article>
            </div>
          ))}
          <AdminPager page={shownPage} total={filtered.length} onPage={setPage} noun="items" />
        </div>
      )}

      {editing !== undefined && (
        <AdminBouquetModal
          bouquet={editing}
          library={list}
          priceList={priceList}
          saving={busy}
          onClose={() => setEditing(undefined)}
          /* The form stays open until the save actually lands. Closing first
             looked tidier, but a refused write — a read-only shop, a dropped
             connection — then took a filled-in costing sheet down with it and
             left nothing but an alert. */
          onSave={(bouquet) => {
            const isNew = !list.some((b) => b.id === bouquet.id);
            const name = bouquet.locales.en.name.trim();
            void persist(
              async () => {
                await saveBouquet(bouquet);
                setEditing(undefined);
                showItem(await reload(), bouquet.id);
              },
              isNew ? `“${name}” added to the shop` : `“${name}” saved`,
              `Could not save “${name}”`
            );
          }}
        />
      )}
    </div>
  );
}
