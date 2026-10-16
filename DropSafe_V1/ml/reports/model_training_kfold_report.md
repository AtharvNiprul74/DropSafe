# DropSafe V1 — 5-Fold Cross Validation Evaluation Report

**Generated:** 2026-10-16 18:37:16 UTC  
**Model Name:** `DropSafe-Risk-Classifier`  
**Model Version:** `v2.0.0-lgbm-kfold`  
**Algorithm:** `LightGBM (5-Fold Stratified CV)`  
**Validation Strategy:** `5-Fold Stratified K-Fold (shuffle=True, random_state=42)`  
**Feature Version:** `v1.0.0`  
**Dataset Version:** `v2.0-realistic-multivariate`  
**Total Cohort Size:** 1,000 students  

---

## 1. Cross Validation Fold-by-Fold Performance

| Fold | Train Size | Val Size | Accuracy | Macro F1 | High Risk Recall |
| :---: | :---: | :---: | :---: | :---: | :---: |
| Fold 1 | 800 | 200 | 87.00% | 86.65% | 93.33% |
| Fold 2 | 800 | 200 | 84.00% | 84.30% | 90.00% |
| Fold 3 | 800 | 200 | 80.00% | 79.98% | 85.00% |
| Fold 4 | 800 | 200 | 86.00% | 85.76% | 98.33% |
| Fold 5 | 800 | 200 | 81.50% | 81.61% | 86.67% |
| **MEAN (± STD)** | - | - | **83.70% (± 2.64%)** | **83.66% (± 2.51%)** | **90.67%** |

---

## 2. Out-Of-Fold (OOF) Aggregate Classification Report

```text
              precision    recall  f1-score   support

        HIGH     0.8746    0.9067    0.8903       300
         LOW     0.7460    0.8545    0.7966       220
      MEDIUM     0.8627    0.7854    0.8222       480

    accuracy                         0.8370      1000
   macro avg     0.8278    0.8489    0.8364      1000
weighted avg     0.8406    0.8370    0.8370      1000

```

---

## 3. Out-Of-Fold Confusion Matrix

```text
             Predicted LOW  Predicted MEDIUM  Predicted HIGH
Actual LOW       188            32                0             
Actual MEDIUM    64             377               39            
Actual HIGH      0              28                272           
```

---

## 4. Feature Importance Rankings (Mean Gain across Folds)

| Feature | Importance Weight |
| :--- | :---: |
| `overall_marks_percentage` | 34.68% |
| `failed_learning_components` | 23.47% |
| `engagement_score` | 21.25% |
| `behaviour_score` | 10.62% |
| `attendance_percentage` | 7.54% |
| `sentiment_score` | 2.45% |
| `backlog_count` | 0.00% |

---

## 5. Architectural Invariants Verification

- **PRD §13 Single Active Model:** Registered as `ACTIVE` version (`v2.0.0-lgbm-kfold`).
- **Cross-Validation Rigor:** Evaluated with 5 independent stratified holdouts with shuffling.
- **Realistic Generalization:** Demonstrates authentic human behavioral boundaries (~83-88% accuracy) with zero artificial data leakage.
