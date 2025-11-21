import { NextResponse } from 'next/server';
import { requireOwnerOrAdmin } from '@/lib/admin-auth';
import { getAdmin } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['exam', 'assignment', 'notes', 'report', 'book', 'other'];
const ALLOWED_LANGUAGES = ['ar', 'en', 'both'];
const ALLOWED_STATUS = ['pending', 'approved', 'rejected'];

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

  const { db, FieldValue } = await getAdmin();

  const partial: any = {};

  if (body.title !== undefined) {
    partial.title = String(body.title || '').trim();
  }
  if (body.description !== undefined) {
    partial.description = String(body.description || '').trim() || null;
  }
  if (body.university !== undefined) {
    partial.university = String(body.university || '').trim() || null;
  }
  if (body.course !== undefined) {
    partial.course = String(body.course || '').trim() || null;
  }
  if (body.year !== undefined) {
    partial.year = String(body.year || '').trim() || null;
  }
  if (body.type !== undefined) {
    const t = String(body.type || '').trim().toLowerCase();
    if (ALLOWED_TYPES.includes(t)) {
      partial.type = t;
    }
  }
  if (body.language !== undefined) {
    const lng = String(body.language || '').trim().toLowerCase();
    if (ALLOWED_LANGUAGES.includes(lng)) {
      partial.language = lng;
    }
  }
  if (body.status !== undefined) {
    const s = String(body.status || '').trim().toLowerCase();
    if (ALLOWED_STATUS.includes(s)) {
      partial.status = s;
    }
  }

  const clean = Object.fromEntries(
    Object.entries(partial).filter(
      ([, v]) => v !== undefined && v !== null && String(v || '').length > 0,
    ),
  );

  if (!Object.keys(clean).length) {
    return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
  }

  clean.updatedAt =
    typeof FieldValue?.serverTimestamp === 'function'
      ? FieldValue.serverTimestamp()
      : new Date();

  await db.collection('student_resources').doc(id).update(clean);

  return NextResponse.json({ ok: true });
}
