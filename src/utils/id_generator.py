"""
---------------------------------------------------------
ID Generator Utility

Purpose:
    Generates unique sequential IDs for different entities
    in the Student Risk Prediction System.

Author:
    Saklen Manjire

Version:
    2.0
---------------------------------------------------------
"""

from typing import Dict


class IDGenerator:
    """
    Generates sequential IDs.

    Example:

        ST000001
        ST000002

        DEP000001
        DEP000002
    """

    _counters: Dict[str, int] = {}

    @classmethod
    def generate(cls, prefix: str) -> str:
        """
        Generate the next ID.
        """

        if prefix not in cls._counters:
            cls._counters[prefix] = 1
        else:
            cls._counters[prefix] += 1

        return f"{prefix}{cls._counters[prefix]:06d}"

    @classmethod
    def generate_student_id(cls):
        return cls.generate("ST")

    @classmethod
    def generate_department_id(cls):
        return cls.generate("DEP")

    @classmethod
    def generate_mentor_id(cls):
        return cls.generate("MN")

    @classmethod
    def generate_course_id(cls):
        return cls.generate("CRS")

    @classmethod
    def generate_semester_id(cls):
        return cls.generate("SEM")

    @classmethod
    def generate_registration_id(cls):
        return cls.generate("REG")

    @classmethod
    def generate_marks_id(cls):
        return cls.generate("MK")

    @classmethod
    def generate_academic_record_id(cls):
        return cls.generate("AR")

    @classmethod
    def generate_prediction_id(cls):
        return cls.generate("PR")

    @classmethod
    def generate_upload_id(cls):
        return cls.generate("UP")

    @classmethod
    def generate_academic_year_id(cls):
        return cls.generate("AY")


    @classmethod
    def generate_curriculum_id(cls):
        return cls.generate("CUR")


    @classmethod
    def generate_course_offering_id(cls):
        return cls.generate("CO")


    @classmethod
    def generate_marks_id(cls):
        return cls.generate("MK")

    @classmethod
    def generate_profile_id(cls):
        return cls.generate("PRO")