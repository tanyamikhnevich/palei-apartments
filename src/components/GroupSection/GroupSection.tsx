'use client';

import Link from 'next/link';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { liveServices } from '@/lib/services';
import styles from './GroupSection.module.scss';

/**
 * The way into the other Palei directions from the home page — how a group of
 * services actually introduces itself, rather than four more items crammed into
 * a navigation bar that is already full on a phone.
 *
 * Only the sections that are open to guests appear. A parked one is left out
 * entirely rather than shown as "coming soon": an empty promise on the home
 * page is worse than no mention at all. If nothing is left but the apartments
 * the strip has nothing to introduce, so it does not render.
 */
export default function GroupSection() {
  const { t, href } = useLanguage();
  const services = liveServices();

  if (services.length < 2) return null;

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
          {services.map((service) => (
            <Link key={service.href} href={href(service.href)} className={styles.card}>
              <span className={styles.label}>{t(`group.services.${service.key}.label`)}</span>
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
