# Attendance Records Dataset Validation

## 1. Dataset Identification

- **Dataset:** `attendance_records.csv`
- **Dataset type:** Synthetic development dataset
- **Generated records:** 1000
- **Random seed:** 48
- **Source datasets:** `academic_records.csv`, `learning_components.csv`

> Synthetic data only. This is not production attendance data.

---

## 2. Dataset Structure

| Column | Data Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Unique attendance-record identifier |
| `organization_id` | UUID | Yes | Organization identifier |
| `academic_record_id` | UUID | Yes | Related academic record |
| `learning_component_id` | UUID | Yes | Related learning component |
| `attended_sessions` | Integer | Yes | Number of sessions attended |
| `total_sessions` | Integer | Yes | Total number of sessions |
| `import_session_id` | UUID | No | Optional import-session reference |
| `created_at` | Timestamp | Yes | Record creation timestamp |
| `updated_at` | Timestamp | Yes | Last record update timestamp |

---

## 3. Source Dataset Counts

- Academic records: **1000**
- Learning components: **2000**
- Attendance records generated: **1000**

One attendance record is generated for each academic record. The component and organization must match the academic record.

---

## 4. Missing Value Analysis

Total missing cells: **1000**

`import_session_id` is intentionally null because the current dataset plan does not include an import-sessions source dataset. This nullable field is not treated as an error.

---

## 5. Duplicate Analysis

- Duplicate complete rows: **0**
- Duplicate IDs: **0**
- Duplicate business keys: **0**

The business key consists of organization, academic record, and learning component.

---

## 6. Data Type Analysis

Pandas-detected data types:

```text
id                       object
organization_id          object
academic_record_id       object
learning_component_id    object
attended_sessions         int64
total_sessions            int64
import_session_id        object
created_at               object
updated_at               object
```

Session counts are additionally checked for integer values.

---

## 7. Invalid Value and Relationship Analysis

- Empty required values: **0**
- Invalid attended-session values: **0**
- Invalid total-session values: **0**
- Attended sessions greater than total: **0**
- Invalid academic-record references: **0**
- Invalid component references: **0**
- Organization mismatches: **0**
- Component mismatches: **0**
- Invalid creation timestamps: **0**
- Invalid update timestamps: **0**
- Updates before creation: **0**

Validation rules:
- `total_sessions` must be greater than zero.
- `attended_sessions` must be a non-negative integer.
- `attended_sessions` must not exceed `total_sessions`.
- Organization and component references must be consistent.

---

## 8. Target / Risk Label

No target or risk label is present in this dataset. No dropout prediction or risk classification was created.

---

## 9. Academic Features

The dataset stores raw attendance evidence as session counts. Attendance percentages can be derived later during feature engineering, for example by dividing attended sessions by total sessions. No derived percentage is stored in this CSV.

---

## 10. Validation Results

| Check | Result |
|---|---|
| Required columns | PASS |
| Duplicate rows | PASS |
| Duplicate IDs | PASS |
| Unique business keys | PASS |
| Attended session counts | PASS |
| Total session counts | PASS |
| Attended does not exceed total | PASS |
| Academic-record references | PASS |
| Component references | PASS |
| Organization consistency | PASS |
| Component consistency | PASS |
| Creation timestamps | PASS |
| Update timestamps | PASS |
| Chronological timestamps | PASS |
| Record count | PASS |

### Overall Validation: **PASS**

---

## 11. Model Training

**No model training was performed.** This task only generates and validates synthetic attendance evidence.

---

## 12. Conclusion

The generator created 1000 synthetic attendance records from {len(academic_records)} academic records. Raw session counts are retained, relationships are checked, and risk labels or derived percentages are not invented.
