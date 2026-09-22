'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import { deleteCostItem, fetchBouquets, fetchCostItems, saveCostItem } from '@/lib/api/client';
import { SHOP_VAT_RATE } from '@/lib/bouquetCost';
import { blankCostItem, COST_GROUP_TITLES, costItemLabel, itemUses } from '@/lib/costCatalog';
import { DEFAULT_FLOWER_AREA } from '@/lib/flowers';
import { formatMoneyExact } from '@/lib/money';
import { currencyForArea } from '@/lib/regions';
import { COST_GROUPS, type CostGroup, type CostItem, type CostPricePoint } from '@/types/flower';
import styles from './AdminFlowers.module.scss';

/**
 * The price list: every stem, balloon and sheet of wrapping the shop buys,
 * priced once.
 *
 * The costing sheets pick from here, and saving a price here re-costs every
 * bouquet that uses it — so a supplier putting roses up is one edit, not a
 * hunt through twenty bouquets for the ones that happen to contain roses.
 *
 * Each row saves on its own. A list edited as one big form loses every change
 * to one refused save, and the florist is usually changing one price anyway.
 */

interface Notice {
  tone: 'ok' | 'error';
  text: string;
}

const NOTICE_MS = 4000;

/** Blank instead of a stubborn 0 — a zero you have to delete first is a trap. */
function numberValue(value: number): string | number {
  return value ? value : '';
}

function toNumber(raw: string): number {
  const value = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/* The shop sells in one country, so the list is kept in its money. */
const money = (amount: number) =>
  formatMoneyExact(amount, currencyForArea(DEFAULT_FLOWER_AREA), 'en');

export default function AdminCostCatalog() {
  const [items, setItems] = useState<CostItem[]>([]);
  const [uses, setUses] = useState<Map<string, number>>(new Map());
  const [writable, setWritable] = useState(false);
  const [loading, setLoading] = useState(true);
  /* Rows added but not yet saved — they live here until the list has them. */
  const [fresh, setFresh] = useState<CostItem[]>([]);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);

  const reload = async () => {
    try {
      const [list, window] = await Promise.all([fetchCostItems(), fetchBouquets()]);
      setItems(list.items);
      setWritable(list.writable);
      setUses(itemUses(window.bouquets.map((b) => b.cost)));
    } catch (e) {
      setNotice({
        tone: 'error',
        text: `Could not load the price list: ${e instanceof Error ? e.message : 'unknown error'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    if (notice?.tone !== 'ok') return;
    const id = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(id);
  }, [notice]);

  const groups = useMemo(() => {
    const words = fold(query.trim()).split(/\s+/).filter(Boolean);
    const matches = (item: CostItem) => {
      const hay = fold(`${item.name} ${item.nameHe ?? ''} ${COST_GROUP_TITLES[item.group]}`);
      return words.every((w) => hay.includes(w));
    };
    return COST_GROUPS.map((group) => ({
      group,
      rows: [
        ...fresh.filter((i) => i.group === group),
        ...items
          .filter((i) => i.group === group && matches(i))
          .sort((a, b) => costItemLabel(a).localeCompare(costItemLabel(b))),
      ],
    })).filter((g) => g.rows.length > 0);
  }, [items, fresh, query]);

  const add = (group: CostGroup) => {
    setQuery('');
    setFresh((prev) => [blankCostItem(group), ...prev]);
  };

  const save = async (item: CostItem) => {
    const name = costItemLabel(item);
    try {
      const { updated } = await saveCostItem(item);
      const isNew = fresh.some((f) => f.id === item.id);
      setFresh((prev) => prev.filter((f) => f.id !== item.id));
      await reload();
      setNotice({
        tone: 'ok',
        text: `“${name}” ${isNew ? 'added' : 'saved'}${
          updated ? ` — ${updated} ${updated === 1 ? 'bouquet' : 'bouquets'} re-costed` : ''
        }`,
      });
      return true;
    } catch (e) {
      setNotice({
        tone: 'error',
        text: `Could not save “${name || 'item'}”: ${e instanceof Error ? e.message : 'unknown error'}`,
      });
      return false;
    }
  };

  const remove = async (item: CostItem) => {
    if (fresh.some((f) => f.id === item.id)) {
      setFresh((prev) => prev.filter((f) => f.id !== item.id));
      return;
    }
    const used = uses.get(item.id) ?? 0;
    const warning = used
      ? `\n\n${used} ${used === 1 ? 'bouquet uses' : 'bouquets use'} it — they keep its current price, but stop following the list.`
      : '';
    const name = costItemLabel(item);
    if (!confirm(`Delete “${name}”?${warning}`)) return;
    try {
      await deleteCostItem(item.id);
      await reload();
      setNotice({ tone: 'ok', text: `“${name}” deleted` });
    } catch (e) {
      setNotice({
        tone: 'error',
        text: `Could not delete “${name}”: ${e instanceof Error ? e.message : 'unknown error'}`,
      });
    }
  };

  return (
    <div className={styles.wrap}>
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

      {!loading && !writable && (
        <p className={styles.notice}>
          <Icon name="shield" size={16} />
          The price list table does not exist yet, so nothing can be saved. Run:{' '}
          <code>npm run db:flowers:migrate</code>
        </p>
      )}

      <div className={styles.kindTabs}>
        {COST_GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            className={styles.kindTab}
            onClick={() => add(g)}
            disabled={!writable}
          >
            <Icon name="plus" size={13} /> {COST_GROUP_TITLES[g]}
          </button>
        ))}
        <input
          type="search"
          className={`input ${styles.search}`}
          placeholder="Search the list…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the price list"
        />
      </div>

      <p className={styles.muted}>
        Prices without VAT. Where VAT is ticked, {SHOP_VAT_RATE}% is added on top. Change a price
        here and every bouquet using it is re-costed.
      </p>

      {loading ? (
        <p className={styles.muted}>Loading…</p>
      ) : groups.length === 0 ? (
        <p className={styles.muted}>
          {query.trim()
            ? `Nothing matches “${query.trim()}”.`
            : 'The list is empty. Add the first thing you buy with the buttons above.'}
        </p>
      ) : (
        groups.map(({ group, rows }) => (
          <section key={group} className={styles.catalogGroup}>
            <h3 className={styles.section}>
              {COST_GROUP_TITLES[group]} <span className={styles.count}>{rows.length}</span>
            </h3>
            <div className={styles.catalogHead}>
              <span>Русский</span>
              <span className={styles.rtlHead}>עברית</span>
              <span>Group</span>
              <span>Price, no VAT</span>
              <span className={styles.costCentre}>+VAT</span>
              <span className={styles.costRight}>With VAT</span>
              <span className={styles.costRight}>Used in</span>
              <span />
            </div>
            {rows.map((item) => (
              <CatalogRow
                key={item.id}
                item={item}
                isNew={fresh.some((f) => f.id === item.id)}
                uses={uses.get(item.id) ?? 0}
                disabled={!writable}
                onSave={save}
                onDelete={remove}
              />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function CatalogRow({
  item,
  isNew,
  uses,
  disabled,
  onSave,
  onDelete,
}: {
  item: CostItem;
  isNew: boolean;
  uses: number;
  disabled: boolean;
  onSave: (item: CostItem) => Promise<boolean>;
  onDelete: (item: CostItem) => void;
}) {
  const [draft, setDraft] = useState(item);
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const history = item.history ?? [];
  /* The price before the current one — what "it went up" is measured from. */
  const previous = history.length > 1 ? history[history.length - 2] : null;

  /* A save elsewhere reloads the list — pick up what the server now holds. */
  useEffect(() => setDraft(item), [item]);

  const dirty =
    isNew ||
    draft.name !== item.name ||
    (draft.nameHe ?? '') !== (item.nameHe ?? '') ||
    draft.group !== item.group ||
    draft.unitNet !== item.unitNet ||
    draft.vat !== item.vat;
  /* Either name will do — plenty of what is bought has only a Hebrew one. */
  const named = Boolean(draft.name.trim() || draft.nameHe?.trim());
  const gross = draft.vat ? draft.unitNet * (1 + SHOP_VAT_RATE / 100) : draft.unitNet;

  const set = <K extends keyof CostItem>(key: K, value: CostItem[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setBusy(true);
    await onSave(draft);
    setBusy(false);
  };

  return (
    <form
      className={`${styles.catalogRow} ${dirty ? styles.catalogDirty : ''}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty && named) void save();
      }}
    >
      <input
        className="input"
        placeholder="Роза Лавли Ред 50 см"
        aria-label="Name in Russian"
        lang="ru"
        autoFocus={isNew}
        value={draft.name}
        onChange={(e) => set('name', e.target.value)}
      />
      <input
        className="input"
        placeholder="ורד לוולי רד 50 ס״מ"
        aria-label="Name in Hebrew"
        lang="he"
        dir="rtl"
        value={draft.nameHe ?? ''}
        onChange={(e) => set('nameHe', e.target.value)}
      />
      <select
        className="select"
        aria-label="Group"
        value={draft.group}
        onChange={(e) => set('group', e.target.value as CostGroup)}
      >
        {COST_GROUPS.map((g) => (
          <option key={g} value={g}>
            {COST_GROUP_TITLES[g]}
          </option>
        ))}
      </select>
      <input
        className="input"
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        aria-label="Price without VAT"
        value={numberValue(draft.unitNet)}
        onWheel={(e) => e.currentTarget.blur()}
        onChange={(e) => set('unitNet', toNumber(e.target.value))}
      />
      <label className={styles.costLineVat} title="Add VAT">
        <input
          type="checkbox"
          aria-label="Add VAT"
          checked={draft.vat}
          onChange={(e) => set('vat', e.target.checked)}
        />
      </label>
      <span className={`${styles.costRight} ${styles.costLineSum}`}>
        {money(gross)}
        {previous && !dirty && (
          <small className={styles.priceWas}>was {money(previous.unitNet)} net</small>
        )}
      </span>
      <span className={`${styles.costRight} ${styles.muted} ${styles.catalogUses}`}>
        {uses ? `${uses} ${uses === 1 ? 'bouquet' : 'bouquets'}` : '—'}
      </span>
      <div className={styles.actions}>
        {history.length > 0 && (
          <button
            type="button"
            className={`${styles.iconBtn} ${showHistory ? styles.iconBtnOn : ''}`}
            onClick={() => setShowHistory((v) => !v)}
            aria-label="Price history"
            aria-expanded={showHistory}
            title="Price history"
          >
            <Icon name="calendar" size={16} />
          </button>
        )}
        <Button
          type="submit"
          variant={dirty ? 'primary' : 'ghost'}
          size="sm"
          disabled={disabled || busy || !dirty || !named}
        >
          {busy ? 'Saving…' : isNew ? 'Add' : 'Save'}
        </Button>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.danger}`}
          onClick={() => onDelete(item)}
          aria-label="Delete"
        >
          <Icon name="trash" size={16} />
        </button>
      </div>

      {showHistory && <PriceHistory history={history} />}
    </form>
  );
}

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Newest first, each price with what it moved by from the one before it. */
function PriceHistory({ history }: { history: CostPricePoint[] }) {
  const rows = history.map((point, i) => ({ point, before: i > 0 ? history[i - 1] : null }));
  return (
    <ol className={styles.history}>
      {rows.reverse().map(({ point, before }) => {
        const delta = before ? point.unitNet - before.unitNet : 0;
        const percent =
          before && before.unitNet > 0 ? Math.round((delta / before.unitNet) * 100) : null;
        return (
          <li key={point.at}>
            <span className={styles.historyDate}>{dateFormat.format(new Date(point.at))}</span>
            <b>{money(point.unitNet)}</b>
            <span className={styles.muted}>{point.vat ? '+VAT' : 'no VAT'}</span>
            {!before ? (
              <span className={styles.muted}>first price</span>
            ) : delta !== 0 ? (
              <span className={delta > 0 ? styles.historyUp : styles.historyDown}>
                {delta > 0 ? '▲ +' : '▼ −'}
                {money(Math.abs(delta))}
                {percent !== null ? ` (${delta > 0 ? '+' : ''}${percent}%)` : ''}
              </span>
            ) : (
              <span className={styles.muted}>
                {before.vat !== point.vat ? (point.vat ? 'VAT added' : 'VAT removed') : 'unchanged'}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
