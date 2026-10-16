# Assessment Records Dataset Validation

## 1. Dataset Identification

- **Dataset:** `assessment_records.csv`
- **Dataset type:** Synthetic development dataset
- **Generated records:** 1000
- **Random seed:** 49
- **Source datasets:** `academic_records.csv`, `learning_components.csv`

> Synthetic data only. This is not production assessment data.

---

## 2. Dataset Structure

| Column | Data Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Unique assessment-record identifier |
| `organization_id` | UUID | Yes | Organization identifier |
| `academic_record_id` | UUID | Yes | Related academic record |
| `learning_component_id` | UUID | Yes | Related learning component |
| `obtained_marks` | Decimal | Yes | Marks obtained |
| `maximum_marks` | Decimal | Yes | Maximum marks for this assessment |
| `grading_outcome` | Nullable | No | Optional grading outcome |
| `import_session_id` | UUID | No | Optional import-session reference |
| `created_at` | Timestamp | Yes | Record creation timestamp |
| `updated_at` | Timestamp | Yes | Last record update timestamp |

---

## 3. Source Dataset Counts

- Academic records: **1000**
- Learning components: **2000**
- Assessment records generated: **1000**

One assessment record is generated per academic record. The organization and component must match the academic record.

---

## 4. Missing Value Analysis

Total missing cells: **2000**

- Records using a fallback maximum mark because the component maximum was null: **0**

When a component's `maximum_marks` is null, the generator uses 100.00 for that synthetic assessment only. The source component CSV is not changed. This is an explicit synthetic assumption, not a value inferred from the source schema.

`grading_outcome` and `import_session_id` are intentionally null. The schema permits these fields to be nullable, and no grading-outcome mapping or import-session source dataset is assumed by this generator.

---

## 5. Duplicate Analysis

- Duplicate complete rows: **0**
- Duplicate IDs: **0**
- Duplicate academic-record references: **0**
- Duplicate business keys: **0**

---

## 6. Data Type Analysis

Pandas-detected data types:

```text
id                       object
organization_id          object
academic_record_id       object
learning_component_id    object
obtained_marks           object
maximum_marks            object
grading_outcome          object
import_session_id        object
created_at               object
updated_at               object
```

Marks are additionally converted to numeric values for validation.

---

## 7. Invalid Value and Relationship Analysis

- Empty required values: **0**
- Invalid obtained marks: **0**
- Invalid maximum marks: **0**
- Obtained marks exceeding maximum: **0**
- Invalid academic-record references: **0**
- Invalid component references: **0**
- Organization mismatches: **0**
- Component mismatches: **0**
- Invalid creation timestamps: **0**
- Invalid update timestamps: **0**
- Updates before creation: **0**

Validation rules:
- `obtained_marks` must be greater than or equal to zero.
- `maximum_marks` must be greater than zero.
- `obtained_marks` must not exceed `maximum_marks`.
- Organization and component references must be consistent.

---

## 8. Target / Risk Label

No target or risk label is present in this dataset. No dropout-risk classification, prediction, or model output was created.

---

## 9. Academic Features

This dataset stores raw assessment evidence. A marks percentage can be derived later during feature engineering using obtained marks divided by maximum marks. No percentage or risk score is stored in this CSV.

---

## 10. Validation Results

| Check | Result |
|---|---|
| Required columns | PASS |
| Duplicate rows | PASS |
| Duplicate IDs | PASS |
| One record per academic record | PASS |
| Unique business keys | PASS |
| Obtained marks | PASS |
| Maximum marks | PASS |
| Obtained marks do not exceed maximum | PASS |
| Academic-record references | PASS |
| Component references | PASS |
| Organization consistency | PASS |
| Component consistency | PASS |
| Creation timestamps | PASS |
| Update timestamps | PASS |
| Chronological timestamps | PASS |

### Overall Validation: **PASS**

---

## 11. Model Training

**No model training was performed.** This task only generates and validates synthetic assessment evidence.

---

## 12. Conclusion

The generator created 1000 synthetic assessment records from {len(academic_records)} academic records. Mark ranges and relationships were validated, and no derived percentages or risk labels were invented.
