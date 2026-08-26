'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button/Button';
import btnStyles from '@/components/ui/Button/Button.module.scss';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatMoney } from '@/lib/money';
import { bouquetCopy, bouquetCurrency, earliestDelivery } from '@/lib/flowers';
import { ApiError, submitFlowerOrder } from '@/lib/api/client';
import {
  PERSON_NAME_MAX,
  PHONE_INPUT_MAX_LENGTH,
  sanitizePhoneInput,
  validatePersonName,
  validatePhone,
} from '@/lib/validation/contact';
import { DELIVERY_SLOTS, type Bouquet, type DeliverySlot } from '@/types/flower';
import styles from './FlowersShop.module.scss';

const CARD_MAX = 300;

interface FlowerOrderFormProps {
  bouquet: Bouquet;
  /** Pre-filled from a booking's check-in day, when there is one. */
  requestedDate?: string | null;
  onClose: () => void;
}

export default function FlowerOrderForm({
  bouquet,
  requestedDate,
  onClose,
}: FlowerOrderFormProps) {
  const { locale, t } = useLanguage();
  const copy = bouquetCopy(bouquet, locale);

  /*
    Computed on the client so the picker cannot offer a date the florist has
    already missed — the server checks the same rule again before sending.
  */
  const earliest = useMemo(() => earliestDelivery(bouquet), [bouquet]);

  /* A requested date only wins if the florist can still make it. */
  const [date, setDate] = useState(
    requestedDate && requestedDate >= earliest ? requestedDate : earliest
  );
  const [slot, setSlot] = useState<DeliverySlot>('morning');
  const [address, setAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [card, setCard] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape closes it, the way every other dialog on the web does.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const complete =
    date >= earliest &&
    address.trim().length >= 5 &&
    validatePersonName(recipient).ok &&
    validatePhone(recipientPhone).ok &&
    validatePersonName(name).ok &&
    validatePhone(contact).ok;

  const handleSubmit = async () => {
    if (!complete) {
      setError(t('booking.fillRequired'));
      return;
    }
    setError(null);
    setSending(true);
    try {
      await submitFlowerOrder({
        bouquetId: bouquet.id,
        date,
        slot,
        address: address.trim(),
        recipient,
        recipientPhone,
        card: card.trim() || undefined,
        name,
        contact,
        honeypot,
      });
      setSent(true);
    } catch (err) {
      console.error('flower order', err);
      setError(
        err instanceof ApiError && err.status === 429
          ? t('contact.form.tooMany')
          : t('contact.form.sendError')
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={copy.name}>
      <div className={styles.sheet}>
        <div className={styles.sheetHead}>
          <div>
            <h2>{copy.name}</h2>
            <span>{formatMoney(bouquet.price, bouquetCurrency(bouquet), locale)}</span>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>

        {sent ? (
          <div className={styles.sent}>
            <div className={styles.sentIcon}>
              <Icon name="check" size={26} />
            </div>
            <h3>{t('flowers.successTitle')}</h3>
            <p>{t('flowers.successDesc')}</p>
            <Button variant="ghost" onClick={onClose}>
              {t('flowers.backToAll')}
            </Button>
          </div>
        ) : (
          <div className={styles.sheetBody}>
            <div className="eyebrow">{t('flowers.orderTitle')}</div>

            <div className={styles.row}>
              <label className="field">
                <span>{t('flowers.date')}</span>
                <input
                  className="input"
                  type="date"
                  value={date}
                  min={earliest}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="field">
                <span>{t('flowers.slot')}</span>
                <select
                  className="select"
                  value={slot}
                  onChange={(e) => setSlot(e.target.value as DeliverySlot)}
                >
                  {DELIVERY_SLOTS.map((s) => (
                    <option key={s} value={s}>
                      {t(`flowers.slots.${s}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!bouquet.sameDay && <p className={styles.hint}>{t('flowers.cutoff')}</p>}

            <label className="field">
              <span>{t('flowers.address')}</span>
              <input
                className="input"
                value={address}
                maxLength={200}
                placeholder={t('flowers.addressPlaceholder')}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>

            <div className={styles.row}>
              <label className="field">
                <span>{t('flowers.recipient')}</span>
                <input
                  className="input"
                  value={recipient}
                  maxLength={PERSON_NAME_MAX}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </label>
              <label className="field">
                <span>{t('flowers.recipientPhone')}</span>
                <input
                  className="input"
                  inputMode="tel"
                  value={recipientPhone}
                  maxLength={PHONE_INPUT_MAX_LENGTH}
                  onChange={(e) => setRecipientPhone(sanitizePhoneInput(e.target.value))}
                />
              </label>
            </div>

            <label className="field">
              <span>{t('flowers.card')}</span>
              <textarea
                className="textarea"
                value={card}
                maxLength={CARD_MAX}
                placeholder={t('flowers.cardPlaceholder')}
                onChange={(e) => setCard(e.target.value)}
              />
            </label>

            <div className="eyebrow">{t('flowers.yourDetails')}</div>
            <div className={styles.row}>
              <label className="field">
                <span>{t('booking.yourName')}</span>
                <input
                  className="input"
                  value={name}
                  maxLength={PERSON_NAME_MAX}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="field">
                <span>{t('booking.contact')}</span>
                <input
                  className="input"
                  inputMode="tel"
                  value={contact}
                  maxLength={PHONE_INPUT_MAX_LENGTH}
                  onChange={(e) => setContact(sanitizePhoneInput(e.target.value))}
                />
              </label>
            </div>

            {/* Honeypot: hidden from users, tempting to bots. */}
            <input
              className={styles.honeypot}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />

            {error && <p className={styles.error}>{error}</p>}

            <Button
              variant="primary"
              icon="check"
              block
              className={!complete && !sending ? btnStyles.inactive : ''}
              disabled={sending}
              onClick={() => void handleSubmit()}
            >
              {sending ? t('booking.submitting') : t('flowers.submit')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
