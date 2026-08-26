import type { Apartment } from '@/types/apartment';
import Badge, { statusTone } from '@/components/ui/Badge/Badge';
import Icon from '@/components/ui/Icon/Icon';
import Placeholder from '@/components/ui/Placeholder/Placeholder';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { isApartmentListedOnSite } from '@/lib/apartmentVisibility';
import styles from './AdminApartmentTable.module.scss';
import { formatMoney } from '@/lib/money';
import { currencyOf } from '@/lib/regions';

interface AdminApartmentTableProps {
  apartments: Apartment[];
  onEdit: (apt: Apartment) => void;
  onDelete: (apt: Apartment) => void;
  onToggle: (apt: Apartment) => void;
}

export default function AdminApartmentTable({
  apartments,
  onEdit,
  onDelete,
  onToggle,
}: AdminApartmentTableProps) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th>Apartment</th>
            <th>Location</th>
            <th>Capacity</th>
            <th>Price</th>
            <th>Status</th>
            <th className={styles.right}>Actions</th>
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {apartments.map((a) => {
            const copy = getApartmentCopy(a, 'en');
            return (
            <tr key={a.id}>
              <td>
                <div className={styles.nameCell}>
                  <Placeholder className={styles.thumb} label="" />
                  {copy.title}
                </div>
              </td>
              <td className={styles.muted}>{copy.location}</td>
              <td className={styles.muted}>
                {a.guests}g · {a.bedrooms}br · {a.beds}b · {a.bathrooms}ba
              </td>
              <td className={styles.price}>
                <b>{formatMoney(a.price, currencyOf(a), 'en')}</b>
              </td>
              <td>
                <Badge tone={statusTone(a.status)} dot>
                  {a.status}
                </Badge>
              </td>
              <td>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={`${styles.switch} ${isApartmentListedOnSite(a) ? styles.switchOn : ''}`}
                    onClick={() => onToggle(a)}
                    aria-label="Toggle availability"
                  />
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => onEdit(a)}
                    aria-label="Edit"
                  >
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.danger}`}
                    onClick={() => onDelete(a)}
                    aria-label="Delete"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </td>
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}
