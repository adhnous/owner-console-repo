import { NextResponse } from 'next/server';
import { requireOwnerOrAdmin } from '@/lib/admin-auth';
import { getAdmin } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const authz = await requireOwnerOrAdmin(req);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.code });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const id = String(body.id || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  }

  const { db } = await getAdmin();
  await db.collection('student_resources').doc(id).delete();

  return NextResponse.json({ ok: true });
}

