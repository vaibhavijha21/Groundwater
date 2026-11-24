from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict
import os
import joblib
import pandas as pd

app = FastAPI(title="India Groundwater Quality API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

bundle = joblib.load("groundwater_rf_bundle.pkl")

if isinstance(bundle, dict):
    model = bundle["model"]
    feature_names = bundle.get("feature_names", list(getattr(model, "feature_names_in_", [])))
    defaults = bundle.get("defaults", {})
    states = bundle.get("states", [])
    metrics = bundle.get("metrics", None)
else:
    model = bundle
    feature_names = list(getattr(model, "feature_names_in_", []))
    defaults = {}
    states = []
    metrics = None

# Friendly form keys -> column in the training file
ALIASES = {
    "EC": "EC (µS/cm at",
    "CO3": "CO3 (mg/L)",
    "Cl": "Cl (mg/L)",
    "F": "F (mg/L)",
    "TH": "Total Hardness",
    "Ca": "Ca (mg/L)",
    "Mg": "Mg (mg/L)",
    "Na": "Na (mg/L)",
    "K": "K (mg/L)",
    "U": "U (ppb)",
}

FORM_FIELDS = [
    {"key": "Latitude", "label": "Latitude", "unit": "°N", "step": 0.0001},
    {"key": "Longitude", "label": "Longitude", "unit": "°E", "step": 0.0001},
    {"key": "pH", "label": "pH", "unit": "pH", "step": 0.01},
    {"key": "EC", "label": "Electrical conductivity", "unit": "µS/cm", "step": 1},
    {"key": "CO3", "label": "Carbonate (CO₃)", "unit": "mg/L", "step": 1},
    {"key": "HCO3", "label": "Bicarbonate (HCO₃)", "unit": "mg/L", "step": 1},
    {"key": "Cl", "label": "Chloride (Cl)", "unit": "mg/L", "step": 1},
    {"key": "F", "label": "Fluoride (F)", "unit": "mg/L", "step": 0.01},
    {"key": "SO4", "label": "Sulphate (SO₄)", "unit": "mg/L", "step": 1},
    {"key": "NO3", "label": "Nitrate (NO₃)", "unit": "mg/L", "step": 1},
    {"key": "TH", "label": "Total hardness", "unit": "mg/L", "step": 1},
    {"key": "Ca", "label": "Calcium (Ca)", "unit": "mg/L", "step": 1},
    {"key": "Mg", "label": "Magnesium (Mg)", "unit": "mg/L", "step": 1},
    {"key": "Na", "label": "Sodium (Na)", "unit": "mg/L", "step": 1},
    {"key": "K", "label": "Potassium (K)", "unit": "mg/L", "step": 0.1},
    {"key": "U", "label": "Uranium (U)", "unit": "ppb", "step": 0.01},
]


def resolve_feature(key: str):
    if key in feature_names:
        return key
    alias = ALIASES.get(key)
    if alias:
        for name in feature_names:
            if name == alias or name.startswith(alias):
                return name
    for name in feature_names:
        if name.startswith(key + " ") or name.startswith(key + "("):
            return name
    return None


def apply_quality_ratings(row: dict):
    """Sub-indices used as model features. pH uses |pH-7| / 1.5; others are C/S × 100."""
    ph = float(row.get("pH", 7) or 7)
    ratings = {
        "q_pH": abs(ph - 7.0) / 1.5 * 100,
        "q_Cl (mg/L)": float(row.get("Cl (mg/L)", 0) or 0) / 250 * 100,
        "q_F (mg/L)": float(row.get("F (mg/L)", 0) or 0) / 1.0 * 100,
        "q_SO4": float(row.get("SO4", 0) or 0) / 200 * 100,
        "q_NO3": float(row.get("NO3", 0) or 0) / 45 * 100,
        "q_Total Hardness": float(row.get("Total Hardness", 0) or 0) / 200 * 100,
        "q_Ca (mg/L)": float(row.get("Ca (mg/L)", 0) or 0) / 75 * 100,
        "q_Mg (mg/L)": float(row.get("Mg (mg/L)", 0) or 0) / 30 * 100,
    }
    for key, value in ratings.items():
        if key in feature_names:
            row[key] = value


def _num(value, digits):
    if pd.isna(value):
        return None
    return round(float(value), digits)


def load_map_data():
    path = os.path.join(os.path.dirname(__file__), "groundwater_map_data.csv")
    if not os.path.exists(path):
        return [], {}, list(states)
    df = pd.read_csv(path)
    found_states = sorted(df["State"].dropna().astype(str).unique().tolist())

    medians = {}
    for name in feature_names:
        if name in df.columns:
            medians[name] = float(df[name].median())
        else:
            medians[name] = 0.0
    apply_quality_ratings(medians)

    sites = []
    for i, rec in df.iterrows():
        values = {}
        for field in FORM_FIELDS:
            column = resolve_feature(field["key"])
            if column and column in df.columns:
                values[field["key"]] = _num(rec[column], 4 if field["key"] in ("Latitude", "Longitude") else 3)
        lat = values.get("Latitude")
        lon = values.get("Longitude")
        if lat is None or lon is None:
            continue
        sites.append({
            "id": int(i),
            "state": str(rec["State"]),
            "district": str(rec["District"]),
            "location": str(rec["Location"]).strip().rstrip(","),
            "lat": lat,
            "lon": lon,
            "wqi": _num(rec["WQI"], 1),
            "category": str(rec["WQI_Category"]),
            "predicted": str(rec["Predicted_Class"]),
            "ph": values.get("pH"),
            "ec": values.get("EC"),
            "cl": values.get("Cl"),
            "f": values.get("F"),
            "no3": values.get("NO3"),
            "th": values.get("TH"),
            "values": values,
        })
    return sites, medians, found_states or list(states)


SITES, MEDIAN_ROW, CSV_STATES = load_map_data()
if CSV_STATES:
    states = CSV_STATES

for field in FORM_FIELDS:
    column = resolve_feature(field["key"])
    if column and column in MEDIAN_ROW:
        digits = 4 if field["key"] in ("Latitude", "Longitude") else 2
        field["default"] = round(float(MEDIAN_ROW[column]), digits)
    else:
        field["default"] = 0


class PredictionRequest(BaseModel):
    state: str = ""
    parameters: Dict[str, float]


@app.get("/")
def root():
    return {
        "service": "India Groundwater Quality API",
        "wells": len(SITES),
        "try": ["/api/metadata", "/api/sites", "/docs"],
        "app": "http://localhost:5173/",
    }


@app.get("/api/metadata")
def get_metadata():
    live_metrics = metrics
    if not live_metrics and hasattr(model, "feature_importances_") and feature_names:
        imp_pairs = sorted(
            zip(feature_names, model.feature_importances_),
            key=lambda x: x[1],
            reverse=True,
        )[:8]
        live_metrics = {
            "accuracy": None,
            "weighted_f1": None,
            "feature_importances": [
                {"feature": k, "importance": round(float(v) * 100, 2)}
                for k, v in imp_pairs
            ],
        }
    return {
        "states": states,
        "metrics": live_metrics,
        "fields": FORM_FIELDS,
        "wells": len(SITES),
    }


@app.get("/api/sites")
def get_sites():
    return {"count": len(SITES), "sites": SITES}


@app.post("/api/predict")
def predict_water_quality(req: PredictionRequest):
    row = {name: float(MEDIAN_ROW.get(name, 0.0)) for name in feature_names}
    for key, val in req.parameters.items():
        matched = resolve_feature(key)
        if matched:
            row[matched] = float(val)
    apply_quality_ratings(row)

    input_df = pd.DataFrame([row])[feature_names]
    try:
        pred = str(model.predict(input_df)[0])
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Model could not score this sample: {exc}") from exc

    probabilities = []
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(input_df)[0]
        probabilities = [
            {"label": str(cls), "confidence": round(float(p) * 100, 1)}
            for cls, p in zip(model.classes_, probs)
        ]
        probabilities.sort(key=lambda x: x["confidence"], reverse=True)

    return {"prediction": pred, "probabilities": probabilities}
