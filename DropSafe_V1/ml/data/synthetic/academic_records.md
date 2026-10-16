# Academic Records Dataset Validation

## 1. Dataset Identification

- **Dataset:** `academic_records.csv`
- **Dataset type:** Synthetic development dataset
- **Generated records:** 1000
- **Random seed:** 47
- **Source datasets:** `enrollments.csv`, `learning_components.csv`, `academic_periods.csv`

> This dataset contains synthetic data only. It is not production student data.

---

## 2. Dataset Structure

| Column | Data Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Unique academic-record identifier |
| `organization_id` | UUID | Yes | Organization identifier |
| `enrollment_id` | UUID | Yes | Related enrollment |
| `learning_component_id` | UUID | Yes | Related learning component |
| `academic_status` | Enum | Yes | Academic-record lifecycle status |
| `last_evidence_update_at` | Timestamp | No | Timestamp of the last evidence update |
| `created_at` | Timestamp | Yes | Record creation timestamp |
| `updated_at` | Timestamp | Yes | Last record update timestamp |

---

## 3. Source Dataset Counts

- Enrollments: **1000**
- Learning components: **2000**
- Academic records generated: **1000**

Each enrollment receives exactly one academic record. Each record references one learning component from the same organization and academic period as its enrollment.

---

## 4. Missing Value Analysis

Total missing cells: **1000**

`last_evidence_update_at` is intentionally null because no evidence-update event is simulated at generation time. Nullable fields are not automatically treated as errors.

---

## 5. Duplicate Analysis

- Duplicate complete rows: **0**
- Duplicate IDs: **0**
- Duplicate enrollment records: **0**

---

## 6. Data Type Analysis

Pandas-detected data types:

```text
id                         object
organization_id            object
enrollment_id              object
learning_component_id      object
academic_status            object
last_evidence_update_at    object
created_at                 object
updated_at                 object
```

Timestamp columns are additionally parsed and validated.

---

## 7. Relationship and Invalid Value Analysis

- Empty required values: **0**
- Invalid academic statuses: **0**
- Invalid enrollment references: **0**
- Invalid component references: **0**
- Organization mismatches: **0**
- Academic-period mismatches: **0**
- Invalid enrollment period references: **0**
- Invalid creation timestamps: **0**
- Invalid update timestamps: **0**
- Updates before creation: **0**
- Invalid evidence timestamps: **0**
- Enrollment coverage mismatches: **0**

Allowed academic statuses: `ACTIVE`, `COMPLETED`, `WITHDRAWN`, `ARCHIVED`.

---

## 8. Target / Risk Label

No target or risk label is defined in this dataset. No dropout-risk label, prediction, or model output was added.

---

## 9. Academic Features

This dataset provides record-level relationships and lifecycle status. Attendance and assessment evidence must come from their respective datasets. Percentages, risk scores, and predictions are not stored here.

---

## 10. Validation Results

| Check | Result |
|---|---|
| Required columns | PASS |
| Duplicate rows | PASS |
| Duplicate IDs | PASS |
| One record per enrollment | PASS |
| Academic status values | PASS |
| Enrollment references | PASS |
| Component references | PASS |
| Organization consistency | PASS |
| Academic-period consistency | PASS |
| Enrollment period references | PASS |
| Creation timestamps | PASS |
| Update timestamps | PASS |
| Chronological timestamps | PASS |
| Evidence timestamps | PASS |

### Overall Validation: **PASS**

---

## 11. Model Training

**No model training was performed.** This task only generates and validates synthetic data.

---

## 12. Conclusion

The generator produced 1000 academic records from {len(enrollments)} enrollments. Each record has one enrollment and one learning-component reference. Risk labels and derived performance metrics were not invented.
