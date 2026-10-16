"""Probability -> risk band / confidence (PROVISIONAL, see PRD Q7)."""
from __future__ import annotations

import numpy as np

from dropsafe_ml.config import RISK_BANDS


def risk_band(p: float, bands: dict | None = None) -> str:
    bands = bands or RISK_BANDS
    if p >= bands["HIGH"]:
        return "HIGH"
    if p >= bands["MEDIUM"]:
        return "MEDIUM"
    return "LOW"


def risk_bands(ps: np.ndarray, bands: dict | None = None) -> np.ndarray:
    return np.array([risk_band(float(p), bands) for p in ps])


def prediction_confidence(p: float) -> float:
    """
    PROVISIONAL definition (PRD Q7 unresolved): certainty of the binary
    outcome, 100 * max(p, 1 - p). 50 = maximally uncertain, 100 = certain.
    """
    return round(100.0 * max(p, 1.0 - p), 2)
