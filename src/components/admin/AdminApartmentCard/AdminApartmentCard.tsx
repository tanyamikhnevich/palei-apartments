import type { Apartment } from '@/types/apartment';
import ApartmentCover from '@/components/ApartmentCover/ApartmentCover';
import Badge, { statusTone } from '@/components/ui/Badge/Badge';
import Icon from '@/components/ui/Icon/Icon';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { formatApartmentTags, TAG_LABELS_EN } from '@/lib/apartmentMedia';
import { isApartmentListedOnSite } from '@/lib/apartmentVisibility';
import styles from './AdminApartmentCard.module.scss';

interface AdminApartmentCardProps {
  apt: Apartment;
  onEdit: (apt: Apartment) => void;
  onDelete: (apt: Apartment) => void;
  onToggle: (apt: Apartment) => void;
}

export function AdminApartmentCardGrid({ children }: { children: React.ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export default function AdminApartmentCard({
  apt,
  onEdit,
  onDelete,
  onToggle,
}: AdminApartmentCardProps) {
  const copy = getApartmentCopy(apt, 'en');
  const isListed = isApartmentListedOnSite(apt);
  const tagLine = formatApartmentTags(apt, 'en', (key) => {
    const id = key.replace('apartments.tags.', '') as keyof typeof TAG_LABELS_EN;
    return TAG_LABELS_EN[id] ?? id;
  });

  return (
    <article className={styles.card}>
      <ApartmentCover
        apt={apt}
        alt={copy.title}
        className={styles.media}
        placeholderLabel={tagLine}
        sizes="280px"
      >
        <span className={styles.statusBadge}>
          <Badge tone={statusTone(apt.status)} dot>
            {apt.status}
          </Badge>
        </span>
      </ApartmentCover>

      <div className={styles.body}>
        <div>
          <div className={styles.name}>{copy.title}</div>
          <div className={styles.loc}>
            <Icon name="pin" size={13} />
            {copy.location}
          </div>
          {tagLine && <div className={styles.tags}>{tagLine}</div>}
        </div>

        <div className={styles.specs}>
          <span>
            <Icon name="guest" size={14} />
            {apt.guests}
          </span>
          <span>
            <Icon name="home" size={14} />
            {apt.bedrooms}
          </span>
          <span>
            <Icon name="bed" size={14} />
            {apt.beds}
          </span>
          <span>
            <Icon name="bath" size={14} />
            {apt.bathrooms}
          </span>
        </div>

        <div className={styles.row}>
          <div className={styles.price}>
            <b>₪{apt.price}</b> <span>/ night</span>
          </div>
          <button
            type="button"
            className={`${styles.switch} ${isListed ? styles.switchOn : ''}`}
            aria-label={isListed ? 'Hide from website' : 'Show on website'}
            onClick={() => onToggle(apt)}
          />
        </div>

        <div className={styles.row} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
          <span className={styles.availLabel}>{isListed ? 'On website' : 'Hidden'}</span>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Edit apartment"
              onClick={() => onEdit(apt)}
            >
              <Icon name="edit" size={16} />
            </button>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.danger}`}
              aria-label="Delete apartment"
              onClick={() => onDelete(apt)}
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
