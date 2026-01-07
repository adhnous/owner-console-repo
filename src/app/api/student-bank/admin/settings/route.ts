import { NextResponse } from 'next/server';
import { requireOwnerOrAdmin } from '@/lib/admin-auth';
import { getAdmin } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET/POST /api/student-bank/admin/settings
// Controls app_settings/student_bank.uploadsEnabled (shared with main app).
export async function GET(req: Request) {
  const authz = await requireOwnerOrAdmin(req);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.code });

  const { db } = await getAdmin();
  const doc = await db.collection('app_settings').doc('student_bank').get();
  const data = (doc.exists ? (doc.data() as any) : null) || {};
  const uploadsEnabled = typeof data.uploadsEnabled === 'boolean' ? data.uploadsEnabled : true;

  return NextResponse.json({ uploadsEnabled });
}

export async function POST(req: Request) {
  const authz = await requireOwnerOrAdmin(req);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.code });

  const body = await req.json().catch(() => ({} as any));
  if (typeof body.uploadsEnabled !== 'boolean') {
    return NextResponse.json({ error: 'invalid_uploads_enabled' }, { status: 400 });
  }

  const { db, FieldValue } = await getAdmin();
  await db.collection('app_settings').doc('student_bank').set(
    {
      uploadsEnabled: body.uploadsEnabled,
      updatedAt: typeof FieldValue?.serverTimestamp === 'function' ? FieldValue.serverTimestamp() : new Date(),
      updatedBy: authz.uid,
    },
    { merge: true },
  );

  return NextResponse.json({ ok: true, uploadsEnabled: body.uploadsEnabled });
}

