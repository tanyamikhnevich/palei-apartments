import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db/index';
import { apartmentToInsert, rowToApartment } from '@/db/map';
import type { Apartment } from '@/types/apartment';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';

type RouteContext = { params: { id: string } };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    const body = (await request.json()) as Apartment;
    if (body.id !== params.id) {
      return jsonError('Apartment id mismatch');
    }

    const db = getDb();
    const updated = await db
      .update(schema.apartments)
      .set({
        ...apartmentToInsert(body),
        updatedAt: new Date(),
      })
      .where(eq(schema.apartments.id, params.id))
      .returning();

    if (!updated.length) {
      return jsonError('Apartment not found', 404);
    }

    return NextResponse.json({ apartment: rowToApartment(updated[0]) });
  } catch (e) {
    console.error('PATCH /api/apartments/[id]', e);
    return jsonError('Failed to update apartment', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    const db = getDb();
    const removed = await db
      .delete(schema.apartments)
      .where(eq(schema.apartments.id, params.id))
      .returning({ id: schema.apartments.id });

    if (!removed.length) {
      return jsonError('Apartment not found', 404);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/apartments/[id]', e);
    return jsonError('Failed to delete apartment', 500);
  }
}
