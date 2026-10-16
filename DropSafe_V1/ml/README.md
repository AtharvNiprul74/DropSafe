# DropSafe ML Service — Student Risk Prediction (V1)

The **Python ML Service** workstream from the DropSafe V1 PRD (§6, §13, §14, §26, §30).
It turns raw academic and behavioural evidence into a **Student Snapshot**, then into a
**LOW / MEDIUM / HIGH risk prediction** with a per-student explanation. It is
decision support only: humans decide interventions.

> ⚠️ **The current model (`dropsafe-risk-v1`) is trained on SIMULATED data.** It shows the
> pipeline working end to end. It must **not** be used for real students. Retrain it on
> approved historical data first (see "Going to real data").

---

## Pipeline

```text
Raw evidence (attendance_records, assessment_records, prior assessments, behaviour signals)
      │
      ▼
Evidence sufficiency gate ──► INSUFFICIENT_EVIDENCE (no prediction; "do not guess")
      │
      ▼
Feature engineering  fe-v1  (the same code is used in training and serving)
      │
      ▼
Student Snapshot (7 PRD features)
      │
      ▼
LightGBM (monotone constraints) ──► Isotonic calibration ──► risk probability
      │
      ▼
Risk band LOW / MEDIUM / HIGH + confidence + top SHAP factors
      │
      ▼
JSON payload for the backend to store in student_snapshots / predictions / prediction_history
```

The service is **stateless**. The Node.js backend owns persistence, RBAC, org isolation and audit.

## Quick start

```bash
pip install -r requirements.txt

python -m dropsafe_ml generate --n 8000 --seed 42             # synthetic raw evidence
python -m dropsafe_ml train --dataset data/synthetic-v1-n8000-s42/students.jsonl --deploy
python -m dropsafe_ml models                                  # registry (ACTIVE / RETIRED)
python -m dropsafe_ml predict examples/at_risk_student.json
python -m dropsafe_ml serve --port 8000                       # API + Swagger at /docs
python -m pytest -q                                           # 14 tests
python -m dropsafe_ml report model                            # model evaluation report
python -m dropsafe_ml report risk --input data/<cohort>/students.jsonl  # student risk report
```

**Debian 13:** see [`DEBIAN13_GUIDE.md`](DEBIAN13_GUIDE.md), or run `bash scripts/setup_debian13.sh`.

## Project layout

| File | Purpose |
|---|---|
| `dropsafe_ml/config.py` | **All provisional decisions in one place**: features, thresholds, evidence rules, hyper-parameters |
| `dropsafe_ml/schemas.py` | Request/response contract; validates PRD §34 integrity constraints |
| `dropsafe_ml/features.py` | Feature engineering `fe-v1` |
| `dropsafe_ml/evidence.py` | "Do not guess" sufficiency gate |
| `dropsafe_ml/synthetic.py` | Synthetic raw-evidence generator |
| `dropsafe_ml/train.py` | Train → calibrate → evaluate (+ logistic baseline) → immutable artifact |
| `dropsafe_ml/registry.py` | `ai_model_metadata` rules: one ACTIVE model, ACTIVE→RETIRED, immutable |
| `dropsafe_ml/predictor.py` | Inference + SHAP explanations |
| `dropsafe_ml/api.py` | FastAPI service (`/` redirects to `/docs`) |
| `dropsafe_ml/report.py` | Model evaluation and student risk reports (HTML/MD/CSV) |
| `scripts/setup_debian13.sh` | One-shot Debian 13 setup |
| `deploy/dropsafe-ml.service` | systemd unit |
| `models/dropsafe-risk-v1/` | Model, calibrator, metadata, metrics, plots |

## Features (`fe-v1`)

| Feature | Formula |
|---|---|
| `attendance_percentage` | 100 × Σ attended / Σ total sessions |
| `overall_marks_percentage` | 100 × Σ obtained / Σ maximum marks |
| `failed_learning_components` | Current-period components with any `FAIL`. If no outcome is given, aggregate % < 40 |
| `backlog_count` | Earlier-period components whose most recent attempt failed |
| `behaviour_score`, `engagement_score`, `sentiment_score` | Passed through (0–100). They are **placeholders** until Behaviour Analysis exists, and may be missing |

Monotone constraints guarantee intuitive behaviour. For example, better attendance
can **never** increase predicted risk (covered by a test).

## Results on the synthetic held-out test set (1,153 students)

| Model | ROC-AUC | PR-AUC | Brier |
|---|---|---|---|
| LightGBM + isotonic calibration | 0.941 | 0.841 | 0.069 |
| Logistic regression baseline | 0.943 | 0.863 | 0.067 |

| Band | Share of students | Observed disengagement | Share of all disengaged students caught |
|---|---|---|---|
| LOW (< 30%) | 76% | 5% | 19% |
| MEDIUM (30–60%) | 5% | 30% | 6% |
| HIGH (≥ 60%) | 19% | 84% | 75% |

**Honest note:** the baseline ties LightGBM here because the synthetic outcome was simulated
with a mostly linear formula. Real student data is usually messier and non-linear. The baseline
comparison runs on every training, so model choice should be re-checked once real data
exists. These numbers say nothing about real-world accuracy.

## API (provisional, internal to the backend)

`GET /health` · `GET /model` · `POST /predict` · `POST /predict/batch` · `POST /admin/reload`

The response is either `PREDICTED`, with a `snapshot` and a `prediction`
(`risk_label`, `risk_probability`, `prediction_confidence`, `prediction_score`,
`ai_model_version`, `feature_version`, `training_dataset_version`, `generated_at`, `top_factors`),
or `INSUFFICIENT_EVIDENCE`, with `missing_evidence` reasons and no prediction.

## Decisions needing approval (PRD §36–37)

These defaults were needed to run the pipeline. All of them are in `config.py`:

1. **Q6 — Prediction Unavailable:** returned as `status: INSUFFICIENT_EVIDENCE` with no prediction record. The schema decision is still open.
2. **Q7 — Score semantics:** `risk_probability` = calibrated P(risk) %; `prediction_confidence` = 100·max(p, 1−p); `prediction_score` = confidence.
3. Risk band thresholds: MEDIUM ≥ 0.30, HIGH ≥ 0.60.
4. Evidence rules: ≥ 1 attendance record, ≥ 10 total sessions, ≥ 1 assessment; behaviour optional.
5. `grading_outcome` values `PASS`/`FAIL`; 40% fallback pass mark.
6. Probabilities clamped to 1–99%, so the model never claims certainty.
7. Outcome label definition ("disengaged") for real data.
8. Authentication between the backend and the ML service.

## Going to real data

1. Export historical records into the same JSONL shape (`evidence` + `label_disengaged`).
2. `python -m dropsafe_ml train --dataset path/to/real.jsonl`. Review `metrics.json` and the plots **before** deploying.
3. `python -m dropsafe_ml deploy dropsafe-risk-vN`. The previous model is RETIRED automatically.
4. `POST /admin/reload`.
5. Add fairness checks across student groups and set band thresholds with counseling capacity in mind.
