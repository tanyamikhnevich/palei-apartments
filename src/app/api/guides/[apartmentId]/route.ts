import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';
import { requireAdminAccess } from '@/lib/auth/guard';
import { sanitizeCodes, sanitizeGuide } from '@/lib/guide/sanitize';
import { readGuide, writeGuide } from '@/lib/server/guides';

type RouteContext = { params: { apartmentId: string } };

/** The check-in guide and its door codes — the panel's eyes only. */
export async function GET(request: Request, { params }: RouteContext) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    return NextResponse.json(await readGuide(params.apartmentId));
  } catch (e) {
    console.error('GET /api/guides/[apartmentId]', e);
    return jsonError('Failed to load the check-in guide', 500);
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    const body = (await request.json()) as { guide?: unknown; codes?: unknown };

    const known = await getDb()
      .select({ id: schema.apartments.id })
      .from(schema.apartments)
      .where(eq(schema.apartments.id, params.apartmentId))
      .limit(1);
    if (!known.length) return jsonError('Apartment not found', 404);

    await writeGuide(sanitizeGuide(params.apartmentId, body.guide), sanitizeCodes(body.codes));
    return NextResponse.json(await readGuide(params.apartmentId));
  } catch (e) {
    console.error('PUT /api/guides/[apartmentId]', e);
    return jsonError('Failed to save the check-in guide', 500);
  }
}
