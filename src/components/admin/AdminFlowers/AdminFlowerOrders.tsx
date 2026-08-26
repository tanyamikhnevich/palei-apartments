'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/Icon/Icon';
import { formatMoney } from '@/lib/money';
import { fetchFlowerOrders, updateFlowerOrderStatus } from '@/lib/api/client';
import { FLOWER_ORDER_STATUSES, type FlowerOrder, type FlowerOrderStatus } from '@/types/flower';
import type { CurrencyCode } from '@/types/settings';
import styles from './AdminFlowers.module.scss';

/** Orders as they come in, with the one thing to do to them: move them along. */
export default function AdminFlowerOrders() {
  const [orders, setOrders] = useState<FlowerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetchFlowerOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const setStatus = async (order: FlowerOrder, status: FlowerOrderStatus) => {
    setBusy(order.id);
    try {
      const saved = await updateFlowerOrderStatus(order.id, status);
      setOrders((prev) => prev.map((o) => (o.id === saved.id ? saved : o)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not update the order');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <p className={styles.muted}>Loading…</p>;

  if (orders.length === 0) {
    return <p className={styles.muted}>No orders yet. They will appear here as they come in.</p>;
  }

  return (
    <div className={styles.orders}>
      {orders.map((order) => (
        <article
          className={`${styles.order} ${order.status === 'Cancelled' ? styles.orderDim : ''}`}
          key={order.id}
        >
          <div className={styles.orderTop}>
            <div className={styles.orderItem}>
              <b>{order.itemName}</b>
              <span>
                {formatMoney(order.price, order.currency as CurrencyCode, 'en')} ·{' '}
                {order.deliveryDate} · {order.slot}
              </span>
            </div>
            <select
              className="select"
              value={order.status}
              disabled={busy === order.id}
              onChange={(e) => void setStatus(order, e.target.value as FlowerOrderStatus)}
            >
              {FLOWER_ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <dl className={styles.orderGrid}>
            <div>
              <dt>
                <Icon name="pin" size={13} /> Address
              </dt>
              <dd>{order.address}</dd>
            </div>
            <div>
              <dt>
                <Icon name="guest" size={13} /> Recipient
              </dt>
              <dd>
                {order.recipient} · {order.recipientPhone}
              </dd>
            </div>
            <div>
              <dt>
                <Icon name="phone" size={13} /> Ordered by
              </dt>
              <dd>
                {order.guest} · {order.guestContact}
              </dd>
            </div>
            {order.card && (
              <div className={styles.orderCard}>
                <dt>
                  <Icon name="edit" size={13} /> Card
                </dt>
                <dd>«{order.card}»</dd>
              </div>
            )}
          </dl>
        </article>
      ))}
    </div>
  );
}
