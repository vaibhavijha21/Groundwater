import { useMemo } from "react";

// Map predicted class to a 0-100 score for the gauge
const CLASS_SCORE = {
  Excellent: 92,
  Good: 72,
  Poor: 48,
  "Very Poor": 28,
  Unsuitable: 8,
};

export default function LiveGauge({ result, label, sub }) {
  const score = useMemo(() => {
    if (!result) return null;
    return CLASS_SCORE[result.prediction] ?? 50;
  }, [result]);

  const color = result
    ? getComputedStyle(document.documentElement).getPropertyValue("--chart-1").trim() || "#22d3ee"
    : "#334155";

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#0c1e33] p-6">
        <div className="text-sm font-semibold text-slate-300">Live quality score</div>
        <div className="mt-4 h-40 w-40 rounded-full border-[10px] border-white/5" />
        <div className="mt-2 text-xs text-slate-500">Enter parameters to score</div>
      </div>
    );
  }

  const circ = 2 * Math.PI * 70;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-[#0c1e33] p-6">
      <div className="text-sm font-semibold text-slate-300">Live quality score</div>
      <div className="relative mt-3">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="100" r="70" fill="none" stroke="#1e293b" strokeWidth="14" />
          <circle
            cx="90"
            cy="100"
            r="70"
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            transform="rotate(-135 90 100)"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="40%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white">{score}</span>
          <span className="text-xs uppercase tracking-wider text-slate-400">/ 100</span>
        </div>
      </div>
      <div className="mt-2 text-base font-semibold" style={{ color: classColor(result.prediction) }}>
        {result.prediction}
      </div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function classColor(name) {
  const map = {
    Excellent: "#22d3ee",
    Good: "#34d399",
    Poor: "#fbbf24",
    "Very Poor": "#fb923c",
    Unsuitable: "#f87171",
  };
  return map[name] || "#94a3b8";
}