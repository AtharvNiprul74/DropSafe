"""
---------------------------------------------------------
Academic Year Model

Purpose:
    Represents an academic year.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from dataclasses import dataclass

from models.base_model import BaseModel


@dataclass(slots=True)
class AcademicYear(BaseModel):
    """
    Represents an academic year.
    """

    academic_year_id: str

    start_year: int

    end_year: int

    is_active: bool = True

    @property
    def name(self) -> str:
        """
        Returns the academic year in readable format.
        Example:
            2025-2026
        """
        return f"{self.start_year}-{self.end_year}"

    def deactivate(self) -> None:
        """
        Marks the academic year as inactive.
        """
        self.is_active = False

    def contains(self, year: int) -> bool:
        """
        Checks whether a calendar year belongs
        to this academic year.
        """
        return self.start_year <= year <= self.end_year