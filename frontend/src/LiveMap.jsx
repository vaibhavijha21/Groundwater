import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster";
import { CLASSES, classColor } from "./constants";

export default function LiveMap({ sites, params, result }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const userMarkerRef = useRef(null);
  const [stateName, setStateName] = useState("All");
  const [colorBy, setColorBy] = useState("predicted");
  const [active, setActive] = useState(() => Object.fromEntries(CLASSES.map((item) => [item.id, true])));

  const states = useMemo(() => [...new Set(sites.map((s) => s.state))].sort(), [sites]);

  const filtered = useMemo(() => {
    return sites.filter((site) => {
      const label = colorBy === "predicted" ? site.predicted : site.category;
      if (!active[label]) return false;
      if (stateName !== "All" && site.state !== stateName) return false;
      return true;
    });
  }, [sites, stateName, colorBy, active]);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, { zoomControl: false, preferCanvas: true, minZoom: 4 }).setView([22.6, 79.5], 5);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (clusterRef.current) { map.removeLayer(clusterRef.current); clusterRef.current = null; }
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      maxClusterRadius: 42,
      spiderfyOnMaxZoom: true,
      iconCreateFunction(group) {
        return L.divIcon({
          html: `<div class="gw-cluster">${group.getChildCount()}</div>`,
          className: "gw-cluster-wrap",
          iconSize: [36, 36],
        });
      },
    });
    cluster.addLayers(filtered.map((site) => {
      const label = colorBy === "predicted" ? site.predicted : site.category;
      const m = L.circleMarker([site.lat, site.lon], {
        radius: 5, color: "#041018", weight: 1, fillColor: classColor(label), fillOpacity: 0.9,
      });
      return m;
    }));
    map.addLayer(cluster);
    clusterRef.current = cluster;
  }, [filtered, colorBy]);

  // Place / update the live user marker from entered coordinates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userMarkerRef.current) { map.removeLayer(userMarkerRef.current); userMarkerRef.current = null; }
    const lat = Number(params?.Latitude);
    const lon = Number(params?.Longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const label = result?.prediction || "Pending";
    const marker = L.circleMarker([lat, lon], {
      radius: 9,
      color: "#ffffff",
      weight: 2.5,
      fillColor: result ? classColor(label) : "#fbbf24",
      fillOpacity: 1,
    });
    marker.bindPopup(
      `<div style="font-size:12px;min-width:140px;">
        <b style="color:#e2e8f0;">Your sample</b><br/>
        <span style="color:#94a3b8;">Lat:</span> ${lat.toFixed(4)}<br/>
        <span style="color:#94a3b8;">Lon:</span> ${lon.toFixed(4)}<br/>
        <span style="color:#94a3b8;">Prediction:</span> <b style="color:${result ? classColor(label) : '#fbbf24'}">${label}</b>
      </div>`
    );
    marker.addTo(map);
    userMarkerRef.current = marker;
  }, [params, result]);

  const toggleClass = (id) => setActive((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-4 overflow-auto rounded-2xl border border-white/10 bg-[#0c1e33] p-4">
        <div>
          <h2 className="text-sm font-semibold">Filters</h2>
          <label className="mt-2 block text-xs text-slate-400">
            State
            <select value={stateName} onChange={(e) => setStateName(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#071422] px-3 py-2 text-sm text-white">
              <option>All</option>
              {states.map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          <div className="mt-3">
            <div className="mb-2 text-xs text-slate-400">Color wells by</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["predicted", "Prediction"],
                ["actual", "WQI class"],
              ].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setColorBy(id)} className={`rounded-lg px-2 py-1.5 text-xs ${colorBy === id ? "bg-sky-500 text-white" : "bg-white/5 text-slate-300"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="text-xs text-slate-400">Classes</div>
            {CLASSES.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!active[item.id]} onChange={() => toggleClass(item.id)} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                {item.id}
              </label>
            ))}
          </div>
        </div>
      </aside>
      <div className="relative min-h-[520px] overflow-hidden rounded-2xl border border-white/10">
        <div ref={mapEl} className="absolute inset-0" />
        <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-xl border border-white/10 bg-[#071422]/90 px-3 py-2 text-xs backdrop-blur">
          <div className="mb-1 font-semibold text-slate-200">Legend</div>
          {CLASSES.map((item) => (
            <div key={item.id} className="flex items-center gap-2 py-0.5 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
              {item.id}
            </div>
          ))}
          <div className="mt-1 text-slate-500">White ring = your sample</div>
        </div>
      </div>
    </div>
  );
}