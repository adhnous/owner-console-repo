import { getAdmin } from '@/lib/firebase-admin';

// Existing helper kept for owner-or-admin checks (UI gating etc.)
export const requireOwnerOrAdmin = async (req: Request) => {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, code: 401 as const, error: 'missing_token' };
  }
  const token = authHeader.slice(7);
  const { auth, db } = await getAdmin();
  // Step 1: verify token
  let decoded: any;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    return { ok: false as const, code: 401 as const, error: 'invalid_token' };
  }
  const uid = decoded.uid as string;
  // Step 2: check role by custom claim or users doc
  try {
    const claimRole = (decoded?.role as string) || null;
    if (claimRole === 'admin') return { ok: true as const, uid, role: 'admin' as const };
    const snap = await db.collection('users').doc(uid).get();
    const role = (snap.exists ? (snap.get('role') as string) : null) || null;
    if (role === 'owner' || role === 'admin') {
      return { ok: true as const, uid, role: (role === 'admin' ? 'admin' : 'owner') };
    }
    return { ok: false as const, code: 403 as const, error: 'forbidden' };
  } catch {
    return { ok: false as const, code: 500 as const, error: 'role_lookup_failed' };
  }
};

// New: strict admin requirement for server routes
export const requireAdmin = async (req: Request) => {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, code: 401 as const, error: 'missing_token' };
  }
  const token = authHeader.slice(7);
  const { auth, db } = await getAdmin();
  let decoded: any;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    return { ok: false as const, code: 401 as const, error: 'invalid_token' };
  }
  const uid = decoded.uid as string;
  const claimRole = (decoded?.role as string) || null;
  if (claimRole === 'admin') return { ok: true as const, uid, role: 'admin' as const };
  try {
    const snap = await db.collection('users').doc(uid).get();
    const role = (snap.exists ? (snap.get('role') as string) : null) || null;
    if (role === 'admin') return { ok: true as const, uid, role: 'admin' as const };
    return { ok: false as const, code: 403 as const, error: 'admin_required' };
  } catch {
    return { ok: false as const, code: 500 as const, error: 'role_lookup_failed' };
  }
};

// For Firebase Functions compatibility (callable context)
export function verifyAdmin(context: { auth?: { uid?: string; token?: any } } | null) {
  if (!context?.auth) return { ok: false as const, code: 401 as const, error: 'unauthenticated' as const };
  const role = (context.auth.token?.role as string) || null;
  if (role === 'admin') return { ok: true as const, uid: String(context.auth.uid || '') };
  return { ok: false as const, code: 403 as const, error: 'admin_required' as const };
}
