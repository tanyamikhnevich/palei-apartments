'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Apartment } from '@/types/apartment';
import FormattedDescription from '@/components/FormattedDescription/FormattedDescription';
import PhotoGallery from '@/components/PhotoGallery/PhotoGallery';
import Button from '@/components/ui/Button/Button';
import btnStyles from '@/components/ui/Button/Button.module.scss';
import Icon from '@/components/ui/Icon/Icon';
import SpecStat from '@/components/ui/SpecStat/SpecStat';
import DateRangeCalendar from '@/components/DateRangeCalendar/DateRangeCalendar';
import ReviewsSection from '@/components/ReviewsSection/ReviewsSection';
import BookingUpsell from '@/components/BookingUpsell/BookingUpsell';
import { useLanguage } from '@/i18n/LanguageProvider';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { formatDateRange, nightsBetween } from '@/lib/dates';
import { scrollToHash } from '@/lib/scrollToHash';
import {
  fetchBookingAvailability,
  saveBookingDraft,
  submitBookingRequest,
} from '@/lib/api/client';
import {
  PERSON_NAME_MAX,
  PHONE_INPUT_MAX_LENGTH,
  sanitizePhoneInput,
  validatePersonName,
  validatePhone,
} from '@/lib/validation/contact';
import { resolveValidationMessage } from '@/lib/validation/resolveMessage';
import { formatApartmentTags, getApartmentPhotos } from '@/lib/apartmentMedia';
import {
  hasPriceTiers,
  optionalServices,
  priceFrom,
  priceTiers,
  quoteStay,
  SERVICE_UNIT_KEYS,
} from '@/lib/pricing';
import styles from './ApartmentDetail.module.scss';
import { formatMoney } from '@/lib/money';
import { countryOf, currencyOf } from '@/lib/regions';

/** Leaflet touches `window` on import, so the mini map is client-only. */
const ApartmentMiniMap = dynamic(
  () => import('@/components/ApartmentMiniMap/ApartmentMiniMap'),
  { ssr: false }
);

interface ApartmentDetailProps {
  apt: Apartment;
}

export default function ApartmentDetail({ apt }: ApartmentDetailProps) {
  const { locale, t } = useLanguage();
  const copy = getApartmentCopy(apt, locale);
  const photos = useMemo(() => getApartmentPhotos(apt), [apt.photos]);
  const minNights = apt.minNights ?? 1;
  const tagLine = formatApartmentTags(apt, locale, t);

  const [bookingId] = useState(
    () => `web-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );
  const [blocked, setBlocked] = useState<{ checkIn: string; checkOut: string }[]>([]);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [guests, setGuests] = useState(Math.min(2, apt.guests));
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [showFormErrors, setShowFormErrors] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [descClipped, setDescClipped] = useState(false);
  const descRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBookingAvailability(apt.id).then(setBlocked).catch(() => setBlocked([]));
  }, [apt.id]);

  /*
    Only offer "show more" when the clamp actually cuts something off — a short
    description should not grow a button that does nothing. Measured rather than
    guessed from the character count, since the cut-off depends on the column
    width and the font. Once expanded there is nothing left to measure, so the
    effect steps aside and the flag keeps its value.
  */
  useEffect(() => {
    if (descOpen) return;
    const el = descRef.current?.firstElementChild as HTMLElement | null;
    if (!el) return;

    const check = () => setDescClipped(el.scrollHeight - el.clientHeight > 4);
    check();
    // Web fonts land after first paint and change where the lines break.
    void document.fonts?.ready.then(check);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [copy.description, descOpen]);

  const nights =
    checkIn && checkOut && checkOut > checkIn ? nightsBetween(checkIn, checkOut) : 0;
  const rangeReady = Boolean(checkIn && checkOut && checkOut > checkIn);
  const nightsValid = rangeReady && nights >= minNights;
  const nameValid = validatePersonName(guestName).ok;
  const contactValid = validatePhone(guestContact).ok;
  const formComplete = nightsValid && nameValid && contactValid;

  const calendarHint = useMemo(() => {
    if (dateError) return dateError;
    if (checkIn && checkOut && checkOut > checkIn) {
      return t('booking.rangeSelected').replace(
        '{range}',
        formatDateRange(checkIn, checkOut, locale)
      );
    }
    if (checkIn && !checkOut) return t('booking.selectCheckOut');
    return t('booking.selectCheckIn');
  }, [checkIn, checkOut, dateError, locale, t]);

  const persistDraft = useCallback(
    async (inDate: string, outDate: string) => {
      if (outDate <= inDate) return;
      if (nightsBetween(inDate, outDate) < minNights) return;
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
    [apt.id, bookingId, copy.title, guestContact, guestName, guests, locale, minNights, t]
  );

  const validateDates = (): boolean => {
    if (!rangeReady) {
      setDateError(t('booking.pickDates'));
      return false;
    }
    if (nights < minNights) {
      setDateError(
        t('booking.minNightsError')
          .replace('{min}', String(minNights))
          .replace('{nights}', String(nights))
      );
      return false;
    }
    setDateError(null);
    return true;
  };

  const onRangeChange = (range: { checkIn: string; checkOut: string | null }) => {
    setCheckIn(range.checkIn);
    setCheckOut(range.checkOut);
    setError(null);

    if (range.checkOut && range.checkOut > range.checkIn) {
      const n = nightsBetween(range.checkIn, range.checkOut);
      if (n < minNights) {
        setDateError(
          t('booking.minNightsError')
            .replace('{min}', String(minNights))
            .replace('{nights}', String(n))
        );
        return;
      }
      setDateError(null);
      void persistDraft(range.checkIn, range.checkOut);
    } else {
      setDateError(null);
    }
  };

  const validateGuestFields = (): { guest: string; contact: string } | null => {
    const nameResult = validatePersonName(guestName);
    if (!nameResult.ok) {
      setNameError(resolveValidationMessage(locale, nameResult.code));
      return null;
    }
    setNameError(null);

    const contactResult = validatePhone(guestContact);
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
    setShowFormErrors(true);
    setError(null);

    const datesOk = validateDates();
    const guestFields = validateGuestFields();

    if (!datesOk || !guestFields) {
      setError(t('booking.fillRequired'));
      return;
    }

    setSubmitting(true);
    try {
      await submitBookingRequest({
        id: bookingId,
        apartmentId: apt.id,
        apt: copy.title,
        guest: guestFields.guest,
        guestContact: guestFields.contact,
        checkIn: checkIn!,
        checkOut: checkOut!,
        dates: formatDateRange(checkIn!, checkOut!, locale),
        guests,
        status: 'New request',
        channel: 'Website',
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('booking.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const quote = quoteStay(apt, nights, guests, selectedServices);
  const total = quote.total;

  /** Every price on this page is in the currency of the apartment's region. */
  const money = (amount: number) => formatMoney(amount, currencyOf(apt), locale);

  /* Back to the listing this apartment actually belongs to. */
  const listingHref = countryOf(apt) === 'CY' ? '/cyprus' : '/apartments';


  /**
   * Phone error message for the current locale.
   * While typing (`live`), we skip the "required / too short" nags and only
   * flag hard problems (too long, wrong format) so the field validates as you go.
   */
  const contactMessage = (raw: string, live: boolean): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return live ? null : resolveValidationMessage(locale, 'phoneRequired');
    const r = validatePhone(trimmed);
    if (r.ok) return null;
    if (live && r.code === 'phoneTooShort') return null;
    return resolveValidationMessage(locale, r.code);
  };

  return (
    <div className={`wrap ${styles.page}`}>
      <Link href={listingHref} className={styles.back}>
        <Icon name="arrow" size={16} className={styles.backIcon} />
        {t('apartments.backToAll')}
      </Link>

      <header className={styles.head}>
        <div className={styles.headMain}>
          <h1 className={styles.title}>{copy.title}</h1>
          <div className={styles.meta}>
            <span className={styles.loc}>
              <Icon name="pin" size={15} />
              {copy.location}
            </span>
            {apt.reviews > 0 ? (
              <span className={styles.metaItem}>
                <Icon name="star" size={15} />
                {apt.rating.toFixed(1)} · {apt.reviews} {t('booking.reviews')}
              </span>
            ) : (
              <span className={styles.metaItem}>{t('reviews.newBadge')}</span>
            )}
            {tagLine && <span className={styles.metaItem}>{tagLine}</span>}
          </div>
        </div>
        <div className={styles.priceBox}>
          {hasPriceTiers(apt) && <span>{t('apartments.from')} </span>}
          <b>{money(priceFrom(apt))}</b> <span>{t('apartments.perNight')}</span>
        </div>
      </header>

      <PhotoGallery
        photos={photos}
        alt={copy.title}
        className={styles.gallery}
        sizes="(max-width: 900px) 100vw, 900px"
        autoPlayMs={7000}
      />

      <div className={styles.layout}>
        <section className={styles.about}>
          <div className={styles.specs}>
            <SpecStat icon="guest" value={apt.guests} label={t('apartments.guests')} />
            <SpecStat
              icon="home"
              value={apt.bedrooms}
              label={apt.bedrooms === 1 ? t('apartments.bedroom') : t('apartments.bedrooms')}
            />
            <SpecStat
              icon="bed"
              value={apt.beds}
              label={apt.beds === 1 ? t('apartments.bed') : t('apartments.beds')}
            />
            <SpecStat
              icon="bath"
              value={apt.bathrooms}
              label={apt.bathrooms === 1 ? t('apartments.bath') : t('apartments.baths')}
            />
          </div>

          <div className={styles.descBlock}>
            <div
              className={`${styles.desc} ${descOpen ? '' : styles.descClamped}`}
              ref={descRef}
            >
              <FormattedDescription text={copy.description} />
            </div>
            {descClipped && (
              <button
                type="button"
                className={styles.descToggle}
                onClick={() => setDescOpen((o) => !o)}
                aria-expanded={descOpen}
              >
                {descOpen ? t('apartments.showLess') : t('apartments.showMore')}
                <Icon
                  name="chevron"
                  size={15}
                  className={`${styles.descChevron} ${descOpen ? styles.descChevronUp : ''}`}
                />
              </button>
            )}
          </div>
        </section>

        {/* `#book` is where the floating booking CTA lands. */}
        <aside className={styles.bookingCol} id="book">
          <section className={styles.booking}>
            {submitted ? (
              <div className={styles.success}>
                <div className={styles.successIcon}>
                  <Icon name="check" size={22} />
                </div>
                <h2 className={styles.successTitle}>{t('booking.successTitle')}</h2>
                <p className={styles.successDesc}>{t('booking.successDesc')}</p>
                <Button variant="ghost" as="a" href={listingHref} iconRight="arrow">
                  {t('apartments.backToAll')}
                </Button>

                {/*
                  Only for Israel — that is where the fleet and the shop are, and
                  offering a Cyprus guest a car from Bat Yam would be a broken
                  promise dressed as a service.
                */}
                {countryOf(apt) === 'IL' && (
                  <BookingUpsell checkIn={checkIn} checkOut={checkOut} />
                )}
              </div>
            ) : (
              <>
                <div className="eyebrow">{t('booking.datesTitle')}</div>
                {minNights > 1 && (
                  <p className={styles.minStay}>
                    {t('booking.minStayHint').replace('{min}', String(minNights))}
                  </p>
                )}
                <DateRangeCalendar
                  locale={locale}
                  hint={calendarHint}
                  blocked={blocked}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onChange={onRangeChange}
                />
                {saving && <p className={styles.muted}>{t('booking.savingDates')}</p>}

                {hasPriceTiers(apt) && (
                  <div className={styles.rates}>
                    <div className={styles.ratesTitle}>{t('booking.rates')}</div>
                    {priceTiers(apt).map((tier) => (
                      <div
                        key={tier.minNights}
                        className={`${styles.rateRow} ${
                          tier.price === quote.rate && nights > 0 ? styles.rateOn : ''
                        }`}
                      >
                        <span>
                          {tier.minNights === 1
                            ? t('booking.rateFrom').replace('{nights}', '1')
                            : t('booking.rateFrom').replace('{nights}', String(tier.minNights))}
                        </span>
                        <span>
                          {money(tier.price)} {t('apartments.perNight')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {optionalServices(apt).length > 0 && (
                  <div className={styles.extras}>
                    <div className={styles.ratesTitle}>{t('booking.extras')}</div>
                    {optionalServices(apt).map((service) => (
                      <label key={service.id} className={styles.extraRow}>
                        <input
                          type="checkbox"
                          checked={selectedServices.includes(service.id)}
                          onChange={(e) =>
                            setSelectedServices((prev) =>
                              e.target.checked
                                ? [...prev, service.id]
                                : prev.filter((id) => id !== service.id)
                            )
                          }
                        />
                        <span className={styles.extraName}>{service.name}</span>
                        <span className={styles.extraPrice}>
                          {money(service.price)} {t(SERVICE_UNIT_KEYS[service.unit])}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

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
                      className={`input ${nameError || (showFormErrors && !nameValid) ? 'inputInvalid' : ''}`}
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
                    className={`input ${contactError || (showFormErrors && !contactValid) ? 'inputInvalid' : ''}`}
                    type="text"
                    inputMode="tel"
                    autoComplete="tel"
                    value={guestContact}
                    aria-invalid={contactError ? true : undefined}
                    maxLength={PHONE_INPUT_MAX_LENGTH}
                    onChange={(e) => {
                      const next = sanitizePhoneInput(e.target.value);
                      setGuestContact(next);
                      setContactError(contactMessage(next, true));
                      setError(null);
                    }}
                    onBlur={() => setContactError(contactMessage(guestContact, false))}
                    placeholder={t('booking.contactPlaceholder')}
                  />
                  {contactError && <span className="fieldError">{contactError}</span>}
                </label>

                {nightsValid && (
                  <div className={styles.summary}>
                    <div className={styles.summaryDates}>
                      {formatDateRange(checkIn!, checkOut!, locale)}
                    </div>
                    <div className={styles.summaryRow}>
                      <span>
                        {t('booking.nightsLine')
                          .replace('{nights}', String(nights))
                          .replace('{price}', money(quote.rate))}
                      </span>
                      <span>{money(quote.nightsTotal)}</span>
                    </div>
                    {quote.charges.map(({ service, amount }) => (
                      <div className={styles.summaryRow} key={service.id}>
                        <span>
                          {service.name}
                          {service.required && ` · ${t('booking.extraRequired')}`}
                        </span>
                        <span>{money(amount)}</span>
                      </div>
                    ))}
                    <div className={styles.summaryTotal}>
                      <span>{t('booking.total')}</span>
                      <strong>{money(total)}</strong>
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
                  className={!formComplete && !submitting ? btnStyles.inactive : ''}
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                >
                  {submitting ? t('booking.submitting') : t('booking.submit')}
                </Button>
              </>
            )}
          </section>
        </aside>

        {/*
          The map and the reviews follow the booking panel in the DOM, so that
          on a phone — where the columns stack — the calendar comes first and
          the map sits right after it. On desktop the grid puts both back in
          the left column, under the description.
        */}
        <section className={styles.mapCol}>
          <ApartmentMiniMap apt={apt} />
        </section>

        <section className={styles.reviewsCol}>
          <ReviewsSection apartmentId={apt.id} />
        </section>
      </div>

      {/*
        Phones only: the booking panel is a long scroll away once the columns
        stack, so the price and the way into it stay pinned to the bottom. It
        shows the live quote as soon as dates are picked, and disappears once
        the request is in — there is nothing left to reserve.
      */}
      {!submitted && (
        <div className={styles.reserveBar}>
          <div className={styles.reservePrice}>
            {nightsValid ? (
              <>
                <span className={styles.reserveAmount}>{money(total)}</span>
                <span className={styles.reserveNote}>
                  {t('booking.total')} · {formatDateRange(checkIn!, checkOut!, locale)}
                </span>
              </>
            ) : (
              <>
                {hasPriceTiers(apt) && (
                  <span className={styles.reserveFrom}>{t('apartments.from')}</span>
                )}
                <span className={styles.reserveAmount}>{money(priceFrom(apt))}</span>
                <span className={styles.reserveNote}>{t('apartments.perNight')}</span>
              </>
            )}
          </div>
          <Button
            variant="primary"
            as="a"
            href="#book"
            className={styles.reserveBtn}
            onClick={(e) => scrollToHash(e, '#book')}
          >
            {t('booking.reserve')}
          </Button>
        </div>
      )}
    </div>
  );
}
