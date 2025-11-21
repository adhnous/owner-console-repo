import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdmin } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const authz = await requireAdmin(req);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.code });

  const body = await req.json().catch(() => ({}));
  const uid = (body?.uid || '').trim();
  if (!uid) return NextResponse.json({ error: 'uid_required' }, { status: 400 });

  try {
    const { auth, db } = await getAdmin();

    // Best-effort delete in Firebase Auth; ignore "not found" errors
    try {
      await auth.deleteUser(uid);
    } catch {}

    // Soft-delete in Firestore: keep the document but mark disabled/deleted
    const now = new Date();
    await db.collection('users').doc(uid).set(
      {
        status: 'disabled',
        deletedAt: now,
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'delete_failed' }, { status: 500 });
  }
}

