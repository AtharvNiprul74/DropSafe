"""
---------------------------------------------------------
SGPA Engine

Purpose:
    Calculate SGPA, CGPA, Credits,
    Failed Courses and Semester Result.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from models.marks import Marks


class SGPAEngine:

    @staticmethod
    def calculate_sgpa(
        marks: list[Marks],
        round_digits: int = 2,
    ) -> float:

        if not marks:
            return 0.0

        total_credit_points = 0.0
        total_registered_credits = 0.0

        for mark in marks:

            total_credit_points += mark.credit_points
            total_registered_credits += mark.credits_registered

        if total_registered_credits == 0:
            return 0.0

        sgpa = (
            total_credit_points /
            total_registered_credits
        )

        return round(sgpa, round_digits)

    @staticmethod
    def calculate_cgpa(
        semester_sgpas: list[float],
        round_digits: int = 2,
    ) -> float:

        if not semester_sgpas:
            return 0.0

        cgpa = (
            sum(semester_sgpas)
            / len(semester_sgpas)
        )

        return round(cgpa, round_digits)

    @staticmethod
    def registered_credits(
        marks: list[Marks],
    ) -> float:

        return round(
            sum(
                mark.credits_registered
                for mark in marks
            ),
            2,
        )

    @staticmethod
    def earned_credits(
        marks: list[Marks],
    ) -> float:

        return round(
            sum(
                mark.credits_earned
                for mark in marks
            ),
            2,
        )

    @staticmethod
    def failed_courses(
        marks: list[Marks],
    ) -> int:

        return sum(
            1
            for mark in marks
            if mark.result == "FAIL"
        )

    @staticmethod
    def passed_courses(
        marks: list[Marks],
    ) -> int:

        return sum(
            1
            for mark in marks
            if mark.result == "PASS"
        )

    @staticmethod
    def semester_result(
        marks: list[Marks],
    ) -> str:

        if not marks:
            return "NOT_REGISTERED"

        failed = SGPAEngine.failed_courses(marks)

        if failed == 0:
            return "PASS"

        if failed <= 2:
            return "PROMOTED"

        return "FAIL"

    @staticmethod
    def pass_percentage(
        marks: list[Marks],
    ) -> float:

        if not marks:
            return 0.0

        passed = SGPAEngine.passed_courses(marks)

        percentage = (
            passed / len(marks)
        ) * 100

        return round(percentage, 2)