import { NextResponse } from 'next/server';
import { requireOwnerOrAdmin } from '@/lib/admin-auth';
import { getAdmin } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeYouTubeUrl(raw: string): string {
  const v = String(raw || '').trim();
  if (!v) return '';

  // Extract YouTube video id from common URL forms
  const m =
    v.match(/youtu\.be\/([\w-]+)/i)?.[1] ||
    v.match(/[?&]v=([\w-]+)/i)?.[1] ||
    v.match(/embed\/([\w-]+)/i)?.[1];

  if (m) {
    return `https://www.youtube.com/embed/${m}`;
  }
  return v;
}

export async function GET(req: Request) {
  try {
    const authz = await requireOwnerOrAdmin(req);
    if (!authz.ok)
      return NextResponse.json({ error: authz.error }, { status: authz.code });

    const { db } = await getAdmin();
    const homeRef = db.collection('settings').doc('home');
    const snap = await homeRef.get();
    const urls: string[] =
      (snap.exists ? (snap.get('landingVideoUrls') as string[] | undefined) : undefined) || [];

    return NextResponse.json({ urls });
  } catch (e) {
    console.error('GET /api/settings/landing-videos error:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authz = await requireOwnerOrAdmin(req);
    if (!authz.ok)
      return NextResponse.json({ error: authz.error }, { status: authz.code });

    const body = await req.json().catch(() => ({} as any));
    const rawUrls = Array.isArray(body?.urls) ? body.urls : [];

    const urls: string[] = rawUrls
      .map((u: any) => normalizeYouTubeUrl(String(u || '')))
      .filter((u: string) => u.length > 0)
      .slice(0, 20); // safety cap

    const { db } = await getAdmin();
    await db.collection('settings').doc('home').set({ landingVideoUrls: urls }, { merge: true });

    return NextResponse.json({ ok: true, urls });
  } catch (e) {
    console.error('POST /api/settings/landing-videos error:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

