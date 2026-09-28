'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useBusiness } from '@/components/BusinessProvider/BusinessProvider';
import { displayPhone, telLink } from '@/lib/phone';
import { SAME_DAY_CUTOFF_HOUR } from '@/lib/flowers';
import type { ShopCategory } from '@/lib/flowerCategories';
import { liveServices } from '@/lib/services';
import type { Locale } from '@/i18n/types';
import base from '@/components/Footer/Footer.module.scss';
import styles from './FlowersFooter.module.scss';

const LANG_LINKS: { locale: Locale; key: string }[] = [
  { locale: 'en', key: 'footer.langEn' },
  { locale: 'ru', key: 'footer.langRu' },
  { locale: 'he', key: 'footer.langHe' },
  { locale: 'fr', key: 'footer.langFr' },
];

/**
 * The shop's footer: its own logo, its aisles, how to reach the florist — and,
 * last, the rest of the family. The apartments are one column here rather than
 * the whole footer, because on this domain they are the neighbour, not the host.
 *
 * `aisles` is the stocked ones, as in the header.
 */
export default function FlowersFooter({ aisles }: { aisles: ShopCategory[] }) {
  const { t, setLocale, href } = useLanguage();
  const { contactPhone } = useBusiness();
  const family = liveServices().filter((s) => s.href !== '/flowers');

  return (
    <footer className={`${base.footer} ${styles.footer}`}>
      <div className="wrap">
        <div className={base.top}>
          <div className={base.logoWrap}>
            <Image src="/palei-flowers-logo.png" alt="Palei Flowers" width={200} height={60} />
            <p>{t('shop.footer.tagline')}</p>
          </div>

          {aisles.length > 0 && (
            <div className={base.col}>
              <h5>{t('shop.footer.shop')}</h5>
              <ul>
                {aisles.map((c) => (
                  <li key={c}>
                    <Link href={href(`/flowers/${c}`)}>{t(`shop.categories.${c}.label`)}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={base.col}>
            <h5>{t('footer.contact')}</h5>
            <ul>
              {contactPhone && (
                <li>
                  <a href={telLink(contactPhone)} dir="ltr">
                    {displayPhone(contactPhone)}
                  </a>
                </li>
              )}
              <li>
                <span className={base.plain}>Bat Yam, Israel</span>
              </li>
              <li>
                <span className={base.plain}>
                  {t('shop.footer.delivery').replace('{time}', `${SAME_DAY_CUTOFF_HOUR}:00`)}
                </span>
              </li>
            </ul>
          </div>

          {family.length > 0 && (
            <div className={base.col}>
              <h5>{t('footer.group')}</h5>
              <ul>
                {family.map((service) => (
                  <li key={service.href}>
                    <Link href={href(service.href)}>
                      {t(`group.services.${service.key}.label`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={`${base.col} ${base.colLang}`}>
            <h5>{t('footer.language')}</h5>
            <ul>
              {LANG_LINKS.map(({ locale, key }) => (
                <li key={locale}>
                  <button type="button" className={base.langBtn} onClick={() => setLocale(locale)}>
                    {t(key)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={base.bottom}>
          <span>{t('shop.footer.copyright')}</span>
        </div>
      </div>
    </footer>
  );
}
