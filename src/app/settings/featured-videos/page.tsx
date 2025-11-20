"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { getIdTokenOrThrow } from "@/lib/auth-client";

type Svc = { id: string; title: string; status?: string; videoUrl?: string; videoUrls?: string[] };

function hasVideo(s: any): boolean {
  if (!s) return false;
  if (Array.isArray(s.videoUrls)) return s.videoUrls.length > 0;
  return !!s.videoUrl;
}

function youTubeThumb(s: Svc): string {
  const urls: string[] = [
    ...((s.videoUrls as string[] | undefined) || []),
    ...((s.videoUrl ? [String(s.videoUrl)] : []) as string[]),
  ];
  const yt = urls.find((u) => /youtu\.be\//i.test(u) || /youtube\.com\/watch\?v=/i.test(u) || /youtube\.com\/embed\//i.test(u));
  if (yt) {
    const idMatch =
      yt.match(/youtu\.be\/([\w-]+)/i)?.[1] ||
      yt.match(/[?&]v=([\w-]+)/i)?.[1] ||
      yt.match(/embed\/([\w-]+)/i)?.[1] ||
      "";
    if (idMatch) return `https://img.youtube.com/vi/${idMatch}/hqdefault.jpg`;
  }
  return "https://placehold.co/400x300.png";
}

export default function FeaturedVideosSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [queryText, setQueryText] = useState("");
  const [all, setAll] = useState<Svc[]>([]);
  const [selected, setSelected] = useState<Svc[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, []);

  async function load() {
    setLoading(true); setError(null); setOk(null);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      // 1) Load curated IDs from API
      const token = await getIdTokenOrThrow();
      const res = await fetch("/api/settings/home-featured", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: ac.signal });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || res.statusText || "failed");
      const ids: string[] = Array.isArray(json?.ids) ? json.ids : [];
      const svcsFromApi: Svc[] = Array.isArray(json?.services) ? json.services : [];

      // 2) Resolve any missing titles for selected
      const selectedFull: Svc[] = [];
      for (const s of svcsFromApi) {
        if (s && s.id) {
          // If API didn't include title, fetch doc
          if (!s.title) {
            try {
              const d = await getDoc(doc(db, "services", s.id));
              if (d.exists()) {
                const data: any = d.data() || {};
                selectedFull.push({ id: d.id, title: String(data.title || "(no title)"), status: data.status, videoUrl: data.videoUrl, videoUrls: data.videoUrls });
              }
            } catch { /* ignore */ }
          } else {
            selectedFull.push(s);
          }
        }
      }

      // 3) Load recent approved services client-side and filter for videos
      const q1 = query(collection(db, "services"), where("status", "==", "approved"), limit(120));
      const snap = await getDocs(q1);
      const pool: Svc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any;
      const candidates = pool.filter((s) => hasVideo(s));

      // 4) Apply initial state
      const selById = new Map(selectedFull.map((s) => [s.id, s]));
      const sel = ids.map((id) => selById.get(id)).filter(Boolean) as Svc[];
      setSelected(sel);
      // Avoid duplicates between candidates and selected
      const candidateFiltered = candidates.filter((c) => !selById.has(c.id));
      setAll(candidateFiltered);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) return all;
    return all.filter((s) => String(s.title || "").toLowerCase().includes(q));
  }, [all, queryText]);

  function addSvc(s: Svc) {
    setSelected((prev) => [...prev, s]);
    setAll((prev) => prev.filter((x) => x.id !== s.id));
  }
  function removeSvc(id: string) {
    const idx = selected.findIndex((s) => s.id === id);
    if (idx >= 0) {
      setAll((prev) => [selected[idx], ...prev]);
      setSelected((prev) => prev.filter((s) => s.id !== id));
    }
  }
  function move(id: string, dir: -1 | 1) {
    setSelected((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      if (i < 0) return prev;
      const j = Math.min(prev.length - 1, Math.max(0, i + dir));
      if (i === j) return prev;
      const next = [...prev];
      const [item] = next.splice(i, 1);
      next.splice(j, 0, item);
      return next;
    });
  }

  async function save() {
    if (saving) return;
    setSaving(true); setError(null); setOk(null);
    try {
      const token = await getIdTokenOrThrow();
      const ids = selected.map((s) => s.id);
      const res = await fetch("/api/settings/home-featured", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || res.statusText || "failed");
      setOk("Saved featured videos.");
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-gray-600">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Featured Videos</h1>
          <div className="flex items-center gap-2">
            <button onClick={load} className="px-3 py-2 rounded-lg border bg-white">Reload</button>
            <button onClick={save} disabled={saving} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>}
        {ok && <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">{ok}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Candidates */}
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Search services (approved with video)</h2>
              <input value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="Search by title" className="px-3 py-2 rounded-lg border w-48" />
            </div>
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {filtered.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                  <img src={youTubeThumb(s)} className="w-16 h-10 object-cover rounded" alt="thumb" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">{s.title || s.id}</div>
                    <div className="text-xs text-gray-500">{s.id}</div>
                  </div>
                  <button onClick={() => addSvc(s)} className="px-2 py-1 text-sm rounded-lg bg-emerald-600 text-white">Add</button>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-sm text-gray-500">No candidates. Try clearing the search.</div>
              )}
            </div>
          </div>

          {/* Selected */}
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Selected (order is preserved)</h2>
              <div className="text-xs text-gray-500">{selected.length} items</div>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {selected.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                  <img src={youTubeThumb(s)} className="w-16 h-10 object-cover rounded" alt="thumb" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">{s.title || s.id}</div>
                    <div className="text-xs text-gray-500">{s.id}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => move(s.id, -1)} disabled={i===0} className="px-2 py-1 text-sm rounded-lg border disabled:opacity-40">Up</button>
                    <button onClick={() => move(s.id, 1)} disabled={i===selected.length-1} className="px-2 py-1 text-sm rounded-lg border disabled:opacity-40">Down</button>
                    <button onClick={() => removeSvc(s.id)} className="px-2 py-1 text-sm rounded-lg bg-red-600 text-white">Remove</button>
                  </div>
                </div>
              ))}
              {selected.length === 0 && (
                <div className="text-sm text-gray-500">Nothing selected yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
