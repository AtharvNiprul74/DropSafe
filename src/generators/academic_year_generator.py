"""
---------------------------------------------------------
Academic Year Generator

Purpose:
    Generates academic year master data.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from generators.base_generator import BaseGenerator
from models.academic_year import AcademicYear
from utils.id_generator import IDGenerator


class AcademicYearGenerator(BaseGenerator):
    """
    Generates academic year records.
    """

    def __init__(
        self,
        start_year: int,
        number_of_years: int,
    ) -> None:

        super().__init__()

        self.start_year = start_year
        self.number_of_years = number_of_years

    def generate(self) -> list[AcademicYear]:
        """
        Generate academic years.
        """

        self.clear()

        for year in range(
            self.start_year,
            self.start_year + self.number_of_years,
        ):

            academic_year = AcademicYear(
                academic_year_id=IDGenerator.generate_academic_year_id(),
                start_year=year,
                end_year=year + 1,
                is_active=False,
            )

            self.records.append(academic_year)

        # Make the latest academic year active
        if self.records:
            self.records[-1].is_active = True

        return self.records