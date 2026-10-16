"""
Tests mapped to PRD acceptance criteria (§38 AI) and integrity rules (§34).
A small model is trained once into a temp registry for the whole session.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import pytest
from pydantic import ValidationError

from dropsafe_ml import config
from dropsafe_ml.evidence import check_sufficiency
from dropsafe_ml.features import engineer_features
from dropsafe_ml.registry import ModelRegistry, RegistryError
from dropsafe_ml.schemas import (
    AttendanceRecord, AssessmentRecord, PredictionRequest, StudentEvidence,
)
from dropsafe_ml.synthetic import write_dataset

EXAMPLES = Path(__file__).resolve().parent.parent / "examples"


# --------------------------------------------------------------------------- #
@pytest.fixture(scope="session")
def trained(tmp_path_factory):
    from dropsafe_ml.train import train
    root = tmp_path_factory.mktemp("ml")
    ds = write_dataset(n_students=2500, seed=7, out_dir=root / "data")
    reg = ModelRegistry(root / "models")
    res = train(ds, reg, seed=7)
    reg.deploy(res["model_version"])
    return reg, res


@pytest.fixture(scope="session")
def predictor(trained):
    from dropsafe_ml.predictor import RiskPredictor
    reg, _ = trained
    return RiskPredictor.from_registry(reg)


def _req(name: str) -> PredictionRequest:
    return PredictionRequest.model_validate(json.loads((EXAMPLES / name).read_text()))


# --------------------------------------------------------------------------- #
# Integrity constraints (PRD §8, §34)
# --------------------------------------------------------------------------- #
def test_attendance_constraints():
    with pytest.raises(ValidationError):
        AttendanceRecord(learning_component_id="A", attended_sessions=11, total_sessions=10)
    with pytest.raises(ValidationError):
        AttendanceRecord(learning_component_id="A", attended_sessions=0, total_sessions=0)


def test_assessment_constraints():
    with pytest.raises(ValidationError):
        AssessmentRecord(learning_component_id="A", obtained_marks=101, maximum_marks=100)
    with pytest.raises(ValidationError):
        AssessmentRecord(learning_component_id="A", obtained_marks=-1, maximum_marks=100)


# --------------------------------------------------------------------------- #
# Feature engineering fe-v1
# --------------------------------------------------------------------------- #
def test_feature_formulas():
    ev = StudentEvidence.model_validate({
        "attendance_records": [
            {"learning_component_id": "A", "attended_sessions": 30, "total_sessions": 40},
            {"learning_component_id": "B", "attended_sessions": 10, "total_sessions": 20},
        ],
        "assessment_records": [
            {"learning_component_id": "A", "obtained_marks": 10, "maximum_marks": 30},
            {"learning_component_id": "A", "obtained_marks": 20, "maximum_marks": 70},  # A = 30% -> fail
            {"learning_component_id": "B", "obtained_marks": 45, "maximum_marks": 100,
             "grading_outcome": "FAIL"},  # explicit outcome wins over %
        ],
        "prior_assessment_records": [
            {"learning_component_id": "X", "academic_period_order": 1, "obtained_marks": 20,
             "maximum_marks": 100, "grading_outcome": "FAIL"},
            {"learning_component_id": "X", "academic_period_order": 2, "obtained_marks": 55,
             "maximum_marks": 100, "grading_outcome": "PASS"},  # cleared -> not a backlog
            {"learning_component_id": "Y", "academic_period_order": 2, "obtained_marks": 25,
             "maximum_marks": 100, "grading_outcome": "FAIL"},  # backlog
        ],
    })
    f = engineer_features(ev)
    assert f["attendance_percentage"] == pytest.approx(66.67)
    assert f["overall_marks_percentage"] == pytest.approx(37.5)
    assert f["failed_learning_components"] == 2
    assert f["backlog_count"] == 1
    assert f["behaviour_score"] is None and f["engagement_score"] is None


def test_features_do_not_modify_evidence():
    req = _req("at_risk_student.json")
    before = req.evidence.model_dump()
    engineer_features(req.evidence)
    assert req.evidence.model_dump() == before


# --------------------------------------------------------------------------- #
# "Do not guess" gate (PRD §38: insufficient evidence -> no prediction)
# --------------------------------------------------------------------------- #
def test_insufficient_evidence_reasons():
    reasons = check_sufficiency(StudentEvidence())
    assert any("Attendance" in r for r in reasons)
    assert any("Assessment" in r for r in reasons)


def test_insufficient_evidence_produces_no_prediction(predictor):
    res = predictor.predict(_req("insufficient_evidence.json"))
    assert res.status == "INSUFFICIENT_EVIDENCE"
    assert res.prediction is None and res.snapshot is None
    assert res.missing_evidence


# --------------------------------------------------------------------------- #
# Predictions (PRD §13, §24, §34)
# --------------------------------------------------------------------------- #
def test_prediction_traceability_and_ranges(predictor, trained):
    _, res_train = trained
    res = predictor.predict(_req("at_risk_student.json"))
    assert res.status == "PREDICTED"
    p = res.prediction
    assert p.risk_label in {"LOW", "MEDIUM", "HIGH"}
    assert 0 <= p.prediction_score <= 100
    assert 0 <= p.risk_probability <= 100
    assert p.ai_model_version == res_train["model_version"]
    assert p.feature_version == config.FEATURE_VERSION
    assert res.snapshot.feature_version == config.FEATURE_VERSION
    assert p.training_dataset_version
    assert p.top_factors


def test_risk_ordering(predictor):
    hi = predictor.predict(_req("at_risk_student.json")).prediction
    lo = predictor.predict(_req("on_track_student.json")).prediction
    assert hi.risk_probability > lo.risk_probability
    assert hi.risk_label == "HIGH" and lo.risk_label == "LOW"


def test_monotonic_attendance(predictor):
    """Holding all else equal, better attendance must never raise risk."""
    base = _req("at_risk_student.json")
    probs = []
    for attended in (10, 20, 30, 38):
        r = base.model_copy(deep=True)
        for rec in r.evidence.attendance_records:
            rec.attended_sessions = min(attended, rec.total_sessions)
        probs.append(predictor.predict(r).prediction.risk_probability)
    assert all(a >= b for a, b in zip(probs, probs[1:])), probs


def test_batch_mixed(predictor):
    out = predictor.predict_batch([_req("at_risk_student.json"),
                                   _req("insufficient_evidence.json"),
                                   _req("on_track_student.json")])
    assert [o.status for o in out] == ["PREDICTED", "INSUFFICIENT_EVIDENCE", "PREDICTED"]
    assert [o.student_id for o in out] == ["STU-1001", "STU-1003", "STU-1002"]


def test_model_quality_on_synthetic(trained):
    m = trained[1]["metrics"]
    assert m["lightgbm_calibrated"]["roc_auc"] > 0.85


# --------------------------------------------------------------------------- #
# Registry rules (PRD §13, §20: one ACTIVE, ACTIVE->RETIRED, immutable)
# --------------------------------------------------------------------------- #
def test_registry_single_active_and_retire(trained, tmp_path):
    from dropsafe_ml.train import train
    reg, first = trained
    ds = write_dataset(n_students=1500, seed=11, out_dir=tmp_path / "d2")
    second = train(ds, reg, seed=11)
    reg.deploy(second["model_version"])
    statuses = {m["model_version"]: m["status"] for m in reg.list()}
    assert statuses[first["model_version"]] == "RETIRED"
    assert statuses[second["model_version"]] == "ACTIVE"
    assert sum(s == "ACTIVE" for s in statuses.values()) == 1
    # retired models remain on disk for historical reference
    assert (reg.model_dir(first["model_version"]) / "model.txt").exists()
    # cannot re-deploy (RETIRED is final / metadata immutable)
    with pytest.raises(RegistryError):
        reg.deploy(first["model_version"])
    # deployed artifacts are read-only
    meta = reg.model_dir(second["model_version"]) / "metadata.json"
    assert not os.access(meta, os.W_OK) or os.geteuid() == 0


# --------------------------------------------------------------------------- #
# API
# --------------------------------------------------------------------------- #
def test_api(trained, monkeypatch):
    from fastapi.testclient import TestClient
    import dropsafe_ml.api as api

    reg, _ = trained
    monkeypatch.setattr(api, "ModelRegistry", lambda: reg)
    monkeypatch.setattr(api, "_predictor", None)
    c = TestClient(api.app)
    assert c.get("/health").json()["status"] == "ok"
    assert c.get("/model").json()["status"] == "ACTIVE"
    r = c.post("/predict", json=json.loads((EXAMPLES / "at_risk_student.json").read_text()))
    assert r.status_code == 200 and r.json()["status"] == "PREDICTED"
    r = c.post("/predict", json={"organization_id": "o", "student_id": "s",
                                 "enrollment_id": "e", "evidence": {}})
    assert r.json()["status"] == "INSUFFICIENT_EVIDENCE"
    bad = json.loads((EXAMPLES / "on_track_student.json").read_text())
    bad["evidence"]["attendance_records"][0]["attended_sessions"] = 999
    assert c.post("/predict", json=bad).status_code == 422


# --------------------------------------------------------------------------- #
# Reports
# --------------------------------------------------------------------------- #
def test_reports(trained, tmp_path):
    from dropsafe_ml.report import model_report, risk_report
    reg, res = trained
    out = model_report(None, registry=reg, out_dir=tmp_path)
    assert out["html"].exists() and "Model Evaluation Report" in out["html"].read_text()
    batch = tmp_path / "cohort.json"
    batch.write_text(json.dumps([json.loads((EXAMPLES / n).read_text()) for n in
                                 ("at_risk_student.json", "on_track_student.json",
                                  "insufficient_evidence.json")]))
    out = risk_report(batch, registry=reg, out_dir=tmp_path)
    text = out["html"].read_text()
    assert "STU-1001" in text and "CONFIDENTIAL" in text
    rows = out["csv"].read_text().strip().splitlines()
    assert len(rows) == 4  # header + 3 students
