"""
---------------------------------------------------------
Date Utility Functions

Purpose:
    Provides reusable date and time utilities
    for the Student Risk Prediction project.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

from datetime import datetime, date, timedelta
import random

from config.config import RANDOM_SEED

random.seed(RANDOM_SEED)


def today() -> date:
    """
    Return today's date.
    """
    return date.today()


def current_datetime() -> datetime:
    """
    Return current date and time.
    """
    return datetime.now()


def current_year() -> int:
    """
    Return current year.
    """
    return date.today().year


def calculate_age(dob: date) -> int:
    """
    Calculate age from date of birth.
    """
    today_date = date.today()

    return (
        today_date.year
        - dob.year
        - (
            (today_date.month, today_date.day)
            < (dob.month, dob.day)
        )
    )


def random_dob(
    min_age: int = 18,
    max_age: int = 25
) -> date:
    """
    Generate a random date of birth.
    """

    today_date = date.today()

    start = date(today_date.year - max_age, 1, 1)
    end = date(today_date.year - min_age, 12, 31)

    delta = (end - start).days

    return start + timedelta(days=random.randint(0, delta))


def format_date(
    value: date,
    fmt: str = "%Y-%m-%d"
) -> str:
    """
    Format a date.
    """
    return value.strftime(fmt)


def parse_date(
    value: str,
    fmt: str = "%Y-%m-%d"
) -> date:
    """
    Convert string into date.
    """
    return datetime.strptime(value, fmt).date()


def academic_year(start_year: int) -> str:
    """
    Example:
        2025 -> 2025-2026
    """
    return f"{start_year}-{start_year + 1}"


def next_academic_year(year: str) -> str:
    """
    Example:
        2025-2026
        ->
        2026-2027
    """

    start = int(year.split("-")[0])

    return academic_year(start + 1)


def semester_name(number: int) -> str:
    """
    Convert semester number into text.
    """

    return f"Semester {number}"


def is_weekend(value: date) -> bool:
    """
    Return True if Saturday or Sunday.
    """
    return value.weekday() >= 5


def days_between(
    start: date,
    end: date
) -> int:
    """
    Return number of days between two dates.
    """
    return abs((end - start).days)