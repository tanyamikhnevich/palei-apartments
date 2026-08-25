'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import type { IconName } from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import {
  EMAIL_INPUT_MAX_LENGTH,
  PERSON_NAME_MAX,
  PHONE_INPUT_MAX_LENGTH,
  looksLikeEmailInput,
  sanitizeContactInput,
  validatePersonName,
  validatePhoneOrEmail,
} from '@/lib/validation/contact';
import { resolveValidationMessage } from '@/lib/validation/resolveMessage';
import { ApiError, submitContactRequest } from '@/lib/api/client';
import styles from './ContactSection.module.scss';

const FEAT_KEYS: { icon: IconName; key: string }[] = [
  { icon: 'shield', key: 'verified' },
  { icon: 'phone', key: 'support' },
  { icon: 'check', key: 'prices' },
];

export default function ContactSection() {
  const { locale, t } = useLanguage();
  const [sent, setSent] = useState(false);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [sending, setSending] = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  /**
   * Contact error copy for the current locale. While typing (`live`) we skip the
   * "required / too short" nags and only flag hard problems, so a number that is
   * still being typed does not read as broken.
   */
  const contactMessage = (raw: string, live: boolean): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return live ? null : resolveValidationMessage(locale, 'contactRequired');
    const r = validatePhoneOrEmail(trimmed);
    if (r.ok) return null;
    if (live && (r.code === 'phoneTooShort' || r.code === 'emailRequired')) return null;
    return resolveValidationMessage(locale, r.code);
  };

  const reset = () => {
    setName('');
    setContact('');
    setMessage('');
    setHoneypot('');
    setNameError(null);
    setContactError(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nameResult = validatePersonName(name);
    const nextNameError = nameResult.ok ? null : resolveValidationMessage(locale, nameResult.code);
    const nextContactError = contactMessage(contact, false);

    setNameError(nextNameError);
    setContactError(nextContactError);

    if (nextNameError || nextContactError) {
      setFormError(t('booking.fillRequired'));
      return;
    }

    setFormError(null);
    setSending(true);
    try {
      await submitContactRequest({
        name,
        contact,
        message: message.trim() || undefined,
        honeypot,
        page: window.location.pathname,
      });
      setSent(true);
    } catch (err) {
      /*
        The API answers in English for the server log's sake; the guest gets the
        message in their own language. Only the rate limit is worth telling
        apart — "try again" would be misleading advice for it.
      */
      console.error('contact form submit', err);
      setFormError(
        err instanceof ApiError && err.status === 429
          ? t('contact.form.tooMany')
          : t('contact.form.sendError')
      );
    } finally {
      setSending(false);
    }
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
                  <Button
                    variant="ghost"
                    onClick={() => {
                      reset();
                      setSent(false);
                    }}
                  >
                    {t('contact.form.sendAnother')}
                  </Button>
                </div>
              </div>
            ) : (
              <form
                className={styles.formStack}
                onSubmit={(e) => void handleSubmit(e)}
                noValidate
              >
                <div className={styles.formRow}>
                  <label className="field">
                    <span>{t('contact.form.name')}</span>
                    <input
                      className={`input ${nameError ? 'inputInvalid' : ''}`}
                      type="text"
                      value={name}
                      maxLength={PERSON_NAME_MAX}
                      aria-invalid={nameError ? true : undefined}
                      onChange={(e) => {
                        setName(e.target.value);
                        setNameError(null);
                        setFormError(null);
                      }}
                      onBlur={() => {
                        const r = validatePersonName(name);
                        setNameError(r.ok ? null : resolveValidationMessage(locale, r.code));
                      }}
                      placeholder={t('contact.form.namePlaceholder')}
                    />
                    {nameError && <span className="fieldError">{nameError}</span>}
                  </label>
                  <label className="field">
                    <span>{t('contact.form.contact')}</span>
                    <input
                      className={`input ${contactError ? 'inputInvalid' : ''}`}
                      type="text"
                      inputMode="tel"
                      autoComplete="tel"
                      value={contact}
                      aria-invalid={contactError ? true : undefined}
                      maxLength={
                        looksLikeEmailInput(contact) ? EMAIL_INPUT_MAX_LENGTH : PHONE_INPUT_MAX_LENGTH
                      }
                      onChange={(e) => {
                        const next = sanitizeContactInput(e.target.value);
                        setContact(next);
                        setContactError(contactMessage(next, true));
                        setFormError(null);
                      }}
                      onBlur={() => setContactError(contactMessage(contact, false))}
                      placeholder={t('contact.form.contactPlaceholder')}
                    />
                    {contactError && <span className="fieldError">{contactError}</span>}
                  </label>
                </div>
                <label className="field">
                  <span>{t('contact.form.message')}</span>
                  <textarea
                    className="textarea"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('contact.form.messagePlaceholder')}
                  />
                </label>
                {/* Honeypot: hidden from users, tempting to bots. */}
                <input
                  className={styles.honeypot}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />

                {formError && (
                  <div className={styles.errorBox}>
                    <p className={styles.error}>{formError}</p>
                  </div>
                )}
                <Button
                  variant="primary"
                  size="lg"
                  block
                  type="submit"
                  iconRight="arrow"
                  disabled={sending}
                >
                  {sending ? t('contact.form.sending') : t('contact.form.submit')}
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
