"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { getIdTokenOrThrow } from '@/lib/auth-client';

type Row = {
  id: string;
  title: string;
  status: string | null;
  providerId: string;
  providerName?: string | null;
  ownerEmail?: string | null;
  createdAt?: string | null;
};

export default function AdminServicesPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [targetEmail, setTargetEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  async function load() {
    setLoading(true); setError(null);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const token = await getIdTokenOrThrow();
      const sp = new URLSearchParams();
      if (status) sp.set('status', status);
      if (ownerEmail) sp.set('email', ownerEmail.trim());
      if (q) sp.set('q', q.trim());
      sp.set('limit', '200');
      const res = await fetch(`/api/services/admin/list?${sp.toString()}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: ac.signal });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      const arr: Row[] = (json.rows || []) as any;
      setRows(arr);
      setSelected({});
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message || 'load_failed');
    } finally { if (!ac.signal.aborted) setLoading(false); }
  }

  useEffect(() => { load(); return () => abortRef.current?.abort(); }, []);

  const [page, setPage] = useState(1);
  const pageSize = 50;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = useMemo(() => rows.slice((page-1)*pageSize, (page-1)*pageSize + pageSize), [rows, page]);
  const allChecked = pagedRows.length > 0 && pagedRows.every((r) => !!selected[r.id]);
  function toggleAll() {
    if (allChecked) {
      const next = { ...selected }; for (const r of pagedRows) next[r.id] = false; setSelected(next); return;
    }
    const next: Record<string, boolean> = { ...selected }; for (const r of pagedRows) next[r.id] = true; setSelected(next);
  }
  function toggleOne(id: string) { setSelected((prev) => ({ ...prev, [id]: !prev[id] })); }
  function selectPage() { const next: Record<string, boolean> = { ...selected }; for (const r of pagedRows) next[r.id] = true; setSelected(next); }
  function clearSelection() { setSelected({}); }

  function confirmText(newOwner: string, count: number) {
    return `Reassign ${count} service(s) to ${newOwner}? This updates ownerId/ownerEmail and logs an event.`;
  }

  async function reassign(toEmail?: string, toSelf?: boolean) {
    const ids = selectedIds;
    if (ids.length === 0) { setToast('Select at least one service.'); return; }
    let newOwner = toSelf ? 'your account' : (toEmail || '').trim();
    if (!toSelf && !newOwner) { setToast('Enter a target email.'); return; }
    if (!toSelf && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newOwner)) { setToast('Enter a valid email.'); return; }
    if (!confirm(confirmText(String(newOwner), ids.length))) return;
    setBusy(true); setToast(null);
    try {
      const token = await getIdTokenOrThrow();
      const idempotencyKey = `${Date.now()}_${ids.join(',')}_${newOwner || 'self'}`;
      const res = await fetch('/api/services/admin/reassign-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids, targetEmail: toSelf ? undefined : newOwner, assignToSelf: !!toSelf, idempotencyKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      const updated = json.updated || 0;
      const notFound = Array.isArray(json.notFound) ? json.notFound.length : 0;
      const skipped = Array.isArray(json.skipped) ? json.skipped.length : 0;
      const summary = `Updated ${updated}` + (skipped?`, skipped ${skipped}`:'') + (notFound?`, not found ${notFound}`:'');
      setToast(summary);
      await load();
    } catch (e: any) {
      setToast(e?.message || 'reassign_failed');
    } finally { setBusy(false); }
  }

  return (
    <div className="oc-grid">
      <div className="oc-toolbar">
        <h1 className="oc-h1">Admin • Services</h1>
      </div>

      {toast && (<div className="oc-card">{toast}</div>)}
      {error && (<div className="oc-card" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b' }}>{error}</div>)}

      <div className="oc-card" style={{ marginBottom: 12 }}>
        <h3 className="oc-title" style={{ marginBottom: 8 }}>Search & Filters</h3>
        <div className="oc-filter-grid cols-4">
          <div className="oc-field">
            <label className="oc-label">Title contains</label>
            <input className="oc-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="plumbing, design..." />
          </div>
          <div className="oc-field">
            <label className="oc-label">Status</label>
            <select className="oc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">(any)</option>
              <option value="draft">draft</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          </div>
          <div className="oc-field">
            <label className="oc-label">Owner email (exact)</label>
            <input className="oc-input" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div>
            <button className="oc-btn oc-btn-primary oc-btn-sm" onClick={() => { setPage(1); load(); }} disabled={loading}>Apply</button>
          </div>
        </div>
      </div>

      <div className="oc-card" style={{ marginBottom: 12 }}>
        <h3 className="oc-title" style={{ marginBottom: 8 }}>Reassign Owner</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <label className="oc-label">Target email</label>
            <input className="oc-input" type="email" placeholder="user@domain.com" value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} />
          </div>
          <div>
            <button className="oc-btn oc-btn-primary" onClick={() => reassign(targetEmail, false)} disabled={busy || selectedIds.length === 0}>Reassign Owner</button>
          </div>
          <div>
            <button className="oc-btn" onClick={() => reassign(undefined, true)} disabled={busy || selectedIds.length === 0}>Assign to me</button>
          </div>
          <div className="oc-subtle">Selected: {selectedIds.length}</div>
          <div style={{ marginLeft: 'auto', display:'flex', gap:8 }}>
            <button className="oc-btn oc-btn-sm" onClick={selectPage} disabled={pagedRows.length===0}>Select page</button>
            <button className="oc-btn oc-btn-sm" onClick={clearSelection} disabled={selectedIds.length===0}>Clear selection</button>
          </div>
        </div>
      </div>

      <div className="oc-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 16 }}>
            <div className="oc-skel-line lg" style={{ width: '30%', marginBottom: 12 }} />
            <div className="oc-skel-line" style={{ width: '90%', marginBottom: 8 }} />
            <div className="oc-skel-line sm" style={{ width: '70%' }} />
          </div>
        ) : (
          <div className="oc-table-wrap">
            <table className="oc-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                  <th>Title</th>
                  <th style={{ width: 140 }}>Status</th>
                  <th style={{ width: 260 }}>Owner email</th>
                  <th style={{ width: 200 }}>Created</th>
                  <th style={{ width: 280 }}>ID</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((r) => (
                  <tr key={r.id}>
                    <td><input type="checkbox" checked={!!selected[r.id]} onChange={() => toggleOne(r.id)} /></td>
                    <td><div className="oc-title" title={r.title || r.id}>{r.title || r.id}</div></td>
                    <td><span className={`oc-badge ${r.status || 'pending'}`}>{r.status || '-'}</span></td>
                    <td className="oc-td-mono" title={(r as any).ownerEmail || ''}>{(r as any).ownerEmail || '-'}</td>
                    <td className="oc-td-mono">{r.createdAt || '-'}</td>
                    <td className="oc-td-mono">{r.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="oc-actions" style={{ justifyContent: 'space-between' }}>
        <div className="oc-subtle">{rows.length} result(s)</div>
        <div className="oc-actions">
          <button className="oc-btn" onClick={() => setPage(Math.max(1, page-1))} disabled={page<=1}>Prev</button>
          <div className="oc-subtle">Page {page} / {pages}</div>
          <button className="oc-btn" onClick={() => setPage(Math.min(pages, page+1))} disabled={page>=pages}>Next</button>
        </div>
      </div>
    </div>
  );
}
