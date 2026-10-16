"""
Synthetic training-data generator.

Generates RAW evidence (attendance records, assessment records, prior-period
assessments, placeholder behaviour signals) plus a binary outcome label
`disengaged` (1 = student disengaged / dropped out by end of period).

!!! This data is SIMULATED. It exists so the full pipeline (feature
engineering -> training -> calibration -> registry -> inference) can be built
and tested before real institutional data is available. A model trained on it
must NOT be used to make decisions about real students. Retrain on real,
approved historical data before production (PRD §37: training dataset not
frozen).

Simulation design
-----------------
Each student has a hidden "risk propensity" z ~ N(0, 1). Observable evidence
(attendance, marks, failures, backlogs, behaviour) is generated from z plus
noise, and the outcome is drawn from a logistic model of the observables, z,
and a few non-linear interactions (so a tree model has something to learn).
~4% of students are generated with deliberately insufficient evidence to
exercise the "do not guess" gate.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from dropsafe_ml.config import DATA_DIR, PASS_MARK_PERCENT
from dropsafe_ml.features import engineer_features
from dropsafe_ml.schemas import StudentEvidence


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + np.exp(-x))


def _student(rng: np.random.Generator, idx: int, org_id: str) -> dict:
    z = rng.normal()
    n_comp = int(rng.integers(4, 8))
    comps = [f"LC-{j + 1:02d}" for j in range(n_comp)]

    # ---- attendance ------------------------------------------------------- #
    base_att = _sigmoid(1.7 - 0.95 * z + rng.normal(0, 0.35))
    attendance = []
    comp_att = {}
    for c in comps:
        total = int(rng.integers(20, 61))
        p = float(np.clip(base_att + rng.normal(0, 0.06), 0.02, 0.995))
        attended = int(rng.binomial(total, p))
        comp_att[c] = attended / total
        attendance.append(
            {"learning_component_id": c, "attended_sessions": attended, "total_sessions": total}
        )

    # ---- current-period assessments --------------------------------------- #
    ability = -0.75 * z + 0.6 * rng.normal()
    assessments = []
    for c in comps:
        pct = 58 + 14 * ability + 30 * (comp_att[c] - 0.78) + rng.normal(0, 9)
        pct = float(np.clip(pct, 0, 100))
        parts = [30.0, 70.0] if rng.random() < 0.7 else [100.0]
        include_outcome = rng.random() < 0.8
        comp_fail = pct < PASS_MARK_PERCENT
        for mx in parts:
            part_pct = float(np.clip(pct + rng.normal(0, 4), 0, 100))
            rec = {
                "learning_component_id": c,
                "obtained_marks": round(mx * part_pct / 100.0, 1),
                "maximum_marks": mx,
            }
            if include_outcome:
                rec["grading_outcome"] = "FAIL" if comp_fail else "PASS"
            assessments.append(rec)

    # ---- earlier periods (backlogs) --------------------------------------- #
    year = int(rng.integers(1, 5))
    prior = []
    n_prior_periods = (year - 1) * 2
    for period in range(1, n_prior_periods + 1):
        for j in range(int(rng.integers(4, 7))):
            comp = f"P{period}-LC-{j + 1:02d}"
            p_fail = _sigmoid(-2.6 + 1.1 * z)
            failed = rng.random() < p_fail
            mx = 100.0
            pct = rng.uniform(15, 39) if failed else rng.uniform(40, 95)
            prior.append({
                "learning_component_id": comp, "academic_period_order": period,
                "obtained_marks": round(pct, 1), "maximum_marks": mx,
                "grading_outcome": "FAIL" if failed else "PASS",
            })
            # Some failed components are cleared in a later period
            if failed and period < n_prior_periods and rng.random() < 0.55:
                prior.append({
                    "learning_component_id": comp,
                    "academic_period_order": int(rng.integers(period + 1, n_prior_periods + 1)),
                    "obtained_marks": round(rng.uniform(40, 70), 1), "maximum_marks": mx,
                    "grading_outcome": "PASS",
                })

    # ---- behaviour placeholder signals ------------------------------------ #
    behaviour = None
    if rng.random() < 0.75:  # ~25% never used the chatbot
        clip = lambda v: float(np.clip(v, 0, 100))  # noqa: E731
        behaviour = {
            "behaviour_score": round(clip(62 - 13 * z + rng.normal(0, 12)), 1),
            "engagement_score": round(clip(60 - 15 * z + rng.normal(0, 14)), 1),
            "sentiment_score": round(clip(55 - 11 * z + rng.normal(0, 13)), 1),
        }

    evidence = {
        "attendance_records": attendance,
        "assessment_records": assessments,
        "prior_assessment_records": prior,
        "behaviour": behaviour,
    }

    # ---- outcome label ---------------------------------------------------- #
    f = engineer_features(StudentEvidence.model_validate(evidence))
    att, marks = f["attendance_percentage"], f["overall_marks_percentage"]
    logit = (
        -2.3
        + 0.55 * z
        + 0.055 * (72 - att)
        + 0.035 * (55 - marks)
        + 0.30 * f["failed_learning_components"]
        + 0.28 * f["backlog_count"]
        + (1.1 if att < 60 and f["failed_learning_components"] >= 2 else 0.0)  # interaction
        + rng.normal(0, 0.6)
    )
    if behaviour is not None:
        logit += 0.025 * (50 - behaviour["engagement_score"])
        logit += 0.9 if (behaviour["sentiment_score"] < 30 and att < 70) else 0.0
    label = int(rng.random() < _sigmoid(logit))

    # ---- make some evidence insufficient (gate testing) ------------------- #
    r = rng.random()
    if r < 0.02:
        evidence["assessment_records"] = []
    elif r < 0.04:
        evidence["attendance_records"] = [{
            "learning_component_id": comps[0], "attended_sessions": 2, "total_sessions": 4}]

    return {
        "organization_id": org_id,
        "student_id": f"STU-{idx:06d}",
        "enrollment_id": f"ENR-{idx:06d}",
        "evidence": evidence,
        "label_disengaged": label,
    }


def generate(n_students: int = 8000, seed: int = 42, org_id: str = "ORG-SYNTHETIC") -> list[dict]:
    rng = np.random.default_rng(seed)
    return [_student(rng, i, org_id) for i in range(1, n_students + 1)]


def dataset_version(n_students: int, seed: int) -> str:
    return f"synthetic-v1-n{n_students}-s{seed}"


def write_dataset(n_students: int = 8000, seed: int = 42, out_dir: Path | None = None) -> Path:
    version = dataset_version(n_students, seed)
    out_dir = Path(out_dir or DATA_DIR / version)
    out_dir.mkdir(parents=True, exist_ok=True)
    rows = generate(n_students, seed)
    path = out_dir / "students.jsonl"
    with path.open("w") as fh:
        for row in rows:
            fh.write(json.dumps(row) + "\n")
    meta = {
        "training_dataset_version": version,
        "n_students": n_students,
        "seed": seed,
        "synthetic": True,
        "positive_rate": round(sum(r["label_disengaged"] for r in rows) / len(rows), 4),
        "warning": "SIMULATED DATA — not for decisions about real students.",
    }
    (out_dir / "dataset_meta.json").write_text(json.dumps(meta, indent=2))
    return path
