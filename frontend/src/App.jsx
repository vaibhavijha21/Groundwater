import { useEffect, useState } from "react";
import { API_BASE } from "./constants";
import HomeView from "./HomeView";
import MapView from "./MapView";
import QualityView from "./QualityView";
import PredictView from "./PredictView";
import ExplorerView from "./ExplorerView";
import LiveAnalysis from "./LiveAnalysis";

const NAV = [
  { id: "home", label: "Home" },
  { id: "live", label: "Live Analysis" },
  { id: "map", label: "Map" },
  { id: "quality", label: "Water Quality" },
  { id: "predict", label: "Predictions" },
  { id: "explorer", label: "Data Explorer" },
];

export default function App() {
  const [view, setView] = useState("map");
  const [sites, setSites] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");
  const [prefill, setPrefill] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/sites`)
      .then((res) => {
        if (!res.ok) throw new Error("sites");
        return res.json();
      })
      .then((data) => setSites(data.sites || []))
      .catch(() => setError("The map needs the API on port 8000. In the project folder, with the virtual environment active, run: uvicorn main:app --reload --port 8000"));

    fetch(`${API_BASE}/api/metadata`)
      .then((res) => res.json())
      .then(setMeta)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-bg text-slate-100">
      <header className="sticky top-0 z-[500] border-b border-white/10 bg-bg-2/95 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <button type="button" onClick={() => setView("map")} className="flex items-center gap-3 text-left">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/25 to-violet-500/25 ring-1 ring-sky-300/30">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="url(#logoGrad)" strokeWidth="2">
                <defs>
                  <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7dd3fc" />
                    <stop offset="100%" stopColor="#c4b5fd" />
                  </linearGradient>
                </defs>
                <path d="M12 2s7 8 7 12a7 7 0 0 1-14 0c0-4 7-12 7-12z" />
                <circle cx="12" cy="12" r="2.4" fill="url(#logoGrad)" />
              </svg>
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight">
                <span className="grad-text">GroundWatch</span>
              </span>
              <span className="block text-[11px] text-slate-400">Groundwater quality across monitoring wells</span>
            </span>
          </button>
          <nav className="flex flex-wrap gap-1">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  view === item.id
                    ? "bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-lg shadow-sky-500/25"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {error && (
        <div className="mx-auto mt-4 max-w-4xl rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      {view === "home" && <HomeView sites={sites} onNavigate={setView} />}
      {view === "live" && <LiveAnalysis meta={meta} prefill={prefill} />}
      {view === "map" && (
        <MapView
          sites={sites}
          onPredict={(site) => {
            setPrefill(site);
            setView("predict");
          }}
        />
      )}
      {view === "quality" && <QualityView sites={sites} />}
      {view === "predict" && <PredictView meta={meta} prefill={prefill} />}
      {view === "explorer" && <ExplorerView sites={sites} />}
    </div>
  );
}