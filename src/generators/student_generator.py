"""
---------------------------------------------------------
Student Generator

Purpose:
    Generates realistic student master data.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from generators.base_generator import BaseGenerator

from models.department import Department
from models.academic_year import AcademicYear
from models.semester import Semester
from models.student import Student

from utils.fake_data import FakeData
from utils.id_generator import IDGenerator


class StudentGenerator(BaseGenerator):
    """
    Generates Student master records.
    """

    def __init__(
        self,
        department: Department,
        academic_year: AcademicYear,
        semester: Semester,
        total_students: int,
        settings: dict,
    ) -> None:
        super().__init__()

        self.department = department
        self.academic_year = academic_year
        self.semester = semester
        self.total_students = total_students
        self.settings = settings

    def generate(self) -> list[Student]:
        """
        Generate student master records.
        """

        self.clear()

        # Example:
        # Academic Year = 2026-27
        # Semester = 7
        # Admission Year = 2023
        admission_year = self.academic_year.start_year - (
            (self.semester.semester_number - 1) // 2
        )

        # Age configuration for current semester
        age_config = self.settings["student"]["age_by_semester"][
            str(self.semester.semester_number)
        ]

        minimum_age = age_config["minimum_age"]
        maximum_age = age_config["maximum_age"]

        for sequence in range(1, self.total_students + 1):

            # Generate gender first
            gender = FakeData.gender()

            # Generate gender-specific first name
            if gender == "Male":
                first_name = FakeData.first_name_male()
            else:
                first_name = FakeData.first_name_female()

            last_name = FakeData.last_name()

            date_of_birth = FakeData.date_of_birth(
                minimum_age=minimum_age,
                maximum_age=maximum_age,
            )

            student = Student(

                student_id=IDGenerator.generate_student_id(),

                roll_number=(
                    f"{self.department.department_code}"
                    f"{admission_year}"
                    f"{sequence:03d}"
                ),

                first_name=first_name,

                last_name=last_name,

                gender=gender,

                date_of_birth=date_of_birth,

                email=FakeData.email(
                    first_name=first_name,
                    last_name=last_name,
                    number=sequence,
                ),

                phone=FakeData.phone(),

                department_id=self.department.department_id,

                academic_year_id=self.academic_year.academic_year_id,

                semester_id=self.semester.semester_id,


                is_active=True,
            )

            self.records.append(student)

        return self.records