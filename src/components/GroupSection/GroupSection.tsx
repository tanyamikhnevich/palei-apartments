'use client';

import Link from 'next/link';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { SERVICES } from '@/lib/services';
import styles from './GroupSection.module.scss';

/**
 * The way into the other Palei directions from the home page — how a group of
 * services actually introduces itself, rather than four more items crammed into
 * a navigation bar that is already full on a phone.
 *
 * Every direction behind it is a working section now, so the strip ships. Its
 * copy goes through the dictionaries like everything else, so the block follows
 * the language switch.
 */
export default function GroupSection() {
  const { t } = useLanguage();

  return (
    <section className={`section--tight ${styles.section}`} id="group">
      <div className="wrap">
        <div className={styles.head}>
          {/* The brand name stays in Latin — it is a name, not a phrase. */}
          <div className="eyebrow">Palei Group</div>
          <h2 className="section-title">{t('group.title')}</h2>
          <p className="section-sub">{t('group.sub')}</p>
        </div>

        <div className={styles.grid}>
          {SERVICES.map((service) => (
            <Link key={service.href} href={service.href} className={styles.card}>
              <span className={styles.label}>
                {t(`group.services.${service.key}.label`)}
                {!service.live && <span className={styles.soon}>{t('group.soon')}</span>}
              </span>
              <span className={styles.note}>{t(`group.services.${service.key}.note`)}</span>
              <span className={styles.go} aria-hidden="true">
                <Icon name="arrow" size={16} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
