import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/firebase-admin';
import { requireOwnerOrAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const authz = await requireOwnerOrAdmin(req);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.code });

  const body = (await req.json().catch(() => ({}))) as any;
  const id = typeof body?.id === 'string' ? body.id : '';
  const status = typeof body?.status === 'string' ? body.status : '';
  if (!id || !['approved', 'pending', 'sold', 'hidden'].includes(status)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const { db } = await getAdmin();

  await db.collection('sale_items').doc(id).set(
    {
      status,
      approvedAt: status === 'approved' ? new Date() : null,
      approvedBy: status === 'approved' ? authz.uid : null,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  return NextResponse.json({ ok: true });
}
