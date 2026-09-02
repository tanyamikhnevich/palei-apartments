'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button/Button';
import btnStyles from '@/components/ui/Button/Button.module.scss';
import Icon from '@/components/ui/Icon/Icon';
import PhotoGallery from '@/components/PhotoGallery/PhotoGallery';
import SpecStat from '@/components/ui/SpecStat/SpecStat';
import DateRangeCalendar from '@/components/DateRangeCalendar/DateRangeCalendar';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatDateRange } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { currencyOf } from '@/lib/regions';
import { daysBetween, hasRateTiers, quoteHire } from '@/lib/cars';
import { ApiError, submitCarRequest } from '@/lib/api/client';
import {
  PERSON_NAME_MAX,
  PHONE_INPUT_MAX_LENGTH,
  sanitizePhoneInput,
  validatePersonName,
  validatePhone,
} from '@/lib/validation/contact';
import { resolveValidationMessage } from '@/lib/validation/resolveMessage';
import type { Car } from '@/types/car';
import styles from './CarDetail.module.scss';

export default function CarDetail({ car }: { car: Car }) {
  const { locale, t, href } = useLanguage();
  const name = `${car.make} ${car.model}`;
  const money = (amount: number) => formatMoney(amount, currencyOf(car), locale);

  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [pickup, setPickup] = useState(car.pickupPoints[0]);
  const [guestName, setGuestName] = useState('');
  const [contact, setContact] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const quote = useMemo(() => quoteHire(car, from, to), [car, from, to]);
  const formComplete =
    Boolean(quote) && validatePersonName(guestName).ok && validatePhone(contact).ok;

  const onRangeChange = (range: { checkIn: string; checkOut: string | null }) => {
    setFrom(range.checkIn);
    setTo(range.checkOut);
    setError(null);

    if (range.checkOut && range.checkOut > range.checkIn) {
      const days = daysBetween(range.checkIn, range.checkOut);
      setDateError(
        days < car.minDays
          ? t('cars.minDaysError')
              .replace('{min}', String(car.minDays))
              .replace('{days}', String(days))
          : null
      );
    } else {
      setDateError(null);
    }
  };

  const handleSubmit = async () => {
    if (!quote) {
      setDateError(t('booking.pickDates'));
      return;
    }
    const nameCheck = validatePersonName(guestName);
    const phoneCheck = validatePhone(contact);
    if (!nameCheck.ok || !phoneCheck.ok) {
      setError(t('booking.fillRequired'));
      return;
    }

    setError(null);
    setSending(true);
    try {
      await submitCarRequest({
        carId: car.id,
        from: from!,
        to: to!,
        pickup,
        name: guestName,
        contact,
        honeypot,
      });
      setSent(true);
    } catch (err) {
      console.error('car request', err);
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
    <div className={`wrap ${styles.page}`}>
      <Link href={href('/cars')} className={styles.back}>
        <Icon name="arrow" size={16} className={styles.backIcon} />
        {t('cars.backToAll')}
      </Link>

      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>{name}</h1>
          <p className={styles.meta}>
            {car.year} · {t(`cars.classes.${car.carClass}`)} ·{' '}
            {car.transmission === 'automatic' ? t('cars.automatic') : t('cars.manual')}
          </p>
        </div>
        <div className={styles.priceBox}>
          {hasRateTiers(car) && <span>{t('cars.from')} </span>}
          <b>{money(car.pricePerDay)}</b> <span>{t('cars.perDay')}</span>
        </div>
      </header>

      <PhotoGallery
        photos={car.photos ?? []}
        alt={name}
        className={styles.gallery}
        placeholderLabel={name}
        sizes="(max-width: 900px) 100vw, 900px"
      />

      <div className={styles.layout}>
        <section className={styles.about}>
          <div className={styles.specs}>
            <SpecStat icon="guest" value={car.seats} label={t('cars.seats')} />
            <SpecStat icon="home" value={car.bags} label={t('cars.bags')} />
            <SpecStat icon="calendar" value={car.minDays} label={t('cars.days')} />
          </div>

          <p className={styles.included}>
            <Icon name="check" size={17} /> {t('cars.included')}
          </p>

          {hasRateTiers(car) && (
            <div className={styles.rates}>
              <div className={styles.ratesTitle}>{t('booking.rates')}</div>
              {[...(car.rateTiers ?? [])]
                .sort((a, b) => a.minDays - b.minDays)
                .map((tier) => (
                  <div
                    key={tier.minDays}
                    className={`${styles.rateRow} ${
                      quote && quote.rate === tier.price ? styles.rateOn : ''
                    }`}
                  >
                    <span>{t('booking.rateFrom').replace('{nights}', String(tier.minDays))}</span>
                    <span>
                      {money(tier.price)} {t('cars.perDay')}
                    </span>
                  </div>
                ))}
            </div>
          )}

          <div className={styles.depositBox}>
            <div className={styles.depositRow}>
              <span>{t('cars.deposit')}</span>
              <strong>{money(car.deposit)}</strong>
            </div>
            <p>{t('cars.depositNote')}</p>
          </div>
        </section>

        <aside className={styles.bookingCol} id="book">
          <section className={styles.booking}>
            {sent ? (
              <div className={styles.success}>
                <div className={styles.successIcon}>
                  <Icon name="check" size={22} />
                </div>
                <h2 className={styles.successTitle}>{t('booking.successTitle')}</h2>
                <p className={styles.successDesc}>{t('booking.successDesc')}</p>
                <Button variant="ghost" as="a" href={href('/cars')} iconRight="arrow">
                  {t('cars.backToAll')}
                </Button>
              </div>
            ) : (
              <>
                <div className="eyebrow">{t('cars.hireTitle')}</div>
                <p className={styles.minStay}>
                  {t('cars.minDays').replace('{n}', String(car.minDays))}
                </p>

                <DateRangeCalendar
                  locale={locale}
                  hint={
                    dateError ??
                    (quote
                      ? t('booking.rangeSelected').replace(
                          '{range}',
                          formatDateRange(from!, to!, locale)
                        )
                      : t('booking.selectCheckIn'))
                  }
                  blocked={car.blocks.map((b) => ({ checkIn: b.from, checkOut: b.to }))}
                  checkIn={from}
                  checkOut={to}
                  onChange={onRangeChange}
                />

                <label className="field">
                  <span>{t('cars.pickupPoint')}</span>
                  <select
                    className="select"
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                  >
                    {car.pickupPoints.map((point) => (
                      <option key={point} value={point}>
                        {point}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>{t('booking.yourName')}</span>
                  <input
                    className="input"
                    value={guestName}
                    maxLength={PERSON_NAME_MAX}
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      setError(null);
                    }}
                    placeholder={t('booking.namePlaceholder')}
                  />
                </label>

                <label className="field">
                  <span>{t('booking.contact')}</span>
                  <input
                    className="input"
                    type="text"
                    inputMode="tel"
                    autoComplete="tel"
                    value={contact}
                    maxLength={PHONE_INPUT_MAX_LENGTH}
                    onChange={(e) => {
                      setContact(sanitizePhoneInput(e.target.value));
                      setError(null);
                    }}
                    placeholder={t('booking.contactPlaceholder')}
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

                {quote && (
                  <div className={styles.summary}>
                    <div className={styles.summaryDates}>
                      {formatDateRange(from!, to!, locale)}
                    </div>
                    <div className={styles.summaryRow}>
                      <span>
                        {t('cars.daysLine')
                          .replace('{days}', String(quote.days))
                          .replace('{price}', money(quote.rate))}
                      </span>
                      <span>{money(quote.total)}</span>
                    </div>
                    <div className={styles.summaryTotal}>
                      <span>{t('booking.total')}</span>
                      <strong>{money(quote.total)}</strong>
                    </div>
                  </div>
                )}

                {error && (
                  <div className={styles.errorBox}>
                    <p className={styles.error}>{error}</p>
                  </div>
                )}

                <Button
                  variant="primary"
                  icon="check"
                  block
                  className={!formComplete && !sending ? btnStyles.inactive : ''}
                  onClick={() => void handleSubmit()}
                  disabled={sending}
                >
                  {sending ? t('booking.submitting') : t('booking.submit')}
                </Button>
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
