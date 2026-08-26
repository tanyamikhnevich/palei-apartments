import type { Apartment } from '@/types/apartment';
import Icon from '@/components/ui/Icon/Icon';
import type { IconName } from '@/components/ui/Icon/Icon';
import styles from './AdminStats.module.scss';
import { formatMoney } from '@/lib/money';
import { currencyForArea } from '@/lib/regions';
import { DEFAULT_AREA } from '@/types/region';

interface AdminStatsProps {
  apartments: Apartment[];
}

export default function AdminStats({ apartments }: AdminStatsProps) {
  const available = apartments.filter((a) => a.status === 'Available').length;
  const booked = apartments.filter((a) => a.status === 'Booked').length;
  const avgPrice = apartments.length
    ? Math.round(apartments.reduce((s, a) => s + a.price, 0) / apartments.length)
    : 0;

  const cards: { icon: IconName; value: string | number; label: string }[] = [
    { icon: 'home', value: apartments.length, label: 'Total apartments' },
    { icon: 'check', value: available, label: 'Available now' },
    { icon: 'calendar', value: booked, label: 'Currently booked' },
    {
      icon: 'sparkle',
      /*
        Shown in the home region's currency. Once listings span two currencies
        a single average stops meaning anything — split it by region then.
      */
      value: formatMoney(avgPrice, currencyForArea(DEFAULT_AREA), 'en'),
      label: 'Avg. price / night',
    },
  ];

  return (
    <div className={styles.stats}>
      {cards.map(({ icon, value, label }) => (
        <div className={styles.stat} key={label}>
          <div className={styles.icon}>
            <Icon name={icon} size={19} />
          </div>
          <div className={styles.n}>{value}</div>
          <div className={styles.l}>{label}</div>
        </div>
      ))}
    </div>
  );
}
