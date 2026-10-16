"""
Command line interface.

    python -m dropsafe_ml generate --n 8000 --seed 42
    python -m dropsafe_ml train --dataset data/synthetic-v1-n8000-s42/students.jsonl [--deploy]
    python -m dropsafe_ml deploy dropsafe-risk-v1
    python -m dropsafe_ml models
    python -m dropsafe_ml predict examples/at_risk_student.json
    python -m dropsafe_ml serve --port 8000
    python -m dropsafe_ml report model [--version dropsafe-risk-v1]
    python -m dropsafe_ml report risk --input data/<cohort>/students.jsonl
"""
from __future__ import annotations

import argparse
import json
import sys


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="dropsafe_ml")
    sub = ap.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("generate", help="Generate a synthetic raw-evidence dataset")
    g.add_argument("--n", type=int, default=8000)
    g.add_argument("--seed", type=int, default=42)

    t = sub.add_parser("train", help="Train + evaluate a new model version")
    t.add_argument("--dataset", required=True)
    t.add_argument("--deploy", action="store_true", help="Make the new model ACTIVE")
    t.add_argument("--seed", type=int, default=42)

    d = sub.add_parser("deploy", help="Make a trained model version ACTIVE")
    d.add_argument("model_version")

    sub.add_parser("models", help="List registered models")

    p = sub.add_parser("predict", help="Predict from a JSON request file")
    p.add_argument("file")

    s = sub.add_parser("serve", help="Run the inference API")
    s.add_argument("--host", default="0.0.0.0")
    s.add_argument("--port", type=int, default=8000)

    r = sub.add_parser("report", help="Generate HTML/Markdown/CSV reports")
    rsub = r.add_subparsers(dest="report_type", required=True)
    rm = rsub.add_parser("model", help="Model evaluation report")
    rm.add_argument("--version", default=None, help="Model version (default: ACTIVE)")
    rr = rsub.add_parser("risk", help="Student risk report for a cohort")
    rr.add_argument("--input", required=True, help=".jsonl / .json of prediction requests")
    rr.add_argument("--title", default=None)

    a = ap.parse_args(argv)

    if a.cmd == "generate":
        from dropsafe_ml.synthetic import write_dataset
        path = write_dataset(a.n, a.seed)
        print(f"Wrote {path}")
        print((path.parent / "dataset_meta.json").read_text())

    elif a.cmd == "train":
        from dropsafe_ml.registry import ModelRegistry
        from dropsafe_ml.train import train
        reg = ModelRegistry()
        res = train(a.dataset, reg, seed=a.seed)
        print(json.dumps({k: v for k, v in res.items()}, indent=2))
        if a.deploy:
            print("Deployed:", json.dumps(reg.deploy(res["model_version"]), indent=2))

    elif a.cmd == "deploy":
        from dropsafe_ml.registry import ModelRegistry
        print(json.dumps(ModelRegistry().deploy(a.model_version), indent=2))

    elif a.cmd == "models":
        from dropsafe_ml.registry import ModelRegistry
        print(json.dumps(ModelRegistry().list(), indent=2))

    elif a.cmd == "predict":
        from dropsafe_ml.predictor import RiskPredictor
        from dropsafe_ml.schemas import PredictionRequest
        with open(a.file) as fh:
            req = PredictionRequest.model_validate(json.load(fh))
        print(RiskPredictor.from_registry().predict(req).model_dump_json(indent=2))

    elif a.cmd == "serve":
        import uvicorn
        uvicorn.run("dropsafe_ml.api:app", host=a.host, port=a.port)

    elif a.cmd == "report":
        from dropsafe_ml import report
        if a.report_type == "model":
            out = report.model_report(a.version)
        else:
            out = report.risk_report(a.input, title=a.title)
        for kind, path in out.items():
            print(f"{kind:9s} {path}")

    else:  # pragma: no cover
        ap.print_help()
        sys.exit(1)
