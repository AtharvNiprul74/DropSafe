"""
---------------------------------------------------------
Marks Generator

Purpose:
    Generate marks for each registered course.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from generators.base_generator import BaseGenerator

from models.registration import Registration
from models.student_profile import StudentProfile
from models.course_offering import CourseOffering
from models.marks import Marks

from engines.grading_engine import GradingEngine

from utils.id_generator import IDGenerator
from utils.random_utils import RandomUtils


class MarksGenerator(BaseGenerator):

    def __init__(
        self,
        registrations: list[Registration],
        student_profiles: list[StudentProfile],
        course_offerings: list[CourseOffering],
        grading_config: dict,
        default_credits: float = 4.0,
    ):
        super().__init__()

        self.registrations = registrations
        self.student_profiles = student_profiles
        self.course_offerings = course_offerings
        self.grading_config = grading_config
        self.default_credits = default_credits

        # Fast lookup maps
        self.profile_map = {
            profile.student_id: profile
            for profile in self.student_profiles
        }

        self.course_map = {
            offering.course_offering_id: offering
            for offering in self.course_offerings
        }

    def generate(self) -> list[Marks]:

        self.clear()

        grading_engine = GradingEngine(self.grading_config)

        for registration in self.registrations:

            # Ignore cancelled registrations
            if registration.registration_status != "REGISTERED":
                continue

            profile = self.profile_map.get(registration.student_id)

            if profile is None:
                continue

            course = self.course_map.get(
                registration.course_offering_id
            )

            if course is None:
                continue

            # Replace with course.credits if available
            credits = self.default_credits

            # Generate marks based on student's profile
            cie_marks = RandomUtils.integer(
                profile.cie_min,
                profile.cie_max
            )

            see_marks = RandomUtils.integer(
                profile.see_min,
                profile.see_max
            )

            # Calculate result
            result = grading_engine.evaluate(
                cie_marks=cie_marks,
                see_marks=see_marks,
                credits=credits
            )

            credits_earned = (
                credits
                if result["result"] == "PASS"
                else 0.0
            )

            marks = Marks(

                marks_id=IDGenerator.generate_marks_id(),

                registration_id=registration.registration_id,

                cie_marks=cie_marks,

                see_marks=see_marks,

                total_marks=result["total_marks"],

                grade_letter=result["grade"],

                grade_point=result["grade_point"],

                credit_points=result["credit_points"],

                credits_registered=credits,

                credits_earned=credits_earned,

                result=result["result"],
            )

            self.records.append(marks)

        return self.records