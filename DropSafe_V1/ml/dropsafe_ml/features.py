"""
Feature engineering — version `fe-v1` (PROVISIONAL formulas, PRD §37).

The SAME function is used for training and inference so there is no
train/serve skew. Source evidence is never modified (PRD §9).

Formulas
--------
attendance_percentage      = 100 * Σ attended_sessions / Σ total_sessions
overall_marks_percentage   = 100 * Σ obtained_marks / Σ maximum_marks
failed_learning_components = # current-period components that failed, where a
                             component fails if ANY of its assessments has
                             grading_outcome == FAIL; if no outcome is given
                             for that component, it fails when its aggregate
                             % < PASS_MARK_PERCENT.
backlog_count              = # components from EARLIER periods whose most
                             recent attempt is a fail (same fail rule).
behaviour/engagement/sentiment = passed through from Behaviour Analysis
                             (None when unavailable).
"""
from __future__ import annotations

from collections import defaultdict
from typing import Iterable, Optional

from dropsafe_ml.config import FEATURE_COLUMNS, PASS_MARK_PERCENT
from dropsafe_ml.schemas import AssessmentRecord, StudentEvidence


def _component_failed(records: Iterable[AssessmentRecord]) -> bool:
    records = list(records)
    outcomes = [r.grading_outcome for r in records if r.grading_outcome is not None]
    if outcomes:
        return "FAIL" in outcomes
    obtained = sum(r.obtained_marks for r in records)
    maximum = sum(r.maximum_marks for r in records)
    return (100.0 * obtained / maximum) < PASS_MARK_PERCENT


def _round(x: Optional[float], nd: int = 2) -> Optional[float]:
    return None if x is None else round(float(x), nd)


def engineer_features(evidence: StudentEvidence) -> dict[str, Optional[float]]:
    """Derive snapshot features from raw evidence. Missing evidence -> None."""
    feats: dict[str, Optional[float]] = {c: None for c in FEATURE_COLUMNS}

    # Attendance
    if evidence.attendance_records:
        attended = sum(r.attended_sessions for r in evidence.attendance_records)
        total = sum(r.total_sessions for r in evidence.attendance_records)
        feats["attendance_percentage"] = _round(100.0 * attended / total)

    # Current-period assessments
    if evidence.assessment_records:
        obtained = sum(r.obtained_marks for r in evidence.assessment_records)
        maximum = sum(r.maximum_marks for r in evidence.assessment_records)
        feats["overall_marks_percentage"] = _round(100.0 * obtained / maximum)

        by_comp: dict[str, list[AssessmentRecord]] = defaultdict(list)
        for r in evidence.assessment_records:
            by_comp[r.learning_component_id].append(r)
        feats["failed_learning_components"] = sum(
            1 for recs in by_comp.values() if _component_failed(recs)
        )

    # Backlogs from earlier periods (0 when the student has no prior periods)
    by_comp_period: dict[str, dict[int, list]] = defaultdict(lambda: defaultdict(list))
    for r in evidence.prior_assessment_records:
        by_comp_period[r.learning_component_id][r.academic_period_order].append(r)
    feats["backlog_count"] = sum(
        1
        for periods in by_comp_period.values()
        if _component_failed(periods[max(periods)])
    )

    # Behaviour (placeholder signals)
    if evidence.behaviour is not None:
        feats["behaviour_score"] = _round(evidence.behaviour.behaviour_score)
        feats["engagement_score"] = _round(evidence.behaviour.engagement_score)
        feats["sentiment_score"] = _round(evidence.behaviour.sentiment_score)

    return feats
