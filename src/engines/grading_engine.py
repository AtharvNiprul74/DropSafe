"""
---------------------------------------------------------
Grading Engine

Purpose:
    Calculates grades based on
    university grading rules.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from typing import Any


class GradingEngine:

    def __init__(self, grading_config: dict[str, Any]):

        self.pass_marks = grading_config["pass_marks"]

        self.round_digits = grading_config["round_digits"]

        self.grades = grading_config["grades"]

    def calculate_total(
        self,
        cie_marks: float,
        see_marks: float,
    ) -> float:

        return round(
            cie_marks + see_marks,
            self.round_digits,
        )

    def get_grade(
        self,
        total_marks: float,
    ) -> dict[str, Any]:

        for grade in self.grades:

            if (
                grade["min_marks"]
                <= total_marks
                <= grade["max_marks"]
            ):
                return grade

        raise ValueError(
            f"No grade configured for {total_marks}"
        )

    def calculate_credit_points(
        self,
        grade_point: int,
        credits: float,
    ) -> float:

        return round(
            grade_point * credits,
            self.round_digits,
        )

    def is_pass(
        self,
        total_marks: float,
    ) -> bool:

        return total_marks >= self.pass_marks

    def evaluate(
        self,
        cie_marks: float,
        see_marks: float,
        credits: float,
    ) -> dict[str, Any]:

        total = self.calculate_total(
            cie_marks,
            see_marks,
        )

        grade = self.get_grade(total)

        credit_points = (
            self.calculate_credit_points(
                grade["grade_point"],
                credits,
            )
        )

        return {

            "total_marks": total,

            "grade": grade["grade"],

            "grade_point": grade["grade_point"],

            "credit_points": credit_points,

            "result": (
                "PASS"
                if self.is_pass(total)
                else "FAIL"
            ),
        }