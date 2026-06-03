'use client';

import Icon from '@/components/ui/Icon/Icon';
import type { IconName } from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import styles from './BenefitsSection.module.scss';

const BENEFIT_KEYS: { icon: IconName; key: string }[] = [
  { icon: 'wave', key: 'beach' },
  { icon: 'sparkle', key: 'clean' },
  { icon: 'phone', key: 'support' },
  { icon: 'home', key: 'families' },
];

export default function BenefitsSection() {
  const { t } = useLanguage();

  return (
    <section className={styles.section}>
      <div className="wrap">
        <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
          <div className="eyebrow">{t('benefits.eyebrow')}</div>
          <h2 className="section-title">{t('benefits.title')}</h2>
          <p className="section-sub" style={{ marginInline: 'auto' }}>
            {t('benefits.sub')}
          </p>
        </div>

        <div className={styles.grid}>
          {BENEFIT_KEYS.map(({ icon, key }) => (
            <div className={styles.card} key={key}>
              <div className={styles.icon}>
                <Icon name={icon} size={24} />
              </div>
              <h3 className={styles.title}>{t(`benefits.items.${key}.title`)}</h3>
              <p className={styles.desc}>{t(`benefits.items.${key}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
