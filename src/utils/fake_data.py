"""
---------------------------------------------------------
Fake Data Utility

Purpose:
    Generates realistic fake data for
    synthetic university datasets.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from datetime import date
from random import choice,randint

from faker import Faker


class FakeData:
    """
    Utility class for generating realistic
    synthetic data.
    """

    _faker = Faker("en_IN")

    GENDERS = (
        "Male",
        "Female",
    )

    @classmethod
    def first_name_male(cls) -> str:
        return cls._faker.first_name_male()

    @classmethod
    def first_name_female(cls) -> str:
        return cls._faker.first_name_female()

    @classmethod
    def last_name(cls) -> str:
        return cls._faker.last_name()

    @classmethod
    def full_name(cls) -> str:
        return cls._faker.name()

    @classmethod
    def gender(cls) -> str:
        return choice(cls.GENDERS)

    @classmethod
    def email(
        cls,
        first_name: str,
        last_name: str,
        number: int = 1,
    ) -> str:
        """
        Generates a realistic college email.
        """

        username = (
            f"{first_name}.{last_name}{number}"
            .lower()
            .replace(" ", "")
        )

        return f"{username}@student.college.edu"

   

    @classmethod
    def phone(cls) -> str:
        first = choice(["6", "7", "8", "9"])
        remaining = "".join(str(randint(0, 9)) for _ in range(9))
        return first + remaining

    @classmethod
    def date_of_birth(
        cls,
        minimum_age: int = 18,
        maximum_age: int = 24,
    ) -> date:
        """
        Generates date of birth.
        """

        return cls._faker.date_of_birth(
            minimum_age=minimum_age,
            maximum_age=maximum_age,
        )
