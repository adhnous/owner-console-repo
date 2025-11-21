import { NextResponse } from 'next/server';
import { requireOwnerOrAdmin } from '@/lib/admin-auth';
import { getAdmin } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const authz = await requireOwnerOrAdmin(req);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.code });

  const { db, auth } = await getAdmin();
  const body = await req.json().catch(() => ({}));
  const uid = (body?.uid || '').trim();
  const email = (body?.email || '').trim();

  try {
    let docSnap: any | null = null;
    if (uid) {
      docSnap = await db.collection('users').doc(uid).get();
    } else if (email) {
      const q = await db.collection('users').where('email', '==', email).limit(1).get();
      docSnap = q.docs[0] || null;
    } else {
      return NextResponse.json({ error: 'uid_or_email_required' }, { status: 400 });
    }

    if (!docSnap || !docSnap.exists) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const data = docSnap.data() || {};
    const createdAtISO = data.createdAt?._seconds ? new Date(data.createdAt._seconds * 1000).toISOString() : null;
    // Try to read email verification from Firebase Auth user record
    let emailVerified: boolean | null = null;
    try {
      let authRec: any = null;
      try {
        authRec = await auth.getUser(docSnap.id);
      } catch (e) {
        const lookupEmail = (data.email || email || '').trim();
        if (lookupEmail) {
          try { authRec = await auth.getUserByEmail(lookupEmail); } catch {}
        }
      }
      if (authRec) emailVerified = !!authRec.emailVerified;
    } catch {}
    const out = {
      uid: docSnap.id,
      email: data.email || null,
      role: data.role || null,
      displayName: data.displayName || null,
      plan: data.plan || 'free',
      status: data.status || 'active',
      createdAt: createdAtISO,
      pricingGate: data.pricingGate || null,
      emailVerified,
    };
    return NextResponse.json({ user: out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'get_failed' }, { status: 500 });
  }
}
