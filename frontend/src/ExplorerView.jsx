import { useMemo, useState } from "react";
import { CLASSES, classColor } from "./constants";

const PAGE = 12;

export default function ExplorerView({ sites }) {
  const [stateName, setStateName] = useState("All");
  const [klass, setKlass] = useState("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const states = useMemo(() => [...new Set(sites.map((site) => site.state))].sort(), [sites]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sites.filter((site) => {
      if (stateName !== "All" && site.state !== stateName) return false;
      if (klass !== "All" && site.predicted !== klass) return false;
      if (!q) return true;
      return (
        site.location.toLowerCase().includes(q) ||
        site.district.toLowerCase().includes(q)
      );
    });
  }, [sites, stateName, klass, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const rows = filtered.slice(safePage * PAGE, safePage * PAGE + PAGE);

  const download = () => {
    const header = ["State", "District", "Location", "Latitude", "Longitude", "WQI", "WQI class", "Predicted class", "pH", "F", "NO3", "Cl"];
    const lines = [header.join(",")];
    for (const site of filtered) {
      const cells = [
        site.state, site.district, site.location, site.lat, site.lon, site.wqi,
        site.category, site.predicted, site.ph, site.f, site.no3, site.cl,
      ].map((value) => `"${String(value).replaceAll('"', '""')}"`);
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "groundwater-filtered.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Data explorer</h1>
          <p className="mt-1 text-sm text-slate-400">{filtered.length.toLocaleString()} rows</p>
        </div>
        <button type="button" onClick={download} className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white">
          Download filtered CSV
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <select
          value={stateName}
          onChange={(event) => { setStateName(event.target.value); setPage(0); }}
          className="rounded-lg border border-white/10 bg-[#0c1e33] px-3 py-2 text-sm"
        >
          <option>All</option>
          {states.map((name) => <option key={name}>{name}</option>)}
        </select>
        <select
          value={klass}
          onChange={(event) => { setKlass(event.target.value); setPage(0); }}
          className="rounded-lg border border-white/10 bg-[#0c1e33] px-3 py-2 text-sm"
        >
          <option>All</option>
          {CLASSES.map((item) => <option key={item.id}>{item.id}</option>)}
        </select>
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setPage(0); }}
          placeholder="Search location or district"
          className="rounded-lg border border-white/10 bg-[#0c1e33] px-3 py-2 text-sm placeholder:text-slate-500"
        />
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#0c1e33] text-xs uppercase tracking-wider text-slate-400">
            <tr>
              {["Location", "District", "State", "Predicted", "WQI class", "WQI", "pH", "F", "NO₃"].map((label) => (
                <th key={label} className="px-3 py-3 font-medium">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((site) => (
              <tr key={site.id} className="border-t border-white/5">
                <td className="px-3 py-2.5">{site.location}</td>
                <td className="px-3 py-2.5 text-slate-300">{site.district}</td>
                <td className="px-3 py-2.5 text-slate-300">{site.state}</td>
                <td className="px-3 py-2.5 font-medium" style={{ color: classColor(site.predicted) }}>{site.predicted}</td>
                <td className="px-3 py-2.5 text-slate-300">{site.category}</td>
                <td className="px-3 py-2.5">{site.wqi}</td>
                <td className="px-3 py-2.5">{site.ph}</td>
                <td className="px-3 py-2.5">{site.f}</td>
                <td className="px-3 py-2.5">{site.no3}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-400">No wells match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
        <span>Page {safePage + 1} of {pages}</span>
        <div className="flex gap-2">
          <button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="rounded-lg bg-white/10 px-3 py-1 disabled:opacity-40">Previous</button>
          <button type="button" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} className="rounded-lg bg-white/10 px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
