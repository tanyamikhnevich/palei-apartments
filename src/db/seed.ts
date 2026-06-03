import { config } from 'dotenv';

config({ path: '.env.local' });
config();
import { sql } from 'drizzle-orm';
import { getDb, schema } from './index';
import { apartmentToInsert, bookingToInsert } from './map';
import { apartments as mockApartments } from '@/data/apartments';
import { buildSeedBookings } from './seedBookings';
import { DEFAULT_BUSINESS_SETTINGS } from '@/types/settings';

async function seed() {
  const db = getDb();
  const now = new Date();

  console.log('Resetting bookings & apartments…');
  await db.delete(schema.bookings);
  await db.delete(schema.apartments);

  console.log(`Inserting ${mockApartments.length} mock apartments…`);
  for (const apt of mockApartments) {
    await db.insert(schema.apartments).values({
      ...apartmentToInsert(apt),
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log('Upserting business settings…');
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

  console.log('Inserting sample bookings…');
  for (const b of buildSeedBookings(mockApartments)) {
    await db.insert(schema.bookings).values({
      ...bookingToInsert(b),
      createdAt: now,
      updatedAt: now,
    });
  }

  const count = await db.select({ n: sql<number>`count(*)::int` }).from(schema.apartments);
  console.log(`Done. Apartments in DB: ${count[0]?.n ?? 0}`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
