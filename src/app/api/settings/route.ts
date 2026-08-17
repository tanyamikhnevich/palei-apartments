import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { rowToSettings } from '@/db/map';
import type { BusinessSettings } from '@/types/settings';
import { DEFAULT_BUSINESS_SETTINGS } from '@/types/settings';
import { isLocale } from '@/i18n/types';
import type { CurrencyCode } from '@/types/settings';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';
import {
  validateBusinessName,
  validateEmail,
  validatePhone,
  validationMessageEn,
} from '@/lib/validation/contact';

const SETTINGS_ID = 'default';

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ settings: DEFAULT_BUSINESS_SETTINGS, source: 'mock' as const });
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.businessSettings)
      .where(eq(schema.businessSettings.id, SETTINGS_ID))
      .limit(1);

    return NextResponse.json({ settings: rowToSettings(rows[0]), source: 'database' as const });
  } catch (e) {
    console.error('GET /api/settings', e);
    return jsonError('Failed to load settings', 500);
  }
}

export async function PUT(request: Request) {
  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    const body = (await request.json()) as BusinessSettings;
    const currencies: CurrencyCode[] = ['ILS', 'USD', 'EUR'];

    if (!isLocale(body.defaultLanguage ?? '') || !currencies.includes(body.currency)) {
      return jsonError('Invalid settings payload');
    }

    const business = validateBusinessName(body.businessName ?? '');
    if (!business.ok) return jsonError(validationMessageEn(business.code), 400);
    const phone = validatePhone(body.contactPhone ?? '');
    if (!phone.ok) return jsonError(validationMessageEn(phone.code), 400);
    const whatsapp = validatePhone(body.whatsappNumber ?? '');
    if (!whatsapp.ok) return jsonError(validationMessageEn(whatsapp.code), 400);
    const email = validateEmail(body.contactEmail ?? '');
    if (!email.ok) return jsonError(validationMessageEn(email.code), 400);

    const db = getDb();
    const now = new Date();
    const values = {
      id: SETTINGS_ID,
      businessName: business.normalized!,
      contactPhone: phone.normalized!,
      contactEmail: email.normalized!,
      whatsappNumber: whatsapp.normalized!,
      defaultLanguage: body.defaultLanguage,
      currency: body.currency,
      updatedAt: now,
    };

    await db
      .insert(schema.businessSettings)
      .values(values)
      .onConflictDoUpdate({
        target: schema.businessSettings.id,
        set: {
          businessName: values.businessName,
          contactPhone: values.contactPhone,
          contactEmail: values.contactEmail,
          whatsappNumber: values.whatsappNumber,
          defaultLanguage: values.defaultLanguage,
          currency: values.currency,
          updatedAt: now,
        },
      });

    const saved = await db
      .select()
      .from(schema.businessSettings)
      .where(eq(schema.businessSettings.id, SETTINGS_ID))
      .limit(1);

    return NextResponse.json({ settings: rowToSettings(saved[0]), source: 'database' as const });
  } catch (e) {
    console.error('PUT /api/settings', e);
    return jsonError('Failed to save settings', 500);
  }
}
