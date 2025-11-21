import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdmin } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const authz = await requireAdmin(req);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.code });

  const body = await req.json().catch(() => ({}));
  const email = (body?.email || '').trim();
  const password = (body?.password || '').trim();
  const role = ((body?.role || '').trim() || 'seeker') as string;
  const status = ((body?.status || '').trim() || 'active') as 'active' | 'disabled';
  const plan = ((body?.plan || '').trim() || 'free') as string;

  if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 });
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'password_min_6' }, { status: 400 });
  }
  const allowedRoles = ['owner', 'admin', 'provider', 'seeker'];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }
  if (!['active', 'disabled'].includes(status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }

  try {
    const { auth, db } = await getAdmin();

    const userRecord = await auth.createUser({
      email,
      password,
      disabled: status === 'disabled',
    });

    const now = new Date();
    await db.collection('users').doc(userRecord.uid).set(
      {
        email,
        role,
        plan,
        status,
        createdAt: now,
      },
      { merge: true },
    );

    return NextResponse.json(
      {
        uid: userRecord.uid,
        email,
        role,
        plan,
        status,
        createdAt: now.toISOString(),
      },
      { status: 201 },
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'create_failed' }, { status: 500 });
  }
}

