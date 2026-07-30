"""
---------------------------------------------------------
Semester Generator

Purpose:
    Generates semesters for each academic year.
    Each academic year contains only two semesters.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from datetime import date

from generators.base_generator import BaseGenerator

from models.academic_year import AcademicYear
from models.semester import Semester

from utils.id_generator import IDGenerator


class SemesterGenerator(BaseGenerator):

    def __init__(
        self,
        academic_years: list[AcademicYear],
        current_semester: int,
    ):

        super().__init__()

        self.academic_years = academic_years
        self.current_semester = current_semester

    def generate(self) -> list[Semester]:

        self.clear()

        semester_number = 1

        for academic_year in self.academic_years:

            # Odd Semester
            self.records.append(

                Semester(

                    semester_id=IDGenerator.generate_semester_id(),

                    academic_year_id=academic_year.academic_year_id,

                    semester_number=semester_number,

                    semester_name=f"Semester {semester_number}",

                    start_date=date(
                        academic_year.start_year,
                        7,
                        15,
                    ),

                    end_date=date(
                        academic_year.start_year,
                        12,
                        15,
                    ),

                    is_active=(
                        academic_year.is_active
                        and semester_number == self.current_semester
                    ),
                )

            )

            semester_number += 1

            # Even Semester
            self.records.append(

                Semester(

                    semester_id=IDGenerator.generate_semester_id(),

                    academic_year_id=academic_year.academic_year_id,

                    semester_number=semester_number,

                    semester_name=f"Semester {semester_number}",

                    start_date=date(
                        academic_year.end_year,
                        1,
                        5,
                    ),

                    end_date=date(
                        academic_year.end_year,
                        5,
                        20,
                    ),

                    is_active=(
                        academic_year.is_active
                        and semester_number == self.current_semester
                    ),
                )

            )

            semester_number += 1

        return self.records