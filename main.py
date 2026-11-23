from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict
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

# Safely handle either a dictionary bundle or a raw model object
if isinstance(bundle, dict):
    model = bundle["model"]
    feature_names = bundle.get("feature_names", list(getattr(model, "feature_names_in_", [])))
    defaults = bundle.get("defaults", {})
    states = bundle.get("states", [
        "Andhra Pradesh", "Bihar", "Chhattisgarh", "Haryana",
        "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab",
        "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"
    ])
    metrics = bundle.get("metrics", None)
else:
    model = bundle
    feature_names = list(getattr(model, "feature_names_in_", []))
    defaults = {}
    states = [
        "Andhra Pradesh", "Bihar", "Chhattisgarh", "Haryana",
        "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab",
        "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"
    ]
    metrics = None

class PredictionRequest(BaseModel):
    state: str
    parameters: Dict[str, float]

@app.get("/api/metadata")
def get_metadata():
    # Build live feature importances directly from the loaded Random Forest model
    live_metrics = metrics
    if not live_metrics and hasattr(model, "feature_importances_") and feature_names:
        imp_pairs = sorted(
            zip(feature_names, model.feature_importances_),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        live_metrics = {
            "accuracy": "N/A (Re-export bundle)",
            "weighted_f1": "N/A",
            "feature_importances": [
                {"feature": k, "importance": round(float(v) * 100, 2)}
                for k, v in imp_pairs
            ]
        }
    return {
        "states": states,
        "defaults": defaults,
        "metrics": live_metrics
    }

@app.post("/api/predict")
def predict_water_quality(req: PredictionRequest):
    row = {col: defaults.get(col, 0.0) for col in feature_names}

    for key, val in req.parameters.items():
        matched = next((c for c in feature_names if c == key or c.startswith(key + " ")), None)
        if matched:
            row[matched] = val

    state_col = f"State_{req.state}"
    if state_col in row:
        row[state_col] = 1.0
    elif "State" in row and req.state in states:
        row["State"] = sorted(states).index(req.state)

    input_df = pd.DataFrame([row])[feature_names] if feature_names else pd.DataFrame([req.parameters])
    pred = str(model.predict(input_df)[0])

    probabilities = []
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(input_df)[0]
        probabilities = [
            {"label": str(cls), "confidence": round(float(p) * 100, 1)}
            for cls, p in zip(model.classes_, probs)
        ]
        probabilities.sort(key=lambda x: x["confidence"], reverse=True)

    return {
        "prediction": pred,
        "probabilities": probabilities
    }