'use client';

import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import type { IconName } from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import styles from './LocationSection.module.scss';

const POINT_KEYS: { icon: IconName; key: string }[] = [
  { icon: 'wave', key: 'beach' },
  { icon: 'pin', key: 'transport' },
  { icon: 'sparkle', key: 'cafes' },
];

const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Bat+Yam+beach';

export default function LocationSection() {
  const { t } = useLanguage();

  return (
    <section className={styles.section} id="location">
      <div className="wrap">
        <div className={styles.head}>
          <div className="eyebrow">{t('location.eyebrow')}</div>
          <h2 className="section-title">{t('location.title')}</h2>
          <p className="section-sub">{t('location.sub')}</p>
        </div>

        <div className={styles.points}>
          {POINT_KEYS.map(({ icon, key }) => (
            <div className={styles.point} key={key}>
              <div className={styles.pointIcon}>
                <Icon name={icon} size={20} />
              </div>
              <div>
                <h4 className={styles.pointTitle}>{t(`location.points.${key}.title`)}</h4>
                <p className={styles.pointDesc}>{t(`location.points.${key}.desc`)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.cta}>
          <Button
            variant="navy"
            icon="pin"
            as="a"
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('location.openMaps')}
          </Button>
        </div>
      </div>
    </section>
  );
}
