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
  const inputEmail = (body?.email || '').trim();

  try {
    const { auth, db } = await getAdmin();
    let email = inputEmail;

    if (!email) {
      if (!uid) return NextResponse.json({ error: 'uid_or_email_required' }, { status: 400 });
      try {
        const rec = await auth.getUser(uid);
        if (rec?.email) email = rec.email;
      } catch {}
      if (!email) {
        try {
          const snap = await db.collection('users').doc(uid).get();
          const data = snap.data() || {};
          if (data?.email) email = String(data.email);
        } catch {}
      }
    }

    if (!email) return NextResponse.json({ error: 'email_not_found' }, { status: 404 });

    const link = await auth.generateEmailVerificationLink(email);
    return NextResponse.json({ ok: true, link });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'generate_failed' }, { status: 500 });
  }
}
