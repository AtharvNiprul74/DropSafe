"""
---------------------------------------------------------
Mentor Generator

Purpose:
    Generates mentor master data.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from faker import Faker

from generators.base_generator import BaseGenerator

from models.department import Department
from models.mentor import Mentor

from utils.id_generator import IDGenerator


fake = Faker("en_IN")


DESIGNATIONS = [
    ("Professor", 5),
    ("Associate Professor", 20),
    ("Assistant Professor", 75),
]


SPECIALIZATIONS = [
    "Artificial Intelligence",
    "Machine Learning",
    "Deep Learning",
    "Computer Vision",
    "Natural Language Processing",
    "Data Science",
    "Software Engineering",
    "Database Systems",
    "Cloud Computing",
]


class MentorGenerator(BaseGenerator):
    """
    Generates mentor records.
    """

    def __init__(
        self,
        department: Department,
        number_of_mentors: int,
    ) -> None:

        super().__init__()

        self.department = department
        self.number_of_mentors = number_of_mentors

    def generate(self) -> list[Mentor]:
        """
        Generate mentor records.
        """

        self.clear()

        for index in range(1, self.number_of_mentors + 1):

            # -----------------------------
            # Personal Information
            # -----------------------------
            first_name = fake.first_name()
            last_name = fake.last_name()

            email = (
                f"{first_name.lower()}."
                f"{last_name.lower()}{index}@college.edu"
            )

            phone = fake.msisdn()[-10:]

            # -----------------------------
            # Academic Information
            # -----------------------------
            designation = fake.random_choices(
                elements=DESIGNATIONS,
                length=1,
            )[0]

            specialization = fake.random_element(
                SPECIALIZATIONS
            )

            # -----------------------------
            # Capacity
            # -----------------------------
            if designation == "Professor":
                max_students = fake.random_int(34, 40)

            elif designation == "Associate Professor":
                max_students = fake.random_int(30, 35)

            else:
                max_students = fake.random_int(25, 32)

            # -----------------------------
            # Create Mentor
            # -----------------------------
            self.records.append(
                Mentor(
                    mentor_id=IDGenerator.generate_mentor_id(),
                    employee_id=f"EMP{index:04d}",
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    phone=phone,
                    designation=designation,
                    department_id=self.department.department_id,
                    specialization=specialization,
                    max_students=max_students,
                    is_active=True,
                )
            )

        return self.records