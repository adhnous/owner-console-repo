import { NextResponse } from 'next/server';
import { requireOwnerOrAdmin } from '@/lib/admin-auth';
import { getAdmin } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authz = await requireOwnerOrAdmin(req);
    if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.code });

    const { db } = await getAdmin();
    const homeRef = db.collection('settings').doc('home');
    const snap = await homeRef.get();
    const ids: string[] = (snap.exists ? (snap.get('featuredVideoIds') as string[] | undefined) : undefined) || [];

    // Resolve minimal service info for UI convenience
    const services: any[] = [];
    for (const id of ids) {
      try {
        const doc = await db.collection('services').doc(id).get();
        if (doc.exists) {
          const d = doc.data() || {};
          const hasVideo = Array.isArray(d.videoUrls) ? d.videoUrls.length > 0 : !!d.videoUrl;
          services.push({ id: doc.id, title: String(d.title || ''), status: String(d.status || ''), hasVideo });
        }
      } catch {}
    }

    return NextResponse.json({ ids, services });
  } catch (e) {
    console.error('GET /api/settings/home-featured error:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authz = await requireOwnerOrAdmin(req);
    if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.code });

    const body = await req.json().catch(() => ({} as any));
    const rawIds = Array.isArray(body?.ids) ? body.ids : [];
    const ids: string[] = rawIds
      .map((v: any) => (typeof v === 'string' ? v.trim() : ''))
      .filter((v: string) => v.length > 0)
      .slice(0, 50); // safety cap

    const { db } = await getAdmin();
    await db.collection('settings').doc('home').set({ featuredVideoIds: ids }, { merge: true });

    return NextResponse.json({ ok: true, ids });
  } catch (e) {
    console.error('POST /api/settings/home-featured error:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
