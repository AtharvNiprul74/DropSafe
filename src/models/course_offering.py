"""
---------------------------------------------------------
Course Offering Model

Purpose:
    Represents a course offered by a department
    in a specific semester and academic year.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from dataclasses import dataclass

from models.base_model import BaseModel


@dataclass(slots=True)
class CourseOffering(BaseModel):
    """
    Represents a course offering.
    """

    course_offering_id: str

    course_id: str

    department_id: str

    academic_year_id: str

    semester_id: str

    faculty_id: str | None = None

    section: str = "A"

    maximum_students: int = 60

    is_elective: bool = False

    is_active: bool = True

    def deactivate(self) -> None:
        """
        Mark this offering as inactive.
        """
        self.is_active = False

    @property
    def offering_name(self) -> str:
        """
        Returns a readable offering name.
        """
        return (
            f"{self.course_id} - "
            f"{self.semester_id} - "
            f"{self.section}"
        )