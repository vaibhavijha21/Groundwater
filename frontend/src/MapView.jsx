import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster";
import { CLASSES, classColor, summarize } from "./constants";

export default function MapView({ sites, onPredict }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const highlightRef = useRef(null);
  const [stateName, setStateName] = useState("All");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(() => Object.fromEntries(CLASSES.map((item) => [item.id, true])));
  const [colorBy, setColorBy] = useState("predicted");
  const [selected, setSelected] = useState(null);
  const fitToken = useRef(0);

  const states = useMemo(
    () => [...new Set(sites.map((site) => site.state))].sort(),
    [sites]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sites.filter((site) => {
      const label = colorBy === "predicted" ? site.predicted : site.category;
      if (!active[label]) return false;
      if (stateName !== "All" && site.state !== stateName) return false;
      if (!q) return true;
      return (
        site.location.toLowerCase().includes(q) ||
        site.district.toLowerCase().includes(q) ||
        site.state.toLowerCase().includes(q)
      );
    });
  }, [sites, query, stateName, active, colorBy]);

  const stats = useMemo(() => summarize(filtered), [filtered]);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, {
      zoomControl: false,
      preferCanvas: true,
      minZoom: 4,
    }).setView([22.6, 79.5], 5);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      maxClusterRadius: 42,
      spiderfyOnMaxZoom: true,
      iconCreateFunction(group) {
        const count = group.getChildCount();
        return L.divIcon({
          html: `<div class="gw-cluster">${count}</div>`,
          className: "gw-cluster-wrap",
          iconSize: [36, 36],
        });
      },
    });
    const markers = filtered.map((site) => {
      const label = colorBy === "predicted" ? site.predicted : site.category;
      const marker = L.circleMarker([site.lat, site.lon], {
        radius: 5.5,
        color: "#041018",
        weight: 1,
        fillColor: classColor(label),
        fillOpacity: 0.92,
      });
      marker.on("click", () => setSelected(site));
      return marker;
    });
    cluster.addLayers(markers);
    map.addLayer(cluster);
    clusterRef.current = cluster;

    if (filtered.length && fitToken.current) {
      map.fitBounds(L.latLngBounds(filtered.map((site) => [site.lat, site.lon])).pad(0.2), {
        maxZoom: 8,
      });
      fitToken.current = 0;
    }
  }, [filtered, colorBy]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (highlightRef.current) {
      map.removeLayer(highlightRef.current);
      highlightRef.current = null;
    }
    if (!selected) return;
    const label = colorBy === "predicted" ? selected.predicted : selected.category;
    highlightRef.current = L.circleMarker([selected.lat, selected.lon], {
      radius: 11,
      color: "#ffffff",
      weight: 2,
      fillColor: classColor(label),
      fillOpacity: 1,
    }).addTo(map);
    map.flyTo([selected.lat, selected.lon], Math.max(map.getZoom(), 8), { duration: 0.55 });
  }, [selected, colorBy]);

  const locationRows = useMemo(() => {
    if (stateName === "All") {
      return Object.entries(stats.byState)
        .map(([name, info]) => ({ name, total: info.total }))
        .sort((a, b) => b.total - a.total);
    }
    const counts = {};
    for (const site of filtered) counts[site.district] = (counts[site.district] || 0) + 1;
    return Object.entries(counts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filtered, stateName, stats.byState]);

  const maxRow = locationRows[0]?.total || 1;
  const potable = (stats.predicted.Excellent || 0) + (stats.predicted.Good || 0);

  const toggleClass = (id) => {
    setActive((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const reset = () => {
    setStateName("All");
    setQuery("");
    setActive(Object.fromEntries(CLASSES.map((item) => [item.id, true])));
    setSelected(null);
    mapRef.current?.setView([22.6, 79.5], 5);
  };

  return (
    <div className="grid gap-3 p-3 lg:h-[calc(100vh-4.25rem)] lg:grid-cols-[272px_minmax(0,1fr)_300px]">
      <aside className="space-y-5 overflow-auto rounded-2xl border border-white/10 bg-[#0c1e33] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Filters</h2>
          <button type="button" onClick={reset} className="text-xs text-sky-300 hover:text-white">
            Reset
          </button>
        </div>
        <label className="block text-xs text-slate-400">
          State
          <select
            value={stateName}
            onChange={(event) => {
              setStateName(event.target.value);
              setSelected(null);
              fitToken.current = 1;
            }}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#071422] px-3 py-2 text-sm text-white"
          >
            <option>All</option>
            {states.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-400">
          Search a well or district
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Dehradun, Chittoor…"
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#071422] px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
        </label>
        <div>
          <div className="mb-2 text-xs text-slate-400">Color wells by</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["predicted", "Prediction"],
              ["actual", "WQI class"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setColorBy(id)}
                className={`rounded-lg px-2 py-1.5 text-xs ${colorBy === id ? "bg-sky-500 text-white" : "bg-white/5 text-slate-300"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-slate-400">Classes</div>
          {CLASSES.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!active[item.id]}
                onChange={() => toggleClass(item.id)}
              />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
              {item.id}
            </label>
          ))}
        </div>
        <p className="text-xs leading-5 text-slate-400">
          {filtered.length.toLocaleString()} wells match. Clusters split as you zoom in.
        </p>
      </aside>

      <div className="relative min-h-[560px] overflow-hidden rounded-2xl border border-white/10">
        <div ref={mapEl} className="absolute inset-0" />
        <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-xl border border-white/10 bg-[#071422]/90 px-3 py-2 text-xs backdrop-blur">
          <div className="mb-1 font-semibold text-slate-200">Legend</div>
          {CLASSES.map((item) => (
            <div key={item.id} className="flex items-center gap-2 py-0.5 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
              {item.id}
            </div>
          ))}
          <div className="mt-1 text-slate-500">Circle = several wells</div>
        </div>
        {selected && (
          <div className="absolute bottom-3 left-3 z-[400] w-[280px] rounded-xl border border-sky-400/30 bg-[#071422]/95 p-3 shadow-xl backdrop-blur">
            <div className="text-[11px] uppercase tracking-wider text-sky-300">{selected.district}</div>
            <div className="text-base font-semibold">{selected.location}</div>
            <div className="text-xs text-slate-400">{selected.state}</div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span style={{ color: classColor(selected.predicted) }}>{selected.predicted}</span>
              <span className="text-xs text-slate-400">WQI {selected.wqi}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Recorded class: {selected.category}
              {selected.predicted === selected.category ? " · matches the model" : " · model differs"}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[11px] text-slate-300">
              <span>pH {selected.ph}</span>
              <span>F {selected.f}</span>
              <span>NO₃ {selected.no3}</span>
            </div>
            <button
              type="button"
              onClick={() => onPredict(selected)}
              className="mt-3 w-full rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Score this well in the model
            </button>
          </div>
        )}
      </div>

      <aside className="space-y-4 overflow-auto rounded-2xl border border-white/10 bg-[#0c1e33] p-4">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dataset overview</h2>
          <div className="mt-3 text-3xl font-semibold">{filtered.length.toLocaleString()}</div>
          <div className="text-xs text-slate-400">wells in the current view</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-white/5 px-3 py-2">
              <div className="text-xs text-slate-400">Drinkable</div>
              <div className="font-semibold text-emerald-300">{potable.toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-white/5 px-3 py-2">
              <div className="text-xs text-slate-400">Needs attention</div>
              <div className="font-semibold text-amber-300">{(filtered.length - potable).toLocaleString()}</div>
            </div>
          </div>
        </section>
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {stateName === "All" ? "By state" : "By district"}
          </h2>
          <div className="mt-3 space-y-2">
            {locationRows.map((row) => (
              <button
                key={row.name}
                type="button"
                onClick={() => {
                  if (stateName === "All") {
                    setStateName(row.name);
                    fitToken.current = 1;
                  } else {
                    setQuery(row.name);
                  }
                }}
                className="block w-full text-left"
              >
                <div className="mb-1 flex justify-between text-xs">
                  <span className="truncate pr-2">{row.name}</span>
                  <span className="text-slate-400">{row.total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10">
                  <div
                    className="h-1.5 rounded-full bg-sky-400"
                    style={{ width: `${Math.max(8, (row.total / maxRow) * 100)}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
