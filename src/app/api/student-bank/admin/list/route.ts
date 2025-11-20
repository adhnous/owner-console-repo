import { NextResponse } from 'next/server';
import { requireOwnerOrAdmin } from '@/lib/admin-auth';
import { getAdmin } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/student-bank/admin/list?q=&type=&language=&limit=
export async function GET(req: Request) {
  const authz = await requireOwnerOrAdmin(req);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.code });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const type = (url.searchParams.get('type') || '').trim();
  const language = (url.searchParams.get('language') || '').trim();
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 1),
    500,
  );

  const { db } = await getAdmin();

  let queryRef: any = db.collection('student_resources');
  if (type) queryRef = queryRef.where('type', '==', type);
  if (language) queryRef = queryRef.where('language', '==', language);
  queryRef = queryRef.limit(limit);

  const snap = await queryRef.get();

  let rows = snap.docs.map((d: any) => {
    const data = d.data() || {};
    const createdAtISO = data.createdAt?._seconds
      ? new Date(data.createdAt._seconds * 1000).toISOString()
      : null;

    const driveLink = data.driveLink || data.fileUrl || null;

    return {
      id: d.id,
      title: data.title || '',
      university: data.university || '',
      course: data.course || '',
      year: data.year || '',
      type: data.type || 'other',
      language: data.language || null,
      hasFile: !!(driveLink || data.driveFileId),
      driveLink,
      uploaderId: data.uploaderId || null,
      createdAt: createdAtISO,
    } as const;
  });

  if (q) {
    rows = rows.filter((r: any) => {
      const title = (r.title || '').toLowerCase();
      const uni = (r.university || '').toLowerCase();
      const course = (r.course || '').toLowerCase();
      return title.includes(q) || uni.includes(q) || course.includes(q);
    });
  }

  rows.sort((a: any, b: any) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
  );

  return NextResponse.json({ rows });
}

