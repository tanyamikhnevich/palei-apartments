'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button/Button';
import { AdminInput, AdminSelect } from '@/components/admin/ui/AdminField';
import {
  CURRENCY_OPTIONS,
  DEFAULT_BUSINESS_SETTINGS,
  LANGUAGE_OPTIONS,
  type BusinessSettings,
} from '@/types/settings';
import { fetchSettings, saveSettings } from '@/lib/api/client';
import {
  BUSINESS_NAME_MAX,
  PHONE_INPUT_MAX_LENGTH,
  sanitizePhoneInput,
  validateBusinessName,
  validatePhone,
  validationMessageEn,
  type ValidationCode,
} from '@/lib/validation/contact';
import styles from './AdminSettings.module.scss';

type FieldKey = 'businessName' | 'contactPhone' | 'whatsappNumber';

function validateAll(settings: BusinessSettings): Partial<Record<FieldKey, string>> {
  const next: Partial<Record<FieldKey, string>> = {};

  const business = validateBusinessName(settings.businessName);
  if (!business.ok) next.businessName = validationMessageEn(business.code);

  const phone = validatePhone(settings.contactPhone);
  if (!phone.ok) next.contactPhone = validationMessageEn(phone.code);

  const whatsapp = validatePhone(settings.whatsappNumber);
  if (!whatsapp.ok) next.whatsappNumber = validationMessageEn(whatsapp.code);


  return next;
}

function validateField(key: FieldKey, value: string): string | undefined {
  let result;
  switch (key) {
    case 'businessName':
      result = validateBusinessName(value);
      break;
    case 'contactPhone':
    case 'whatsappNumber':
      result = validatePhone(value);
      break;
  }
  if (!result.ok) return validationMessageEn(result.code as ValidationCode);
  return undefined;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_BUSINESS_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});

  useEffect(() => {
    fetchSettings()
      .then(({ settings: s, fromDb }) => {
        setSettings(s);
        setDbConnected(fromDb);
      })
      .catch(() => {
        setSettings(DEFAULT_BUSINESS_SETTINGS);
        setDbConnected(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setStatus(null);
    if (key === 'businessName' || key === 'contactPhone' || key === 'whatsappNumber') {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const blurField = (key: FieldKey) => {
    const err = validateField(key, String(settings[key]));
    setFieldErrors((prev) => ({ ...prev, [key]: err }));
  };

  const handleSave = async () => {
    const errors = validateAll(settings);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setStatus('Fix the highlighted fields before saving.');
      return;
    }

    const phone = validatePhone(settings.contactPhone);
    const whatsapp = validatePhone(settings.whatsappNumber);
    const business = validateBusinessName(settings.businessName);

    const payload: BusinessSettings = {
      ...settings,
      businessName: business.ok ? business.normalized! : settings.businessName.trim(),
      contactPhone: phone.ok ? phone.normalized! : settings.contactPhone,
      whatsappNumber: whatsapp.ok ? whatsapp.normalized! : settings.whatsappNumber,
    };

    setSaving(true);
    setStatus(null);
    try {
      const saved = await saveSettings(payload);
      setSettings(saved);
      setDbConnected(true);
      setStatus('Settings saved.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className={styles.status}>Loading settings…</p>;
  }

  return (
    <div className={styles.settings}>
      {!dbConnected && (
        <p className={styles.warn}>
          Database not connected — showing defaults. Add <code>DATABASE_URL</code> to{' '}
          <code>.env.local</code> and run <code>npm run db:push</code>.
        </p>
      )}

      <div className={styles.panel}>
        <h3>Business profile</h3>
        <p className={styles.desc}>Shown across the public website and in guest messages.</p>
        <div className={styles.stack}>
          <AdminInput
            label="Business name"
            value={settings.businessName}
            maxLength={BUSINESS_NAME_MAX}
            error={fieldErrors.businessName}
            onChange={(e) => update('businessName', e.target.value)}
            onBlur={() => blurField('businessName')}
          />
          <div className={styles.grid}>
            <AdminInput
              label="Contact phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+972 50 123 4567"
              value={settings.contactPhone}
              error={fieldErrors.contactPhone}
              maxLength={PHONE_INPUT_MAX_LENGTH}
              onChange={(e) => update('contactPhone', sanitizePhoneInput(e.target.value))}
              onBlur={() => blurField('contactPhone')}
            />
          </div>
          <AdminInput
            label="WhatsApp number"
            type="tel"
            inputMode="tel"
            placeholder="+972 50 123 4567"
            value={settings.whatsappNumber}
            error={fieldErrors.whatsappNumber}
            maxLength={PHONE_INPUT_MAX_LENGTH}
            onChange={(e) => update('whatsappNumber', sanitizePhoneInput(e.target.value))}
            onBlur={() => blurField('whatsappNumber')}
          />
        </div>
      </div>

      <div className={styles.panel}>
        <h3>Languages & currency</h3>
        <p className={styles.desc}>Control what guests can switch between.</p>
        <div className={styles.grid}>
          <AdminSelect
            label="Default language"
            options={LANGUAGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={settings.defaultLanguage}
            onChange={(e) => update('defaultLanguage', e.target.value as BusinessSettings['defaultLanguage'])}
          />
          <AdminSelect
            label="Currency"
            options={CURRENCY_OPTIONS.map((o) => ({ value: o.code, label: o.label }))}
            value={settings.currency}
            onChange={(e) => update('currency', e.target.value as BusinessSettings['currency'])}
          />
        </div>
      </div>

      <div className={styles.foot}>
        {status && <p className={styles.status}>{status}</p>}
        <Button variant="primary" icon="check" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}
