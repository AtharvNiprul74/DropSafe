"""
---------------------------------------------------------
Registration Model

Purpose:
    Represents a student's registration for a
    particular course offering.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from dataclasses import dataclass

from models.base_model import BaseModel


@dataclass(slots=True)
class Registration(BaseModel):
    """
    Student Course Registration
    """

    registration_id: str

    student_id: str

    course_offering_id: str

    mentor_id: str

    registration_status: str = "REGISTERED"

    is_repeat: bool = False

    attendance_percentage: float = 0.0

    assignment_completion: float = 0.0

    lms_activity_score: float = 0.0

    def cancel(self) -> None:
        """
        Cancel course registration.
        """
        self.registration_status = "CANCELLED"

    def complete(self) -> None:
        """
        Mark registration as completed.
        """
        self.registration_status = "COMPLETED"

    @property
    def is_active(self) -> bool:
        """
        Returns True if registration is active.
        """
        return self.registration_status == "REGISTERED"