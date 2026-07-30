"""
---------------------------------------------------------
Registration Generator

Purpose:
    Registers every student into all course
    offerings of their current semester.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from generators.base_generator import BaseGenerator

from models.student import Student
from models.course_offering import CourseOffering
from models.registration import Registration
from models.student_profile import StudentProfile

from utils.id_generator import IDGenerator
from utils.random_utils import RandomUtils


PROFILE_CONFIG = {

    "Excellent": {
        "lms": (85, 100),
        "cancel": 0.01,
        "repeat": 0.00,
    },

    "Good": {
        "lms": (70, 92),
        "cancel": 0.02,
        "repeat": 0.01,
    },

    "Average": {
        "lms": (50, 80),
        "cancel": 0.05,
        "repeat": 0.04,
    },

    "Improving": {
        "lms": (35, 65),
        "cancel": 0.08,
        "repeat": 0.08,
    },

    "Declining": {
        "lms": (15, 50),
        "cancel": 0.15,
        "repeat": 0.18,
    },

    "HighRisk": {
        "lms": (0, 35),
        "cancel": 0.25,
        "repeat": 0.35,
    },
}


class RegistrationGenerator(BaseGenerator):
    """
    Generates Registration records.
    """

    def __init__(
        self,
        students: list[Student],
        course_offerings: list[CourseOffering],
        student_profiles: list[StudentProfile],
    ) -> None:

        super().__init__()

        self.students = students
        self.course_offerings = course_offerings

        self.profile_map = {
            profile.student_id: profile
            for profile in student_profiles
        }

    def generate(self) -> list[Registration]:

        self.clear()

        offerings_by_semester = {}

        for offering in self.course_offerings:

            offerings_by_semester.setdefault(
                offering.semester_id,
                []
            ).append(offering)

        for student in self.students:

            # ------------------------------------
            # Skip inactive students
            # ------------------------------------

            if not student.is_active:
                continue

            semester_offerings = offerings_by_semester.get(
                student.semester_id,
                []
            )

            profile = self.profile_map.get(
                student.student_id
            )

            if profile is None:
                continue

            config = PROFILE_CONFIG[
                profile.profile_name
            ]

            for offering in semester_offerings:

                # ------------------------------------
                # Attendance
                # ------------------------------------

                attendance = RandomUtils.integer(
                    profile.attendance_min,
                    profile.attendance_max,
                )

                # ------------------------------------
                # Assignment
                # Assignment follows attendance
                # ------------------------------------

                assignment = RandomUtils.integer(
                    max(
                        profile.assignment_min,
                        attendance - 20
                    ),
                    min(
                        profile.assignment_max,
                        attendance + 5
                    ),
                )

                # ------------------------------------
                # LMS Score
                # LMS follows attendance
                # ------------------------------------

                lms_min, lms_max = config["lms"]

                lms_lower = max(
                    lms_min,
                    attendance - 15,
                )

                lms_upper = min(
                    lms_max,
                    attendance + 10,
                )

                if lms_lower > lms_upper:
                    lms_lower = lms_min
                    lms_upper = lms_max

                lms_score = RandomUtils.integer(
                    lms_lower,
                    lms_upper,
                )
                
                                # ------------------------------------
                # Registration Status
                # ------------------------------------

                if RandomUtils.probability(config["cancel"]):
                    registration_status = "CANCELLED"
                else:
                    registration_status = "REGISTERED"

                # ------------------------------------
                # Repeat Course
                # ------------------------------------

                if registration_status == "REGISTERED":
                    is_repeat = RandomUtils.probability(
                        config["repeat"]
                    )
                else:
                    is_repeat = False

                # ------------------------------------
                # Create Registration
                # ------------------------------------

                registration = Registration(

                    registration_id=
                    IDGenerator.generate_registration_id(),

                    student_id=
                    student.student_id,

                    course_offering_id=
                    offering.course_offering_id,

                    mentor_id=
                    offering.faculty_id,

                    registration_status=
                    registration_status,

                    is_repeat=
                    is_repeat,

                    attendance_percentage=
                    attendance,

                    assignment_completion=
                    assignment,

                    lms_activity_score=
                    lms_score,
                )

                self.records.append(
                    registration
                )

        return self.records