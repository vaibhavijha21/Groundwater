import { CLASSES, summarize } from "./constants";

const CARDS = [
  {
    id: "home",
    title: "Dashboard",
    text: "Dataset overview, state distribution, and how often the model matches the WQI class.",
    icon: "grid",
  },
  {
    id: "live",
    title: "Live Analysis",
    text: "Type parameters and watch the radar, gauge, and map update in real time.",
    icon: "live",
  },
  {
    id: "quality",
    title: "Water Quality Assessment",
    text: "Compare predicted classes and see how many wells exceed the limits used in the WQI.",
    icon: "drop",
  },
  {
    id: "predict",
    title: "ML Predictions",
    text: "Score a sample with the trained random forest and read the class probabilities.",
    icon: "model",
  },
  {
    id: "map",
    title: "Geographical Insights",
    text: "Explore monitoring wells on the map, colored by the predicted water-quality class.",
    icon: "map",
  },
  {
    id: "explorer",
    title: "Data Explorer",
    text: "Search wells, filter by state and class, and download the rows you are looking at.",
    icon: "table",
  },
];

function Icon({ name }) {
  const common = "h-5 w-5";
  if (name === "drop") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />
      </svg>
    );
  }
  if (name === "model") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v4M12 17v4M4.9 6.5l2.8 2.8M16.3 14.7l2.8 2.8M3 12h4M17 12h4M4.9 17.5l2.8-2.8M16.3 9.3l2.8-2.8" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  if (name === "map") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z" />
        <path d="M9 4v13M15 6.5v13" />
      </svg>
    );
  }
  if (name === "table") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 4h10a2 2 0 0 1 2 2v2H4V6a2 2 0 0 1 2-2h2zM4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8z" />
        <path d="M10 10v10" />
      </svg>
    );
  }
  if (name === "live") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v2M12 19v2M3.5 12h2M18.5 12h2" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <path d="M6.5 6.5l1.5 1.5M16 16l1.5 1.5M6.5 17.5l1.5-1.5M16 8l1.5-1.5" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export default function HomeView({ sites, onNavigate }) {
  const stats = summarize(sites);
  const n = sites.length || 1;
  const states = Object.keys(stats.byState).length;
  const agreePct = sites.length ? Math.round((stats.agree / sites.length) * 1000) / 10 : 0;
  const potablePct = sites.length ? Math.round((stats.potable / sites.length) * 1000) / 10 : 0;
  const ranked = Object.entries(stats.byState).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Monitoring wells" value={sites.length ? sites.length.toLocaleString() : "—"} note="Plotted from the project dataset" />
        <Stat label="Predicted drinkable" value={sites.length ? `${potablePct}%` : "—"} note="Excellent or Good" />
        <Stat label="Model agrees with WQI" value={sites.length ? `${agreePct}%` : "—"} note={`${states} states in this file`} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {CARDS.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onNavigate(card.id === "home" ? "map" : card.id)}
            className="flex items-start gap-4 rounded-2xl border border-sky-100/80 bg-slate-100 px-5 py-5 text-left text-slate-900 transition hover:-translate-y-0.5 hover:border-sky-300"
          >
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-700">
              <Icon name={card.icon} />
            </span>
            <span>
              <span className="block text-base font-semibold">{card.title}</span>
              <span className="mt-1 block text-sm leading-5 text-slate-600">{card.text}</span>
            </span>
          </button>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-[#0c1e33] p-5">
        <h2 className="text-sm font-semibold tracking-wide text-sky-200">Predicted class by share</h2>
        <div className="mt-4 space-y-3">
          {CLASSES.map((item) => {
            const count = stats.predicted[item.id] || 0;
            const pct = Math.round((count / n) * 1000) / 10;
            return (
              <div key={item.id}>
                <div className="mb-1 flex justify-between text-xs text-slate-300">
                  <span>{item.id}</span>
                  <span>{sites.length ? `${count.toLocaleString()} · ${pct}%` : "—"}</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: item.color }} />
                </div>
              </div>
            );
          })}
        </div>
        {ranked.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Wells by state</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {ranked.map(([state, info]) => (
                <div key={state} className="flex items-center justify-between text-sm">
                  <span className="text-slate-200">{state}</span>
                  <span className="text-slate-400">{info.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1e33] px-4 py-4">
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{note}</div>
    </div>
  );
}
