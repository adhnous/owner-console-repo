"use client";

import { useEffect, useState } from 'react';
import { getIdTokenOrThrow } from '@/lib/auth-client';

const MAIN_APP_BASE = process.env.NEXT_PUBLIC_MAIN_APP_URL || '';

type Row = {
  id: string;
  title: string;
  providerId: string;
  providerName?: string | null;
  status: 'pending' | 'approved' | 'sold' | 'hidden' | null;
  createdAt: string | null;
  imageUrl?: string | null;
  images?: { url: string }[];
  tags?: string[];
  price?: number | null;
  city?: string | null;
  condition?: string | null;
  tradeEnabled?: boolean;
};

type Status = 'pending' | 'approved' | 'sold' | 'hidden';

export default function SalesModerationPage() {
  const [status, setStatus] = useState<Status>('pending');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch(`/api/sales/list?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      setRows(json.rows || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [status]);

  async function update(id: string, next: Status) {
    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch('/api/sales/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed to update');
    }
  }

  function fmtPrice(n?: number | null) {
    if (typeof n !== 'number') return null;
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'LYD', maximumFractionDigits: 0 }).format(n); } catch { return `${n} LYD`; }
  }

  function badgeClass(s: Row['status']) { return `oc-badge ${s ?? 'pending'}`; }

  function primaryTag(r: Row): string | null {
    if (!Array.isArray(r.tags)) return null;
    const first = r.tags.find((t) => !!t && typeof t === 'string');
    return first || null;
  }

  return (
    <div className="oc-grid">
      <div className="oc-toolbar">
        <h1 className="oc-h1">Sales Moderation</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="oc-tabs">
            {(['pending', 'approved', 'sold', 'hidden'] as Status[]).map((s) => (
              <button
                key={s}
                type="button"
                className={`oc-tab ${status === s ? 'active' : ''}`}
                onClick={() => setStatus(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="oc-card" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b' }}>{error}</div>}

      <div className="oc-grid">
        {loading ? (
          <div className="oc-card">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="oc-card">No sale items.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="oc-card oc-row">
              <img className="oc-thumb" alt={r.title || r.id} src={r.imageUrl || 'https://placehold.co/240x180.png'} loading="lazy" />
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 className="oc-title" title={r.title}>{r.title || r.id}</h3>
                  <span className={badgeClass(r.status)}>{r.status}</span>
                </div>
                <div className="oc-meta">
                  {primaryTag(r) && <span>{primaryTag(r)}</span>}
                  {typeof r.price === 'number' && <span>{fmtPrice(r.price)}</span>}
                  {r.city && <span>{r.city}</span>}
                  {r.condition && <span>{r.condition}</span>}
                  {r.tradeEnabled && <span>Trade</span>}
                </div>
                {(r.images && r.images.length > 1) && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {r.images.slice(1, 5).map((im, i) => (
                      <img key={i} src={im.url} alt={`img-${i}`} style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />
                    ))}
                  </div>
                )}
                <div className="oc-meta" style={{ marginTop: 6 }}>
                  <span className="oc-subtle">Provider: {r.providerName || r.providerId}</span>
                  <span className="oc-subtle">Created: {r.createdAt || '-'}</span>
                </div>
                <div className="oc-meta" style={{ marginTop: 6 }}>
                  <a
                    href={MAIN_APP_BASE ? `${MAIN_APP_BASE}/sales/${r.id}` : `/sales/${r.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="oc-subtle"
                    style={{ textDecoration: 'underline' }}
                  >
                    View
                  </a>
                </div>
              </div>
              <div className="oc-actions">
                {status !== 'approved' && (
                  <button className="oc-btn oc-btn-green" onClick={() => update(r.id, 'approved')}>Approve</button>
                )}
                {status !== 'pending' && (
                  <button className="oc-btn" onClick={() => update(r.id, 'pending')}>Mark Pending</button>
                )}
                {status !== 'hidden' && (
                  <button className="oc-btn" onClick={() => update(r.id, 'hidden')}>Hide</button>
                )}
                {status !== 'sold' && (
                  <button className="oc-btn oc-btn-red" onClick={() => update(r.id, 'sold')}>Mark Sold</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
