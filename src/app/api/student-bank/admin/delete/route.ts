import { NextResponse } from 'next/server';
import { requireOwnerOrAdmin } from '@/lib/admin-auth';
import { getAdmin } from '@/lib/firebase-admin';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, getStudentResourcesBucket, isS3Configured } from '@/lib/s3';

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
  const ref = db.collection('student_resources').doc(id);

  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const data = (snap.data() as any) || {};
  const pdfKey = typeof data.pdfKey === 'string' ? data.pdfKey : '';

  if (pdfKey && pdfKey.startsWith('student-resources/')) {
    const cfg = isS3Configured();
    if (cfg.ok) {
      try {
        const s3 = getS3Client();
        await s3.send(
          new DeleteObjectCommand({
            Bucket: getStudentResourcesBucket(),
            Key: pdfKey,
          }),
        );
      } catch (e) {
        console.error('Failed to delete MinIO object for student resource', { id, pdfKey, e });
      }
    }
  }

  await ref.delete();

  return NextResponse.json({ ok: true });
}
