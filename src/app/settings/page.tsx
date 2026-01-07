"use client";

import { useEffect, useRef, useState } from "react";
import { getIdTokenOrThrow } from "@/lib/auth-client";

type Features = {
  pricingEnabled: boolean;
  showForProviders: boolean;
  showForSeekers: boolean;
  enforceAfterMonths: number;
  lockAllToPricing: boolean;
  lockProvidersToPricing: boolean;
  lockSeekersToPricing: boolean;
  showCityViews: boolean;
};

type FeaturesResponse = { features?: Partial<Features>; error?: string };

function sanitizeFeatures(input: Partial<Features> | undefined): Features {
  const def: Features = {
    pricingEnabled: true,
    showForProviders: false,
    showForSeekers: false,
    enforceAfterMonths: 3,
    lockAllToPricing: false,
    lockProvidersToPricing: false,
    lockSeekersToPricing: false,
    showCityViews: true,
  };

  const src = input || {};
  const n = Number(src.enforceAfterMonths);
  const months = Number.isFinite(n)
    ? Math.min(12, Math.max(0, Math.floor(n)))
    : def.enforceAfterMonths;

  return {
    pricingEnabled:
      src.pricingEnabled !== undefined
        ? !!src.pricingEnabled
        : def.pricingEnabled,
    showForProviders:
      src.showForProviders !== undefined
        ? !!src.showForProviders
        : def.showForProviders,
    showForSeekers:
      src.showForSeekers !== undefined
        ? !!src.showForSeekers
        : def.showForSeekers,
    enforceAfterMonths: months,
    lockAllToPricing:
      src.lockAllToPricing !== undefined
        ? !!src.lockAllToPricing
        : def.lockAllToPricing,
    lockProvidersToPricing:
      src.lockProvidersToPricing !== undefined
        ? !!src.lockProvidersToPricing
        : def.lockProvidersToPricing,
    lockSeekersToPricing:
      src.lockSeekersToPricing !== undefined
        ? !!src.lockSeekersToPricing
        : def.lockSeekersToPricing,
    showCityViews:
      src.showCityViews !== undefined ? !!src.showCityViews : def.showCityViews,
  };
}

export default function SettingsPage() {
  // Loading / saving / messages
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // Student Bank uploads toggle (shared with main app)
  const [studentBankUploadsEnabled, setStudentBankUploadsEnabled] = useState<boolean | null>(null);
  const [studentBankLoading, setStudentBankLoading] = useState(false);
  const [studentBankSaving, setStudentBankSaving] = useState(false);
  const [studentBankError, setStudentBankError] = useState<string | null>(null);

  // Feature state
  const [pricingEnabled, setPricingEnabled] = useState<boolean>(true);
  const [showForProviders, setShowForProviders] = useState<boolean>(false);
  const [showForSeekers, setShowForSeekers] = useState<boolean>(false);
  const [enforceAfterMonths, setEnforceAfterMonths] = useState<number>(3);
  const [lockAllToPricing, setLockAllToPricing] = useState<boolean>(false);
  const [lockProvidersToPricing, setLockProvidersToPricing] =
    useState<boolean>(false);
  const [lockSeekersToPricing, setLockSeekersToPricing] =
    useState<boolean>(false);
  const [showCityViews, setShowCityViews] = useState<boolean>(true);

  // Abortable load
  const abortRef = useRef<AbortController | null>(null);

  async function loadStudentBankSettings() {
    setStudentBankLoading(true);
    setStudentBankError(null);
    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch("/api/student-bank/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json: any = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(json?.error || res.statusText);
      setStudentBankUploadsEnabled(
        typeof json.uploadsEnabled === "boolean" ? json.uploadsEnabled : true,
      );
    } catch (e: any) {
      setStudentBankUploadsEnabled(null);
      setStudentBankError(e?.message || "Failed to load Student Bank settings");
    } finally {
      setStudentBankLoading(false);
    }
  }

  async function saveStudentBankUploadsEnabled(next: boolean) {
    setStudentBankSaving(true);
    setStudentBankError(null);
    setOkMsg(null);
    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch("/api/student-bank/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uploadsEnabled: next }),
      });
      const json: any = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(json?.error || res.statusText);
      setStudentBankUploadsEnabled(next);
      setOkMsg("Student Bank settings saved.");
    } catch (e: any) {
      setStudentBankError(e?.message || "Failed to save Student Bank settings");
    } finally {
      setStudentBankSaving(false);
    }
  }

  const applyFeatures = (f: Partial<Features>) => {
    if (f.pricingEnabled !== undefined)
      setPricingEnabled(!!f.pricingEnabled);
    if (f.showForProviders !== undefined)
      setShowForProviders(!!f.showForProviders);
    if (f.showForSeekers !== undefined)
      setShowForSeekers(!!f.showForSeekers);
    if (f.enforceAfterMonths !== undefined) {
      const n = Number(f.enforceAfterMonths);
      const months = Number.isFinite(n)
        ? Math.min(12, Math.max(0, Math.floor(n)))
        : 3;
      setEnforceAfterMonths(months);
    }
    if (f.lockAllToPricing !== undefined)
      setLockAllToPricing(!!f.lockAllToPricing);
    if (f.lockProvidersToPricing !== undefined)
      setLockProvidersToPricing(!!f.lockProvidersToPricing);
    if (f.lockSeekersToPricing !== undefined)
      setLockSeekersToPricing(!!f.lockSeekersToPricing);
    if (f.showCityViews !== undefined)
      setShowCityViews(!!f.showCityViews);
  };

  async function load() {
    setLoading(true);
    setError(null);
    setOkMsg(null);

    // cancel previous if any
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const token = await getIdTokenOrThrow();
      const res = await fetch("/api/settings/features", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: ac.signal,
      });

      const json: FeaturesResponse = await res
        .json()
        .catch(() => ({} as any));

      if (res.status === 401 || res.status === 403) {
        throw new Error("Unauthorized: please sign in again.");
      }

      if (!res.ok) {
        throw new Error(json?.error || res.statusText);
      }

      const sanitized = sanitizeFeatures(json.features);
      applyFeatures(sanitized);
      snapshotRef.current = sanitized;
      setIsDirty(false);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError(e?.message || "Failed to load settings");
      }
    } finally {
      if (!ac.signal.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    load();
    loadStudentBankSettings();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dirty tracking + snapshot
  const snapshotRef = useRef<Features | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const current: Features = {
    pricingEnabled,
    showForProviders,
    showForSeekers,
    enforceAfterMonths,
    lockAllToPricing,
    lockProvidersToPricing,
    lockSeekersToPricing,
    showCityViews,
  };

  // When load finishes, freeze snapshot
  useEffect(() => {
    if (!loading) {
      snapshotRef.current = current;
      setIsDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Compare against snapshot
  useEffect(() => {
    const s = snapshotRef.current;
    if (!s) return;

    const dirty =
      s.pricingEnabled !== pricingEnabled ||
      s.showForProviders !== showForProviders ||
      s.showForSeekers !== showForSeekers ||
      s.enforceAfterMonths !== enforceAfterMonths ||
      s.lockAllToPricing !== lockAllToPricing ||
      s.lockProvidersToPricing !== lockProvidersToPricing ||
      s.lockSeekersToPricing !== lockSeekersToPricing ||
      s.showCityViews !== showCityViews;

    setIsDirty(dirty);
  }, [
    pricingEnabled,
    showForProviders,
    showForSeekers,
    enforceAfterMonths,
    lockAllToPricing,
    lockProvidersToPricing,
    lockSeekersToPricing,
    showCityViews,
  ]);

  async function save() {
    if (saving || !isDirty) return;

    setSaving(true);
    setError(null);
    setOkMsg(null);

    const before = snapshotRef.current || current;
    snapshotRef.current = current;

    try {
      const token = await getIdTokenOrThrow();
      const body = sanitizeFeatures(current);

      const res = await fetch("/api/settings/features", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const json: FeaturesResponse = await res
        .json()
        .catch(() => ({} as any));

      if (res.status === 401 || res.status === 403) {
        throw new Error("Unauthorized: please sign in again.");
      }

      if (!res.ok) {
        throw new Error(json?.error || res.statusText);
      }

      const sanitized = sanitizeFeatures(json.features ?? body);
      applyFeatures(sanitized);
      snapshotRef.current = sanitized;
      setIsDirty(false);
      setOkMsg("Settings saved.");
    } catch (e: any) {
      applyFeatures(before);
      snapshotRef.current = before;
      setError(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  // lockAll → sync granular
  const lastGranularRef = useRef({
    providers: false,
    seekers: false,
  });

  const onToggleLockAll = (checked: boolean) => {
    setLockAllToPricing(checked);
    if (checked) {
      lastGranularRef.current = {
        providers: lockProvidersToPricing,
        seekers: lockSeekersToPricing,
      };
      setLockProvidersToPricing(true);
      setLockSeekersToPricing(true);
    } else {
      setLockProvidersToPricing(lastGranularRef.current.providers);
      setLockSeekersToPricing(lastGranularRef.current.seekers);
    }
  };

  const disabled = saving || !pricingEnabled;

  // ------- UI -------

  if (loading) {
    return (
      <div className="oc-container">
        <div className="oc-card">
          <div
            className="oc-skel-line lg"
            style={{ width: "30%", marginBottom: 12 }}
          />
          <div
            className="oc-skel-line"
            style={{ width: "85%", marginBottom: 8 }}
          />
          <div
            className="oc-skel-line sm"
            style={{ width: "60%" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="oc-container">
      <div className="oc-toolbar">
        <h1 className="oc-h1">Settings</h1>
        <div className="oc-actions">
          <button
            className="oc-btn"
            onClick={load}
            disabled={loading || saving}
          >
            Reload
          </button>
          <button
            className="oc-btn oc-btn-primary"
            onClick={save}
            disabled={saving || !isDirty}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="oc-card"
          style={{
            borderColor: "#fecaca",
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      {okMsg && (
        <div
          className="oc-card"
          style={{
            borderColor: "#bbf7d0",
            background: "#ecfdf5",
            color: "#065f46",
          }}
        >
          {okMsg}
        </div>
      )}

      {/* KPIs */}
      <div className="oc-kpis">
        <div className="oc-kpi">
          <div className="label">Pricing</div>
          <div className="value">
            {pricingEnabled ? "Enabled" : "Disabled"}
          </div>
        </div>
        <div className="oc-kpi">
          <div className="label">Locks</div>
          <div className="value">
            {lockAllToPricing ||
            lockProvidersToPricing ||
            lockSeekersToPricing
              ? "Active"
              : "Off"}
          </div>
        </div>
        <div className="oc-kpi">
          <div className="label">Show After</div>
          <div className="value">{enforceAfterMonths} mo</div>
        </div>
      </div>

      {/* Visibility */}
      <div className="oc-card">
        <h3 className="oc-title" style={{ marginBottom: 8 }}>
          Visibility
        </h3>
        <div className="oc-filter-grid cols-4">
          <div className="oc-field">
            <label className="oc-label">Enable pricing features</label>
            <input
              type="checkbox"
              className="oc-switch"
              checked={pricingEnabled}
              onChange={(e) =>
                setPricingEnabled(e.target.checked)
              }
            />
          </div>
          <div className="oc-field">
            <label className="oc-label">Show for providers</label>
            <input
              type="checkbox"
              className="oc-switch"
              checked={showForProviders}
              onChange={(e) =>
                setShowForProviders(e.target.checked)
              }
              disabled={disabled}
            />
          </div>
          <div className="oc-field">
            <label className="oc-label">Show for seekers</label>
            <input
              type="checkbox"
              className="oc-switch"
              checked={showForSeekers}
              onChange={(e) =>
                setShowForSeekers(e.target.checked)
              }
              disabled={disabled}
            />
          </div>
          <div className="oc-field">
            <label className="oc-label">Show City Views page</label>
            <input
              type="checkbox"
              className="oc-switch"
              checked={showCityViews}
              onChange={(e) => setShowCityViews(e.target.checked)}
            />
          </div>
        </div>
      </div>

      {/* Student Bank */}
      <div className="oc-card">
        <h3 className="oc-title" style={{ marginBottom: 8 }}>
          Student Bank
        </h3>
        {studentBankError && (
          <div
            className="oc-card"
            style={{
              borderColor: "#fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              marginBottom: 12,
            }}
          >
            {studentBankError}
          </div>
        )}
        <div className="oc-filter-grid cols-4">
          <div className="oc-field">
            <label className="oc-label">Enable student uploads</label>
            <input
              type="checkbox"
              className="oc-switch"
              checked={studentBankUploadsEnabled === true}
              onChange={(e) => saveStudentBankUploadsEnabled(e.target.checked)}
              disabled={
                studentBankUploadsEnabled === null ||
                studentBankLoading ||
                studentBankSaving
              }
            />
          </div>
          <div className="oc-field">
            <label className="oc-label">Status</label>
            <div className="oc-subtle">
              {studentBankLoading
                ? "Loading..."
                : studentBankUploadsEnabled === null
                  ? "Unknown"
                  : studentBankUploadsEnabled
                    ? "Enabled"
                    : "Disabled"}
            </div>
          </div>
          <div className="oc-field" style={{ alignSelf: "end" }}>
            <button
              className="oc-btn"
              onClick={loadStudentBankSettings}
              disabled={studentBankLoading || studentBankSaving || loading || saving}
            >
              Reload Student Bank
            </button>
          </div>
        </div>
      </div>

      {/* Locking */}
      <div className="oc-card">
        <h3 className="oc-title" style={{ marginBottom: 8 }}>
          Locking
        </h3>
        <div className="oc-filter-grid cols-4">
          <div className="oc-field">
            <label className="oc-label">Lock all to pricing</label>
            <input
              type="checkbox"
              className="oc-switch"
              checked={lockAllToPricing}
              onChange={(e) =>
                onToggleLockAll(e.target.checked)
              }
              disabled={disabled}
            />
          </div>
          <div className="oc-field">
            <label className="oc-label">Lock providers</label>
            <input
              type="checkbox"
              className="oc-switch"
              checked={lockProvidersToPricing}
              onChange={(e) =>
                setLockProvidersToPricing(
                  e.target.checked
                )
              }
              disabled={disabled || lockAllToPricing}
            />
          </div>
          <div className="oc-field">
            <label className="oc-label">Lock seekers</label>
            <input
              type="checkbox"
              className="oc-switch"
              checked={lockSeekersToPricing}
              onChange={(e) =>
                setLockSeekersToPricing(
                  e.target.checked
                )
              }
              disabled={disabled || lockAllToPricing}
            />
          </div>
        </div>
        <div
          className="oc-subtle"
          style={{ marginTop: 8 }}
        >
          When locked, provider services may be demoted to
          pending until the plan is paid.
        </div>
      </div>

      {/* Timing */}
      <div className="oc-card">
        <h3 className="oc-title" style={{ marginBottom: 8 }}>
          Timing
        </h3>
        <div className="oc-filter-grid cols-4">
          <div className="oc-field">
            <label className="oc-label">
              Show pricing after (months)
            </label>
            <input
              type="number"
              className="oc-input"
              min={0}
              max={12}
              value={enforceAfterMonths}
              onChange={(e) =>
                setEnforceAfterMonths(
                  Math.max(
                    0,
                    Math.min(
                      12,
                      Math.floor(
                        Number(e.target.value) || 0
                      )
                    )
                  )
                )
              }
              disabled={disabled}
            />
          </div>
        </div>
        <div
          className="oc-subtle"
          style={{ marginTop: 8 }}
        >
          {enforceAfterMonths === 0
            ? "Visible immediately for all users."
            : `Visible after ${enforceAfterMonths} month${
                enforceAfterMonths === 1 ? "" : "s"
              }.`}
        </div>
      </div>
    </div>
  );
}
