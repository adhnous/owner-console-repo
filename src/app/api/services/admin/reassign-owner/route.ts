import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdmin } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  ids?: string[];
  targetEmail?: string;
  assignToSelf?: boolean;
  idempotencyKey?: string;
};

export async function POST(req: Request) {
  const authz = await requireAdmin(req);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.code });

  const { db, auth, FieldValue } = await getAdmin();

  const body: Body = await req.json().catch(() => ({} as any));
  const rawIds = Array.isArray(body.ids) ? body.ids : [];
  const ids = rawIds
    .filter((v) => typeof v === 'string' && v.trim())
    .map((v) => v.trim());
  if (!ids.length) return NextResponse.json({ error: 'no_ids' }, { status: 400 });

  const assignToSelf = body.assignToSelf === true;
  const targetEmailRaw = (body.targetEmail || '').trim().toLowerCase();
  if (!assignToSelf && !targetEmailRaw) {
    return NextResponse.json({ error: 'target_required' }, { status: 400 });
  }

  // Resolve target user (uid + email) using Admin Auth. Never trust client for owner identity.
  let targetUid: string | null = null;
  let targetEmail: string | null = null;
  try {
    if (assignToSelf) {
      targetUid = (authz as any).uid;
      const rec = await auth.getUser(targetUid);
      if (rec?.disabled) return NextResponse.json({ error: 'target_disabled' }, { status: 400 });
      targetEmail = (rec.email || '').trim().toLowerCase() || null;
      if (!targetEmail) return NextResponse.json({ error: 'target_missing_email' }, { status: 400 });
    } else {
      const rec = await auth.getUserByEmail(targetEmailRaw);
      if (!rec?.uid) return NextResponse.json({ error: 'target_not_found' }, { status: 404 });
      if (rec.disabled) return NextResponse.json({ error: 'target_disabled' }, { status: 400 });
      targetUid = rec.uid;
      targetEmail = (rec.email || targetEmailRaw).trim().toLowerCase();
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'target_not_found' }, { status: 404 });
  }
  if (!targetUid || !targetEmail) {
    return NextResponse.json({ error: 'target_unresolvable' }, { status: 400 });
  }

  // Process in batches with audit logging
  const unique = Array.from(new Set(ids));
  let updated = 0;
  const notFound: string[] = [];
  let batch = db.batch();
  let ops = 0;
  const skipped: string[] = [];
  const results: Array<{ id: string; status: 'updated'|'skipped'|'not_found' }> = [];
  const idem = (body.idempotencyKey || '').trim();

  for (const id of unique) {
    const ref = db.collection('services').doc(id);
    const snap = await ref.get();
    if (!snap.exists) { notFound.push(id); results.push({ id, status: 'not_found' }); continue; }
    const cur = snap.data() || {};
    const prevOwnerId = cur.ownerId || cur.providerId || null;
    const prevOwnerEmail = cur.ownerEmail || null;

    // Skip if already owned by target
    if (String(prevOwnerId || '') === String(targetUid)) {
      skipped.push(id);
      results.push({ id, status: 'skipped' });
      continue;
    }

    // Idempotency guard
    if (idem) {
      const q = await db.collection('service_events')
        .where('type','==','reassign_owner')
        .where('serviceId','==', id)
        .where('toOwnerId','==', targetUid)
        .where('idempotencyKey','==', idem)
        .limit(1)
        .get();
      if (!q.empty) {
        skipped.push(id);
        results.push({ id, status: 'skipped' });
        continue;
      }
    }

    batch.update(ref, {
      ownerId: targetUid,
      ownerEmail: targetEmail,
      providerId: targetUid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: (authz as any).uid,
    });
    const logRef = db.collection('service_events').doc();
    batch.set(logRef, {
      type: 'reassign_owner',
      serviceId: id,
      fromOwnerId: prevOwnerId,
      fromOwnerEmail: prevOwnerEmail,
      toOwnerId: targetUid,
      toOwnerEmail: targetEmail,
      actorUid: (authz as any).uid,
      idempotencyKey: idem || null,
      at: FieldValue.serverTimestamp(),
    });
    ops += 2; updated++;
    results.push({ id, status: 'updated' });
    if (ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
  }
  if (ops > 0) await batch.commit();

  return NextResponse.json({ ok: true, updated, notFound, skipped, results, targetUid, targetEmail });
}
