# DropSafe ML Service: Debian 13 (trixie) Command Guide

Every command below assumes your project lives at
`~/DropSafe/DropSafe_V1/ml` (the folder that contains `dropsafe_ml/`, `requirements.txt`,
`models/`, `examples/`). Debian 13 ships **Python 3.13**, which this project supports.

---

## 0. One-shot setup (easiest)

```bash
cd ~/DropSafe/DropSafe_V1/ml
bash scripts/setup_debian13.sh
```
It installs system packages, creates `.venv`, installs requirements, trains a model if none exists,
runs the tests, and generates both reports. The rest of this guide is the same work done by hand.

---

## 1. System packages

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip python3-dev \
                    build-essential libgomp1 curl jq git
python3 --version          # should print Python 3.13.x
```
`libgomp1` is the OpenMP runtime that **LightGBM needs** on Debian.

## 2. Virtual environment

Debian 13 blocks `pip install` outside a venv (`externally-managed-environment`, PEP 668).
Always work inside `.venv`:

```bash
cd ~/DropSafe/DropSafe_V1/ml
python3 -m venv .venv
source .venv/bin/activate          # prompt shows (.venv)
python -m pip install --upgrade pip wheel
pip install -r requirements.txt
python -c "import lightgbm, sklearn, fastapi; print('OK', lightgbm.__version__)"
```
Every new terminal needs `cd ~/DropSafe/DropSafe_V1/ml && source .venv/bin/activate` first.

## 3. Data, training, model registry

```bash
# synthetic training data (8,000 simulated students)
python -m dropsafe_ml generate --n 8000 --seed 42

# train + evaluate + make ACTIVE
python -m dropsafe_ml train --dataset data/synthetic-v1-n8000-s42/students.jsonl --deploy

# list models (ACTIVE / RETIRED)
python -m dropsafe_ml models

# training a new version later automatically RETIRES the old one
python -m dropsafe_ml train --dataset data/synthetic-v1-n8000-s42/students.jsonl --seed 7 --deploy
```

## 4. Tests

```bash
python -m pytest -q            # expect: 14 passed
python -m pytest -v            # one line per test
```

## 5. Single predictions from the terminal

```bash
python -m dropsafe_ml predict examples/at_risk_student.json
python -m dropsafe_ml predict examples/on_track_student.json
python -m dropsafe_ml predict examples/insufficient_evidence.json

# only the important fields (jq was installed in step 1)
python -m dropsafe_ml predict examples/at_risk_student.json \
  | jq '{status, label: .prediction.risk_label, prob: .prediction.risk_probability, why: [.prediction.top_factors[].description]}'
```

## 6. Reports

### 6a. Model Evaluation Report (metrics, risk bands, calibration, feature importance)
```bash
python -m dropsafe_ml report model                         # ACTIVE model
python -m dropsafe_ml report model --version dropsafe-risk-v1
xdg-open reports/model_report_dropsafe-risk-v1.html        # opens in your browser
cat reports/model_report_dropsafe-risk-v1.md               # terminal-friendly version
```

### 6b. Student Risk Report (a cohort: HIGH / MEDIUM lists, reasons, insufficient evidence, CSV)
```bash
python -m dropsafe_ml generate --n 300 --seed 2026         # demo cohort
python -m dropsafe_ml report risk \
  --input data/synthetic-v1-n300-s2026/students.jsonl \
  --title "Student Risk Report: Demo Cohort"
xdg-open reports/risk_report_synthetic-v1-n300-s2026.html
libreoffice --calc reports/risk_report_synthetic-v1-n300-s2026.csv   # if LibreOffice installed
```
`--input` accepts `.jsonl` (one request per line), a `.json` array, or `{"requests": [...]}`.

### 6c. Save a report as PDF (optional)
```bash
sudo apt install -y chromium
chromium --headless --no-pdf-header-footer \
  --print-to-pdf=reports/model_report_dropsafe-risk-v1.pdf \
  reports/model_report_dropsafe-risk-v1.html
```
Or open the HTML in Firefox and press **Ctrl+P → Save to PDF**.

> Risk reports contain HIGH-sensitivity student data (PRD §17). Keep `reports/` out of git:
> `echo "reports/" >> .gitignore`

## 7. Run the API

```bash
python -m dropsafe_ml serve --port 8000
```
Use a real port number (e.g. `8000`). `--port 0` / `0000` means "pick any random free port".

| Open in browser | What |
|---|---|
| http://localhost:8000/ | redirects to `/docs` |
| http://localhost:8000/docs | Swagger UI: try `/predict` interactively |
| http://localhost:8000/health | `{"status":"ok", ...}` |

Test from a second terminal:
```bash
curl -s localhost:8000/health | jq
curl -s localhost:8000/model  | jq '{model_version, status, feature_version}'
curl -s -X POST localhost:8000/predict \
     -H "Content-Type: application/json" \
     -d @examples/at_risk_student.json | jq '.prediction | {risk_label, risk_probability}'

# batch: 3 students in one call
jq -s '{requests: .}' examples/*.json \
  | curl -s -X POST localhost:8000/predict/batch -H "Content-Type: application/json" -d @- \
  | jq '.[] | {student_id, status, label: .prediction.risk_label}'

# after deploying a new model, without restarting:
curl -s -X POST localhost:8000/admin/reload | jq
```

## 8. Run as a background service (systemd)

```bash
# edit User= and paths in the file if yours differ from /home/prince/DropSafe/DropSafe_V1/ml
sudo cp deploy/dropsafe-ml.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now dropsafe-ml

systemctl status dropsafe-ml           # is it running?
journalctl -u dropsafe-ml -f           # live logs (Ctrl+C to exit)
sudo systemctl restart dropsafe-ml     # after code/model changes
sudo systemctl stop dropsafe-ml
```
The service binds to **127.0.0.1**, so only your local Node.js backend can reach it. That's
intentional, because backend-to-ML authentication isn't specified yet. Don't open port 8000
in the firewall.

## 9. Troubleshooting on Debian 13

| Symptom | Fix |
|---|---|
| `error: externally-managed-environment` | You're outside the venv. Run `source .venv/bin/activate` |
| `OSError: libgomp.so.1: cannot open shared object file` | `sudo apt install -y libgomp1` |
| `GET / 404 Not Found` | Old `api.py`. Open `/docs`, or pull the latest `api.py` (has the `/` redirect) |
| `/health` → `"degraded"` / `No ACTIVE model` | `python -m dropsafe_ml train --dataset data/synthetic-v1-n8000-s42/students.jsonl --deploy` |
| `[Errno 98] Address already in use` | `ss -ltnp \| grep :8000` then `kill <PID>` (or `sudo systemctl stop dropsafe-ml`) |
| `Permission denied` deleting `models/...` | Deployed models are read-only on purpose: `chmod -R u+w models/<version>` first |
| `ModuleNotFoundError: dropsafe_ml` | Run commands from the `ml/` folder (the one containing `dropsafe_ml/`) |
| `xdg-open` does nothing (server / SSH) | Copy the file: `scp prince@server:~/DropSafe/DropSafe_V1/ml/reports/*.html .` |

## 10. Daily workflow cheat-sheet

```bash
cd ~/DropSafe/DropSafe_V1/ml && source .venv/bin/activate
python -m pytest -q
python -m dropsafe_ml models
python -m dropsafe_ml report model && xdg-open reports/model_report_dropsafe-risk-v1.html
python -m dropsafe_ml serve --port 8000
deactivate                                  # leave the venv
```
