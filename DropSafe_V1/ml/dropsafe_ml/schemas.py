"""
Pydantic schemas for the ML service contract.

Input shapes mirror the raw-evidence tables in the PRD (attendance_records,
assessment_records) so the backend can pass evidence straight through.
Output shapes mirror student_snapshots / predictions / prediction_history so
the backend can persist them (the ML service itself is stateless).

NOTE (PRD §37): REST paths and request/response schemas are not frozen. This is
a provisional internal contract between the backend and the ML service.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


# --------------------------------------------------------------------------- #
# Raw evidence (inputs)
# --------------------------------------------------------------------------- #
class AttendanceRecord(BaseModel):
    learning_component_id: str
    attended_sessions: int = Field(ge=0)
    total_sessions: int = Field(gt=0)

    @model_validator(mode="after")
    def _attended_le_total(self):
        if self.attended_sessions > self.total_sessions:
            raise ValueError("attended_sessions must be <= total_sessions")
        return self


class AssessmentRecord(BaseModel):
    learning_component_id: str
    obtained_marks: float = Field(ge=0)
    maximum_marks: float = Field(gt=0)
    # PRD defines grading_outcome but not its values -> PROVISIONAL enum.
    grading_outcome: Optional[Literal["PASS", "FAIL"]] = None

    @model_validator(mode="after")
    def _obtained_le_max(self):
        if self.obtained_marks > self.maximum_marks:
            raise ValueError("obtained_marks must be <= maximum_marks")
        return self


class PriorAssessmentRecord(AssessmentRecord):
    """Assessment from an EARLIER academic period (used for backlog_count)."""

    academic_period_order: int = Field(
        description="Ordering of earlier periods; higher = more recent."
    )


class BehaviourSignals(BaseModel):
    """Placeholder until the Behaviour Analysis module exists. All 0-100."""

    behaviour_score: Optional[float] = Field(default=None, ge=0, le=100)
    engagement_score: Optional[float] = Field(default=None, ge=0, le=100)
    # 0 = very negative, 50 = neutral, 100 = very positive
    sentiment_score: Optional[float] = Field(default=None, ge=0, le=100)


class StudentEvidence(BaseModel):
    attendance_records: list[AttendanceRecord] = Field(default_factory=list)
    assessment_records: list[AssessmentRecord] = Field(default_factory=list)
    prior_assessment_records: list[PriorAssessmentRecord] = Field(default_factory=list)
    behaviour: Optional[BehaviourSignals] = None


class PredictionRequest(BaseModel):
    organization_id: str
    student_id: str
    enrollment_id: str
    import_session_id: Optional[str] = None
    evidence: StudentEvidence


class BatchPredictionRequest(BaseModel):
    requests: list[PredictionRequest] = Field(min_length=1, max_length=5000)


# --------------------------------------------------------------------------- #
# Outputs
# --------------------------------------------------------------------------- #
class PredictionStatus(str, Enum):
    PREDICTED = "PREDICTED"
    # PRD Q6: how "Prediction Unavailable" is persisted is unresolved. The ML
    # service signals it here and produces NO prediction record.
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class RiskLabel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class RiskFactor(BaseModel):
    feature: str
    label: str
    value: Optional[float]
    impact: float = Field(description="SHAP contribution in log-odds (+ raises risk)")
    direction: Literal["RAISES_RISK", "LOWERS_RISK"]
    description: str


class SnapshotOut(BaseModel):
    """Maps to student_snapshots."""

    organization_id: str
    student_id: str
    enrollment_id: str
    import_session_id: Optional[str]
    feature_version: str
    snapshot_generated_at: datetime
    attendance_percentage: Optional[float]
    overall_marks_percentage: Optional[float]
    failed_learning_components: Optional[int]
    backlog_count: Optional[int]
    behaviour_score: Optional[float]
    engagement_score: Optional[float]
    sentiment_score: Optional[float]


class PredictionOut(BaseModel):
    """Maps to predictions + prediction_history."""

    risk_label: RiskLabel
    risk_probability: float = Field(ge=0, le=100, description="Calibrated P(risk) in %")
    prediction_confidence: float = Field(ge=0, le=100)
    # PRD Q7: predictions.prediction_score is described as "confidence %".
    # Provisionally prediction_score == prediction_confidence.
    prediction_score: float = Field(ge=0, le=100)
    ai_model_version: str
    feature_version: str
    training_dataset_version: str
    generated_at: datetime
    top_factors: list[RiskFactor]


class PredictionResponse(BaseModel):
    status: PredictionStatus
    organization_id: str
    student_id: str
    enrollment_id: str
    missing_evidence: list[str] = Field(default_factory=list)
    snapshot: Optional[SnapshotOut] = None
    prediction: Optional[PredictionOut] = None
    disclaimer: str = (
        "Decision support only. A human must review before any intervention; "
        "a HIGH prediction does not automatically create an intervention."
    )
