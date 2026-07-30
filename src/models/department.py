"""
---------------------------------------------------------
Department Model

Purpose:
    Represents an academic department.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from dataclasses import dataclass

from models.base_model import BaseModel


@dataclass(slots=True)
class Department(BaseModel):
    """
    Represents an academic department.
    """

    department_id: str

    department_code: str

    department_name: str

    hod_name: str

    total_semesters: int = 8

    is_active: bool = True

    def deactivate(self) -> None:
        """
        Mark department as inactive.
        """
        self.is_active = False