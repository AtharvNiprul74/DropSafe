"""
Inference: request -> sufficiency gate -> snapshot features -> calibrated risk
probability -> LOW/MEDIUM/HIGH -> per-student explanation (SHAP via LightGBM
pred_contrib).

Stateless: returns snapshot + prediction payloads for the backend to persist
in student_snapshots / predictions / prediction_history.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd

from dropsafe_ml import config
from dropsafe_ml.evidence import check_sufficiency
from dropsafe_ml.features import engineer_features
from dropsafe_ml.registry import ModelRegistry
from dropsafe_ml.schemas import (
    PredictionOut, PredictionRequest, PredictionResponse, PredictionStatus,
    RiskFactor, SnapshotOut,
)
from dropsafe_ml.scoring import prediction_confidence, risk_band


class ModelNotAvailable(RuntimeError):
    pass


class RiskPredictor:
    def __init__(self, model_dir: Path | str):
        model_dir = Path(model_dir)
        self.metadata = json.loads((model_dir / "metadata.json").read_text())
        if self.metadata["feature_version"] != config.FEATURE_VERSION:
            raise ModelNotAvailable(
                f"Model feature_version {self.metadata['feature_version']} != service "
                f"feature_version {config.FEATURE_VERSION}. Retrain or roll back."
            )
        self.booster = lgb.Booster(model_file=str(model_dir / "model.txt"))
        self.calibrator = joblib.load(model_dir / "calibrator.joblib")
        self.columns = self.metadata["feature_columns"]
        self.bands = self.metadata.get("risk_band_thresholds", config.RISK_BANDS)

    @classmethod
    def from_registry(cls, registry: ModelRegistry | None = None) -> "RiskPredictor":
        registry = registry or ModelRegistry()
        active = registry.get_active()
        if active is None:
            raise ModelNotAvailable("No ACTIVE model. Train and deploy one first.")
        return cls(registry.model_dir(active["model_version"]))

    # ------------------------------------------------------------------ #
    def predict(self, req: PredictionRequest) -> PredictionResponse:
        return self.predict_batch([req])[0]

    def predict_batch(self, reqs: list[PredictionRequest]) -> list[PredictionResponse]:
        now = datetime.now(timezone.utc)
        responses: list[PredictionResponse | None] = [None] * len(reqs)
        ok_idx, ok_feats = [], []

        for i, req in enumerate(reqs):
            reasons = check_sufficiency(req.evidence)
            base = dict(organization_id=req.organization_id, student_id=req.student_id,
                        enrollment_id=req.enrollment_id)
            if reasons:
                responses[i] = PredictionResponse(
                    status=PredictionStatus.INSUFFICIENT_EVIDENCE, missing_evidence=reasons, **base)
                continue
            ok_idx.append(i)
            ok_feats.append(engineer_features(req.evidence))

        if ok_idx:
            X = pd.DataFrame(ok_feats, columns=self.columns).astype(float)
            raw = self.booster.predict(X)
            probs = np.clip(self.calibrator.predict(raw), *config.PROBABILITY_BOUNDS)
            contrib = self.booster.predict(X, pred_contrib=True)

            for row, i in enumerate(ok_idx):
                req, feats, p = reqs[i], ok_feats[row], float(probs[row])
                snapshot = SnapshotOut(
                    organization_id=req.organization_id, student_id=req.student_id,
                    enrollment_id=req.enrollment_id, import_session_id=req.import_session_id,
                    feature_version=config.FEATURE_VERSION, snapshot_generated_at=now,
                    **feats,
                )
                conf = prediction_confidence(p)
                prediction = PredictionOut(
                    risk_label=risk_band(p, self.bands),
                    risk_probability=round(100.0 * p, 2),
                    prediction_confidence=conf,
                    prediction_score=conf,
                    ai_model_version=self.metadata["model_version"],
                    feature_version=self.metadata["feature_version"],
                    training_dataset_version=self.metadata["training_dataset_version"],
                    generated_at=now,
                    top_factors=self._explain(feats, contrib[row]),
                )
                responses[i] = PredictionResponse(
                    status=PredictionStatus.PREDICTED, organization_id=req.organization_id,
                    student_id=req.student_id, enrollment_id=req.enrollment_id,
                    snapshot=snapshot, prediction=prediction,
                )
        return responses  # type: ignore[return-value]

    # ------------------------------------------------------------------ #
    def _explain(self, feats: dict, contrib_row: np.ndarray, top_k: int = 4) -> list[RiskFactor]:
        items = []
        for col, impact in zip(self.columns, contrib_row[:-1]):
            if abs(impact) < 1e-6:
                continue
            value = feats.get(col)
            label = config.FEATURE_LABELS[col]
            raises = impact > 0
            if value is None or (isinstance(value, float) and math.isnan(value)):
                desc = f"{label} not available"
            elif col.endswith("percentage"):
                desc = f"{label} {value:.1f}%"
            elif col in config.BEHAVIOUR_FEATURES:
                desc = f"{label} {value:.0f}/100"
            else:
                desc = f"{label}: {int(value)}"
            desc += " — raises risk" if raises else " — lowers risk"
            items.append(RiskFactor(
                feature=col, label=label, value=value, impact=round(float(impact), 4),
                direction="RAISES_RISK" if raises else "LOWERS_RISK", description=desc,
            ))
        items.sort(key=lambda f: -abs(f.impact))
        return items[:top_k]
