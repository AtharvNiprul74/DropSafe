"""
---------------------------------------------------------
Student Model

Purpose:
    Represents a student in the Student Risk
    Prediction System.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Optional
from models.base_model import BaseModel


@dataclass(slots=True)
class Student(BaseModel):
    """
    Represents a student.
    """

    student_id: str

    roll_number: str

    first_name: str

    last_name: str

    gender: str

    date_of_birth: date

    email: str

    phone: str

    department_id: str

    academic_year_id: str

    semester_id: str

    is_active: bool = True


    @property
    def full_name(self) -> str:
        """
        Returns student's full name.
        """
        return f"{self.first_name} {self.last_name}"

    def promote(self) -> None:
        """
        Promote student to next semester.
        """
        if self.current_semester < 8:
            self.current_semester += 1

    def deactivate(self) -> None:
        """
        Mark student as inactive.
        """
        self.is_active = False