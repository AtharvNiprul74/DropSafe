# DropSafe V1 — Machine Learning

## Overview

The DropSafe ML module is responsible for predicting student dropout risk using academic data.

The ML pipeline is implemented separately from the Node.js backend. The backend communicates with the ML service when a prediction is required.

The V1 academic prediction pipeline focuses on academic indicators such as attendance, assignments, examination performance, SGPA/CGPA, failed courses, and backlogs.

---

## Owner

**Team:** ML / AI  
**Branch:** `feature/ml-pipeline`

---

## Technology Stack

- Python
- pandas
- NumPy
- scikit-learn
- joblib
- Jupyter Notebook

Additional Python libraries may be added when required by the ML implementation.

---

## Responsibilities

The ML module is responsible for:

- Dataset validation
- Data cleaning
- Data preprocessing
- Feature engineering
- Feature selection
- Model training
- Model evaluation
- Model persistence
- Model inference
- Dropout-risk prediction
- Prediction service integration

---

## Academic Risk Prediction

The academic prediction pipeline can use student academic indicators such as:

- Attendance
- Assignment performance
- CIE performance
- SEE performance
- SGPA
- CGPA
- Failed courses
- Backlogs
- Credit completion

The prediction pipeline produces an academic risk classification.

The expected risk categories are:

```text
LOW
MEDIUM
HIGH
