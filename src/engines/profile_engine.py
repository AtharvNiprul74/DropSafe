"""
---------------------------------------------------------
Profile Engine

Purpose:
    Assigns realistic academic profiles
    to students.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

import json
import random

from models.student import Student
from models.student_profile import StudentProfile

from utils.id_generator import IDGenerator
from utils.random_utils import RandomUtils


class ProfileEngine:

    def __init__(
        self,
        students,
        profile_config,
    ):
        self.students = students
        self.profile_config = profile_config

    def generate(self) -> list[StudentProfile]:

        profiles = []

        total_students = len(self.students)

        profile_pool = []

        for profile_name, config in self.profile_config.items():

            count = round(
                total_students *
                config["percentage"] / 100
            )

            profile_pool.extend(
                [profile_name] * count
            )

        while len(profile_pool) < total_students:

            profile_pool.append("Average")

        RandomUtils.shuffle(profile_pool)

        for student, profile_name in zip(
            self.students,
            profile_pool,
        ):

            config = self.profile_config[
                profile_name
            ]

            profiles.append(

                StudentProfile(

                    profile_id=(
                        IDGenerator.generate_profile_id()
                    ),

                    student_id=student.student_id,

                    profile_name=profile_name,

                    attendance_min=config["attendance"][0],
                    attendance_max=config["attendance"][1],

                    assignment_min=config["assignment"][0],
                    assignment_max=config["assignment"][1],

                    cie_min=config["cie"][0],
                    cie_max=config["cie"][1],

                    see_min=config["see"][0],
                    see_max=config["see"][1],

                    dropout_probability=(
                        config["dropout_probability"]
                    ),
                )

            )

        return profiles