"""
---------------------------------------------------------
Course Offering Generator

Purpose:
    Generates course offerings for every
    curriculum entry.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from generators.base_generator import BaseGenerator

from models.curriculum import Curriculum
from models.mentor import Mentor
from models.course_offering import CourseOffering

from utils.id_generator import IDGenerator


class CourseOfferingGenerator(BaseGenerator):
    """
    Generates Course Offering records.
    """

    def __init__(
        self,
        curriculum: list[Curriculum],
        mentors: list[Mentor],
    ) -> None:

        super().__init__()

        self.curriculum = curriculum
        self.mentors = mentors

    def generate(
        self,
    ) -> list[CourseOffering]:
        """
        Generate Course Offerings.
        """

        self.clear()

        mentor_index = 0

        for curriculum_entry in self.curriculum:

            mentor = self.mentors[
                mentor_index
            ]

            self.records.append(

                CourseOffering(

                    course_offering_id=(
                        IDGenerator.generate_course_offering_id()
                    ),

                    course_id=curriculum_entry.course_id,

                    department_id=(
                        curriculum_entry.department_id
                    ),

                    academic_year_id=(
                        curriculum_entry.academic_year_id
                    ),

                    semester_id=(
                        curriculum_entry.semester_id
                    ),

                    faculty_id=mentor.mentor_id,

                    section="A",

                    maximum_students=60,

                    is_elective=(
                        curriculum_entry.is_elective
                    ),

                    is_active=(
                        curriculum_entry.is_active
                    )
                )
            )

            mentor_index = (
                mentor_index + 1
            ) % len(self.mentors)

        return self.records