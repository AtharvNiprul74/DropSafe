"""
---------------------------------------------------------
Marks Model

Purpose:
    Represents examination marks obtained by a
    student in a registered course.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from dataclasses import dataclass

from models.base_model import BaseModel


@dataclass(slots=True)
class Marks(BaseModel):
    """
    Student examination marks.
    """

    marks_id: str

    registration_id: str

    # Examination Marks
    cie_marks: float
    see_marks: float

    # Calculated Values
    total_marks: float = 0.0

    # Grade Information
    grade_letter: str = ""
    grade_point: float = 0.0
    credit_points: float = 0.0

    # Credits
    credits_registered: float = 0.0
    credits_earned: float = 0.0

    result: str = "PASS"

    def calculate_total(self) -> float:
        """
        Calculate total marks.
        """
        self.total_marks = self.cie_marks + self.see_marks
        return self.total_marks

    def calculate_credit_points(self) -> float:
        """
        Credit Points = Credits Earned × Grade Point
        """
        self.credit_points = (
            self.credits_earned *
            self.grade_point
        )
        return self.credit_points

    @property
    def is_pass(self) -> bool:
        return self.result.upper() == "PASS"