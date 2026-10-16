# Student Identifiers Dataset Validation

## 1. Dataset Identification

**Dataset:** `student_identifiers.csv`  
**Type:** Synthetic development data  
**Rows:** 1000  
**Parent dataset:** `students.csv` (1000 rows)  
**Random seed:** 47

> All records are synthetic and must not be treated as production data.

## 2. Dataset Structure

| Column | Meaning |
|---|---|
| `id` | Identifier record UUID |
| `organization_id` | Owning organization |
| `student_id` | Referenced student |
| `identifier_type` | PRN, roll number, or admission number |
| `identifier_value` | Institution-specific identifier |
| `is_primary` | Whether this is the student's primary identifier |
| `status` | ACTIVE or ARCHIVED |
| `created_at` | Creation timestamp |
| `updated_at` | Last update timestamp |
| `created_by` | Creating user, nullable |
| `updated_by` | Updating user, nullable |

## 3. Missing Values and Data Types

- Total missing cells: 2000
- `created_by` and `updated_by` are nullable by schema.

Detected data types:

```text
id                  object
organization_id     object
student_id          object
identifier_type     object
identifier_value    object
is_primary            bool
status              object
created_at          object
updated_at          object
created_by          object
updated_by          object
```

## 4. Duplicate Analysis

- Duplicate complete rows: 0
- Duplicate IDs: 0
- Duplicate organization/type/value keys: 0
- Duplicate student/type pairs: 0

## 5. Relationship and Value Validation

- Invalid student references: 0
- Organization mismatches: 0
- Invalid identifier types: 0
- Invalid statuses: 0
- Invalid primary flags: 0
- Empty identifier values: 0
- Students with multiple primary identifiers: 0

Allowed identifier types: `PRN`, `ROLL_NUMBER`, `ADMISSION_NUMBER`.  
Allowed statuses: `ACTIVE`, `ARCHIVED`.

## 6. Target / Risk Label

No target or risk label is defined in this dataset. Student identifiers are identity attributes, not academic risk features.

## 7. Validation Summary

**Overall validation: PASS**

## 8. Model Training

**No model training was performed.** This task only generates and validates synthetic data.
