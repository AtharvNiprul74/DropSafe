# Learning Programs Dataset Validation
## 1. Dataset Identification
**Dataset:** `learning_programs.csv`
**Dataset type:** Synthetic development dataset
**Purpose:** Provide development-time learning program records for testing the DropSafe academic data pipeline.
**Generated records:** 500
**Random seed:** 42
> This dataset contains synthetic data only. It must not be treated as real student or production data.
---
## 2. Dataset Structure
| Column | Data Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Learning program identifier |
| `organization_id` | UUID | Yes | Organization identifier |
| `program_code` | String | Yes | Program business code |
| `name` | String | Yes | Learning program name |
| `description` | String | No | Program description |
| `duration` | Integer | Yes | Program duration |
| `status` | String | Yes | Program lifecycle status |
| `created_at` | Timestamp | Yes | Creation timestamp |
| `updated_at` | Timestamp | Yes | Last update timestamp |
| `created_by` | UUID | No | Creating user identifier |
| `updated_by` | UUID | No | Updating user identifier |

---
## 3. Required Columns
- `id`
- `organization_id`
- `program_code`
- `name`
- `description`
- `duration`
- `status`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`

### Missing Required Columns
None

---
## 4. Missing Value Analysis
Total missing cells: **1000**
Nullable fields such as `description`, `created_by`, and `updated_by` may contain null values according to the source schema.

---
## 5. Duplicate Record Analysis
### Duplicate complete rows

**0**
### Duplicate IDs

**0**
### Duplicate program codes

**0**
Program codes are expected to be unique within an organization.

---
## 6. Data Type Analysis
The generated dataset was inspected using pandas.
```text
id                 object
organization_id    object
program_code       object
name               object
description        object
duration            int64
status             object
created_at         object
updated_at         object
created_by         object
updated_by         object
```
The generated columns correspond to the expected logical schema types.

---
## 7. Invalid Value Analysis
### Invalid duration

**0**
All generated duration values must be greater than zero.
### Invalid status
**0**
Allowed statuses:
- `ACTIVE`
- `INACTIVE`
- `ARCHIVED`

### Empty program codes

**0**

### Empty program names

**0**

---
## 8. Target / Risk Label
No target or risk label is present in the `learning_programs` dataset.
There is no `risk_label`, `dropout_risk`, or prediction column.
No artificial risk label was created for this dataset.

---
## 9. Academic Features
The dataset provides academic structure rather than student performance evidence.
Potential structural features include:
- Learning program identity
- Program code
- Program name
- Program duration
- Program lifecycle status
- Organization association

These are structural academic attributes and should not be treated as direct student-risk indicators.

---
## 10. Validation Result
| Check | Result |
|---|---|
| Required columns | PASS |
| Missing values | REVIEW |
| Duplicate rows | PASS |
| Duplicate IDs | PASS |
| Duplicate program codes | PASS |
| Duration validation | PASS |
| Status validation | PASS |
| Empty program code | PASS |
| Empty program name | PASS |

### Overall Result

**PASS**

---
## 11. Model Training
**No model training was performed.**
This task only generates and validates synthetic development data.

---
## 12. Conclusion
The `learning_programs` synthetic dataset contains 500 records and follows the available learning program schema structure.
The dataset is intended only for development, validation, and pipeline testing.
