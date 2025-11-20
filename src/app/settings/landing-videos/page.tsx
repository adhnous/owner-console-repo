"use client";

import { useEffect, useRef, useState } from "react";
import { getIdTokenOrThrow } from "@/lib/auth-client";

export default function LandingVideosSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[]>([""]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    setOk(null);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch("/api/settings/landing-videos", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: ac.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || res.statusText || "Failed");

      const arr: string[] = Array.isArray(json?.urls) ? json.urls : [];
      if (arr.length === 0) {
        setUrls([""]);
      } else {
        setUrls(arr.slice(0, 20));
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError(e?.message || "Failed to load");
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }

  function updateUrl(index: number, value: string) {
    setUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addRow() {
    setUrls((prev) => {
      if (prev.length >= 20) return prev;
      return [...prev, ""];
    });
  }

  function removeRow(index: number) {
    setUrls((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [""] : next;
    });
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    setOk(null);

    try {
      const token = await getIdTokenOrThrow();
      const bodyUrls = urls
        .map((u) => String(u || "").trim())
        .filter((u) => u.length > 0)
        .slice(0, 20);

      const res = await fetch("/api/settings/landing-videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ urls: bodyUrls }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || res.statusText || "Failed");

      const saved: string[] = Array.isArray(json?.urls) ? json.urls : bodyUrls;
      setUrls(saved.length === 0 ? [""] : saved);
      setOk("Landing page videos updated.");
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Landing page videos</h1>
        <p className="mt-1 text-sm text-gray-600">
          Paste up to 20 YouTube links to show on the public landing page. Any
          YouTube URL format is accepted; we will store them as embed links.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {ok && (
            <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {ok}
            </div>
          )}

          <div className="space-y-3">
            {urls.map((u, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder={
                    idx === 0
                      ? "https://www.youtube.com/watch?v=…"
                      : "Optional extra video link"
                  }
                  value={u}
                  onChange={(e) => updateUrl(idx, e.target.value)}
                />
                <button
                  type="button"
                  className="rounded border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                  onClick={() => removeRow(idx)}
                  disabled={urls.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              className="rounded border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
              onClick={addRow}
              disabled={urls.length >= 20}
            >
              Add video
            </button>

            <button
              type="button"
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

