import { CLASSES, summarize } from "./constants";

const LIMITS = [
  { key: "fluoride", label: "Fluoride above 1.0 mg/L", note: "Desirable limit used in the WQI. Permissible limit is 1.5 mg/L." },
  { key: "nitrate", label: "Nitrate above 45 mg/L", note: "BIS desirable and permissible limit for nitrate." },
  { key: "chloride", label: "Chloride above 250 mg/L", note: "Desirable limit. Permissible limit is 1,000 mg/L." },
  { key: "hardness", label: "Hardness above 200 mg/L", note: "Desirable limit. Permissible limit is 600 mg/L." },
  { key: "ph", label: "pH outside 6.5–8.5", note: "Acceptable range in IS 10500." },
];

export default function QualityView({ sites }) {
  const stats = summarize(sites);
  const n = sites.length || 1;
  const agree = sites.length ? Math.round((stats.agree / sites.length) * 1000) / 10 : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Water quality assessment</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
        Each well already has a water-quality index class. The random forest predicts that same label from
        location and chemistry. Agreement here is how often those two labels match in this file, not a
        separately held-out test score.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#0c1e33] p-4">
          <div className="text-xs uppercase tracking-wider text-slate-400">Agreement</div>
          <div className="mt-1 text-3xl font-semibold">{sites.length ? `${agree}%` : "—"}</div>
          <div className="text-xs text-slate-400">{stats.agree.toLocaleString()} of {sites.length.toLocaleString()} wells</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0c1e33] p-4 sm:col-span-2">
          <div className="text-xs uppercase tracking-wider text-slate-400">Predicted vs recorded class</div>
          <div className="mt-4 space-y-3">
            {CLASSES.map((item) => {
              const pred = stats.predicted[item.id] || 0;
              const act = stats.actual[item.id] || 0;
              return (
                <div key={item.id} className="grid grid-cols-[110px_1fr_1fr] items-center gap-3 text-xs">
                  <span>{item.id}</span>
                  <Bar label="Predicted" count={pred} total={n} color={item.color} />
                  <Bar label="Recorded" count={act} total={n} color={item.color} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-[#0c1e33] p-5">
        <h2 className="text-sm font-semibold">Wells outside the limits used for the index</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {LIMITS.map((item) => {
            const count = stats[item.key] || 0;
            const pct = sites.length ? Math.round((count / sites.length) * 1000) / 10 : 0;
            return (
              <div key={item.key} className="rounded-xl bg-white/5 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-lg font-semibold text-sky-200">{sites.length ? `${pct}%` : "—"}</div>
                </div>
                <div className="mt-1 text-xs text-slate-400">{count.toLocaleString()} wells. {item.note}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Bar({ label, count, total, color }) {
  const pct = Math.round((count / total) * 1000) / 10;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-slate-400">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10">
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
