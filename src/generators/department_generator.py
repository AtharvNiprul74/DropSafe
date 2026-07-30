"""
---------------------------------------------------------
Department Generator

Purpose:
    Generates department master data for the
    Student Risk Prediction System.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from utils.fake_data import FakeData
from generators.base_generator import BaseGenerator
from models.department import Department
from utils.id_generator import IDGenerator


class DepartmentGenerator(BaseGenerator):
    """
    Generates department records.
    """

    def generate(self) -> list[Department]:
        """
        Generate department master data.
        """

        self.clear()

        

        departments = [
            {
                "department_code": "AIML",
                "department_name": (
                    "Artificial Intelligence and "
                    "Machine Learning"
                ),
                "hod_name": f"Dr. {FakeData.full_name()}",
                "total_semesters": 8,
            }
        ]

        for department in departments:
            self.records.append(
                Department(
                    department_id=IDGenerator.generate_department_id(),
                    department_code=department["department_code"],
                    department_name=department["department_name"],
                    hod_name=department["hod_name"],
                    total_semesters=department["total_semesters"],
                )
            )

        return self.records