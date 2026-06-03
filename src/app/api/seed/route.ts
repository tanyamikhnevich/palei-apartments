import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { apartmentToInsert, bookingToInsert } from '@/db/map';
import { buildSeedBookings } from '@/db/seedBookings';
import { apartments as mockApartments } from '@/data/apartments';
import { DEFAULT_BUSINESS_SETTINGS } from '@/types/settings';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';

async function runSeed() {
  const db = getDb();
  const now = new Date();

  await db.delete(schema.bookings);
  await db.delete(schema.apartments);

  for (const apt of mockApartments) {
    await db.insert(schema.apartments).values({
      ...apartmentToInsert(apt),
      createdAt: now,
      updatedAt: now,
    });
  }

  await db
    .insert(schema.businessSettings)
    .values({
      id: 'default',
      businessName: DEFAULT_BUSINESS_SETTINGS.businessName,
      contactPhone: DEFAULT_BUSINESS_SETTINGS.contactPhone,
      contactEmail: DEFAULT_BUSINESS_SETTINGS.contactEmail,
      whatsappNumber: DEFAULT_BUSINESS_SETTINGS.whatsappNumber,
      defaultLanguage: DEFAULT_BUSINESS_SETTINGS.defaultLanguage,
      currency: DEFAULT_BUSINESS_SETTINGS.currency,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.businessSettings.id,
      set: {
        businessName: DEFAULT_BUSINESS_SETTINGS.businessName,
        contactPhone: DEFAULT_BUSINESS_SETTINGS.contactPhone,
        contactEmail: DEFAULT_BUSINESS_SETTINGS.contactEmail,
        whatsappNumber: DEFAULT_BUSINESS_SETTINGS.whatsappNumber,
        defaultLanguage: DEFAULT_BUSINESS_SETTINGS.defaultLanguage,
        currency: DEFAULT_BUSINESS_SETTINGS.currency,
        updatedAt: now,
      },
    });

  for (const b of buildSeedBookings(mockApartments)) {
    await db.insert(schema.bookings).values({
      ...bookingToInsert(b),
      createdAt: now,
      updatedAt: now,
    });
  }

  const count = await db.select({ n: sql<number>`count(*)::int` }).from(schema.apartments);
  return count[0]?.n ?? 0;
}

/** POST — load mock apartments + default business settings into Neon */
export async function POST(request: Request) {
  if (!isDbConfigured()) return dbUnavailableResponse();

  const isDev = process.env.NODE_ENV === 'development';
  const secret = process.env.SEED_SECRET;
  const header = request.headers.get('x-seed-secret');

  if (!isDev && secret && header !== secret) {
    return jsonError('Unauthorized', 401);
  }

  try {
    const count = await runSeed();
    return NextResponse.json({
      ok: true,
      message: `Seeded ${count} apartments and default business settings`,
      count,
    });
  } catch (e) {
    console.error('POST /api/seed', e);
    return jsonError('Seed failed', 500);
  }
}
