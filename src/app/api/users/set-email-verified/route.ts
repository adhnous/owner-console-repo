import { NextResponse } from 'next/server';
import { requireOwnerOrAdmin } from '@/lib/admin-auth';
import { getAdmin } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const authz = await requireOwnerOrAdmin(req);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.code });

  const body = await req.json().catch(() => ({}));
  const uid = (body?.uid || '').trim();
  if (!uid) return NextResponse.json({ error: 'uid_required' }, { status: 400 });

  let nextVerified: boolean | null = null;
  if (typeof body?.verified === 'boolean') nextVerified = body.verified;
  else if (typeof body?.emailVerified === 'boolean') nextVerified = body.emailVerified;
  if (nextVerified == null) return NextResponse.json({ error: 'verified_flag_required' }, { status: 400 });

  try {
    const { auth } = await getAdmin();
    await auth.updateUser(uid, { emailVerified: !!nextVerified });
    const rec = await auth.getUser(uid);
    return NextResponse.json({ ok: true, emailVerified: !!rec.emailVerified });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'update_failed' }, { status: 500 });
  }
}
