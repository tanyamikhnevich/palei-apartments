'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { Apartment } from '@/types/apartment';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import Placeholder from '@/components/ui/Placeholder/Placeholder';
import DateRangeCalendar from '@/components/DateRangeCalendar/DateRangeCalendar';
import { useLanguage } from '@/i18n/LanguageProvider';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { formatDateRange, nightsBetween } from '@/lib/dates';
import {
  fetchBookingAvailability,
  saveBookingDraft,
  submitBookingRequest,
} from '@/lib/api/client';
import {
  PERSON_NAME_MAX,
  sanitizePhoneInput,
  validatePersonName,
  validatePhoneOrEmail,
} from '@/lib/validation/contact';
import { resolveValidationMessage } from '@/lib/validation/resolveMessage';
import { getApartmentPhotos, isPhotoUrl } from '@/lib/apartmentMedia';
import styles from './BookingModal.module.scss';

interface BookingModalProps {
  apt: Apartment;
  onClose: () => void;
}

export default function BookingModal({ apt, onClose }: BookingModalProps) {
  const { locale, t } = useLanguage();
  const copy = getApartmentCopy(apt, locale);
  const [bookingId] = useState(
    () => `web-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );
  const [blocked, setBlocked] = useState<{ checkIn: string; checkOut: string }[]>([]);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [guests, setGuests] = useState(Math.min(2, apt.guests));
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  const photos = useMemo(() => getApartmentPhotos(apt), [apt.photos]);

  useEffect(() => {
    fetchBookingAvailability(apt.id).then(setBlocked).catch(() => setBlocked([]));
  }, [apt.id]);

  const calendarHint = useMemo(() => {
    if (checkIn && checkOut && checkOut > checkIn) {
      return t('booking.rangeSelected').replace('{range}', formatDateRange(checkIn, checkOut, locale));
    }
    if (checkIn && !checkOut) return t('booking.selectCheckOut');
    return t('booking.selectCheckIn');
  }, [checkIn, checkOut, locale, t]);

  const persistDraft = useCallback(
    async (inDate: string, outDate: string) => {
      if (outDate <= inDate) return;
      setSaving(true);
      setError(null);
      try {
        await saveBookingDraft({
          id: bookingId,
          apartmentId: apt.id,
          apt: copy.title,
          guest: guestName.trim() || t('booking.guestPlaceholder'),
          guestContact: guestContact.trim() || undefined,
          checkIn: inDate,
          checkOut: outDate,
          dates: formatDateRange(inDate, outDate, locale),
          guests,
          status: 'Draft',
          channel: 'Website',
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : t('booking.saveError'));
      } finally {
        setSaving(false);
      }
    },
    [apt.id, bookingId, copy.title, guestContact, guestName, guests, locale, t]
  );

  const onRangeChange = (range: { checkIn: string; checkOut: string | null }) => {
    setCheckIn(range.checkIn);
    setCheckOut(range.checkOut);
    setError(null);
    if (range.checkOut && range.checkOut > range.checkIn) {
      void persistDraft(range.checkIn, range.checkOut);
    }
  };

  const nights =
    checkIn && checkOut && checkOut > checkIn ? nightsBetween(checkIn, checkOut) : 0;
  const total = nights * apt.price;
  const rangeReady = Boolean(checkIn && checkOut && checkOut > checkIn);

  const validateGuestFields = (): { guest: string; contact: string } | null => {
    const nameResult = validatePersonName(guestName);
    if (!nameResult.ok) {
      setNameError(resolveValidationMessage(locale, nameResult.code));
      return null;
    }
    setNameError(null);

    const contactResult = validatePhoneOrEmail(guestContact);
    if (!contactResult.ok) {
      setContactError(resolveValidationMessage(locale, contactResult.code));
      return null;
    }
    setContactError(null);

    return {
      guest: nameResult.normalized!,
      contact: contactResult.normalized!,
    };
  };

  const handleSubmit = async () => {
    if (!rangeReady || !checkIn || !checkOut) {
      setError(t('booking.pickDates'));
      return;
    }
    const guestFields = validateGuestFields();
    if (!guestFields) return;

    setSubmitting(true);
    setError(null);
    try {
      await submitBookingRequest({
        id: bookingId,
        apartmentId: apt.id,
        apt: copy.title,
        guest: guestFields.guest,
        guestContact: guestFields.contact,
        checkIn,
        checkOut,
        dates: formatDateRange(checkIn, checkOut, locale),
        guests,
        status: 'New request',
        channel: 'Website',
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('booking.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const bedLabel = apt.bedrooms === 1 ? t('apartments.bed') : t('apartments.beds');
  const bathLabel = apt.bathrooms === 1 ? t('apartments.bath') : t('apartments.baths');
  const guestLabel = apt.guests === 1 ? t('apartments.guest') : t('apartments.guests');
  const currentPhoto = photos[activePhoto] ?? photos[0];

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.head}>
          <div>
            <h2 id="booking-title" className={styles.title}>
              {copy.title}
            </h2>
            <div className={styles.loc}>
              <Icon name="pin" size={14} />
              {copy.location}
            </div>
          </div>
          <button type="button" className={styles.close} aria-label={t('booking.close')} onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className={styles.layout}>
          <section className={styles.about}>
            <div className={styles.gallery}>
              <div className={styles.mainPhoto}>
                {currentPhoto && isPhotoUrl(currentPhoto) ? (
                  <Image
                    src={currentPhoto}
                    alt={copy.title}
                    fill
                    sizes="(max-width: 720px) 100vw, 360px"
                    className={styles.photoImg}
                  />
                ) : (
                  <Placeholder className={styles.photoPh} label={currentPhoto} />
                )}
              </div>
              {photos.length > 1 && (
                <div className={styles.thumbs}>
                  {photos.map((p, i) => (
                    <button
                      key={`${p}-${i}`}
                      type="button"
                      className={`${styles.thumb} ${i === activePhoto ? styles.thumbOn : ''}`}
                      onClick={() => setActivePhoto(i)}
                      aria-label={`Photo ${i + 1}`}
                    >
                      {isPhotoUrl(p) ? (
                        <Image src={p} alt="" fill sizes="72px" className={styles.photoImg} />
                      ) : (
                        <Placeholder className={styles.thumbPh} label="" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p className={styles.desc}>{copy.description}</p>

            <div className={styles.specs}>
              <span className={styles.spec}>
                <Icon name="guest" size={16} />
                {apt.guests} {guestLabel}
              </span>
              <span className={styles.spec}>
                <Icon name="bed" size={16} />
                {apt.bedrooms} {bedLabel}
              </span>
              <span className={styles.spec}>
                <Icon name="bath" size={16} />
                {apt.bathrooms} {bathLabel}
              </span>
              <span className={styles.spec}>
                <Icon name="star" size={16} />
                {apt.rating.toFixed(1)} · {apt.reviews} {t('booking.reviews')}
              </span>
            </div>
          </section>

          <section className={styles.booking}>
            <div className="eyebrow">{t('booking.datesTitle')}</div>
            <DateRangeCalendar
              locale={locale}
              hint={calendarHint}
              labels={{
                prev: t('booking.prevMonth'),
                next: t('booking.nextMonth'),
                weekdays: [],
              }}
              blocked={blocked}
              checkIn={checkIn}
              checkOut={checkOut}
              onChange={onRangeChange}
            />
            {saving && <p className={styles.muted}>{t('booking.savingDates')}</p>}

            <div className={styles.fields}>
              <label className="field">
                <span>{t('booking.guests')}</span>
                <select
                  className="select"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                >
                  {Array.from({ length: apt.guests }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t('booking.yourName')}</span>
                <input
                  className={`input ${nameError ? 'inputInvalid' : ''}`}
                  value={guestName}
                  maxLength={PERSON_NAME_MAX}
                  aria-invalid={nameError ? true : undefined}
                  onChange={(e) => {
                    setGuestName(e.target.value);
                    setNameError(null);
                    setError(null);
                  }}
                  onBlur={() => {
                    const r = validatePersonName(guestName);
                    setNameError(r.ok ? null : resolveValidationMessage(locale, r.code));
                  }}
                  placeholder={t('booking.namePlaceholder')}
                />
                {nameError && <span className="fieldError">{nameError}</span>}
              </label>
            </div>

            <label className="field">
              <span>{t('booking.contact')}</span>
              <input
                className={`input ${contactError ? 'inputInvalid' : ''}`}
                type="text"
                inputMode="tel"
                autoComplete="tel"
                value={guestContact}
                aria-invalid={contactError ? true : undefined}
                maxLength={254}
                onChange={(e) => {
                  const v = e.target.value;
                  setGuestContact(v.includes('@') ? v : sanitizePhoneInput(v));
                  setContactError(null);
                  setError(null);
                }}
                onBlur={() => {
                  const r = validatePhoneOrEmail(guestContact);
                  setContactError(r.ok ? null : resolveValidationMessage(locale, r.code));
                }}
                placeholder={t('booking.contactPlaceholder')}
              />
              {contactError && <span className="fieldError">{contactError}</span>}
            </label>

            {rangeReady && (
              <div className={styles.summary}>
                {formatDateRange(checkIn!, checkOut!, locale)} · {nights}{' '}
                {nights === 1 ? t('booking.night') : t('booking.nights')} ·{' '}
                <strong>₪{total}</strong> {t('booking.total')}
              </div>
            )}

            {error && (
              <div className={styles.errorBox}>
                <p className={styles.error}>{error}</p>
                <Button variant="ghost" size="sm" onClick={() => void handleSubmit()} disabled={submitting}>
                  {t('booking.tryAgain')}
                </Button>
              </div>
            )}

            <div className={styles.foot}>
              <Button variant="ghost" onClick={onClose}>
                {t('booking.cancel')}
              </Button>
              <Button
                variant="primary"
                icon="check"
                onClick={() => void handleSubmit()}
                disabled={submitting || !rangeReady}
              >
                {submitting ? t('booking.submitting') : t('booking.submit')}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
