"""
Evidence sufficiency gate — "The prediction engine does not guess when
evidence is insufficient" (PRD §2, §14, §30, §38).

Rules are PROVISIONAL (see config.EVIDENCE_RULES).
"""
from __future__ import annotations

from dropsafe_ml.config import EVIDENCE_RULES
from dropsafe_ml.schemas import StudentEvidence


def check_sufficiency(evidence: StudentEvidence, rules: dict | None = None) -> list[str]:
    """Return a list of human-readable reasons. Empty list == sufficient."""
    rules = rules or EVIDENCE_RULES
    reasons: list[str] = []

    n_att = len(evidence.attendance_records)
    if n_att < rules["min_attendance_records"]:
        reasons.append(
            f"Attendance evidence missing: {n_att} record(s), "
            f"need >= {rules['min_attendance_records']}."
        )
    else:
        total = sum(r.total_sessions for r in evidence.attendance_records)
        if total < rules["min_total_sessions"]:
            reasons.append(
                f"Too few attendance sessions recorded: {total}, "
                f"need >= {rules['min_total_sessions']}."
            )

    n_ass = len(evidence.assessment_records)
    if n_ass < rules["min_assessment_records"]:
        reasons.append(
            f"Assessment evidence missing: {n_ass} record(s), "
            f"need >= {rules['min_assessment_records']}."
        )

    if rules.get("require_behaviour"):
        b = evidence.behaviour
        if b is None or all(
            v is None for v in (b.behaviour_score, b.engagement_score, b.sentiment_score)
        ):
            reasons.append("Behaviour evidence missing.")

    return reasons
