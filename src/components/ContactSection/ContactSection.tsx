'use client';

import { useState } from 'react';
import { apartments } from '@/data/apartments';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import type { IconName } from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import styles from './ContactSection.module.scss';

const FEAT_KEYS: { icon: IconName; key: string }[] = [
  { icon: 'shield', key: 'verified' },
  { icon: 'phone', key: 'support' },
  { icon: 'check', key: 'prices' },
];

export default function ContactSection() {
  const { locale, t } = useLanguage();
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <section className={styles.section} id="contact">
      <div className="wrap">
        <div className={styles.grid}>
          <div>
            <div className="eyebrow">{t('contact.eyebrow')}</div>
            <h2 className="section-title">{t('contact.title')}</h2>
            <p className="section-sub">{t('contact.sub')}</p>

            <div className={styles.feats}>
              {FEAT_KEYS.map(({ icon, key }) => (
                <div className={styles.feat} key={key}>
                  <div className={styles.featIcon}>
                    <Icon name={icon} size={19} />
                  </div>
                  <div>
                    <h4 className={styles.featTitle}>{t(`contact.feats.${key}.title`)}</h4>
                    <p className={styles.featDesc}>{t(`contact.feats.${key}.desc`)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.whatsapp}>
              <Button
                variant="primary"
                icon="phone"
                as="a"
                href="#"
                style={{ background: '#25D366' }}
              >
                {t('contact.whatsapp')}
              </Button>
            </div>
          </div>

          <div className={styles.formCard}>
            {sent ? (
              <div className={styles.sent}>
                <div className={styles.sentIcon}>
                  <Icon name="check" size={30} />
                </div>
                <h3 className={styles.sentTitle}>{t('contact.form.thanksTitle')}</h3>
                <p className={styles.sentDesc}>{t('contact.form.thanksDesc')}</p>
                <div className={styles.sentCta}>
                  <Button variant="ghost" onClick={() => setSent(false)}>
                    {t('contact.form.sendAnother')}
                  </Button>
                </div>
              </div>
            ) : (
              <form className={styles.formStack} onSubmit={handleSubmit}>
                <div className={styles.formRow}>
                  <label className="field">
                    <span>{t('contact.form.name')}</span>
                    <input
                      className="input"
                      type="text"
                      placeholder={t('contact.form.namePlaceholder')}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{t('contact.form.contact')}</span>
                    <input
                      className="input"
                      type="text"
                      placeholder={t('contact.form.contactPlaceholder')}
                      required
                    />
                  </label>
                </div>
                <div className={styles.formRow}>
                  <label className="field">
                    <span>{t('contact.form.checkIn')}</span>
                    <input className="input" type="date" required />
                  </label>
                  <label className="field">
                    <span>{t('contact.form.checkOut')}</span>
                    <input className="input" type="date" required />
                  </label>
                </div>
                <label className="field">
                  <span>{t('contact.form.apartment')}</span>
                  <select className="select">
                    <option value="">{t('contact.form.noPreference')}</option>
                    {apartments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {getApartmentCopy(a, locale).title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{t('contact.form.message')}</span>
                  <textarea
                    className="textarea"
                    placeholder={t('contact.form.messagePlaceholder')}
                  />
                </label>
                <Button variant="primary" size="lg" block type="submit" iconRight="arrow">
                  {t('contact.form.submit')}
                </Button>
                <p className={styles.formNote}>{t('contact.form.note')}</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
