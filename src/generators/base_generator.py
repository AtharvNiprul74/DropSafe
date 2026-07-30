"""
---------------------------------------------------------
Base Generator

Purpose:
    Base class for all dataset generators.
---------------------------------------------------------
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class BaseGenerator(ABC):
    """
    Abstract base class for all generators.
    """

    def __init__(self) -> None:
        self.records = []

    @abstractmethod
    def generate(self):
        """
        Generate records.
        """
        pass

    def total_records(self) -> int:
        """
        Returns total generated records.
        """
        return len(self.records)

    def clear(self) -> None:
        """
        Clear generated records.
        """
        self.records.clear()