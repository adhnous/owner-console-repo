import { NextResponse } from 'next/server';
import { requireOwnerOrAdmin } from '@/lib/admin-auth';
import { getAdmin } from '@/lib/firebase-admin';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3PresignClient, getStudentResourcesBucket, isS3Configured } from '@/lib/s3';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/student-bank/admin/signed-url { id }
export async function POST(req: Request) {
  const authz = await requireOwnerOrAdmin(req);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.code });
  }

  const body = await req.json().catch(() => ({} as any));
  const id = String(body.id || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  }

  const { db } = await getAdmin();
  const snap = await db.collection('student_resources').doc(id).get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const data = (snap.data() as any) || {};
  const pdfKey = typeof data.pdfKey === 'string' ? data.pdfKey : '';
  const driveLink = (data.driveLink || data.fileUrl || null) as string | null;
  const driveFileId = typeof data.driveFileId === 'string' ? data.driveFileId : '';

  if (!pdfKey) {
    if (driveLink) return NextResponse.json({ ok: true, url: driveLink, source: 'drive' });
    if (driveFileId) {
      return NextResponse.json({
        ok: true,
        url: `https://drive.google.com/file/d/${encodeURIComponent(driveFileId)}/view`,
        source: 'drive',
      });
    }
    return NextResponse.json({ error: 'no_file' }, { status: 404 });
  }

  if (!pdfKey.startsWith('student-resources/')) {
    return NextResponse.json({ error: 'invalid_key' }, { status: 400 });
  }

  const cfg = isS3Configured();
  if (!cfg.ok) {
    return NextResponse.json({ error: 'storage_not_configured', missing: cfg.missing }, { status: 400 });
  }

  const s3 = getS3PresignClient();
  const bucket = getStudentResourcesBucket();
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: pdfKey,
      ResponseContentType: 'application/pdf',
      ResponseContentDisposition: 'inline',
    }),
    { expiresIn: 10 * 60 },
  );

  return NextResponse.json({ ok: true, url, source: 's3' });
}
