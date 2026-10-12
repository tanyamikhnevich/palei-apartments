'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import type { Apartment } from '@/types/apartment';
import {
  ACCESS_CODE_KINDS,
  MAX_STEP_PHOTOS,
  type AccessCode,
  type AccessCodeKind,
  type CheckInGuide,
  type GuestPass,
  type GuideStage,
  type GuideStep,
  type LocalizedText,
} from '@/types/guide';
import Button from '@/components/ui/Button/Button';
import Icon from '@/components/ui/Icon/Icon';
import { AdminField, AdminInput, blurOnWheel } from '@/components/admin/ui/AdminField';
import shell from '@/components/admin/AdminApartmentModal/AdminApartmentModal.module.scss';
import { getApartmentCopy } from '@/i18n/apartmentLocale';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/types';
import {
  createGuestPass,
  fetchGuestPasses,
  fetchGuide,
  revokeGuestPass,
  saveGuide,
  uploadApartmentPhotos,
} from '@/lib/api/client';
import { formatDateRange, todayISO } from '@/lib/dates';
import { nowInZone, timeZoneForArea } from '@/lib/guide/time';
import { codesInForce } from '@/lib/guide/window';
import { IMAGE_UPLOAD_ACCEPT } from '@/lib/imageUpload';
import { prepareImageForUpload } from '@/lib/prepareImageForUpload';
import GuestLinkBox from './GuestLinkBox';
import styles from './AdminGuideModal.module.scss';

const KIND_LABELS: Record<AccessCodeKind, string> = {
  building: 'Building entrance',
  lockbox: 'Key lockbox',
  door: 'Apartment door',
};

const localId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function passStatus(pass: GuestPass): { text: string; tone: 'off' | 'ok' | 'seen' | 'idle' } {
  if (pass.revokedAt) return { text: 'Revoked', tone: 'off' };
  if (pass.checkOut < todayISO()) return { text: 'Stay ended', tone: 'off' };
  if (pass.arrivedAt) return { text: 'Checked in', tone: 'ok' };
  if (pass.openCount > 0) return { text: `Opened ×${pass.openCount}`, tone: 'seen' };
  return { text: 'Not opened yet', tone: 'idle' };
}

const STAGES: { stage: GuideStage; title: string; hint: string }[] = [
  {
    stage: 'in',
    title: 'On the way in',
    hint: 'One step per place: the street entrance, the building door, the lockbox, the flat.',
  },
  {
    stage: 'out',
    title: 'When leaving',
    hint: 'Where the key goes back, what to switch off, where the rubbish goes. Moves to the top of the guest’s page on the day they leave.',
  },
];

const stageOf = (step: GuideStep): GuideStage => step.stage ?? 'in';

interface AdminGuideModalProps {
  apartment: Apartment;
  /** Every apartment, so a finished guide can be copied to its neighbour. */
  apartments: Apartment[];
  onClose: () => void;
}

/**
 * How guests get into one apartment: the address, the codes, the steps with
 * their photos — and the personal links that show all of it to a guest.
 *
 * The guide is saved with the button at the bottom. Guest links are not part
 * of that: making or revoking one happens the moment it is clicked.
 */
export default function AdminGuideModal({ apartment, apartments, onClose }: AdminGuideModalProps) {
  const title = getApartmentCopy(apartment, 'en').title;
  const timeZone = timeZoneForArea(apartment.area);

  const [guide, setGuide] = useState<CheckInGuide | null>(null);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [passes, setPasses] = useState<GuestPass[]>([]);
  const [lang, setLang] = useState<Locale>('en');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingStep, setUploadingStep] = useState<string | null>(null);
  const [newPass, setNewPass] = useState({ guestName: '', guestContact: '', checkIn: '', checkOut: '' });
  const [passError, setPassError] = useState<string | null>(null);
  const [passBusy, setPassBusy] = useState(false);
  /** The photo being dragged, and the slot it is hovering over. */
  const [drag, setDrag] = useState<{ stepId: string; photo: string } | null>(null);
  const [dropSlot, setDropSlot] = useState<{ stepId: string; index: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileStep = useRef<string | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([fetchGuide(apartment.id), fetchGuestPasses(apartment.id)])
      .then(([bundle, list]) => {
        if (!live) return;
        setGuide(bundle.guide);
        setCodes(bundle.codes);
        setPasses(list);
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Could not load the guide'));
    return () => {
      live = false;
    };
  }, [apartment.id]);

  /** Which codes guests would be shown this minute. */
  const inForce = useMemo(
    () => new Set(codesInForce(codes, timeZone).map((c) => c.id)),
    [codes, timeZone]
  );

  const patch = (fields: Partial<CheckInGuide>) => {
    setSaved(false);
    setGuide((prev) => (prev ? { ...prev, ...fields } : prev));
  };

  const patchSteps = (change: (steps: GuideStep[]) => GuideStep[]) => {
    setSaved(false);
    setGuide((prev) => (prev ? { ...prev, steps: change(prev.steps) } : prev));
  };

  const patchStep = (id: string, fields: Partial<GuideStep>) =>
    patchSteps((steps) => steps.map((s) => (s.id === id ? { ...s, ...fields } : s)));

  /** Swaps a step with its neighbour in the same part of the stay. */
  const moveStep = (id: string, by: -1 | 1) =>
    patchSteps((steps) => {
      const from = steps.findIndex((s) => s.id === id);
      if (from < 0) return steps;
      const peers = steps.flatMap((s, i) => (stageOf(s) === stageOf(steps[from]) ? [i] : []));
      const to = peers[peers.indexOf(from) + by];
      if (to === undefined) return steps;
      const next = [...steps];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });

  const patchCode = (id: string, fields: Partial<AccessCode>) => {
    setSaved(false);
    setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)));
  };

  const withText = (text: LocalizedText, value: string): LocalizedText => ({ ...text, [lang]: value });

  const pickPhoto = (stepId: string) => {
    fileStep.current = stepId;
    fileRef.current?.click();
  };

  const uploadPhotos = async (fileList: FileList | null) => {
    const stepId = fileStep.current;
    const files = Array.from(fileList ?? []);
    if (!files.length || !stepId) return;
    setUploadingStep(stepId);
    setError(null);

    // One request per photo, as the apartment photos do: each stays under the
    // host's body limit, and one bad file does not lose the ones already up.
    const failed: string[] = [];
    try {
      for (const file of files) {
        try {
          const prepared = await prepareImageForUpload(file);
          const { urls } = await uploadApartmentPhotos([prepared]);
          patchSteps((steps) =>
            steps.map((s) =>
              s.id === stepId
                ? { ...s, photos: [...(s.photos ?? []), ...urls].slice(0, MAX_STEP_PHOTOS) }
                : s
            )
          );
        } catch (e) {
          failed.push(`${file.name}: ${e instanceof Error ? e.message : 'upload failed'}`);
        }
      }
      if (failed.length) setError(failed.join('\n'));
    } finally {
      setUploadingStep(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /**
   * Puts the dragged photo at `index` of a step — its own, to reorder, or
   * another one's, when a picture was uploaded to the wrong step.
   */
  const dropPhoto = (stepId: string, index: number) => {
    const moving = drag;
    setDrag(null);
    setDropSlot(null);
    if (!moving) return;

    patchSteps((steps) => {
      const target = steps.find((s) => s.id === stepId);
      if (!target) return steps;
      const landing = (target.photos ?? []).filter((p) => p !== moving.photo);
      // Full already, and the photo is coming from elsewhere: leave it where it is.
      if (moving.stepId !== stepId && landing.length >= MAX_STEP_PHOTOS) return steps;
      landing.splice(Math.min(index, landing.length), 0, moving.photo);

      return steps.map((s) => {
        if (s.id === stepId) return { ...s, photos: landing };
        if (s.id === moving.stepId) {
          return { ...s, photos: (s.photos ?? []).filter((p) => p !== moving.photo) };
        }
        return s;
      });
    });
  };

  /** Starts this guide from another apartment's — the same building, usually. */
  const copyFrom = async (otherId: string) => {
    if (!otherId || !guide) return;
    const other = apartments.find((a) => a.id === otherId);
    const name = other ? getApartmentCopy(other, 'en').title : otherId;
    if (guide.steps.length && !confirm(`Replace the steps here with the ones from “${name}”?`)) return;

    setError(null);
    try {
      const { guide: source } = await fetchGuide(otherId);
      if (!source.steps.length) return setError(`“${name}” has no steps to copy yet.`);
      patch({
        steps: source.steps.map((step) => ({ ...step, id: localId('step') })),
        notes: source.notes,
        checkInTime: source.checkInTime,
        checkOutTime: source.checkOutTime,
        revealHours: source.revealHours,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not copy the guide');
    }
  };

  const save = async () => {
    if (!guide) return;
    setSaving(true);
    setError(null);
    try {
      const bundle = await saveGuide({ guide, codes });
      setGuide(bundle.guide);
      setCodes(bundle.codes);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the guide');
    } finally {
      setSaving(false);
    }
  };

  const addPass = async () => {
    setPassBusy(true);
    setPassError(null);
    try {
      const pass = await createGuestPass({
        apartmentId: apartment.id,
        guestName: newPass.guestName,
        guestContact: newPass.guestContact || undefined,
        checkIn: newPass.checkIn,
        checkOut: newPass.checkOut,
      });
      setPasses((prev) => [pass, ...prev]);
      setNewPass({ guestName: '', guestContact: '', checkIn: '', checkOut: '' });
    } catch (e) {
      setPassError(e instanceof Error ? e.message : 'Could not create the link');
    } finally {
      setPassBusy(false);
    }
  };

  const revoke = async (pass: GuestPass) => {
    if (!confirm(`Revoke the link for ${pass.guestName}? It stops working at once.`)) return;
    try {
      await revokeGuestPass(pass.id);
      setPasses((prev) =>
        prev.map((p) => (p.id === pass.id ? { ...p, revokedAt: new Date().toISOString() } : p))
      );
    } catch (e) {
      setPassError(e instanceof Error ? e.message : 'Could not revoke the link');
    }
  };

  return (
    <div
      className={shell.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={shell.modal}>
        <div className={shell.head}>
          <div>
            <h3>Check-in guide</h3>
            <p>{title} — what a guest sees on their personal link.</p>
          </div>
          <button type="button" className={shell.close} onClick={onClose} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className={shell.body}>
          {error && <p className={styles.error}>{error}</p>}
          {!guide && !error && <p className={styles.hint}>Loading…</p>}

          {guide && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept={IMAGE_UPLOAD_ACCEPT}
                multiple
                hidden
                onChange={(e) => void uploadPhotos(e.target.files)}
              />

              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Arrival</h4>
                <AdminInput
                  label="Exact address (house, entrance, floor, flat)"
                  placeholder={getApartmentCopy(apartment, 'en').location}
                  value={guide.address}
                  onChange={(e) => patch({ address: e.target.value })}
                />
                <p className={styles.hint}>
                  Shown only on guest links, never on the public site. Left empty, the listing’s
                  own address is used.
                </p>
                <div className={styles.grid3}>
                  <AdminInput
                    label="Check-in from"
                    type="time"
                    value={guide.checkInTime}
                    onChange={(e) => patch({ checkInTime: e.target.value })}
                  />
                  <AdminInput
                    label="Check-out by"
                    type="time"
                    value={guide.checkOutTime}
                    onChange={(e) => patch({ checkOutTime: e.target.value })}
                  />
                  <AdminField label="Show codes, hours before">
                    <input
                      className="input"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={72}
                      step={1}
                      onWheel={blurOnWheel}
                      value={guide.revealHours}
                      onChange={(e) =>
                        patch({ revealHours: Math.max(0, parseInt(e.target.value || '0', 10)) })
                      }
                    />
                  </AdminField>
                </div>
                <p className={styles.hint}>
                  Codes and the Wi-Fi password appear on a guest’s page this many hours before
                  their check-in and disappear an hour after check-out. Times are {timeZone} time.
                </p>
              </section>

              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Access codes</h4>
                <p className={styles.hint}>
                  Guests see the newest code whose start time has passed. To change a code, add a
                  new row with the moment of the change rather than editing the old one — the
                  guest who is still inside keeps theirs until then.
                </p>
                {codes.map((code) => (
                  <div key={code.id} className={styles.codeRow}>
                    <select
                      className="select"
                      aria-label="What the code opens"
                      value={code.kind}
                      onChange={(e) => patchCode(code.id, { kind: e.target.value as AccessCodeKind })}
                    >
                      {ACCESS_CODE_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {KIND_LABELS[kind]}
                        </option>
                      ))}
                    </select>
                    <input
                      className={`input ${styles.codeInput}`}
                      aria-label="Code"
                      placeholder="4821"
                      value={code.code}
                      onChange={(e) => patchCode(code.id, { code: e.target.value })}
                    />
                    <input
                      className="input"
                      type="datetime-local"
                      aria-label="In force from"
                      value={code.validFrom}
                      onChange={(e) => patchCode(code.id, { validFrom: e.target.value.slice(0, 16) })}
                    />
                    <span className={inForce.has(code.id) ? styles.badgeOn : styles.badge}>
                      {inForce.has(code.id)
                        ? 'In force'
                        : code.validFrom > nowInZone(timeZone)
                          ? 'Scheduled'
                          : 'Replaced'}
                    </span>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label="Remove code"
                      onClick={() => {
                        setSaved(false);
                        setCodes((prev) => prev.filter((c) => c.id !== code.id));
                      }}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() => {
                    setSaved(false);
                    setCodes((prev) => [
                      { id: localId('code'), kind: 'lockbox', code: '', validFrom: nowInZone(timeZone) },
                      ...prev,
                    ]);
                  }}
                >
                  <Icon name="plus" size={15} />
                  Add code
                </button>
              </section>

              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Wi-Fi</h4>
                <div className={styles.grid2}>
                  <AdminInput
                    label="Network name"
                    value={guide.wifiName}
                    onChange={(e) => patch({ wifiName: e.target.value })}
                  />
                  <AdminInput
                    label="Password"
                    value={guide.wifiPassword}
                    onChange={(e) => patch({ wifiPassword: e.target.value })}
                  />
                </div>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h4 className={styles.sectionTitle}>Steps and photos</h4>
                  <div className={styles.langs} role="tablist" aria-label="Language of the texts">
                    {LOCALES.map((l) => (
                      <button
                        key={l}
                        type="button"
                        role="tab"
                        aria-selected={l === lang}
                        className={`${styles.langBtn} ${l === lang ? styles.langOn : ''}`}
                        onClick={() => setLang(l)}
                      >
                        {LOCALE_LABELS[l]}
                      </button>
                    ))}
                  </div>
                </div>
                <p className={styles.hint}>
                  Each step takes up to {MAX_STEP_PHOTOS} photos — the wide shot first, then the
                  detail; drag a photo to change the order or to move it to another step — and a
                  text per language; a step not translated yet is shown in
                  English. Never photograph a code: pick it under the step and it is printed
                  there only once the guest’s window opens.
                </p>

                {apartments.length > 1 && (
                  <select
                    className={`select ${styles.copyFrom}`}
                    aria-label="Copy steps from another apartment"
                    value=""
                    onChange={(e) => void copyFrom(e.target.value)}
                  >
                    <option value="">Copy steps from another apartment…</option>
                    {apartments
                      .filter((a) => a.id !== apartment.id)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {getApartmentCopy(a, 'en').title}
                        </option>
                      ))}
                  </select>
                )}

                {STAGES.map(({ stage, title: stageTitle, hint }) => {
                  const steps = guide.steps.filter((s) => stageOf(s) === stage);
                  return (
                    <div key={stage} className={styles.stage}>
                      <h5 className={styles.stageTitle}>{stageTitle}</h5>
                      <p className={styles.hint}>{hint}</p>

                      {steps.map((step, i) => {
                        const photos = step.photos ?? [];
                        const busy = uploadingStep === step.id;
                        return (
                          <div key={step.id} className={styles.step}>
                            <div className={styles.stepPhotos}>
                              {photos.map((photo, n) => (
                                <div
                                  key={photo}
                                  className={[
                                    styles.stepPhoto,
                                    styles.stepPhotoDrag,
                                    drag?.photo === photo && styles.stepPhotoDragging,
                                    dropSlot?.stepId === step.id &&
                                      dropSlot.index === n &&
                                      styles.stepPhotoTarget,
                                  ]
                                    .filter(Boolean)
                                    .join(' ')}
                                  draggable
                                  title="Drag to reorder"
                                  onDragStart={(e) => {
                                    setDrag({ stepId: step.id, photo });
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('text/plain', photo);
                                  }}
                                  onDragEnd={() => {
                                    setDrag(null);
                                    setDropSlot(null);
                                  }}
                                  onDragOver={(e) => {
                                    if (!drag) return;
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    setDropSlot({ stepId: step.id, index: n });
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    dropPhoto(step.id, n);
                                  }}
                                >
                                  <Image
                                    src={photo}
                                    alt=""
                                    fill
                                    sizes="110px"
                                    className={styles.stepImg}
                                    unoptimized
                                    draggable={false}
                                  />
                                  <span className={styles.stepPhotoTag}>{n + 1}</span>
                                  <button
                                    type="button"
                                    className={styles.stepPhotoDel}
                                    aria-label="Remove photo"
                                    onClick={() =>
                                      patchStep(step.id, { photos: photos.filter((p) => p !== photo) })
                                    }
                                  >
                                    <Icon name="x" size={12} />
                                  </button>
                                </div>
                              ))}
                              {photos.length < MAX_STEP_PHOTOS && (
                                <button
                                  type="button"
                                  className={[
                                    styles.stepPhoto,
                                    styles.stepPhotoAdd,
                                    dropSlot?.stepId === step.id &&
                                      dropSlot.index === photos.length &&
                                      styles.stepPhotoTarget,
                                  ]
                                    .filter(Boolean)
                                    .join(' ')}
                                  onClick={() => pickPhoto(step.id)}
                                  disabled={uploadingStep !== null}
                                  // Dropping here puts the photo last — and is how one
                                  // lands in a step that has none yet.
                                  onDragOver={(e) => {
                                    if (!drag) return;
                                    e.preventDefault();
                                    setDropSlot({ stepId: step.id, index: photos.length });
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    dropPhoto(step.id, photos.length);
                                  }}
                                >
                                  <Icon name="image" size={18} />
                                  {busy ? 'Uploading…' : photos.length ? 'More' : 'Add photos'}
                                </button>
                              )}
                            </div>

                            <textarea
                              className={`textarea ${styles.stepText}`}
                              dir={lang === 'he' ? 'rtl' : 'ltr'}
                              placeholder={`Step ${i + 1} — ${LOCALE_LABELS[lang]}`}
                              value={step.text[lang] ?? ''}
                              onChange={(e) =>
                                patchStep(step.id, { text: withText(step.text, e.target.value) })
                              }
                            />
                            <div className={styles.stepTools}>
                              <select
                                className={`select ${styles.stepCode}`}
                                aria-label="Code shown in this step"
                                value={step.codeKind ?? ''}
                                onChange={(e) =>
                                  patchStep(step.id, {
                                    codeKind: (e.target.value || undefined) as
                                      | AccessCodeKind
                                      | undefined,
                                  })
                                }
                              >
                                <option value="">No code in this step</option>
                                {ACCESS_CODE_KINDS.map((kind) => (
                                  <option key={kind} value={kind}>
                                    Show code: {KIND_LABELS[kind]}
                                  </option>
                                ))}
                              </select>
                              <span className={styles.stepOrder}>
                                <button
                                  type="button"
                                  className={styles.iconBtn}
                                  aria-label="Move step up"
                                  disabled={i === 0}
                                  onClick={() => moveStep(step.id, -1)}
                                >
                                  <Icon name="chevron" size={15} className={styles.up} />
                                </button>
                                <button
                                  type="button"
                                  className={styles.iconBtn}
                                  aria-label="Move step down"
                                  disabled={i === steps.length - 1}
                                  onClick={() => moveStep(step.id, 1)}
                                >
                                  <Icon name="chevron" size={15} className={styles.down} />
                                </button>
                                <button
                                  type="button"
                                  className={styles.iconBtn}
                                  aria-label="Remove step"
                                  onClick={() =>
                                    patchSteps((all) => all.filter((s) => s.id !== step.id))
                                  }
                                >
                                  <Icon name="trash" size={15} />
                                </button>
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        className={styles.addBtn}
                        onClick={() =>
                          patchSteps((all) => [...all, { id: localId('step'), stage, text: {} }])
                        }
                      >
                        <Icon name="plus" size={15} />
                        Add step
                      </button>
                    </div>
                  );
                })}

                <AdminField label={`Good to know — ${LOCALE_LABELS[lang]} (rules, parking, quiet hours)`}>
                  <textarea
                    className="textarea"
                    dir={lang === 'he' ? 'rtl' : 'ltr'}
                    value={guide.notes[lang] ?? ''}
                    onChange={(e) => patch({ notes: withText(guide.notes, e.target.value) })}
                  />
                </AdminField>
              </section>

              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Sticker for the apartment</h4>
                <p className={styles.hint}>
                  A card to print and leave inside: one QR code joins the Wi-Fi, the other opens
                  the house notes and the “When leaving” steps in the guest’s language. It never
                  shows a door code. Save the guide first — the sticker prints what is saved.
                </p>
                <div>
                  <Button
                    as="a"
                    size="sm"
                    variant="ghost"
                    icon="image"
                    href={`/admin/sticker/${encodeURIComponent(apartment.id)}`}
                    target="_blank"
                    rel="noopener"
                  >
                    Open the sticker
                  </Button>
                </div>
              </section>

              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Guest links</h4>
                <p className={styles.hint}>
                  One link per stay. A stay booked on the site gets its link from the Bookings
                  screen; for a guest from Airbnb or Booking.com make one here. A link works at
                  once — it does not wait for “Save guide”.
                </p>

                <div className={styles.passForm}>
                  <AdminInput
                    label="Guest name"
                    value={newPass.guestName}
                    onChange={(e) => setNewPass({ ...newPass, guestName: e.target.value })}
                  />
                  <AdminInput
                    label="WhatsApp number (optional)"
                    placeholder="+972501234567"
                    value={newPass.guestContact}
                    onChange={(e) => setNewPass({ ...newPass, guestContact: e.target.value })}
                  />
                  <AdminInput
                    label="Check-in"
                    type="date"
                    value={newPass.checkIn}
                    onChange={(e) => setNewPass({ ...newPass, checkIn: e.target.value })}
                  />
                  <AdminInput
                    label="Check-out"
                    type="date"
                    value={newPass.checkOut}
                    onChange={(e) => setNewPass({ ...newPass, checkOut: e.target.value })}
                  />
                </div>
                {passError && <p className={styles.error}>{passError}</p>}
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="navy"
                    icon="plus"
                    disabled={passBusy}
                    onClick={() => void addPass()}
                  >
                    Create link
                  </Button>
                </div>

                {passes.map((pass) => {
                  const status = passStatus(pass);
                  const dead = status.tone === 'off';
                  return (
                    <div key={pass.id} className={`${styles.pass} ${dead ? styles.passOff : ''}`}>
                      <div className={styles.passHead}>
                        <div>
                          <b>{pass.guestName}</b>
                          <span className={styles.passDates}>
                            {formatDateRange(pass.checkIn, pass.checkOut, 'en')}
                            {pass.bookingId ? ' · from a booking' : ''}
                          </span>
                        </div>
                        <span className={`${styles.badge} ${styles[`tone_${status.tone}`] ?? ''}`}>
                          {status.text}
                        </span>
                        {!pass.revokedAt && (
                          <button type="button" className={styles.textBtn} onClick={() => void revoke(pass)}>
                            Revoke
                          </button>
                        )}
                      </div>
                      {!dead && pass.path && (
                        <GuestLinkBox
                          pass={pass}
                          titleFor={(locale) => getApartmentCopy(apartment, locale).title}
                        />
                      )}
                    </div>
                  );
                })}
              </section>
            </>
          )}
        </div>

        <div className={shell.foot}>
          {saved && <span className={styles.saved}>Saved</span>}
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            icon="check"
            disabled={!guide || saving}
            onClick={() => void save()}
          >
            {saving ? 'Saving…' : 'Save guide'}
          </Button>
        </div>
      </div>
    </div>
  );
}
