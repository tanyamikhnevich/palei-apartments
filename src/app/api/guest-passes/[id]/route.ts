import { NextResponse } from 'next/server';
import { dbUnavailableResponse, isDbConfigured, jsonError } from '@/lib/api/errors';
import { requireAdminAccess } from '@/lib/auth/guard';
import { revokePass } from '@/lib/server/guides';

type RouteContext = { params: { id: string } };

/**
 * Takes a link down. The row stays: it is the record that a link was once
 * sent, and of whether the guest ever opened it.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

  if (!isDbConfigured()) return dbUnavailableResponse();

  try {
    await revokePass(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/guest-passes/[id]', e);
    return jsonError('Failed to revoke the guest link', 500);
  }
}
