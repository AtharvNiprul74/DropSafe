#!/usr/bin/env bash
# DropSafe ML Service: one-shot setup for Debian 13 (trixie)
# Usage:  bash scripts/setup_debian13.sh            (run from the ml/ folder)
set -euo pipefail
cd "$(dirname "$0")/.."

. /etc/os-release
echo "==> Detected: $PRETTY_NAME"
[[ "${VERSION_CODENAME:-}" == "trixie" ]] || echo "    (warning: script written for Debian 13 'trixie')"

echo "==> Installing system packages (needs sudo)"
sudo apt update
sudo apt install -y python3 python3-venv python3-pip python3-dev \
                    build-essential libgomp1 curl jq git

echo "==> Creating virtual environment .venv (Debian 13 blocks system-wide pip: PEP 668)"
[[ -d .venv ]] || python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install --upgrade pip wheel
pip install -r requirements.txt

echo "==> Verifying"
python -c "import sys, lightgbm, sklearn, fastapi; print('Python', sys.version.split()[0], '| LightGBM', lightgbm.__version__, '| sklearn', sklearn.__version__, '| FastAPI', fastapi.__version__)"

if [[ ! -f models/registry.json ]]; then
  echo "==> No model found: generating synthetic data, training and deploying v1"
  python -m dropsafe_ml generate --n 8000 --seed 42
  python -m dropsafe_ml train --dataset data/synthetic-v1-n8000-s42/students.jsonl --deploy > /dev/null
fi

echo "==> Running tests"
python -m pytest -q

echo "==> Generating reports"
python -m dropsafe_ml report model
[[ -f data/synthetic-v1-n300-s2026/students.jsonl ]] || python -m dropsafe_ml generate --n 300 --seed 2026 > /dev/null
python -m dropsafe_ml report risk --input data/synthetic-v1-n300-s2026/students.jsonl \
       --title "Student Risk Report: Demo Cohort (300 students)"

echo
echo "Done. Next:"
echo "  source .venv/bin/activate"
echo "  python -m dropsafe_ml serve --port 8000      # then open http://localhost:8000/docs"
echo "  xdg-open reports/model_report_dropsafe-risk-v1.html"
