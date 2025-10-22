"use client";

import { useState } from "react";
import { getIdTokenOrThrow } from "@/lib/auth-client";

export default function UsersOverridesPage() {
  const [email, setEmail] = useState("");
  const [uid, setUid] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  const [mode, setMode] = useState<"" | "force_show" | "force_hide">("");
  const [showAt, setShowAt] = useState<string>("");
  const [enforceAfterMonths, setEnforceAfterMonths] = useState<number | "">("");
  const [status, setStatus] = useState<'active' | 'disabled'>('active');
  const [emailVerified, setEmailVerifiedState] = useState<boolean | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [filterRole, setFilterRole] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [emailPrefix, setEmailPrefix] = useState<string>("");
  const [listOrderBy, setListOrderBy] = useState<'createdAt' | 'email'>('createdAt');
  const [nextCursor, setNextCursor] = useState<any | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);

  async function search() {
    setLoading(true); setError(null); setUser(null);
    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch('/api/users/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: email || undefined, uid: uid || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      setUser(json.user);
      const pg = json.user?.pricingGate || {};
      setMode(pg?.mode || "");
      const showAtISO = pg?.showAt?._seconds ? new Date(pg.showAt._seconds * 1000).toISOString().slice(0,16) : (pg?.showAt ? new Date(pg.showAt).toISOString().slice(0,16) : "");
      setShowAt(showAtISO);
      setEnforceAfterMonths(pg?.enforceAfterMonths ?? "");
      setStatus(json.user?.status === 'disabled' ? 'disabled' : 'active');
      setEmailVerifiedState(json.user?.emailVerified ?? null);
      setVerificationLink(null);
    } catch (e: any) {
      setError(e?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(next: 'active' | 'disabled') {
    if (!user?.uid) return;
    if (!confirm(`Are you sure you want to set status to ${next}?`)) return;
    setSaving(true); setError(null);
    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch('/api/users/set-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: user.uid, status: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      setStatus(json.status === 'disabled' ? 'disabled' : 'active');
      alert('Status updated');
    } catch (e: any) {
      setError(e?.message || 'Update status failed');
    } finally {
      setSaving(false);
    }
  }
  

  async function save() {
    if (!user?.uid) return;
    setSaving(true); setError(null);
    try {
      const token = await getIdTokenOrThrow();
      const payload: any = { uid: user.uid };
      if (mode) payload.mode = mode; else payload.mode = null;
      if (showAt) payload.showAt = new Date(showAt).toISOString(); else payload.showAt = null;
      if (enforceAfterMonths !== "") payload.enforceAfterMonths = enforceAfterMonths;
      const res = await fetch('/api/users/set-pricing-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      alert('Saved');
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function setEmailVerified(next: boolean) {
    if (!user?.uid) return;
    if (!confirm(`Are you sure you want to mark email as ${next ? 'verified' : 'unverified'}?`)) return;
    setSaving(true); setError(null);
    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch('/api/users/set-email-verified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: user.uid, verified: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      setEmailVerifiedState(!!json.emailVerified);
      alert('Email verification updated');
    } catch (e: any) {
      setError(e?.message || 'Update email verification failed');
    } finally {
      setSaving(false);
    }
  }

  async function loadUsers(mode: 'reset' | 'more' = 'reset') {
    setListLoading(true); setError(null);
    try {
      const token = await getIdTokenOrThrow();
      const body: any = {
        limit: 100,
        orderBy: listOrderBy,
      };
      if (filterRole) body.role = filterRole;
      if (filterStatus) body.status = filterStatus;
      if (emailPrefix) body.emailPrefix = emailPrefix;
      if (mode === 'more' && nextCursor) body.cursor = nextCursor;
      const res = await fetch('/api/users/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      const arr = Array.isArray(json.users) ? json.users : [];
      if (mode === 'more') setUsersList(prev => [...prev, ...arr]); else setUsersList(arr);
      setNextCursor(json.nextCursor || null);
      setHasMore(!!json.nextCursor);
    } catch (e: any) {
      setError(e?.message || 'List users failed');
    } finally {
      setListLoading(false);
    }
  }

  async function generateVerificationLink() {
    if (!user?.uid && !user?.email) return;
    setLinkLoading(true); setError(null); setVerificationLink(null);
    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch('/api/users/generate-verification-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: user?.uid, email: user?.email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      setVerificationLink(json.link || null);
    } catch (e: any) {
      setError(e?.message || 'Generate link failed');
    } finally {
      setLinkLoading(false);
    }
  }

  function copyLink() {
    if (!verificationLink) return;
    try { navigator.clipboard.writeText(verificationLink); alert('Copied'); } catch {}
  }

  return (
    <div className="oc-grid">
      <div className="oc-toolbar">
        <h1 className="oc-h1">Users</h1>
      </div>

      {error && (
        <div className="oc-card" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b' }}>{error}</div>
      )}

      <div className="oc-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="oc-title">All Users</h3>
          <div className="oc-actions">
            <button className="oc-btn" onClick={() => { setNextCursor(null); setHasMore(false); loadUsers('reset'); }} disabled={listLoading}>Apply filters</button>
            <button className="oc-btn oc-btn-primary" onClick={() => loadUsers('reset')} disabled={listLoading}>{listLoading ? 'Loading…' : 'Load users'}</button>
          </div>
        </div>
        <div className="oc-subtle" style={{ marginTop: 6 }}>Shows up to 100 per load. Use filters to narrow results.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
          <div>
            <label className="oc-label">Role</label>
            <select className="oc-input" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <option value="">(any)</option>
              <option value="owner">owner</option>
              <option value="admin">admin</option>
              <option value="provider">provider</option>
            </select>
          </div>
          <div>
            <label className="oc-label">Status</label>
            <select className="oc-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">(any)</option>
              <option value="active">active</option>
              <option value="disabled">disabled</option>
            </select>
          </div>
          <div>
            <label className="oc-label">Email starts with</label>
            <input className="oc-input" value={emailPrefix} onChange={(e) => setEmailPrefix(e.target.value)} placeholder="prefix@domain" />
          </div>
          <div>
            <label className="oc-label">Order by</label>
            <select className="oc-input" value={listOrderBy} onChange={(e) => setListOrderBy(e.target.value as any)}>
              <option value="createdAt">createdAt desc</option>
              <option value="email">email asc</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {['owner','admin','provider'].map(r => {
            const count = usersList.filter(u => (u.role||'') === r).length;
            return (
              <div key={r} className="oc-chip">
                <span>{r}</span>
                <span className="dot" />
                <span>{count}</span>
              </div>
            );
          })}
          <div className="oc-chip"><span>total</span><span className="dot" /><span>{usersList.length}</span></div>
        </div>
        <div className="oc-table-wrap" style={{ marginTop: 12 }}>
          <table className="oc-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Plan</th>
                <th>Verified</th>
                <th>UID</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.uid}>
                  <td className="oc-ellips" style={{ maxWidth: 280 }}>{u.email || '-'}</td>
                  <td>{u.role || '-'}</td>
                  <td>{u.status || '-'}</td>
                  <td>{u.plan || '-'}</td>
                  <td>{u.emailVerified == null ? '-' : (u.emailVerified ? 'yes' : 'no')}</td>
                  <td className="oc-ellips" style={{ maxWidth: 240 }}>{u.uid}</td>
                  <td>{u.createdAt || '-'}</td>
                </tr>
              ))}
              {(!usersList || usersList.length === 0) && (
                <tr>
                  <td colSpan={7} className="oc-subtle">{listLoading ? 'Loading…' : 'No users loaded yet.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 10 }}>
          <button className="oc-btn" onClick={() => loadUsers('more')} disabled={listLoading || !hasMore}>{listLoading ? 'Loading…' : (hasMore ? 'Load more' : 'No more')}</button>
        </div>
      </div>

      <div className="oc-card">
        <h3 className="oc-title" style={{ marginBottom: 8 }}>Find user</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12 }}>
          <div>
            <label className="oc-label">Email</label>
            <input className="oc-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div>
            <label className="oc-label">UID</label>
            <input className="oc-input" value={uid} onChange={(e) => setUid(e.target.value)} placeholder="firebase uid" />
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button className="oc-btn oc-btn-primary" onClick={search} disabled={loading}>Search</button>
          </div>
        </div>
      </div>

      {user && (
        <div className="oc-card">
          <h3 className="oc-title" style={{ marginBottom: 8 }}>User</h3>
          <div className="oc-kv">
            <div><span className="k">UID</span><span className="v">{user.uid}</span></div>
            <div><span className="k">Email</span><span className="v">{user.email || '-'}</span></div>
            <div><span className="k">Role</span><span className="v">{user.role || '-'}</span></div>
            <div><span className="k">Plan</span><span className="v">{user.plan || '-'}</span></div>
            <div><span className="k">Status</span><span className="v">{status}</span></div>
            <div><span className="k">Email Verified</span><span className="v">{emailVerified == null ? '-' : (emailVerified ? 'yes' : 'no')}</span></div>
            <div><span className="k">Created</span><span className="v">{user.createdAt || '-'}</span></div>
          </div>

          <div style={{ margin: '10px 0 18px' }}>
            {status === 'active' ? (
              <button className="oc-btn" onClick={() => toggleStatus('disabled')} disabled={saving}>Disable account</button>
            ) : (
              <button className="oc-btn oc-btn-primary" onClick={() => toggleStatus('active')} disabled={saving}>Enable account</button>
            )}
            <span style={{ display: 'inline-block', width: 12 }} />
            {emailVerified ? (
              <button className="oc-btn" onClick={() => setEmailVerified(false)} disabled={saving}>Mark email as unverified</button>
            ) : (
              <button className="oc-btn oc-btn-primary" onClick={() => setEmailVerified(true)} disabled={saving}>Mark email as verified</button>
            )}
            <span style={{ display: 'inline-block', width: 12 }} />
            <button className="oc-btn" onClick={generateVerificationLink} disabled={linkLoading}>Generate verification link</button>
          </div>

          {verificationLink && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <input className="oc-input" value={verificationLink} readOnly />
              <button className="oc-btn" onClick={copyLink}>Copy</button>
            </div>
          )}

          <h4 className="oc-title" style={{ margin: '12px 0 8px' }}>Pricing Overrides</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12 }}>
            <div>
              <label className="oc-label">Mode</label>
              <select className="oc-input" value={mode} onChange={(e) => setMode(e.target.value as any)}>
                <option value="">(default rules)</option>
                <option value="force_show">Force Show</option>
                <option value="force_hide">Force Hide</option>
              </select>
            </div>
            <div>
              <label className="oc-label">Show at (optional)</label>
              <input className="oc-input" type="datetime-local" value={showAt} onChange={(e) => setShowAt(e.target.value)} />
              <div className="oc-help">When reached, Pricing becomes visible for this user.</div>
            </div>
            <div>
              <label className="oc-label">Enforce after months (optional)</label>
              <input className="oc-input" type="number" min={0} value={enforceAfterMonths} onChange={(e) => setEnforceAfterMonths(e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value)||0)))} />
              <div className="oc-help">Overrides the global months for this user.</div>
            </div>
            <div style={{ alignSelf: 'end' }}>
              <button className="oc-btn oc-btn-primary" onClick={save} disabled={saving}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
