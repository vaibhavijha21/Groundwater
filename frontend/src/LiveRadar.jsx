import { useMemo } from "react";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  registerables,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

// Safe/limit reference values for normalising each axis
const LIMITS = {
  pH: 8.5,
  EC: 1500,
  CO3: 250,
  HCO3: 400,
  Cl: 250,
  F: 1.0,
  SO4: 200,
  NO3: 45,
  TH: 200,
  Ca: 75,
  Mg: 30,
  Na: 200,
  K: 12,
  U: 30,
};

const KEYS = ["pH", "EC", "CO3", "HCO3", "Cl", "F", "SO4", "NO3", "TH", "Ca", "Mg", "Na", "K", "U"];

export default function LiveRadar({ params }) {
  const data = useMemo(() => {
    const values = KEYS.map((k) => {
      const raw = Number(params?.[k]) || 0;
      const lim = LIMITS[k] || 1;
      // For pH invert: closer to 7 is better
      if (k === "pH") {
        const dev = Math.abs(raw - 7);
        return Math.max(0, Math.min(100, 100 - (dev / 1.5) * 100));
      }
      return Math.max(0, Math.min(100, (raw / lim) * 100));
    });
    return {
      labels: KEYS,
      datasets: [
        {
          label: "Your sample",
          data: values,
          backgroundColor: "rgba(34, 211, 238, 0.25)",
          borderColor: "#22d3ee",
          borderWidth: 2,
          pointBackgroundColor: "#22d3ee",
          pointRadius: 3,
        },
        {
          label: "Safe limit (100)",
          data: KEYS.map(() => 100),
          backgroundColor: "rgba(248, 113, 113, 0.08)",
          borderColor: "rgba(248, 113, 113, 0.5)",
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
        },
      ],
    };
  }, [params]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1e33] p-4">
      <div className="mb-2 text-sm font-semibold text-slate-300">Parameter profile</div>
      <div className="h-[300px]">
        <Radar
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: { color: "#94a3b8", usePointStyle: true, padding: 14, font: { size: 11 } },
              },
              tooltip: { backgroundColor: "#0b1c30", borderColor: "#1e3a54", borderWidth: 1 },
            },
            scales: {
              r: {
                min: 0,
                max: 100,
                ticks: { color: "#475569", backdropColor: "transparent", stepSize: 25, font: { size: 9 } },
                pointLabels: { color: "#cbd5e1", font: { size: 11 } },
                grid: { color: "rgba(148,163,184,0.12)" },
                angleLines: { color: "rgba(148,163,184,0.12)" },
              },
            },
          }}
        />
      </div>
    </div>
  );
}