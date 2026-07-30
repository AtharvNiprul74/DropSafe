"""
---------------------------------------------------------
CSV Utility Module

Purpose:
    Read and write CSV files used by the synthetic
    data generator.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from pathlib import Path
import csv
from typing import List, Dict, Any


def create_directory(directory: Path) -> None:
    """
    Create directory if it doesn't exist.
    """

    directory.mkdir(parents=True, exist_ok=True)


def write_csv(
    file_path: Path,
    data: List[Dict[str, Any]]
) -> None:
    """
    Write data into CSV.

    Parameters
    ----------
    file_path : Path
        CSV file path.

    data : List[Dict]
        List of dictionary records.
    """

    if not data:
        return

    create_directory(file_path.parent)

    with open(
        file_path,
        mode="w",
        newline="",
        encoding="utf-8"
    ) as csv_file:

        writer = csv.DictWriter(
            csv_file,
            fieldnames=data[0].keys()
        )

        writer.writeheader()

        writer.writerows(data)


def append_csv(
    file_path: Path,
    data: List[Dict[str, Any]]
) -> None:
    """
    Append records to CSV.
    """

    if not data:
        return

    create_directory(file_path.parent)

    file_exists = file_path.exists()

    with open(
        file_path,
        mode="a",
        newline="",
        encoding="utf-8"
    ) as csv_file:

        writer = csv.DictWriter(
            csv_file,
            fieldnames=data[0].keys()
        )

        if not file_exists:
            writer.writeheader()

        writer.writerows(data)


def read_csv(
    file_path: Path
) -> List[Dict[str, str]]:
    """
    Read CSV file.

    Returns
    -------
    List of dictionaries.
    """

    if not file_path.exists():
        raise FileNotFoundError(
            f"{file_path} not found."
        )

    with open(
        file_path,
        mode="r",
        newline="",
        encoding="utf-8"
    ) as csv_file:

        reader = csv.DictReader(csv_file)

        return list(reader)


def clear_csv(file_path: Path) -> None:
    """
    Delete CSV if it exists.
    """

    if file_path.exists():
        file_path.unlink()


def csv_exists(file_path: Path) -> bool:
    """
    Check whether CSV exists.
    """

    return file_path.exists()


def total_records(file_path: Path) -> int:
    """
    Count total records.

    Header is excluded.
    """

    if not file_path.exists():
        return 0

    with open(
        file_path,
        mode="r",
        encoding="utf-8"
    ) as csv_file:

        return max(sum(1 for _ in csv_file) - 1, 0)