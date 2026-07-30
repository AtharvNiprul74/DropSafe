"""
---------------------------------------------------------
Helper Utility Functions

Purpose:
    Provides common reusable helper functions
    used across the Student Risk Prediction project.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, List, Sequence

from config.config import RANDOM_SEED

import random

random.seed(RANDOM_SEED)


def clamp(value: float, minimum: float, maximum: float) -> float:
    """
    Restrict a value between minimum and maximum.
    """
    return max(minimum, min(value, maximum))


def safe_divide(numerator: float, denominator: float) -> float:
    """
    Safely divide two numbers.
    Returns 0 if denominator is zero.
    """
    if denominator == 0:
        return 0.0
    return numerator / denominator


def percentage(obtained: float, total: float) -> float:
    """
    Calculate percentage.
    """
    return round(safe_divide(obtained * 100, total), 2)


def round_decimal(value: float, digits: int = 2) -> float:
    """
    Round a float to the specified number of decimal places.
    """
    return round(value, digits)


def random_choice_by_weight(
    items: Sequence[Any],
    weights: Sequence[float]
) -> Any:
    """
    Select one item based on weighted probability.
    """
    return random.choices(items, weights=weights, k=1)[0]


def is_between(value: float, minimum: float, maximum: float) -> bool:
    """
    Check whether a value lies within a range.
    """
    return minimum <= value <= maximum


def current_timestamp() -> str:
    """
    Return current timestamp in ISO format.
    """
    return datetime.now().isoformat()


def generate_uuid() -> str:
    """
    Generate a UUID string.
    """
    return str(uuid.uuid4())


def to_title_case(text: str) -> str:
    """
    Convert text to Title Case.
    """
    return text.strip().title()


def snake_to_title(text: str) -> str:
    """
    Convert snake_case to Title Case.
    Example:
        academic_record -> Academic Record
    """
    return text.replace("_", " ").title()


def normalize_text(text: str) -> str:
    """
    Remove extra spaces from text.
    """
    return " ".join(text.strip().split())


def capitalize_first(text: str) -> str:
    """
    Capitalize only the first character.
    """
    if not text:
        return text
    return text[0].upper() + text[1:]


def flatten(nested_list: List[List[Any]]) -> List[Any]:
    """
    Flatten a nested list.
    """
    return [item for sublist in nested_list for item in sublist]