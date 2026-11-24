import { useEffect, useState } from "react";
import { API_BASE, CLASSES, FALLBACK_FIELDS, classColor } from "./constants";

export default function PredictView({ meta, prefill }) {
  const fields = meta?.fields?.length ? meta.fields : FALLBACK_FIELDS;
  const [params, setParams] = useState(() =>
    Object.fromEntries(FALLBACK_FIELDS.map((field) => [field.key, field.default]))
  );
  const [source, setSource] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fields.length) return;
    setParams((prev) => {
      const next = { ...prev };
      for (const field of fields) {
        if (next[field.key] == null) next[field.key] = field.default;
      }
      return next;
    });
  }, [fields]);

  useEffect(() => {
    if (!prefill?.values) return;
    setParams((prev) => ({ ...prev, ...prefill.values }));
    setSource(`${prefill.location}, ${prefill.district}, ${prefill.state}`);
    setResult(null);
  }, [prefill]);

  const submit = async (event) => {
    event.preventDefault();
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
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1.3fr_0.7fr] sm:px-6">
      <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-[#0c1e33] p-5">
        <h1 className="text-xl font-semibold">Score a sample</h1>
        <p className="mt-1 text-sm text-slate-400">
          These are the measurements the forest was trained on. Sub-index features are calculated on the server
          before scoring, using the same ratios as the dataset.
        </p>
        {source && (
          <p className="mt-3 rounded-lg bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
            Loaded from {source}
            {prefill?.category ? ` · recorded class ${prefill.category}` : ""}
          </p>
        )}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
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
                onChange={(event) =>
                  setParams((prev) => ({
                    ...prev,
                    [field.key]: event.target.value === "" ? "" : Number(event.target.value),
                  }))
                }
                className="w-full rounded-lg border border-white/10 bg-[#071422] px-3 py-2 text-sm text-white"
              />
            </label>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-sky-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Scoring…" : "Predict water-quality class"}
        </button>
      </form>

      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-[#0c1e33] p-5">
          <h2 className="text-sm font-semibold">Prediction</h2>
          {!result ? (
            <p className="mt-6 text-sm text-slate-400">Run a sample to see the class and how sure the model is.</p>
          ) : (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider text-slate-400">Predicted class</div>
              <div className="mt-1 text-3xl font-semibold" style={{ color: classColor(result.prediction) }}>
                {result.prediction}
              </div>
              {prefill?.category && (
                <p className="mt-1 text-xs text-slate-400">
                  Recorded WQI class for this well: {prefill.category}
                </p>
              )}
              <div className="mt-4 space-y-2">
                {result.probabilities?.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{item.label}</span>
                      <span>{item.confidence}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${item.confidence}%`, background: classColor(item.label) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-white/10 bg-[#0c1e33] p-5">
          <h2 className="text-sm font-semibold">What the forest relies on</h2>
          <p className="mt-1 text-xs text-slate-400">Share of splits using each input, from the saved model.</p>
          <div className="mt-4 space-y-2">
            {importances.length === 0 && <p className="text-sm text-slate-400">Start the API to load importances.</p>}
            {importances.map((item) => (
              <div key={item.feature}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="truncate pr-2">{item.feature}</span>
                  <span>{item.importance}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10">
                  <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${Math.min(item.importance, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {CLASSES.map((item) => (
              <span key={item.id} className="text-[11px] text-slate-400">
                <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: item.color }} />
                {item.id}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
