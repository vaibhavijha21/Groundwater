export const API_BASE = "http://localhost:8000";

export const CLASSES = [
  { id: "Excellent", color: "#22d3ee", hint: "Suitable for drinking" },
  { id: "Good", color: "#34d399", hint: "Generally acceptable" },
  { id: "Poor", color: "#fbbf24", hint: "Treatment advisable" },
  { id: "Very Poor", color: "#fb923c", hint: "Not for drinking without treatment" },
  { id: "Unsuitable", color: "#f87171", hint: "Unfit for drinking" },
];

export function classColor(name) {
  return CLASSES.find((item) => item.id === name)?.color ?? "#94a3b8";
}

export function summarize(sites) {
  const predicted = {};
  const actual = {};
  let agree = 0;
  let fluoride = 0;
  let nitrate = 0;
  let ph = 0;
  let chloride = 0;
  let hardness = 0;
  const byState = {};

  for (const site of sites) {
    predicted[site.predicted] = (predicted[site.predicted] || 0) + 1;
    actual[site.category] = (actual[site.category] || 0) + 1;
    if (site.predicted === site.category) agree += 1;
    if (site.f > 1) fluoride += 1;
    if (site.no3 > 45) nitrate += 1;
    if (site.ph < 6.5 || site.ph > 8.5) ph += 1;
    if (site.cl > 250) chloride += 1;
    if (site.th > 200) hardness += 1;
    if (!byState[site.state]) byState[site.state] = { total: 0, potable: 0 };
    byState[site.state].total += 1;
    if (site.predicted === "Excellent" || site.predicted === "Good") {
      byState[site.state].potable += 1;
    }
  }

  const potable = (predicted.Excellent || 0) + (predicted.Good || 0);
  return {
    predicted,
    actual,
    agree,
    potable,
    fluoride,
    nitrate,
    ph,
    chloride,
    hardness,
    byState,
  };
}

export const FALLBACK_FIELDS = [
  { key: "Latitude", label: "Latitude", unit: "°N", step: 0.0001, default: 22.51 },
  { key: "Longitude", label: "Longitude", unit: "°E", step: 0.0001, default: 79.38 },
  { key: "pH", label: "pH", unit: "pH", step: 0.01, default: 7.76 },
  { key: "EC", label: "Electrical conductivity", unit: "µS/cm", step: 1, default: 883 },
  { key: "CO3", label: "Carbonate (CO₃)", unit: "mg/L", step: 1, default: 0 },
  { key: "HCO3", label: "Bicarbonate (HCO₃)", unit: "mg/L", step: 1, default: 336 },
  { key: "Cl", label: "Chloride (Cl)", unit: "mg/L", step: 1, default: 70 },
  { key: "F", label: "Fluoride (F)", unit: "mg/L", step: 0.01, default: 0.56 },
  { key: "SO4", label: "Sulphate (SO₄)", unit: "mg/L", step: 1, default: 32 },
  { key: "NO3", label: "Nitrate (NO₃)", unit: "mg/L", step: 1, default: 12 },
  { key: "TH", label: "Total hardness", unit: "mg/L", step: 1, default: 280 },
  { key: "Ca", label: "Calcium (Ca)", unit: "mg/L", step: 1, default: 52 },
  { key: "Mg", label: "Magnesium (Mg)", unit: "mg/L", step: 1, default: 32 },
  { key: "Na", label: "Sodium (Na)", unit: "mg/L", step: 1, default: 63 },
  { key: "K", label: "Potassium (K)", unit: "mg/L", step: 0.1, default: 4 },
  { key: "U", label: "Uranium (U)", unit: "ppb", step: 0.01, default: 2.78 },
];
