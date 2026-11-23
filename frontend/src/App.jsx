import { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000";

const PARAM_FIELDS = [
  { key: "pH", label: "pH Level", unit: "pH", defaultVal: 7.4, step: 0.1 },
  { key: "EC", label: "Electrical Conductivity", unit: "µS/cm", defaultVal: 850, step: 10 },
  { key: "TDS", label: "Total Dissolved Solids", unit: "mg/L", defaultVal: 500, step: 10 },
  { key: "TH", label: "Total Hardness", unit: "mg/L", defaultVal: 220, step: 5 },
  { key: "Ca", label: "Calcium (Ca)", unit: "mg/L", defaultVal: 45, step: 1 },
  { key: "Mg", label: "Magnesium (Mg)", unit: "mg/L", defaultVal: 25, step: 1 },
  { key: "Na", label: "Sodium (Na)", unit: "mg/L", defaultVal: 60, step: 1 },
  { key: "Cl", label: "Chloride (Cl)", unit: "mg/L", defaultVal: 90, step: 5 },
  { key: "SO4", label: "Sulphate (SO₄)", unit: "mg/L", defaultVal: 50, step: 5 },
  { key: "NO3", label: "Nitrate (NO₃)", unit: "mg/L", defaultVal: 20, step: 1 },
  { key: "F", label: "Fluoride (F)", unit: "mg/L", defaultVal: 0.8, step: 0.05 },
  { key: "Fe", label: "Iron (Fe)", unit: "ppm", defaultVal: 0.3, step: 0.05 },
  { key: "As", label: "Arsenic (As)", unit: "ppb", defaultVal: 2.0, step: 0.5 },
  { key: "U", label: "Uranium (U)", unit: "ppb", defaultVal: 5.0, step: 0.5 },
];

export default function App() {
  const [states, setStates] = useState(["Punjab", "Maharashtra", "Uttar Pradesh"]);
  const [selectedState, setSelectedState] = useState("Punjab");
  const [params, setParams] = useState(() =>
    Object.fromEntries(PARAM_FIELDS.map((f) => [f.key, f.defaultVal]))
  );
  const [metrics, setMetrics] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/metadata`)
      .then((res) => res.json())
      .then((data) => {
        if (data.states?.length) {
          setStates(data.states);
          setSelectedState(data.states[0]);
        }
        if (data.metrics) setMetrics(data.metrics);
      })
      .catch((err) => console.error("Backend not connected yet:", err));
  }, []);

  const handleParamChange = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: selectedState, parameters: params }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert("Could not reach FastAPI server on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              India Groundwater Quality Analyzer
            </h1>
            <p className="text-sm text-slate-500">
              Physicochemical Parameter Prediction & Random Forest Model Metrics
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Random Forest Classifier Active
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Parameter Entry Form (7 cols) */}
        <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-1">1. Sample Parameter Entry</h2>
          <p className="text-sm text-slate-500 mb-6">
            Select the state and enter groundwater chemical readings to predict water quality.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                State / Region
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {states.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PARAM_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>{field.label}</span>
                    <span className="text-slate-400">{field.unit}</span>
                  </label>
                  <input
                    type="number"
                    step={field.step}
                    value={params[field.key]}
                    onChange={(e) => handleParamChange(field.key, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Running Model..." : "Predict Groundwater Quality"}
            </button>
          </form>
        </section>

        {/* Right Column: Prediction Output & Model Metrics (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Prediction Result Card */}
          <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">2. Prediction Result</h2>

            {!result ? (
              <div className="text-center py-8 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
                Submit sample parameters on the left to view classification output.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-xs uppercase tracking-wider text-blue-600 font-semibold">
                    Predicted Water Quality Class
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {result.prediction}
                  </div>
                </div>

                {result.probabilities?.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="text-xs font-semibold text-slate-500 uppercase">
                      Class Confidence Breakdown
                    </div>
                    {result.probabilities.map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span>{item.label}</span>
                          <span>{item.confidence}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${item.confidence}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Model Metrics Card */}
          <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-1">3. Model Evaluation Metrics</h2>
            <p className="text-xs text-slate-500 mb-4">
              Validation scores from trained Random Forest model
            </p>

            {metrics ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500">Test Accuracy</div>
                    <div className="text-xl font-bold text-slate-900">
                      {metrics.accuracy}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-xs text-slate-500">Weighted F1-Score</div>
                    <div className="text-xl font-bold text-slate-900">
                      {metrics.weighted_f1}%
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase mb-2.5">
                    Top Feature Importances
                  </div>
                  <div className="space-y-2">
                    {metrics.feature_importances?.slice(0, 6).map((feat) => (
                      <div key={feat.feature}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700">{feat.feature}</span>
                          <span className="text-slate-500">{feat.importance}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(feat.importance * 3, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">
                Start the FastAPI backend to load live model metrics.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}