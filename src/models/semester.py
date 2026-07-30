"""
---------------------------------------------------------
Semester Model

Purpose:
    Represents a semester within an academic year.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from dataclasses import dataclass

from models.base_model import BaseModel


@dataclass(slots=True)
class Semester(BaseModel):
    """
    Represents a semester.
    """

    semester_id: str

    academic_year_id: str

    semester_number: int

    semester_name: str

    start_date: str

    end_date: str

    is_active: bool = True

    def activate(self) -> None:
        """
        Mark semester as active.
        """
        self.is_active = True

    def deactivate(self) -> None:
        """
        Mark semester as inactive.
        """
        self.is_active = False

    @property
    def duration(self) -> str:
        """
        Returns semester duration.
        """
        return f"{self.start_date} to {self.end_date}"