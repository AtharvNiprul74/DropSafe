# Enrollment Evidence Layer

## 1. Dataset Identification

- **Output:** `data/processed/enrollment_evidence.csv`
- **Input datasets:** `enrollments.csv`, `academic_records.csv`, `attendance_records.csv`, `assessment_records.csv`, `learning_components.csv`, `chatbot_conversations.csv`
- **Enrollments covered:** 1000
- **Organizations covered:** 1

> Synthetic development data only. Not production data.

---

## 2. Evidence Availability

| Measure | Count |
|---|---|
| Enrollments with academic record | 1000 |
| Enrollments with attendance evidence | 1000 |
| Enrollments with assessment evidence | 1000 |
| Enrollments with linked conversation evidence | 685 |
| Enrollments with sufficient evidence (attendance AND assessment only) | 1000 |

---

## 3. Insufficiency Breakdown (academic evidence)

| Reason | Count |
|---|---|
| Attendance evidence only | 0 |
| Assessment evidence only | 0 |
| Neither | 0 |

---

## 4. PRD Compliance Notes

- This layer stores raw evidence values only (session counts, marks, conversation counts). Attendance percentage, marks percentage, sentiment, behaviour scores, and engagement scores are derived later during feature engineering (PRD §8, §9, §11).
- No risk label, prediction, or AI-generated value is present in this file.
- Source CSVs in `data/raw` are read-only for this script (PRD §9, §11).
- `evidence_sufficient` does NOT include behavioural evidence yet; the exact sufficiency definition is not frozen by the PRD (§30, §37; §36 Q6) and requires an approved decision before predictions are gated on it.
- Unlinked conversations (no enrollment reference, PRD §11) are not reflected in this per-enrollment view; student-level behavioural aggregation is a pending feature-engineering decision.

---

## 5. Downstream Use

This file is the input for feature engineering and Student Snapshot building (PRD §13, §14). Enrollments without sufficient evidence must not receive a prediction (PRD §30).

---

## 6. Model Training

**No model training was performed.**
