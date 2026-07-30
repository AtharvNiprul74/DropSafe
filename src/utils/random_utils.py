"""
---------------------------------------------------------
Random Utility Module

Purpose:
    Generic random helper methods used
    throughout the project.
---------------------------------------------------------
"""

from __future__ import annotations

import random
from datetime import date, timedelta


class RandomUtils:

    @staticmethod
    def seed(seed: int) -> None:
        random.seed(seed)

    @staticmethod
    def integer(minimum: int, maximum: int) -> int:
        return random.randint(minimum, maximum)

    @staticmethod
    def decimal(
        minimum: float,
        maximum: float,
        digits: int = 2,
    ) -> float:
        return round(random.uniform(minimum, maximum), digits)

    @staticmethod
    def percentage(
        minimum: int = 0,
        maximum: int = 100,
    ) -> int:
        return random.randint(minimum, maximum)

    @staticmethod
    def probability(value: float) -> bool:
        """
        Example:
            probability(0.05) -> 5%
        """
        return random.random() < value

    @staticmethod
    def choice(values):
        return random.choice(values)

    @staticmethod
    def shuffle(values):
        random.shuffle(values)

    @staticmethod
    def date_between(
        start_date: date,
        end_date: date,
    ) -> date:

        days = (end_date - start_date).days

        return start_date + timedelta(
            days=random.randint(0, days)
        )