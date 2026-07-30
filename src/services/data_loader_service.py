from pathlib import Path
import json


class DataLoaderService:

    SRC_ROOT = Path(__file__).resolve().parents[1]
    # services -> src

    @staticmethod
    def load_json(file_path: str):

        path = DataLoaderService.SRC_ROOT / file_path

        with path.open(
            "r",
            encoding="utf-8",
        ) as file:

            return json.load(file)

    @staticmethod
    def load_settings():

        return DataLoaderService.load_json(
            "config/settings.json"
        )