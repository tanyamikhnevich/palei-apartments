'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button/Button';
import btnStyles from '@/components/ui/Button/Button.module.scss';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatMoney } from '@/lib/money';
import { bouquetCopy, bouquetCurrency, earliestDelivery, offersWrapping, orderTotal } from '@/lib/flowers';
import { ApiError, submitFlowerOrder } from '@/lib/api/client';
import {
  builderTotal,
  colorLeadDays,
  defaultSelection,
  isBuilder,
  mixRemaining,
  selectionName,
} from '@/lib/roseBuilder';
import RoseBuilderFields from './RoseBuilderFields';
import AddOnSuggestions from './AddOnSuggestions';
import { loadBookingHandoff } from '@/lib/bookingHandoff';
import { useScrollLock } from '@/lib/useScrollLock';
import { clearDeliveryDraft, loadDeliveryDraft, saveDeliveryDraft } from '@/lib/deliveryDraft';
import { primaryCategory } from '@/lib/flowerCategories';
import {
  PERSON_NAME_MAX,
  PHONE_INPUT_MAX_LENGTH,
  sanitizePhoneInput,
  validatePersonName,
  validatePhone,
} from '@/lib/validation/contact';
import { resolveValidationMessage } from '@/lib/validation/resolveMessage';
import {
  DELIVERY_SLOTS,
  type Bouquet,
  type DeliverySlot,
  type RoseSelection,
} from '@/types/flower';
import styles from './FlowersShop.module.scss';

const CARD_MAX = 300;
const COMMENT_MAX = 500;
const ADDRESS_MIN = 5;

interface FlowerOrderFormProps {
  bouquet: Bouquet;
  /** Pre-filled from a booking's check-in day, when there is one. */
  requestedDate?: string | null;
  onClose: () => void;
}

/** The fields that can be wrong, in the order they appear — the first one gets focus. */
type Field = 'mix' | 'date' | 'address' | 'recipient' | 'recipientPhone' | 'name' | 'contact';
const FIELDS: Field[] = ['mix', 'date', 'address', 'recipient', 'recipientPhone', 'name', 'contact'];
type Errors = Partial<Record<Field, string>>;

/** `2026-10-05` → `5.10.2026`, for the "not before" message. */
function readableDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${Number(d)}.${Number(m)}.${y}`;
}

export default function FlowerOrderForm({
  bouquet,
  requestedDate,
  onClose,
}: FlowerOrderFormProps) {
  const { locale, t, href } = useLanguage();
  const router = useRouter();
  const item = bouquet;
  const copy = bouquetCopy(item, locale);

  /*
    An order placed a moment ago, with "add to this delivery" pressed: its
    address, time and people are filled in here, and the note at the top says
    so. Read once, when the form opens — the form is client-only.
  */
  const [draft] = useState(loadDeliveryDraft);
  const previous = draft?.after ?? null;

  /*
    Computed on the client so the picker cannot offer a date the florist has
    already missed — the server checks the same rule again before sending.
  */
  const builder = isBuilder(item) ? item.builder : null;
  const [roses, setRoses] = useState<RoseSelection | null>(() =>
    builder ? defaultSelection(builder) : null
  );

  /*
    A colour that has to be brought in moves the earliest date, so the picker
    cannot offer a day the florist has nothing to cut. The server checks the
    same rule against the same stored card.
  */
  const leadDays = builder && roses ? colorLeadDays(builder, roses.colorId, roses.mix) : 0;
  const earliest = useMemo(
    () => earliestDelivery(item, new Date(), leadDays),
    [item, leadDays]
  );

  /*
    A guest who has just booked a flat gets the form filled from that booking:
    the flat is the address, the arrival day the date, and they are both the
    one ordering and — until they change it — the one receiving. Read once,
    when the form opens; the form is client-only, so storage is there.
  */
  const [handoff] = useState(loadBookingHandoff);
  const wanted = requestedDate ?? draft?.date ?? handoff?.checkIn ?? null;

  /* A requested date only wins if the florist can still make it. */
  const [date, setDate] = useState(wanted && wanted >= earliest ? wanted : earliest);
  const [slot, setSlot] = useState<DeliverySlot>(draft?.slot ?? 'morning');
  const [address, setAddress] = useState(draft?.address ?? handoff?.address ?? '');
  const [recipient, setRecipient] = useState(draft?.recipient ?? handoff?.name ?? '');
  const [recipientPhone, setRecipientPhone] = useState(
    draft?.recipientPhone ?? handoff?.contact ?? ''
  );
  const [card, setCard] = useState('');
  const [comment, setComment] = useState('');
  const [wrapping, setWrapping] = useState(false);
  const [name, setName] = useState(draft?.name ?? handoff?.name ?? '');
  const [contact, setContact] = useState(draft?.contact ?? handoff?.contact ?? '');
  const [honeypot, setHoneypot] = useState('');
  /* The same sum the server will charge — see `orderTotal`. */
  const total =
    builder && roses ? builderTotal(builder, roses) : orderTotal(item, wrapping);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  /** What the server said went wrong — the form's own checks are `errors` below. */
  const [error, setError] = useState<string | null>(null);
  /*
    A field speaks up as soon as it has been left — not while the first letters
    are still going in, which reads as scolding, and not only at the very end,
    which is too late. From then on it follows every keystroke, so a fixed
    field clears itself. Sending shows every remaining problem at once.
  */
  const [tried, setTried] = useState(false);
  const [touched, setTouched] = useState<ReadonlySet<Field>>(() => new Set());
  const touch = (field: Field) =>
    setTouched((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));
  const bodyRef = useRef<HTMLDivElement>(null);

  // The page behind stays put; only the sheet scrolls.
  useScrollLock();

  // Escape closes it, the way every other dialog on the web does.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const personError = (value: string) => {
    const r = validatePersonName(value);
    return r.ok ? undefined : resolveValidationMessage(locale, r.code);
  };
  const phoneError = (value: string) => {
    const r = validatePhone(value);
    return r.ok ? undefined : resolveValidationMessage(locale, r.code);
  };

  const errors: Errors = {
    mix: builder && roses && mixRemaining(builder, roses) !== 0 ? t('flowers.errors.mix') : undefined,
    date:
      !date || date < earliest
        ? t('flowers.errors.date').replace('{date}', readableDate(earliest))
        : undefined,
    address: address.trim().length < ADDRESS_MIN ? t('flowers.errors.address') : undefined,
    recipient: personError(recipient),
    recipientPhone: phoneError(recipientPhone),
    name: personError(name),
    contact: phoneError(contact),
  };
  const firstError = FIELDS.find((f) => errors[f]);
  const complete = !firstError;
  const shown = (field: Field) => (tried || touched.has(field) ? errors[field] : undefined);

  /** Props that mark a field wrong for sighted readers and screen readers alike. */
  const invalid = (field: Field, base: string) => ({
    className: `${base} ${shown(field) ? 'inputInvalid' : ''}`,
    'aria-invalid': shown(field) ? true : undefined,
    'aria-describedby': shown(field) ? `fo-${field}-error` : undefined,
    'data-field': field,
    onBlur: () => touch(field),
  });
  const fieldError = (field: Field) =>
    shown(field) ? (
      <span className="fieldError" id={`fo-${field}-error`} role="alert">
        {shown(field)}
      </span>
    ) : null;

  const handleSubmit = async () => {
    setTried(true);
    if (firstError) {
      // Straight to the first thing to fix, rather than a message at the bottom.
      const target = bodyRef.current?.querySelector<HTMLElement>(`[data-field="${firstError}"]`);
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target?.focus({ preventScroll: true });
      return;
    }
    setError(null);
    setSending(true);
    try {
      await submitFlowerOrder({
        bouquetId: item.id,
        date,
        slot,
        address: address.trim(),
        recipient,
        recipientPhone,
        card: card.trim() || undefined,
        comment: comment.trim() || undefined,
        wrapping,
        roses: roses ?? undefined,
        name,
        contact,
        honeypot,
      });
      // The delivery it was carried for has its second order now.
      if (draft) clearDeliveryDraft();
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

  /*
    "Add to this delivery": the delivery is kept, and the buyer is taken to
    the aisle the suggestion came from — the wine, the balloons — to pick from
    all of it. Whatever they order there opens with the same address, time and
    people already filled in.
  */
  const addToDelivery = (next: Bouquet) => {
    saveDeliveryDraft({
      after: copy.name,
      date,
      slot,
      address: address.trim(),
      recipient,
      recipientPhone,
      name,
      contact,
    });
    onClose();
    router.push(href(`/flowers/${primaryCategory(next)}`));
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={copy.name}>
      <div className={styles.sheet}>
        <div className={styles.sheetHead}>
          <div>
            <h2>{builder && roses ? selectionName(builder, roses) : copy.name}</h2>
            <span>{formatMoney(total, bouquetCurrency(item), locale)}</span>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>

        {sent ? (
          <div className={styles.sheetBody}>
            <div className={styles.sent}>
              <div className={styles.sentIcon}>
                <Icon name="check" size={26} />
              </div>
              <h3>{t('flowers.successTitle')}</h3>
              <p>{t('flowers.successDesc')}</p>
            </div>

            <AddOnSuggestions
              bought={item}
              title={t('flowers.addOn.title')}
              sub={t('flowers.addOn.sub')}
              onAdd={addToDelivery}
            />

            <Button variant="ghost" block onClick={onClose}>
              {t('flowers.backToAll')}
            </Button>
          </div>
        ) : (
          <div className={styles.sheetBody} ref={bodyRef}>
            {previous && (
              <p className={styles.sameDelivery}>
                <Icon name="check" size={15} />
                {t('flowers.addOn.sameDelivery').replace('{item}', previous)}
              </p>
            )}

            {builder && roses && (
              <>
                <div className="eyebrow">{t('flowers.builder.title')}</div>
                <div data-field="mix" tabIndex={-1}>
                  <RoseBuilderFields
                    builder={builder}
                    selection={roses}
                    currency={bouquetCurrency(item)}
                    sameDay={item.sameDay}
                    onChange={setRoses}
                  />
                  {fieldError('mix')}
                </div>
                <div className={styles.total}>
                  <span>{t('flowers.fromTotal')}</span>
                  <b>{formatMoney(total, bouquetCurrency(item), locale)}</b>
                </div>
                <p className={styles.hint}>{t('flowers.builder.priceNote')}</p>
              </>
            )}

            <div className="eyebrow">{t('flowers.orderTitle')}</div>

            <div className={styles.row}>
              <label className="field">
                <span>{t('flowers.date')}</span>
                <input
                  {...invalid('date', 'input')}
                  type="date"
                  value={date}
                  min={earliest}
                  onChange={(e) => {
                    setDate(e.target.value);
                    touch('date');
                  }}
                />
                {fieldError('date')}
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

            {!item.sameDay && <p className={styles.hint}>{t('flowers.cutoff')}</p>}

            <label className="field">
              <span>{t('flowers.address')}</span>
              <input
                {...invalid('address', 'input')}
                value={address}
                maxLength={200}
                autoComplete="street-address"
                placeholder={t('flowers.addressPlaceholder')}
                onChange={(e) => setAddress(e.target.value)}
              />
              {fieldError('address')}
            </label>

            <div className={styles.row}>
              <label className="field">
                <span>{t('flowers.recipient')}</span>
                <input
                  {...invalid('recipient', 'input')}
                  value={recipient}
                  maxLength={PERSON_NAME_MAX}
                  onChange={(e) => setRecipient(e.target.value)}
                />
                {fieldError('recipient')}
              </label>
              <label className="field">
                <span>{t('flowers.recipientPhone')}</span>
                <input
                  {...invalid('recipientPhone', 'input')}
                  inputMode="tel"
                  value={recipientPhone}
                  maxLength={PHONE_INPUT_MAX_LENGTH}
                  placeholder={t('booking.contactPlaceholder')}
                  onChange={(e) => setRecipientPhone(sanitizePhoneInput(e.target.value))}
                />
                {fieldError('recipientPhone')}
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

            {!builder && offersWrapping(item) && (
              <label className={styles.wrapping}>
                <input
                  type="checkbox"
                  checked={wrapping}
                  onChange={(e) => setWrapping(e.target.checked)}
                />
                <span>{t('flowers.wrapping')}</span>
                <b>+{formatMoney(item.wrappingPrice!, bouquetCurrency(item), locale)}</b>
              </label>
            )}

            {!builder && offersWrapping(item) && (
              <div className={styles.total}>
                <span>{t('flowers.total')}</span>
                <b>{formatMoney(total, bouquetCurrency(item), locale)}</b>
              </div>
            )}

            <label className="field">
              <span>{t('flowers.comment')}</span>
              <textarea
                className="textarea"
                value={comment}
                maxLength={COMMENT_MAX}
                placeholder={t('flowers.commentPlaceholder')}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>

            <div className="eyebrow">{t('flowers.yourDetails')}</div>
            <div className={styles.row}>
              <label className="field">
                <span>{t('booking.yourName')}</span>
                <input
                  {...invalid('name', 'input')}
                  value={name}
                  maxLength={PERSON_NAME_MAX}
                  autoComplete="name"
                  onChange={(e) => setName(e.target.value)}
                />
                {fieldError('name')}
              </label>
              <label className="field">
                <span>{t('booking.contact')}</span>
                <input
                  {...invalid('contact', 'input')}
                  inputMode="tel"
                  value={contact}
                  maxLength={PHONE_INPUT_MAX_LENGTH}
                  autoComplete="tel"
                  placeholder={t('booking.contactPlaceholder')}
                  onChange={(e) => setContact(sanitizePhoneInput(e.target.value))}
                />
                {fieldError('contact')}
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

            {/* The summary goes away by itself once the last field is fixed. */}
            {(tried && firstError) || error ? (
              <p className={styles.error} role="alert">
                {tried && firstError ? t('booking.fillRequired') : error}
              </p>
            ) : null}

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
