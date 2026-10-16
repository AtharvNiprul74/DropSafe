"""
Central configuration for the DropSafe ML service.

IMPORTANT — PRD §37 states that the exact ML algorithm, feature formulas,
training dataset and evaluation thresholds are NOT frozen. Every value marked
`PROVISIONAL` below is an implementation default chosen so the pipeline can run
end-to-end. Each must be confirmed (or replaced) by an approved ML
specification before production use. Changing any feature formula requires
bumping FEATURE_VERSION.
"""
from __future__ import annotations

import os
from pathlib import Path

# --------------------------------------------------------------------------- #
# Paths
# --------------------------------------------------------------------------- #
PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = Path(os.environ.get("DROPSAFE_MODELS_DIR", PROJECT_ROOT / "models"))
DATA_DIR = Path(os.environ.get("DROPSAFE_DATA_DIR", PROJECT_ROOT / "data"))

# --------------------------------------------------------------------------- #
# Model identity (maps to ai_model_metadata)
# --------------------------------------------------------------------------- #
MODEL_NAME = "dropsafe-risk"
ALGORITHM = "LightGBM gradient-boosted trees (binary) + isotonic calibration"

# --------------------------------------------------------------------------- #
# Feature engineering (maps to student_snapshots feature columns, PRD §13)
# --------------------------------------------------------------------------- #
FEATURE_VERSION = "fe-v1"

FEATURE_COLUMNS: list[str] = [
    "attendance_percentage",
    "overall_marks_percentage",
    "failed_learning_components",
    "backlog_count",
    "behaviour_score",
    "engagement_score",
    "sentiment_score",
]

# Behavioural features come from the (not-yet-built) Behaviour Analysis module.
# Until it exists they may be absent; LightGBM handles missing values natively.
BEHAVIOUR_FEATURES = {"behaviour_score", "engagement_score", "sentiment_score"}

# Human-readable labels used in explanations.
FEATURE_LABELS: dict[str, str] = {
    "attendance_percentage": "Attendance",
    "overall_marks_percentage": "Overall marks",
    "failed_learning_components": "Failed learning components",
    "backlog_count": "Backlogs from earlier periods",
    "behaviour_score": "Behaviour score",
    "engagement_score": "Engagement score",
    "sentiment_score": "Sentiment score",
}

# Monotonic constraints (+1: higher value -> higher risk, -1: higher -> lower risk).
# Keeps the model's behaviour explainable & defensible for human reviewers.
MONOTONE_CONSTRAINTS: dict[str, int] = {
    "attendance_percentage": -1,
    "overall_marks_percentage": -1,
    "failed_learning_components": +1,
    "backlog_count": +1,
    "behaviour_score": -1,
    "engagement_score": -1,
    "sentiment_score": -1,
}

# PROVISIONAL: pass mark used ONLY when an assessment has no grading_outcome.
PASS_MARK_PERCENT = 40.0

# --------------------------------------------------------------------------- #
# Evidence sufficiency (PRD §2.3, §14, §30: "do not guess")
# --------------------------------------------------------------------------- #
# PROVISIONAL rules — the PRD requires the gate but does not define it.
EVIDENCE_RULES = {
    "min_attendance_records": 1,
    "min_total_sessions": 10,        # total sessions across all components
    "min_assessment_records": 1,
    "require_behaviour": False,      # behaviour analysis not built yet
}

# --------------------------------------------------------------------------- #
# Risk bands (predictions.risk_label: LOW / MEDIUM / HIGH)
# --------------------------------------------------------------------------- #
# PROVISIONAL thresholds on calibrated risk probability (0-1).
RISK_BANDS = {
    "MEDIUM": 0.30,  # p >= 0.30 -> MEDIUM
    "HIGH": 0.60,    # p >= 0.60 -> HIGH
}

# Calibrated probabilities are clamped so the model never claims certainty.
PROBABILITY_BOUNDS = (0.01, 0.99)

# --------------------------------------------------------------------------- #
# Training hyper-parameters (PROVISIONAL)
# --------------------------------------------------------------------------- #
LGBM_PARAMS = {
    "objective": "binary",
    "metric": ["binary_logloss", "auc"],
    "learning_rate": 0.03,
    "num_leaves": 15,
    "min_data_in_leaf": 40,
    "feature_fraction": 0.9,
    "bagging_fraction": 0.8,
    "bagging_freq": 1,
    "lambda_l2": 1.0,
    "verbose": -1,
    "seed": 42,
    "deterministic": True,
    "num_threads": 2,
}
NUM_BOOST_ROUND = 3000
EARLY_STOPPING_ROUNDS = 100
