import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';
import { requireAdminAccess } from '@/lib/auth/guard';
import { houseLinkFor, reissueHouseLink } from '@/lib/server/guides';
import { MAIN_SITE_URL } from '@/lib/sites';

type RouteContext = { params: { apartmentId: string } };

/**
 * A sticker is printed once and read for years, so its link is the live
 * site's — whatever address the panel happens to be open on.
 */
const answer = (path: string) => NextResponse.json({ path, url: `${MAIN_SITE_URL}${path}` });

async function apartmentExists(id: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: schema.apartments.id })
    .from(schema.apartments)
    .where(eq(schema.apartments.id, id))
    .limit(1);
  return rows.length > 0;
}

/** The link for this apartment's sticker — made on first asking, the same one after. */
export async function GET(request: Request, { params }: RouteContext) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    if (!(await apartmentExists(params.apartmentId))) return jsonError('Apartment not found', 404);
    return answer(await houseLinkFor(params.apartmentId));
  } catch (e) {
    console.error('GET /api/guides/[apartmentId]/sticker', e);
    return jsonError('Failed to load the sticker link — has `npm run db:migrate` been run?', 500);
  }
}

/** A new link: the sticker already on the wall stops working. */
export async function POST(request: Request, { params }: RouteContext) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    if (!(await apartmentExists(params.apartmentId))) return jsonError('Apartment not found', 404);
    return answer(await reissueHouseLink(params.apartmentId));
  } catch (e) {
    console.error('POST /api/guides/[apartmentId]/sticker', e);
    return jsonError('Failed to renew the sticker link', 500);
  }
}
