"""
---------------------------------------------------------
CSV Export Service

Purpose:
    Export generated model objects into CSV files.

Author:
    Saklen Manjire
---------------------------------------------------------
"""

from __future__ import annotations

import csv
from dataclasses import asdict, is_dataclass
from pathlib import Path


class CSVExportService:

    def __init__(self, output_directory: str):

        self.output_directory = Path(output_directory)

        self.output_directory.mkdir(
            parents=True,
            exist_ok=True,
        )

    def export(
        self,
        filename: str,
        records: list,
    ) -> None:
        """
        Export a list of dataclass objects to CSV.
        """

        if not records:
            print(f"{filename}: No records found.")
            return

        if not is_dataclass(records[0]):
            raise TypeError(
                "CSVExportService supports dataclass models only."
            )

        file_path = self.output_directory / filename

        rows = [
            asdict(record)
            for record in records
        ]

        fieldnames = rows[0].keys()

        with open(
            file_path,
            mode="w",
            newline="",
            encoding="utf-8",
        ) as csv_file:

            writer = csv.DictWriter(
                csv_file,
                fieldnames=fieldnames,
            )

            writer.writeheader()

            writer.writerows(rows)

        print(
            f"Exported {len(rows)} records -> {file_path}"
        )

    def export_all(
        self,
        datasets: dict[str, list],
    ) -> None:
        """
        Export multiple datasets.
        """

        for filename, records in datasets.items():

            self.export(
                filename,
                records,
            )