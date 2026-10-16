"""
Training pipeline:

raw evidence (jsonl) -> sufficiency gate -> feature engineering (fe-v1)
-> stratified train/valid/test split -> LightGBM (monotone constraints,
early stopping) -> isotonic calibration on valid -> evaluation on held-out
test (+ logistic-regression baseline) -> immutable artifact directory.

Deployment (making the model ACTIVE) is a separate, explicit step.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import lightgbm as lgb
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from sklearn.calibration import calibration_curve  # noqa: E402
from sklearn.impute import SimpleImputer  # noqa: E402
from sklearn.isotonic import IsotonicRegression  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import (  # noqa: E402
    average_precision_score, brier_score_loss, log_loss, roc_auc_score,
)
from sklearn.model_selection import train_test_split  # noqa: E402
from sklearn.pipeline import make_pipeline  # noqa: E402
from sklearn.preprocessing import StandardScaler  # noqa: E402

from dropsafe_ml import config  # noqa: E402
from dropsafe_ml.evidence import check_sufficiency  # noqa: E402
from dropsafe_ml.features import engineer_features  # noqa: E402
from dropsafe_ml.registry import ModelRegistry  # noqa: E402
from dropsafe_ml.schemas import StudentEvidence  # noqa: E402
from dropsafe_ml.scoring import risk_bands  # noqa: E402


# --------------------------------------------------------------------------- #
def load_dataset(path: Path) -> tuple[pd.DataFrame, pd.Series, dict]:
    rows, labels, excluded = [], [], 0
    with Path(path).open() as fh:
        for line in fh:
            rec = json.loads(line)
            ev = StudentEvidence.model_validate(rec["evidence"])
            if check_sufficiency(ev):
                excluded += 1  # never train on evidence we wouldn't predict on
                continue
            rows.append(engineer_features(ev))
            labels.append(int(rec["label_disengaged"]))
    X = pd.DataFrame(rows, columns=config.FEATURE_COLUMNS).astype(float)
    y = pd.Series(labels, name="label_disengaged")
    meta_path = Path(path).parent / "dataset_meta.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    meta.update({"rows_used": len(X), "rows_excluded_insufficient_evidence": excluded})
    return X, y, meta


def _band_report(y: np.ndarray, p: np.ndarray) -> dict:
    bands = risk_bands(p)
    out = {}
    for b in ("LOW", "MEDIUM", "HIGH"):
        m = bands == b
        out[b] = {
            "students": int(m.sum()),
            "share_of_students": round(float(m.mean()), 4),
            "observed_disengagement_rate": round(float(y[m].mean()), 4) if m.any() else None,
            "share_of_all_disengaged_captured": round(float(y[m].sum() / max(y.sum(), 1)), 4),
        }
    return out


def _metrics(y: np.ndarray, p: np.ndarray) -> dict:
    return {
        "roc_auc": round(float(roc_auc_score(y, p)), 4),
        "pr_auc": round(float(average_precision_score(y, p)), 4),
        "brier": round(float(brier_score_loss(y, p)), 4),
        "log_loss": round(float(log_loss(y, np.clip(p, 1e-6, 1 - 1e-6))), 4),
    }


# --------------------------------------------------------------------------- #
def train(dataset_path: Path | str, registry: ModelRegistry | None = None,
          seed: int = 42) -> dict:
    registry = registry or ModelRegistry()
    X, y, ds_meta = load_dataset(Path(dataset_path))
    ds_version = ds_meta.get("training_dataset_version", Path(dataset_path).parent.name)

    X_tr, X_tmp, y_tr, y_tmp = train_test_split(X, y, test_size=0.30, stratify=y, random_state=seed)
    X_va, X_te, y_va, y_te = train_test_split(X_tmp, y_tmp, test_size=0.50, stratify=y_tmp,
                                              random_state=seed)

    # ---- LightGBM --------------------------------------------------------- #
    params = dict(config.LGBM_PARAMS)
    params["seed"] = seed
    params["monotone_constraints"] = [config.MONOTONE_CONSTRAINTS[c] for c in config.FEATURE_COLUMNS]
    dtr = lgb.Dataset(X_tr, y_tr, feature_name=config.FEATURE_COLUMNS)
    dva = lgb.Dataset(X_va, y_va, reference=dtr)
    booster = lgb.train(
        params, dtr, num_boost_round=config.NUM_BOOST_ROUND, valid_sets=[dva],
        callbacks=[lgb.early_stopping(config.EARLY_STOPPING_ROUNDS, first_metric_only=True, verbose=False)],
    )

    # ---- calibration (fit on validation split) ---------------------------- #
    raw_va = booster.predict(X_va, num_iteration=booster.best_iteration)
    calibrator = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
    calibrator.fit(raw_va, y_va)

    raw_te = booster.predict(X_te, num_iteration=booster.best_iteration)
    p_te = np.clip(calibrator.predict(raw_te), *config.PROBABILITY_BOUNDS)

    # ---- baseline: logistic regression ------------------------------------ #
    baseline = make_pipeline(SimpleImputer(strategy="median", add_indicator=True),
                             StandardScaler(), LogisticRegression(max_iter=2000))
    baseline.fit(X_tr, y_tr)
    p_base = baseline.predict_proba(X_te)[:, 1]

    yt = y_te.to_numpy()
    metrics = {
        "split_sizes": {"train": len(X_tr), "valid": len(X_va), "test": len(X_te)},
        "test_positive_rate": round(float(yt.mean()), 4),
        "lightgbm_calibrated": _metrics(yt, p_te),
        "lightgbm_uncalibrated": _metrics(yt, raw_te),
        "baseline_logistic_regression": _metrics(yt, p_base),
        "risk_bands_test": _band_report(yt, p_te),
        "risk_band_thresholds": config.RISK_BANDS,
        "best_iteration": int(booster.best_iteration),
    }

    # ---- global importance (mean |SHAP|) ---------------------------------- #
    contrib = booster.predict(X_te, num_iteration=booster.best_iteration, pred_contrib=True)
    mean_abs = np.abs(contrib[:, :-1]).mean(axis=0)
    importance = dict(sorted(
        {c: round(float(v), 4) for c, v in zip(config.FEATURE_COLUMNS, mean_abs)}.items(),
        key=lambda kv: -kv[1]))
    metrics["global_feature_importance_mean_abs_shap"] = importance

    # ---- write immutable artifact ----------------------------------------- #
    version = registry.next_version()
    out = registry.model_dir(version)
    out.mkdir(parents=True, exist_ok=False)
    booster.save_model(str(out / "model.txt"), num_iteration=booster.best_iteration)
    joblib.dump(calibrator, out / "calibrator.joblib")

    metadata = {
        "model_name": config.MODEL_NAME,
        "model_version": version,
        "algorithm": config.ALGORITHM,
        "feature_version": config.FEATURE_VERSION,
        "feature_columns": config.FEATURE_COLUMNS,
        "monotone_constraints": config.MONOTONE_CONSTRAINTS,
        "training_dataset_version": ds_version,
        "training_dataset_synthetic": bool(ds_meta.get("synthetic", False)),
        "dataset_rows_used": ds_meta["rows_used"],
        "dataset_rows_excluded_insufficient_evidence": ds_meta["rows_excluded_insufficient_evidence"],
        "lgbm_params": params,
        "risk_band_thresholds": config.RISK_BANDS,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    (out / "metadata.json").write_text(json.dumps(metadata, indent=2))
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2))
    _plots(out, importance, yt, p_te, p_base)
    return {"model_version": version, "artifact_dir": str(out), "metrics": metrics}


def _plots(out: Path, importance: dict, y: np.ndarray, p: np.ndarray, p_base: np.ndarray) -> None:
    fig, ax = plt.subplots(figsize=(7, 4))
    names = [config.FEATURE_LABELS[k] for k in importance][::-1]
    ax.barh(names, list(importance.values())[::-1], color="#3b6fd8")
    ax.set_xlabel("Mean |SHAP| (log-odds)")
    ax.set_title("DropSafe risk model — global feature importance")
    fig.tight_layout()
    fig.savefig(out / "feature_importance.png", dpi=130)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(5.5, 5))
    for probs, name in ((p, "LightGBM (calibrated)"), (p_base, "Logistic baseline")):
        fy, fx = calibration_curve(y, probs, n_bins=10, strategy="quantile")
        ax.plot(fx, fy, marker="o", label=name)
    ax.plot([0, 1], [0, 1], "--", color="grey", label="Perfect calibration")
    ax.set_xlabel("Predicted risk probability")
    ax.set_ylabel("Observed disengagement rate")
    ax.set_title("Calibration (held-out test set)")
    ax.legend()
    fig.tight_layout()
    fig.savefig(out / "calibration.png", dpi=130)
    plt.close(fig)
