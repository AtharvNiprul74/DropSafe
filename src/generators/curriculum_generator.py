"""
---------------------------------------------------------
Curriculum Generator

Purpose:
    Generates Course and Curriculum records
    without requiring an external CSV.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from generators.base_generator import BaseGenerator

from models.course import Course
from models.curriculum import Curriculum
from models.department import Department
from models.semester import Semester

from utils.id_generator import IDGenerator


class CurriculumGenerator(BaseGenerator):

    def __init__(
        self,
        department: Department,
        semesters: list[Semester],
    ):

        super().__init__()

        self.department = department
        self.semesters = semesters

        self.courses = []
        self.curriculum = []

    def generate(self):

        self.courses.clear()
        self.curriculum.clear()

        # Map semester number -> Semester object
        semester_map = {
            semester.semester_number: semester
            for semester in self.semesters
        }

        curriculum_data = [
        # code, name, credits, semester, category, course_type

        ("MAT101", "Engineering Mathematics-I", 4, 1, "Core", "Theory"),
        ("PHY101", "Engineering Physics", 4, 1, "Core", "Theory"),
        ("CSE101", "Programming in C", 4, 1, "Core", "Practical"),
        ("ENG101", "Communication Skills", 2, 1, "Core", "Practical"),

        ("MAT102", "Engineering Mathematics-II", 4, 2, "Core", "Theory"),
        ("CSE102", "Data Structures", 4, 2, "Core", "Theory"),
        ("ECE101", "Digital Electronics", 4, 2, "Core", "Theory"),
        ("ENV101", "Environmental Studies", 2, 2, "Core", "Theory"),

        ("AML201", "Discrete Mathematics", 4, 3, "Core", "Theory"),
        ("AML202", "Object Oriented Programming", 4, 3, "Core", "Theory"),
        ("AML203", "Database Management Systems", 4, 3, "Core", "Theory"),
        ("AML204", "Computer Organization", 3, 3, "Core", "Theory"),

        ("AML205", "Operating Systems", 4, 4, "Core", "Theory"),
        ("AML206", "Design and Analysis of Algorithms", 4, 4, "Core", "Theory"),
        ("AML207", "Software Engineering", 3, 4, "Core", "Theory"),
        ("AML208", "Artificial Neural Networks", 4, 4, "Core", "Theory"),

        ("AML301", "Machine Learning", 4, 5, "Core", "Theory"),
        ("AML302", "Computer Vision", 4, 5, "Core", "Theory"),
        ("AML303", "Natural Language Processing", 4, 5, "Core", "Theory"),
        ("AML304", "Cloud Computing", 3, 5, "Core", "Theory"),

        ("AML305", "Deep Learning", 4, 6, "Core", "Theory"),
        ("AML306", "Generative AI", 4, 6, "Core", "Theory"),
        ("AML307", "Big Data Analytics", 4, 6, "Core", "Theory"),
        ("AML308", "Data Mining", 3, 6, "Core", "Theory"),

        ("AML401", "Reinforcement Learning", 4, 7, "Core", "Theory"),
        ("AML402", "MLOps", 4, 7, "Core", "Theory"),
        ("AML403", "Project Phase-I", 6, 7, "Core", "Project"),
        ("AML404", "Professional Elective-I", 3, 7, "Elective", "Theory"),

        ("AML405", "Project Phase-II", 10, 8, "Core", "Project"),
        ("AML406", "Internship", 8, 8, "Core", "Internship"),
        ("AML407", "Professional Elective-II", 3, 8, "Elective", "Theory"),
    ]

        for code, name, credits, sem_no, category, course_type in curriculum_data:

            semester = semester_map.get(sem_no)

            if semester is None:
                raise ValueError(
                    f"Semester {sem_no} not found."
                )

            course = Course(
                course_id=IDGenerator.generate_course_id(),
                course_code=code,
                course_name=name,
                credits=credits,
                category=category,
                course_type=course_type,
                is_active=True,
            )

            self.courses.append(course)

            self.curriculum.append(
                Curriculum(
                    curriculum_id=IDGenerator.generate_curriculum_id(),
                    department_id=self.department.department_id,
                    academic_year_id=semester.academic_year_id,
                    semester_id=semester.semester_id,
                    course_id=course.course_id,
                    is_elective=(category == "Elective"),
                    is_active=True,
                )
            )

        return self.courses, self.curriculum