"""
FastAPI inference service (internal — called by the Node.js backend only).

PROVISIONAL endpoints (PRD §37: REST paths not frozen):
    GET  /                  redirects to /docs (Swagger UI)
    GET  /health
    GET  /model             active model metadata (ai_model_metadata)
    POST /predict           single student
    POST /predict/batch     many students (e.g. after an Import Session)
    POST /admin/reload      reload ACTIVE model after a deployment

Privacy: request bodies (student evidence) are never logged.
Authentication between backend and ML service is NOT yet specified; deploy on
a private network or put it behind the backend's service auth.
"""
from __future__ import annotations

import logging
from threading import Lock

from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse, Response

from dropsafe_ml import __version__, config
from dropsafe_ml.predictor import ModelNotAvailable, RiskPredictor
from dropsafe_ml.registry import ModelRegistry
from dropsafe_ml.schemas import BatchPredictionRequest, PredictionRequest, PredictionResponse

log = logging.getLogger("dropsafe_ml")
app = FastAPI(title="DropSafe ML Service", version=__version__,
              description="Student risk prediction — decision support only.")

_lock = Lock()
_predictor: RiskPredictor | None = None


def _get_predictor() -> RiskPredictor:
    global _predictor
    with _lock:
        if _predictor is None:
            try:
                _predictor = RiskPredictor.from_registry(ModelRegistry())
            except ModelNotAvailable as e:
                raise HTTPException(status_code=503, detail=str(e))
        return _predictor


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)


@app.get("/health")
def health():
    try:
        p = _get_predictor()
        return {"status": "ok", "active_model": p.metadata["model_version"],
                "feature_version": config.FEATURE_VERSION}
    except HTTPException as e:
        return {"status": "degraded", "detail": e.detail}


@app.get("/model")
def model_info():
    p = _get_predictor()
    active = ModelRegistry().get_active()
    return {**p.metadata, "status": active["status"] if active else None,
            "deployment_timestamp": active.get("deployment_timestamp") if active else None}


@app.post("/predict", response_model=PredictionResponse)
def predict(req: PredictionRequest):
    return _get_predictor().predict(req)


@app.post("/predict/batch", response_model=list[PredictionResponse])
def predict_batch(req: BatchPredictionRequest):
    return _get_predictor().predict_batch(req.requests)


@app.post("/admin/reload")
def reload_model():
    global _predictor
    with _lock:
        _predictor = None
    p = _get_predictor()
    return {"reloaded": True, "active_model": p.metadata["model_version"]}
