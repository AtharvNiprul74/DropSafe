# DropSafe V1 — Model Training & Evaluation Report (Phase 3 LightGBM)

**Generated:** 2026-10-16 17:57:14 UTC  
**Model Name:** `DropSafe-Risk-Classifier`  
**Model Version:** `v1.1.0`  
**Status:** `ACTIVE` (PRD §13 Single Active Model)  
**Algorithm:** `LGBMClassifier` (LightGBM Gradient Boosting)  
**Feature Version:** `v1.0.0`  
**Training Dataset Version:** `v1.0-draft-points`  
**Model Artifact:** `models\dropsafe_risk_model_v1.joblib`  
**Metadata Record:** `data\processed\ai_model_metadata.csv`  

---

## 1. Executive Performance Summary

| Metric | Result | Target Benchmark | Status |
| :--- | :---: | :---: | :---: |
| **Total Labeled Cohort** | 1,000 enrollments | 1,000 | Complete |
| **Training Split (80%)** | 800 enrollments | - | - |
| **Holdout Test Split (20%)** | 200 enrollments | - | - |
| **Overall Test Accuracy** | **99.50%** | > 80.0% | Evaluated |
| **Macro-Averaged F1-Score**| **98.84%** | > 75.0% | Evaluated |

---

## 2. Classification Performance on Holdout Test Set

```text
              precision    recall  f1-score   support

        HIGH     1.0000    1.0000    1.0000        72
         LOW     1.0000    0.9412    0.9697        17
      MEDIUM     0.9911    1.0000    0.9955       111

    accuracy                         0.9950       200
   macro avg     0.9970    0.9804    0.9884       200
weighted avg     0.9950    0.9950    0.9949       200

```

---

## 3. Confusion Matrix (Holdout Test Set)

```text
             Predicted LOW  Predicted MEDIUM  Predicted HIGH
Actual LOW       16             1                 0             
Actual MEDIUM    0              111               0             
Actual HIGH      0              0                 72            
```

---

## 4. Feature Importance Rankings (Information Gain)

| Feature | Importance Weight |
| :--- | :---: |
| `attendance_percentage` | 41.54% |
| `failed_learning_components` | 23.81% |
| `sentiment_score` | 19.64% |
| `overall_marks_percentage` | 7.93% |
| `behaviour_score` | 6.49% |
| `engagement_score` | 0.60% |
| `backlog_count` | 0.00% |

---

## 5. PRD Invariants Verification

- **PRD §13 Lifecycle:** Exactly one ACTIVE model (`v1.1.0`).
- **PRD §14 Grounding:** Trained exclusively on verified, sufficient evidence.
- **PRD §24 Traceability:** Full chain preserved from `training_labels` to `student_features` to model binary.
- **Handoff:** Ready for Phase 4 Prediction Generation (`predict.py`).
