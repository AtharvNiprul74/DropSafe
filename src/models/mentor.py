"""
---------------------------------------------------------
Mentor Model

Purpose:
    Represents a faculty mentor assigned to students.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from dataclasses import dataclass

from models.base_model import BaseModel


@dataclass(slots=True)
class Mentor(BaseModel):
    """
    Faculty mentor.
    """

    mentor_id: str

    employee_id: str

    first_name: str

    last_name: str

    email: str

    phone: str

    designation: str

    department_id: str

    specialization: str

    max_students: int = 30

    is_active: bool = True

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def deactivate(self) -> None:
        self.is_active = False

    def activate(self) -> None:
        self.is_active = True