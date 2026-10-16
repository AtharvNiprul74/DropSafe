# Model Evaluation Report — dropsafe-risk-v1

Status: **ACTIVE** · Feature version `fe-v1` · Dataset `synthetic-v1-n8000-s42`

> ⚠️ Trained on SIMULATED data — not for real-student decisions.

## Key findings
- The model ranks students well on held-out data (ROC-AUC 0.941; 0.5 = random, 1.0 = perfect).
- HIGH band: 19.4% of students, of whom 84.4% actually disengaged; it captures 75.0% of all disengaged students.
- HIGH + MEDIUM together capture 81.3% of disengaged students; 18.6% are missed in LOW (LOW-band disengagement rate 5.4%).
- LightGBM and the logistic-regression baseline perform about the same. On synthetic data this is expected (the outcome was simulated with a mostly linear formula). Re-check on real data.
- Strongest risk drivers: Attendance, Overall marks, Failed learning components.
- 316 records were excluded from training because they failed the evidence-sufficiency gate.

## Test metrics
| Model | ROC-AUC | PR-AUC | Brier | Log-loss |
|---|---|---|---|---|
| LightGBM (calibrated) | 0.9413 | 0.8409 | 0.0691 | 0.2385 |
| Logistic baseline | 0.9433 | 0.8633 | 0.0671 | 0.2336 |

## Risk bands
| Band | Students | Share | Observed disengagement | Captured |
|---|---|---|---|---|
| HIGH | 224 | 19.4% | 84.4% | 75.0% |
| MEDIUM | 53 | 4.6% | 30.2% | 6.3% |
| LOW | 876 | 76.0% | 5.4% | 18.6% |
