import { NextResponse } from 'next/server';
import { requireOwnerOrAdmin } from '@/lib/admin-auth';
import { getAdmin } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const authz = await requireOwnerOrAdmin(req);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.code });

  const body = await req.json().catch(() => ({}));
  const limit = Math.max(1, Math.min(500, Number(body?.limit) || 100));
  let orderBy: 'createdAt' | 'email' = body?.orderBy === 'email' ? 'email' : 'createdAt';
  const role = (body?.role || '').trim();
  const status = (body?.status || '').trim();
  const emailPrefixRaw = (body?.emailPrefix || '').trim();
  const includeEmailVerified = body?.includeEmailVerified !== false; // default true
  const cursor = body?.cursor || null; // { createdAtISO, email, docId }

  try {
    const { db, auth } = await getAdmin();
    let q: any = db.collection('users');

    if (role) q = q.where('role', '==', role);
    if (status) q = q.where('status', '==', status);

    let emailPrefix: string | null = emailPrefixRaw || null;
    if (emailPrefix) {
      // For prefix query we must orderBy email; adjust order
      orderBy = 'email';
      const end = emailPrefix + '\uf8ff';
      q = q.where('email', '>=', emailPrefix).where('email', '<=', end);
    }

    if (orderBy === 'createdAt') {
      q = q.orderBy('createdAt', 'desc');
      if (cursor?.createdAtISO) {
        const ts = new Date(cursor.createdAtISO);
        if (!isNaN(ts.getTime())) q = q.startAfter(ts);
      }
    } else {
      q = q.orderBy('email', 'asc');
      if (cursor?.email) {
        q = q.startAfter(cursor.email);
      }
    }

    q = q.limit(limit);

    let snap: any = null;
    try {
      snap = await q.get();
    } catch (e: any) {
      // Fallback: if createdAt ordering/index fails, fallback to email ordering
      if (orderBy === 'createdAt') {
        let fallback = db.collection('users');
        if (role) fallback = fallback.where('role', '==', role);
        if (status) fallback = fallback.where('status', '==', status);
        fallback = fallback.orderBy('email', 'asc').limit(limit);
        if (cursor?.email) fallback = fallback.startAfter(cursor.email);
        snap = await fallback.get();
        orderBy = 'email';
      } else {
        throw e;
      }
    }

    type UserRow = {
      uid: string;
      email: string | null;
      role: string | null;
      plan: string;
      status: string;
      createdAt: string | null;
      emailVerified?: boolean | null;
    };

    const baseUsers: UserRow[] = snap.docs.map((d: any): UserRow => {
      const data = d.data() || {};
      const createdAtISO = data.createdAt?._seconds ? new Date(data.createdAt._seconds * 1000).toISOString() : null;
      return {
        uid: d.id,
        email: data.email || null,
        role: data.role || null,
        plan: data.plan || 'free',
        status: data.status || 'active',
        createdAt: createdAtISO,
      };
    });

    let users = baseUsers;
    if (includeEmailVerified && baseUsers.length > 0) {
      const results = await Promise.all(baseUsers.map(async (u: UserRow): Promise<{ uid: string; emailVerified: boolean | null }> => {
        try {
          const rec = await auth.getUser(u.uid);
          return { uid: u.uid, emailVerified: !!rec.emailVerified };
        } catch {
          return { uid: u.uid, emailVerified: null as any };
        }
      }));
      const map = new Map(results.map(r => [r.uid, r.emailVerified]));
      users = baseUsers.map((u: UserRow): UserRow => ({ ...u, emailVerified: map.get(u.uid) ?? null }));
    }

    // Prepare next cursor
    let nextCursor: any = null;
    if (snap.docs.length === limit) {
      const last = snap.docs[snap.docs.length - 1];
      if (orderBy === 'createdAt') {
        const lastData = last.data() || {};
        const lastISO = lastData.createdAt?._seconds ? new Date(lastData.createdAt._seconds * 1000).toISOString() : null;
        if (lastISO) nextCursor = { createdAtISO: lastISO };
      } else {
        nextCursor = { email: (last.get('email') || null) };
      }
    }

    return NextResponse.json({ users, orderBy, nextCursor });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'list_failed' }, { status: 500 });
  }
}
