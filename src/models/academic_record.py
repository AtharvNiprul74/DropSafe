"""
---------------------------------------------------------
Academic Record Model

Purpose:
    Represents a student's semester-wise
    academic performance summary.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from dataclasses import dataclass

from models.base_model import BaseModel


@dataclass(slots=True)
class AcademicRecord(BaseModel):
    """
    Semester Academic Record
    """

    academic_record_id: str

    student_id: str

    semester_id: str

    academic_year_id: str

    # Semester Summary
    credits_registered: float

    credits_earned: float

    sgpa: float

    cgpa: float

    failed_courses: int = 0

    backlog_courses: int = 0

    semester_result: str = "PASS"

    def has_backlog(self) -> bool:
        """
        Returns True if student has any backlog.
        """
        return self.backlog_courses > 0

    def completion_percentage(self) -> float:
        """
        Returns semester credit completion percentage.
        """
        if self.credits_registered == 0:
            return 0.0

        return round(
            (self.credits_earned / self.credits_registered) * 100,
            2
        )