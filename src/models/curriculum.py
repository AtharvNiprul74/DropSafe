"""
---------------------------------------------------------
Curriculum Model

Purpose:
    Represents the curriculum structure of a
    department by mapping courses to academic
    years and semesters.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from dataclasses import dataclass

from models.base_model import BaseModel


@dataclass(slots=True)
class Curriculum(BaseModel):
    """
    Represents a curriculum entry.
    """

    curriculum_id: str

    department_id: str

    academic_year_id: str

    semester_id: str

    course_id: str

    is_elective: bool = False

    is_active: bool = True