"""
File-based model registry implementing the ai_model_metadata rules (PRD §13, §20):

* Status lifecycle: ACTIVE -> RETIRED (no other transitions; RETIRED is final).
* Only ONE model version may be ACTIVE at a time.
* Deployed model metadata is immutable; retired models stay available for
  historical reference / traceability of old predictions.

Layout:
    models/
      registry.json                 # status + deployment timestamps
      <model_version>/              # immutable artifact directory
         model.txt  calibrator.joblib  metadata.json  metrics.json  *.png
"""
from __future__ import annotations

import json
import os
import stat
from datetime import datetime, timezone
from pathlib import Path

from dropsafe_ml.config import MODEL_NAME, MODELS_DIR


class RegistryError(RuntimeError):
    pass


class ModelRegistry:
    def __init__(self, root: Path | str | None = None):
        self.root = Path(root or MODELS_DIR)
        self.root.mkdir(parents=True, exist_ok=True)
        self.index_path = self.root / "registry.json"

    # ------------------------------------------------------------------ io --
    def _load(self) -> dict:
        if not self.index_path.exists():
            return {"model_name": MODEL_NAME, "models": []}
        return json.loads(self.index_path.read_text())

    def _save(self, data: dict) -> None:
        tmp = self.index_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2))
        os.replace(tmp, self.index_path)

    # ------------------------------------------------------------- queries --
    def list(self) -> list[dict]:
        return self._load()["models"]

    def get_active(self) -> dict | None:
        active = [m for m in self.list() if m["status"] == "ACTIVE"]
        if len(active) > 1:  # should be impossible; fail loudly
            raise RegistryError("Registry corrupted: more than one ACTIVE model.")
        return active[0] if active else None

    def model_dir(self, model_version: str) -> Path:
        return self.root / model_version

    def next_version(self) -> str:
        existing = {p.name for p in self.root.iterdir() if p.is_dir()}
        n = 1
        while f"{MODEL_NAME}-v{n}" in existing:
            n += 1
        return f"{MODEL_NAME}-v{n}"

    # ------------------------------------------------------------ commands --
    def deploy(self, model_version: str) -> dict:
        """Mark a trained artifact ACTIVE; retire the previous ACTIVE model."""
        mdir = self.model_dir(model_version)
        meta_path = mdir / "metadata.json"
        if not meta_path.exists():
            raise RegistryError(f"No trained artifact found for {model_version}")
        data = self._load()
        if any(m["model_version"] == model_version for m in data["models"]):
            raise RegistryError(
                f"{model_version} was already deployed; ACTIVE->RETIRED is final "
                "and deployed metadata is immutable. Train a new version instead."
            )
        meta = json.loads(meta_path.read_text())
        now = datetime.now(timezone.utc).isoformat()
        for m in data["models"]:
            if m["status"] == "ACTIVE":
                m["status"] = "RETIRED"
                m["retired_at"] = now
        entry = {
            "model_name": meta["model_name"],
            "model_version": model_version,
            "algorithm": meta["algorithm"],
            "feature_version": meta["feature_version"],
            "training_dataset_version": meta["training_dataset_version"],
            "deployment_timestamp": now,
            "status": "ACTIVE",
        }
        data["models"].append(entry)
        self._save(data)
        _make_read_only(mdir)
        return entry


def _make_read_only(directory: Path) -> None:
    """Best-effort immutability for deployed artifacts."""
    for p in directory.iterdir():
        if p.is_file():
            p.chmod(stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)
