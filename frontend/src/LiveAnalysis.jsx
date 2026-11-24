import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE, CLASSES, FALLBACK_FIELDS, classColor } from "./constants";
import LiveGauge from "./LiveGauge";
import LiveRadar from "./LiveRadar";
import LiveMap from "./LiveMap";

export default function LiveAnalysis({ meta, prefill }) {
  const fields = meta?.fields?.length ? meta.fields : FALLBACK_FIELDS;
  const [params, setParams] = useState(() =>
    Object.fromEntries(FALLBACK_FIELDS.map((f) => [f.key, f.default]))
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sites, setSites] = useState([]);
  const [autoScore, setAutoScore] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/sites`).then((r) => r.json()).then((d) => setSites(d.sites || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!prefill?.values) return;
    setParams((prev) => ({ ...prev, ...prefill.values }));
    setResult(null);
  }, [prefill]);

  // Debounced auto-scoring as the user types
  useEffect(() => {
    if (!autoScore) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(score, 450);
    return () => clearTimeout(timerRef.current);
  }, [params, autoScore]);

  const score = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parameters: params }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Prediction failed");
      setResult(data);
    } catch (err) {
      setError(err.message || "Could not reach the API on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const importances = meta?.metrics?.feature_importances || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Live analysis</h1>
          <p className="mt-1 text-sm text-slate-400">
            Type parameters and watch the radar, gauge, and map update instantly.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={autoScore} onChange={(e) => setAutoScore(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-[#071422] text-sky-500" />
          Auto-score on input
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-5">
          <form onSubmit={score} className="rounded-2xl border border-white/10 bg-[#0c1e33] p-5">
            <h2 className="text-sm font-semibold text-slate-200">Sample parameters</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.key} className="text-xs text-slate-300">
                  <span className="mb-1 flex justify-between">
                    <span>{field.label}</span>
                    <span className="text-slate-500">{field.unit}</span>
                  </span>
                  <input
                    type="number"
                    step={field.step}
                    value={params[field.key] ?? ""}
                    onChange={(e) =>
                      setParams((prev) => ({ ...prev, [field.key]: e.target.value === "" ? "" : Number(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#071422] px-3 py-2 text-sm text-white"
                  />
                </label>
              ))}
            </div>
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={loading} className="mt-5 w-full rounded-lg bg-sky-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {loading ? "Scoring…" : "Score sample"}
            </button>
          </form>

          <LiveGauge result={result} label="Live quality score" />
        </div>

        <div className="space-y-5">
          <LiveRadar params={params} />
          <LiveMap sites={sites} params={params} result={result} />
        </div>
      </div>
    </div>
  );
}