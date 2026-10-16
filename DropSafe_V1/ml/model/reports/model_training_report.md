# DropSafe V1 — Model Training & Evaluation Report (Phase 3)

**Generated:** 2026-10-16 17:15:49 UTC  
**Model Name:** `DropSafe-Risk-Classifier`  
**Model Version:** `v1.0.0`  
**Status:** `ACTIVE` (PRD §13 Single Active Model)  
**Algorithm:** `RandomForestClassifier`  
**Feature Version:** `v1.0.0`  
**Training Dataset Version:** `v1.0-draft-points`  
**Model Artifact:** `models\dropsafe_risk_model_v1.joblib`  
**Metadata Record:** `..\data\processed\ai_model_metadata.csv`  

---

## 1. Executive Performance Summary

| Metric | Result | Target Benchmark | Status |
| :--- | :---: | :---: | :---: |
| **Total Labeled Cohort** | 1,000 enrollments | 1,000 | Complete |
| **Training Split (80%)** | 800 enrollments | - | - |
| **Holdout Test Split (20%)** | 200 enrollments | - | - |
| **Overall Test Accuracy** | **100.00%** | > 80.0% | Evaluated |
| **Macro-Averaged F1-Score**| **100.00%** | > 75.0% | Evaluated |

---

## 2. Classification Performance on Holdout Test Set

```text
              precision    recall  f1-score   support

        HIGH     1.0000    1.0000    1.0000        72
         LOW     1.0000    1.0000    1.0000        17
      MEDIUM     1.0000    1.0000    1.0000       111

    accuracy                         1.0000       200
   macro avg     1.0000    1.0000    1.0000       200
weighted avg     1.0000    1.0000    1.0000       200

```

---

## 3. Confusion Matrix (Holdout Test Set)

```text
             Predicted LOW  Predicted MEDIUM  Predicted HIGH
Actual LOW       17             0                 0             
Actual MEDIUM    0              111               0             
Actual HIGH      0              0                 72            
```

---

## 4. Feature Importance Rankings (PRD §13 Features)

| Feature | Importance Weight |
| :--- | :---: |
| `attendance_percentage` | 24.41% |
| `engagement_score` | 16.97% |
| `overall_marks_percentage` | 15.58% |
| `sentiment_score` | 14.79% |
| `failed_learning_components` | 13.33% |
| `backlog_count` | 10.16% |
| `behaviour_score` | 4.76% |

---

## 5. PRD Invariants Verification

- **PRD §13 Lifecycle:** Exactly one ACTIVE model (`v1.0.0`).
- **PRD §14 Grounding:** Trained exclusively on verified, sufficient evidence.
- **PRD §24 Traceability:** Full chain preserved from `training_labels` to `student_features` to model binary.
- **Handoff:** Ready for Phase 4 Prediction Generation (`predict.py`).
