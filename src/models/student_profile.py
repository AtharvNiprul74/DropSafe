"""
---------------------------------------------------------
Student Profile Model

Purpose:
    Stores academic profile assigned
    to a student.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from dataclasses import dataclass

from models.base_model import BaseModel


@dataclass(slots=True)
class StudentProfile(BaseModel):

    profile_id: str

    student_id: str

    profile_name: str

    attendance_min: int
    attendance_max: int

    assignment_min: int
    assignment_max: int

    cie_min: int
    cie_max: int

    see_min: int
    see_max: int

    dropout_probability: float