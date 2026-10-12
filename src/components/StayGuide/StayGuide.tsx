'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useBusiness } from '@/components/BusinessProvider/BusinessProvider';
import PhotoLightbox from '@/components/PhotoGallery/PhotoLightbox';
import Icon from '@/components/ui/Icon/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { isAvifImagePath } from '@/lib/imageUpload';
import { telLink, whatsappLink } from '@/lib/phone';
import type { AccessCodeKind, StayView } from '@/types/guide';
import StayShell from './StayShell';
import styles from './StayGuide.module.scss';

const MINUTE = 60 * 1000;
/** How often an open page asks again, at most — on coming back to the tab. */
const REFRESH_EVERY_MS = 30 * 1000;

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

/** Where the building is, for the two navigation apps guests actually use here. */
function mapLinks(view: StayView): { google: string; waze: string } {
  const hasPoint = typeof view.lat === 'number' && typeof view.lng === 'number';
  const place = hasPoint ? `${view.lat},${view.lng}` : view.address;
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`,
    waze: hasPoint
      ? `https://waze.com/ul?ll=${view.lat},${view.lng}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(view.address)}&navigate=yes`,
  };
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older in-app browsers — the ones chat apps open links in — have no
    // clipboard API, or refuse it. The selection trick still works there.
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const done = document.execCommand('copy');
    area.remove();
    return done;
  }
}

type StayGuideProps = {
  view: StayView;
  /**
   * The guest's own link token — how the page reports back about itself.
   * Absent on the sticker's page, which belongs to the apartment rather than
   * to a stay: nobody to greet, nothing to report, no arrival to confirm.
   */
  token?: string;
};

export default function StayGuide({ view, token }: StayGuideProps) {
  const { t } = useLanguage();
  const business = useBusiness();
  const router = useRouter();

  const open = view.phase === 'open';
  const [copied, setCopied] = useState<string | null>(null);
  const [arrived, setArrived] = useState(view.arrived);
  const [zoomed, setZoomed] = useState<number | null>(null);
  // Time left until the codes appear. Unknown until the page is in a browser:
  // the server's clock and the phone's would not agree on the minute.
  const [left, setLeft] = useState<number | null>(null);
  const reported = useRef(false);
  const lastRefresh = useRef(0);

  const report = useCallback(
    (event: 'opened' | 'arrived') =>
      token &&
      fetch(`/api/stay/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
        keepalive: true,
      }).catch(() => undefined),
    [token]
  );

  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    void report('opened');
  }, [report]);

  const refresh = useCallback(() => {
    if (Date.now() - lastRefresh.current < REFRESH_EVERY_MS) return;
    lastRefresh.current = Date.now();
    router.refresh();
  }, [router]);

  /*
    The page is a live view of a moment that passes: the codes appear at an
    hour, and the owner may change one while the guest is out. So it asks again
    whenever the guest comes back to it, and by itself when the hour arrives.
  */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  useEffect(() => {
    if (view.phase !== 'upcoming') {
      setLeft(null);
      return;
    }
    const tick = () => {
      const remaining = view.revealAt - Date.now();
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) refresh();
    };
    tick();
    const id = window.setInterval(tick, 20 * 1000);
    return () => window.clearInterval(id);
  }, [view.phase, view.revealAt, refresh]);

  const copy = async (key: string, text: string) => {
    if (!(await copyText(text))) return;
    setCopied(key);
    window.setTimeout(() => setCopied((held) => (held === key ? null : held)), 1600);
  };

  const countdown = (ms: number): string => {
    const minutes = Math.max(1, Math.ceil(ms / MINUTE));
    const d = Math.floor(minutes / (60 * 24));
    const h = Math.floor((minutes % (60 * 24)) / 60);
    const m = minutes % 60;
    if (d > 0) return `${d} ${t('stay.units.d')} ${h} ${t('stay.units.h')}`;
    if (h > 0) return `${h} ${t('stay.units.h')} ${m} ${t('stay.units.min')}`;
    return `${m} ${t('stay.units.min')}`;
  };

  const codeFor = (kind: AccessCodeKind) => view.codes.find((c) => c.kind === kind)?.code;
  const kindLabel = (kind: AccessCodeKind) => t(`stay.codeKinds.${kind}`);
  const when = { when: view.revealLabel };

  const maps = mapLinks(view);
  // Every photo in the guide, in order: the full-screen view pages through
  // them all, so a guest can swipe the whole way in without closing it.
  const allPhotos = [...new Set(view.steps.flatMap((step) => step.photos))];

  const helpText = fill(t(token ? 'stay.helpMessage' : 'stay.houseHelpMessage'), {
    name: view.guestName,
    apartment: view.apartmentTitle,
  });
  const chat = whatsappLink(business.whatsappNumber);

  const confirmArrival = () => {
    setArrived(true);
    void report('arrived');
  };

  const stepSection = (stage: 'in' | 'out') => {
    const steps = view.steps.filter((step) => step.stage === stage);
    if (!steps.length) return null;

    return (
      <section className={styles.steps}>
        <h2 className={styles.sectionTitle}>
          {t(stage === 'in' ? 'stay.stepsTitle' : 'stay.leaveTitle')}
        </h2>
        {stage === 'out' && (
          <p className={styles.muted}>
            {t('stay.checkOut')} <b dir="ltr">{view.checkOutTime}</b>
          </p>
        )}
        <ol className={styles.stepList}>
          {steps.map((step, i) => {
            const code = step.codeKind ? codeFor(step.codeKind) : undefined;
            return (
              <li key={step.id} className={styles.step}>
                {step.photos.length > 0 && (
                  <div
                    className={`${styles.stepPhotos} ${
                      step.photos.length > 1 ? styles.stepPhotosMany : ''
                    }`}
                  >
                    {step.photos.map((photo, n) => (
                      <button
                        key={photo}
                        type="button"
                        className={styles.stepPhoto}
                        aria-label={t('stay.viewPhoto')}
                        onClick={() => setZoomed(allPhotos.indexOf(photo))}
                      >
                        <Image
                          src={photo}
                          alt=""
                          fill
                          sizes="(max-width: 600px) 100vw, 560px"
                          className={styles.stepImg}
                          unoptimized={isAvifImagePath(photo)}
                        />
                        <span className={styles.stepZoom}>
                          {step.photos.length > 1 ? (
                            <span dir="ltr">
                              {n + 1} / {step.photos.length}
                            </span>
                          ) : (
                            <Icon name="expand" size={15} />
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <div className={styles.stepBody}>
                  <span className={styles.stepNumber}>{i + 1}</span>
                  <div className={styles.stepText}>
                    {step.text && <p>{step.text}</p>}
                    {step.codeKind &&
                      (code ? (
                        <button
                          type="button"
                          className={styles.stepCode}
                          onClick={() => void copy(`step-${step.id}`, code)}
                        >
                          <span>{kindLabel(step.codeKind)}</span>
                          <b dir="ltr">{code}</b>
                          <Icon name={copied === `step-${step.id}` ? 'check' : 'copy'} size={14} />
                        </button>
                      ) : (
                        !open && (
                          <span className={styles.stepCodeLater}>
                            <Icon name="lock" size={14} />
                            {fill(t('stay.stepCodeLater'), when)}
                          </span>
                        )
                      ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    );
  };

  return (
    <StayShell>
      <section className={styles.hero}>
        {view.guestName && (
          <p className={styles.hello}>{fill(t('stay.hello'), { name: view.guestName })}</p>
        )}
        <h1 className={styles.title}>{view.apartmentTitle}</h1>
        <p className={styles.muted}>{t(token ? 'stay.intro' : 'stay.houseIntro')}</p>

        <dl className={styles.facts}>
          {view.datesLabel && (
            <div>
              <dt>
                <Icon name="calendar" size={15} />
              </dt>
              <dd>{view.datesLabel}</dd>
            </div>
          )}
          <div>
            <dt>{t('stay.checkIn')}</dt>
            <dd dir="ltr">{view.checkInTime}</dd>
          </div>
          <div>
            <dt>{t('stay.checkOut')}</dt>
            <dd dir="ltr">{view.checkOutTime}</dd>
          </div>
        </dl>
      </section>

      {view.address && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            <Icon name="pin" size={17} />
            {t('stay.addressTitle')}
          </h2>
          <button
            type="button"
            className={styles.address}
            onClick={() => void copy('address', view.address)}
          >
            <span>{view.address}</span>
            <span className={styles.copyHint}>
              <Icon name={copied === 'address' ? 'check' : 'copy'} size={15} />
              {t(copied === 'address' ? 'stay.copied' : 'stay.copy')}
            </span>
          </button>
          <div className={styles.actions}>
            <a className={styles.action} href={maps.google} target="_blank" rel="noopener noreferrer">
              <Icon name="pin" size={16} />
              {t('stay.openMaps')}
            </a>
            <a className={styles.action} href={maps.waze} target="_blank" rel="noopener noreferrer">
              <Icon name="car" size={16} />
              {t('stay.openWaze')}
            </a>
          </div>
        </section>
      )}

      {view.codeKinds.length > 0 && (
        <section className={`${styles.card} ${open ? styles.cardOpen : styles.cardLocked}`}>
          <h2 className={styles.cardTitle}>
            <Icon name={open ? 'key' : 'lock'} size={17} />
            {t('stay.codesTitle')}
          </h2>

          {open ? (
            <>
              <div className={styles.codes}>
                {view.codes.map(({ kind, code }) => (
                  <button
                    key={kind}
                    type="button"
                    className={styles.code}
                    onClick={() => void copy(`code-${kind}`, code)}
                  >
                    <span className={styles.codeLabel}>{kindLabel(kind)}</span>
                    <span className={styles.codeValue} dir="ltr">
                      {code}
                    </span>
                    <span className={styles.copyHint}>
                      <Icon name={copied === `code-${kind}` ? 'check' : 'copy'} size={14} />
                      {t(copied === `code-${kind}` ? 'stay.copied' : 'stay.copy')}
                    </span>
                  </button>
                ))}
              </div>
              <p className={styles.hint}>{t('stay.tapToCopy')}</p>
            </>
          ) : (
            <>
              <p className={styles.lockedText}>{fill(t('stay.codesLocked'), when)}</p>
              {left !== null && left > 0 && (
                <p className={styles.countdown}>
                  {t('stay.opensIn')} <b>{countdown(left)}</b>
                </p>
              )}
              <p className={styles.hint}>{t('stay.codesLockedHint')}</p>
            </>
          )}
        </section>
      )}

      {/* On the day of departure the way out is what the guest came here for. */}
      {view.leavingToday && stepSection('out')}
      {stepSection('in')}
      {!view.leavingToday && stepSection('out')}

      {view.hasWifi && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            <Icon name="wifi" size={17} />
            {t('stay.wifiTitle')}
          </h2>
          {view.wifi ? (
            <dl className={styles.wifi}>
              {view.wifi.name && (
                <div>
                  <dt>{t('stay.wifiName')}</dt>
                  <dd dir="ltr">{view.wifi.name}</dd>
                </div>
              )}
              {view.wifi.password && (
                <div>
                  <dt>{t('stay.wifiPassword')}</dt>
                  <dd>
                    <button
                      type="button"
                      className={styles.wifiPassword}
                      onClick={() => void copy('wifi', view.wifi?.password ?? '')}
                    >
                      <span dir="ltr">{view.wifi.password}</span>
                      <Icon name={copied === 'wifi' ? 'check' : 'copy'} size={15} />
                    </button>
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className={styles.hint}>{t('stay.wifiLocked')}</p>
          )}
        </section>
      )}

      {view.notes && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            <Icon name="sparkle" size={17} />
            {t('stay.notesTitle')}
          </h2>
          <p className={styles.notes}>{view.notes}</p>
        </section>
      )}

      {open && token && (
        <section className={`${styles.card} ${styles.arrival}`}>
          {arrived ? (
            <p className={styles.arrivedDone}>
              <Icon name="check" size={18} />
              {t('stay.arrivedDone')}
            </p>
          ) : (
            <>
              <button type="button" className={styles.arrivedButton} onClick={confirmArrival}>
                <Icon name="check" size={18} />
                {t('stay.arrivedButton')}
              </button>
              <p className={styles.hint}>{t('stay.arrivedHint')}</p>
            </>
          )}
        </section>
      )}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{t('stay.helpTitle')}</h2>
        <p className={styles.muted}>{t('stay.helpText')}</p>
        <div className={styles.actions}>
          {chat && (
            <a
              className={`${styles.action} ${styles.actionMain}`}
              href={`${chat}?text=${encodeURIComponent(helpText)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="mail" size={16} />
              {t('stay.whatsapp')}
            </a>
          )}
          {business.contactPhone && (
            <a className={styles.action} href={telLink(business.contactPhone)}>
              <Icon name="phone" size={16} />
              {t('stay.call')}
            </a>
          )}
        </div>
      </section>

      {zoomed !== null && zoomed >= 0 && (
        <PhotoLightbox
          photos={allPhotos}
          alt={t('stay.stepsTitle')}
          startIndex={zoomed}
          onClose={() => setZoomed(null)}
        />
      )}
    </StayShell>
  );
}
