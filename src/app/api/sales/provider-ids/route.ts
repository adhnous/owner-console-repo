import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/firebase-admin';
import { requireOwnerOrAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/sales/provider-ids
// Modes:
// - Distinct provider IDs: /api/sales/provider-ids?status=approved&limit=1000&includeNames=false
// - Owners for specific sale IDs: /api/sales/provider-ids?saleIds=a,b,c&includeNames=true
//   (also supports single: ?saleId=xyz)
export async function GET(req: Request) {
  const authz = await requireOwnerOrAdmin(req);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.code });

  const { db } = await getAdmin();
  const url = new URL(req.url);
  const includeNames = (url.searchParams.get('includeNames') || 'false').toLowerCase() === 'true';

  // Parse saleIds list if provided
  const saleId = url.searchParams.get('saleId');
  const saleIdsParam = url.searchParams.get('saleIds');
  let saleIds: string[] = [];
  if (saleId) saleIds.push(saleId);
  if (saleIdsParam) saleIds.push(...saleIdsParam.split(',').map((s) => s.trim()).filter(Boolean));
  saleIds = Array.from(new Set(saleIds));

  if (saleIds.length > 0) {
    // Owners for specific sale IDs
    const snaps = await Promise.all(saleIds.map((id) => db.collection('sale_items').doc(id).get()));

    const ownersBySaleId: Record<string, { providerId: string | null; providerName: string | null }> = {};
    const providerIdsSet = new Set<string>();

    snaps.forEach((s: any, idx: number) => {
      const id = saleIds[idx];
      if (!s.exists) {
        ownersBySaleId[id] = { providerId: null, providerName: null };
        return;
      }
      const d = s.data() || {};
      const providerId = typeof d.providerId === 'string' ? d.providerId : null;
      ownersBySaleId[id] = { providerId, providerName: null };
      if (providerId) providerIdsSet.add(providerId);
    });

    if (includeNames && providerIdsSet.size > 0) {
      const ids = Array.from(providerIdsSet);
      const userSnaps = await Promise.all(ids.map((id) => db.collection('users').doc(id).get()));
      const namesById: Record<string, string> = {};
      for (const s of userSnaps as any[]) {
        if (s.exists) {
          const d = s.data() || {};
          const name = d.displayName || d.name || (typeof d.email === 'string' ? d.email.split('@')[0] : null);
          if (name) namesById[s.id] = String(name);
        }
      }
      for (const [sid, val] of Object.entries(ownersBySaleId)) {
        if (val.providerId) ownersBySaleId[sid].providerName = namesById[val.providerId] || null;
      }
    }

    const missing = saleIds.filter((_, idx) => !snaps[idx].exists);
    return NextResponse.json({
      mode: 'lookup',
      saleIds,
      ownersBySaleId,
      missing,
    });
  }

  // Distinct provider IDs across sale_items with optional status filter
  const status = (url.searchParams.get('status') || 'approved') as 'pending' | 'approved' | 'sold' | 'hidden' | 'any' | 'all';
  const limitParam = Number(url.searchParams.get('limit') || '1000');
  const limitCount = Math.max(1, Math.min(5000, isNaN(limitParam) ? 1000 : limitParam));

  let q = db.collection('sale_items');
  if (status && status !== 'any' && status !== 'all') {
    q = q.where('status', '==', status);
  }
  q = q.limit(limitCount);

  const snap = await q.get();
  const idsSet = new Set<string>();
  snap.docs.forEach((d: any) => {
    const providerId = d.get('providerId');
    if (typeof providerId === 'string' && providerId) idsSet.add(providerId);
  });
  const providerIds = Array.from(idsSet);

  if (includeNames && providerIds.length > 0) {
    const userSnaps = await Promise.all(providerIds.map((id) => db.collection('users').doc(id).get()));
    const providers = (userSnaps as any[]).map((s: any) => {
      const d = s.data() || {};
      const name = d.displayName || d.name || (typeof d.email === 'string' ? d.email.split('@')[0] : null);
      return { id: s.id, name: name || null };
    });
    return NextResponse.json({ mode: 'distinct', status, count: providers.length, providers });
  }

  return NextResponse.json({ mode: 'distinct', status, count: providerIds.length, providerIds });
}
