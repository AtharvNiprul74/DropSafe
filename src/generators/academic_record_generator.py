"""
---------------------------------------------------------
Academic Record Generator

Purpose:
    Generate academic summary for every student
    using Registration + Marks.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from generators.base_generator import BaseGenerator

from models.student import Student
from models.registration import Registration
from models.marks import Marks
from models.academic_record import AcademicRecord

from engines.sgpa_engine import SGPAEngine

from utils.id_generator import IDGenerator


class AcademicRecordGenerator(BaseGenerator):

    def __init__(
        self,
        students: list[Student],
        registrations: list[Registration],
        marks: list[Marks],
        round_digits: int = 2,
    ):

        super().__init__()

        self.students = students
        self.registrations = registrations
        self.marks = marks
        self.round_digits = round_digits

    def generate(self) -> list[AcademicRecord]:

        self.clear()

        sgpa_engine = SGPAEngine()

        # ---------------------------------------
        # Registration lookup
        # ---------------------------------------

        registration_map = {
            registration.registration_id: registration
            for registration in self.registrations
        }

        # ---------------------------------------
        # Student -> Marks Mapping
        # ---------------------------------------

        marks_by_student = {}

        for mark in self.marks:

            registration = registration_map.get(
                mark.registration_id
            )

            if registration is None:
                continue

            if registration.registration_status != "REGISTERED":
                continue

            student_id = registration.student_id

            marks_by_student.setdefault(
                student_id,
                []
            ).append(mark)

        # ---------------------------------------
        # Previous CGPA Store
        # ---------------------------------------

        cgpa_history = {}

        # ---------------------------------------
        # Generate Academic Records
        # ---------------------------------------

        for student in self.students:

            student_marks = marks_by_student.get(
                student.student_id,
                []
            )

            credits_registered = (
                sgpa_engine.registered_credits(
                    student_marks
                )
            )

            credits_earned = (
                sgpa_engine.earned_credits(
                    student_marks
                )
            )

            failed_courses = (
                sgpa_engine.failed_courses(
                    student_marks
                )
            )

            backlog_courses = failed_courses

            sgpa = sgpa_engine.calculate_sgpa(
                student_marks,
                self.round_digits,
            )

            # ---------------------------------------
            # CGPA
            # ---------------------------------------

            if student.student_id not in cgpa_history:

                cgpa = sgpa

                cgpa_history[student.student_id] = [
                    sgpa
                ]

            else:

                cgpa_history[
                    student.student_id
                ].append(sgpa)

                cgpa = sgpa_engine.calculate_cgpa(
                    cgpa_history[
                        student.student_id
                    ],
                    self.round_digits,
                )

            semester_result = (
                sgpa_engine.semester_result(
                    student_marks
                )
            )

            self.records.append(

                AcademicRecord(

                    academic_record_id=
                    IDGenerator.generate_academic_record_id(),

                    student_id=student.student_id,

                    semester_id=student.semester_id,

                    academic_year_id=
                    student.academic_year_id,

                    credits_registered=
                    credits_registered,

                    credits_earned=
                    credits_earned,

                    sgpa=sgpa,

                    cgpa=cgpa,

                    failed_courses=
                    failed_courses,

                    backlog_courses=
                    backlog_courses,

                    semester_result=
                    semester_result,
                )
            )

        return self.records