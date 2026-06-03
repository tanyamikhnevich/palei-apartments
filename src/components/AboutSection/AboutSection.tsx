'use client';

import { useLanguage } from '@/i18n/LanguageProvider';
import styles from './AboutSection.module.scss';

const STAT_KEYS = [
  { n: '6', key: 'about.stats.apartments' },
  { n: '1,200+', key: 'about.stats.guests' },
  { n: '4.9', key: 'about.stats.rating' },
  { n: '3', key: 'about.stats.languages' },
] as const;

export default function AboutSection() {
  const { t } = useLanguage();

  return (
    <section className={styles.section} id="about">
      <div className="wrap">
        <div className={styles.band}>
          <span className={styles.badge}>{t('about.badge')}</span>
          <h2 className={styles.h2}>{t('about.title')}</h2>
          <p className={styles.desc}>{t('about.desc')}</p>
          <div className={styles.stats}>
            {STAT_KEYS.map(({ n, key }) => (
              <div className={styles.stat} key={key}>
                <div className={styles.n}>{n}</div>
                <div className={styles.l}>{t(key)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
