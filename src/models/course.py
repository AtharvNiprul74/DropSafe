"""
---------------------------------------------------------
Course Model

Purpose:
    Represents a master course in the curriculum.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from dataclasses import dataclass

from models.base_model import BaseModel


@dataclass(slots=True)
class Course(BaseModel):
    """
    Represents a master course.
    """

    course_id: str

    course_code: str

    course_name: str

    credits: int

    category: str

    course_type: str

    is_active: bool = True

    def deactivate(self) -> None:
        """
        Archive the course.
        """
        self.is_active = False