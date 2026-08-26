'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import StarRating from '@/components/ui/StarRating/StarRating';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fetchApartmentReviews, submitReview } from '@/lib/api/client';
import {
  PERSON_NAME_MAX,
  sanitizePhoneInput,
  validatePersonName,
  validatePhone,
} from '@/lib/validation/contact';
import { REVIEW_TEXT_MAX } from '@/lib/validation/review';
import { resolveValidationMessage } from '@/lib/validation/resolveMessage';
import type { Review } from '@/types/review';
import styles from './ReviewsSection.module.scss';

interface ReviewsSectionProps {
  apartmentId: string;
}

const INITIAL_VISIBLE = 5;

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
}

export default function ReviewsSection({ apartmentId }: ReviewsSectionProps) {
  const { locale, t } = useLanguage();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // form state
  const [rating, setRating] = useState(0);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [contact, setContact] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchApartmentReviews(apartmentId)
      .then((list) => {
        if (active) setReviews(list);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apartmentId]);

  const average = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  const visible = expanded ? reviews : reviews.slice(0, INITIAL_VISIBLE);

  const handleSubmit = async () => {
    setError(null);

    if (rating < 1) {
      setError(t('reviews.ratingRequired'));
      return;
    }
    const nameCheck = validatePersonName(name);
    if (!nameCheck.ok) {
      setError(resolveValidationMessage(locale, nameCheck.code));
      return;
    }
    if (text.trim().length > REVIEW_TEXT_MAX) {
      setError(t('reviews.textTooLong'));
      return;
    }
    if (contact.trim()) {
      const contactCheck = validatePhone(contact);
      if (!contactCheck.ok) {
        setError(resolveValidationMessage(locale, contactCheck.code));
        return;
      }
    }

    setSubmitting(true);
    try {
      await submitReview({
        apartmentId,
        guestName: nameCheck.normalized!,
        rating,
        text: text.trim() || undefined,
        contact: contact.trim() || undefined,
        honeypot,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('reviews.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.reviews}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('reviews.sectionTitle')}</h3>
        {reviews.length > 0 && (
          <div className={styles.summary}>
            <StarRating value={average} size={16} />
            <span className={styles.summaryNum}>{average.toFixed(1)}</span>
            <span className={styles.summaryCount}>
              · {reviews.length} {t('reviews.reviewsWord')}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <ul className={styles.list} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className={styles.item}>
              <div className={styles.itemHead}>
                <Skeleton width={120} height={14} />
                <Skeleton width={76} height={12} />
              </div>
              <Skeleton width={88} height={14} />
              <Skeleton height={12} />
              <Skeleton width="68%" height={12} />
            </li>
          ))}
        </ul>
      ) : reviews.length === 0 ? (
        <p className={styles.empty}>{t('reviews.noneYet')}</p>
      ) : (
        <ul className={styles.list}>
          {visible.map((r) => (
            <li key={r.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.itemName}>{r.guestName}</span>
                <span className={styles.itemDate}>{formatDate(r.createdAt, locale)}</span>
              </div>
              <StarRating value={r.rating} size={14} />
              {r.text && <p className={styles.itemText}>{r.text}</p>}
            </li>
          ))}
        </ul>
      )}

      {reviews.length > INITIAL_VISIBLE && (
        <button type="button" className={styles.toggle} onClick={() => setExpanded((v) => !v)}>
          {expanded ? t('reviews.showLess') : t('reviews.showAll')}
        </button>
      )}

      {submitted ? (
        <div className={styles.success}>
          <Icon name="check" size={18} />
          <div>
            <strong>{t('reviews.successTitle')}</strong>
            <p className={styles.muted}>{t('reviews.successDesc')}</p>
          </div>
        </div>
      ) : formOpen ? (
        <div className={styles.form}>
          <label className={styles.ratingField}>
            <span>{t('reviews.yourRating')}</span>
            <StarRating
              value={rating}
              onChange={setRating}
              size={26}
              labelTemplate={t('reviews.starsLabel')}
            />
          </label>

          <label className="field">
            <span>{t('reviews.yourName')}</span>
            <input
              className="input"
              value={name}
              maxLength={PERSON_NAME_MAX}
              placeholder={t('reviews.namePlaceholder')}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
            />
          </label>

          <label className="field">
            <span>{t('reviews.reviewText')}</span>
            <textarea
              className="textarea"
              value={text}
              maxLength={REVIEW_TEXT_MAX}
              placeholder={t('reviews.textPlaceholder')}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
            />
          </label>

          <label className="field">
            <span>{t('reviews.contact')}</span>
            <input
              className="input"
              type="text"
              inputMode="tel"
              value={contact}
              maxLength={254}
              placeholder={t('reviews.contactPlaceholder')}
              onChange={(e) => {
                const v = e.target.value;
                setContact(v.includes('@') ? v : sanitizePhoneInput(v));
                setError(null);
              }}
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

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.formFoot}>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              {t('reviews.cancel')}
            </Button>
            <Button
              variant="primary"
              icon="check"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? t('reviews.submitting') : t('reviews.submit')}
            </Button>
          </div>
        </div>
      ) : (
        <button type="button" className={styles.leaveBtn} onClick={() => setFormOpen(true)}>
          <Icon name="star" size={16} />
          {t('reviews.leaveReview')}
        </button>
      )}
    </section>
  );
}
