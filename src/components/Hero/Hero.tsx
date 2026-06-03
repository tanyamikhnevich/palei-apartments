'use client';

import ApartmentSearch from '@/components/ApartmentSearch/ApartmentSearch';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import styles from './Hero.module.scss';

const TRUST_KEYS = [
  { icon: 'wave' as const, key: 'hero.trust.beach' },
  { icon: 'sparkle' as const, key: 'hero.trust.equipped' },
  { icon: 'calendar' as const, key: 'hero.trust.flexible' },
  { icon: 'shield' as const, key: 'hero.trust.verified' },
];

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section className={styles.hero} id="top">
      <div className={styles.media}>
        <div className="wrap">
          <div className={styles.inner}>
            <span className={styles.pill}>
              <Icon name="pin" size={15} />
              {t('hero.pill')}
            </span>

            <h1 className={styles.h1}>{t('hero.title')}</h1>

            <p className={styles.sub}>{t('hero.sub')}</p>

            <ApartmentSearch variant="hero" />

            <div className={styles.cta}>
              <Button variant="light" as="a" href="#apartments" iconRight="arrow">
                {t('hero.viewApartments')}
              </Button>
              <Button
                variant="ghost"
                as="a"
                href="#contact"
                style={{
                  background: 'rgba(255,255,255,.12)',
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,.3)',
                }}
              >
                {t('hero.contactUs')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className={styles.trust}>
          {TRUST_KEYS.map(({ icon, key }) => (
            <div className={styles.trustItem} key={key}>
              <span className={styles.trustIc}>
                <Icon name={icon} size={20} />
              </span>
              {t(key)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
