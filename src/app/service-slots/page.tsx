"use client";

import { useEffect, useMemo, useState } from 'react';
import { getIdTokenOrThrow } from '@/lib/auth-client';

export default function ServiceSlotsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [status, setStatus] = useState<string>('pending');
  const [uid, setUid] = useState('');
  const [email, setEmail] = useState('');
  const [paid, setPaid] = useState<string>('');

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (uid) p.set('uid', uid.trim());
    if (email) p.set('email', email.trim());
    if (paid) p.set('paid', paid);
    p.set('limit', '300');
    return p.toString();
  }, [status, uid, email, paid]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch(`/api/service-slots/list?${qs}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      setRows(json.rows || []);
    } catch (e: any) {
      setError(e?.message || 'load_failed');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function update(id: string, partial: any) {
    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch('/api/service-slots/update', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id, ...partial }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      await load();
      alert('Updated');
    } catch (e: any) {
      alert(e?.message || 'update_failed');
    }
  }

  return (
    <div className="oc-grid">
      <div className="oc-toolbar">
        <h1 className="oc-h1">Service Slot Requests</h1>
      </div>

      <div className="oc-card" style={{ marginBottom: 12 }}>
        <h3 className="oc-title" style={{ marginBottom: 8 }}>Filters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1.5fr 180px auto', gap: 12 }}>
          <div>
            <label className="oc-label">Status</label>
            <select className="oc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">(any)</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="oc-label">UID</label>
            <input className="oc-input" value={uid} onChange={(e) => setUid(e.target.value)} />
          </div>
          <div>
            <label className="oc-label">Email</label>
            <input className="oc-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="oc-label">Paid</label>
            <select className="oc-input" value={paid} onChange={(e) => setPaid(e.target.value)}>
              <option value="">(any)</option>
              <option value="true">Paid</option>
              <option value="false">Unpaid</option>
            </select>
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button className="oc-btn oc-btn-primary" onClick={load} disabled={loading}>Apply</button>
          </div>
        </div>
      </div>

      {error && (<div className="oc-card" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b' }}>{error}</div>)}

      <div className="oc-grid">
        {loading ? (
          <div className="oc-card">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="oc-card">No requests.</div>
        ) : (
          rows.map((r) => {
            const fmt = (iso: string | null) => {
              if (!iso) return '-';
              const d = new Date(iso);
              if (isNaN(d.getTime())) return iso;
              return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            };
            return (
              <div key={r.id} className="oc-card">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <h3 className="oc-title" title={r.id}>{r.email || r.uid}</h3>
                      <span className={`oc-badge ${r.status}`}>{r.status}</span>
                    </div>
                    <div className="oc-meta" style={{ marginTop: 6 }}>
                      <span className="oc-subtle">UID: {r.uid}</span>
                      <span className="oc-subtle">Created: {fmt(r.createdAt)}</span>
                      {r.approvedAt && <span className="oc-subtle">Approved: {fmt(r.approvedAt)}</span>}
                      {r.consumed && <span className="oc-subtle">Consumed</span>}
                      {r.paid && <span className="oc-subtle">Paid</span>}
                    </div>
                    <div className="oc-meta" style={{ marginTop: 6 }}>
                      <span className="oc-subtle">Notes: {r.notes || '-'}</span>
                    </div>
                  </div>
                  <div className="oc-actions">
                    {r.status !== 'approved' && (
                      <button className="oc-btn oc-btn-green" onClick={() => update(r.id, { status: 'approved' })}>Approve</button>
                    )}
                    {r.status !== 'rejected' && (
                      <button className="oc-btn oc-btn-red" onClick={() => update(r.id, { status: 'rejected' })}>Reject</button>
                    )}
                    <button className="oc-btn" onClick={() => update(r.id, { paid: !r.paid })}>{r.paid ? 'Mark Unpaid' : 'Mark Paid'}</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
