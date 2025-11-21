"use client";

import { useEffect, useMemo, useState } from 'react';
import { getIdTokenOrThrow } from '@/lib/auth-client';

type Row = {
  id: string;
  title: string;
  university: string;
  course: string;
  year: string;
  type: string;
  language: string | null;
  hasFile: boolean;
  driveLink?: string | null;
  uploaderId?: string | null;
  createdAt: string | null;
  status?: 'pending' | 'approved' | 'rejected' | null;
};

type FilterType = '' | 'exam' | 'assignment' | 'notes' | 'report' | 'book' | 'other';
type FilterLanguage = '' | 'ar' | 'en' | 'both';
type FilterStatus = '' | 'pending' | 'approved' | 'rejected';

export default function StudentBankAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [type, setType] = useState<FilterType>('');
  const [language, setLanguage] = useState<FilterLanguage>('');
  const [status, setStatusFilter] = useState<FilterStatus>('');

  const [savingId, setSavingId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q.trim());
    if (type) p.set('type', type);
    if (language) p.set('language', language);
    if (status) p.set('status', status);
    p.set('limit', '200');
    return p.toString();
  }, [q, type, language, status]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch(`/api/student-bank/admin/list?${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      setRows(json.rows || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load student resources');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  async function editRow(r: Row) {
    const title = window.prompt('Title', r.title) ?? r.title;
    const university = window.prompt('University', r.university || '') ?? r.university;
    const course = window.prompt('Course / subject', r.course || '') ?? r.course;
    const year = window.prompt('Year / term', r.year || '') ?? r.year;
    const type = (window.prompt(
      'Type (exam, assignment, notes, report, book, other)',
      r.type,
    ) || r.type) as FilterType;
    const language = (window.prompt('Language (ar, en, both)', r.language || '') ||
      r.language ||
      '') as FilterLanguage;

    setSavingId(r.id);
    try {
      const token = await getIdTokenOrThrow();
      const payload: any = {
        id: r.id,
        title,
        university,
        course,
        year,
        type,
        language: language || undefined,
      };
      const res = await fetch('/api/student-bank/admin/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Update failed');
    } finally {
      setSavingId(null);
    }
  }

  async function removeRow(r: Row) {
    if (!confirm('Delete student resource? This cannot be undone.')) return;
    setSavingId(r.id);
    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch('/api/student-bank/admin/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: r.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e: any) {
      alert(e?.message || 'Delete failed');
    } finally {
      setSavingId(null);
    }
  }

  async function setStatus(r: Row, status: 'pending' | 'approved' | 'rejected') {
    setSavingId(r.id);
    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch('/api/student-bank/admin/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: r.id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Status update failed');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="oc-grid">
      <div className="oc-toolbar">
        <h1 className="oc-h1">Student Resource Bank</h1>
        <button className="oc-btn" onClick={load} disabled={loading}>
          Reload
        </button>
      </div>

      <div className="oc-card" style={{ marginBottom: 12 }}>
        <h3 className="oc-title" style={{ marginBottom: 8 }}>
          Filters
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div>
            <label className="oc-label">Search</label>
            <input
              className="oc-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title, university, or course"
            />
          </div>
          <div>
            <label className="oc-label">Type</label>
            <select
              className="oc-input"
              value={type}
              onChange={(e) => setType(e.target.value as FilterType)}
            >
              <option value="">Any</option>
              <option value="exam">Exam</option>
              <option value="assignment">Assignment</option>
              <option value="notes">Notes</option>
              <option value="report">Report</option>
              <option value="book">Book</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="oc-label">Language</label>
            <select
              className="oc-input"
              value={language}
              onChange={(e) => setLanguage(e.target.value as FilterLanguage)}
            >
              <option value="">Any</option>
              <option value="ar">AR</option>
              <option value="en">EN</option>
              <option value="both">AR + EN</option>
            </select>
          </div>
          <div>
            <label className="oc-label">Status</label>
            <select
              className="oc-input"
              value={status}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            >
              <option value="">Any</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button className="oc-btn" onClick={load} disabled={loading}>
              Apply
            </button>
          </div>
        </div>
      </div>

      <div className="oc-card">
        {error && (
          <div className="oc-error" style={{ marginBottom: 8 }}>
            {error}
          </div>
        )}
        {loading ? (
          <div className="oc-subtle">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="oc-subtle">No student resources found for this filter.</div>
        ) : (
          <table className="oc-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>University / Course</th>
                <th>Status</th>
                <th>Type</th>
                <th>Lang</th>
                <th>File</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="oc-strong">{r.title || '(no title)'}</div>
                    <div className="oc-subtle text-xs">
                      ID: <span className="font-mono text-[10px]">{r.id}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className="oc-subtle text-xs"
                      style={{
                        fontWeight: 600,
                        color:
                          r.status === 'approved'
                            ? '#166534'
                            : r.status === 'rejected'
                            ? '#991b1b'
                            : '#92400e',
                      }}
                    >
                      {r.status || 'pending'}
                    </span>
                  </td>
                  <td>
                    <div>{r.university || '-'}</div>
                    <div className="oc-subtle text-xs">{r.course || '-'}</div>
                    {r.year && (
                      <div className="oc-subtle text-xs">Year: {r.year}</div>
                    )}
                  </td>
                  <td>{r.type || '-'}</td>
                  <td>{r.language || '-'}</td>
                  <td>
                    {r.hasFile && r.driveLink ? (
                      <a
                        href={r.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="oc-link"
                      >
                        Open
                      </a>
                    ) : (
                      <span className="oc-subtle text-xs">No file</span>
                    )}
                  </td>
                  <td className="oc-subtle text-xs">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {r.status !== 'approved' && (
                        <button
                          className="oc-btn oc-btn-sm"
                          onClick={() => setStatus(r, 'approved')}
                          disabled={savingId === r.id}
                        >
                          Approve
                        </button>
                      )}
                      <button
                        className="oc-btn oc-btn-sm"
                        onClick={() => editRow(r)}
                        disabled={savingId === r.id}
                      >
                        Edit
                      </button>
                      <button
                        className="oc-btn oc-btn-sm oc-btn-red"
                        onClick={() => removeRow(r)}
                        disabled={savingId === r.id}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
