# Learning Components Dataset Validation
## 1. Dataset Identification
**Dataset:** `learning_components.csv`
**Dataset type:** Synthetic development dataset
**Parent dataset:** `academic_periods.csv`
**Generated records:** 2000
**Available parent academic periods:** 2000
**Components per academic period:** 1
**Random seed:** 45
> This dataset contains synthetic data only. It must not be treated as real academic or production data.

---
## 2. Dataset Structure
| Column | Data Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Learning component identifier |
| `organization_id` | UUID | Yes | Organization identifier |
| `academic_period_id` | UUID | Yes | Parent academic period |
| `component_code` | String | Yes | Learning component code |
| `name` | String | Yes | Learning component name |
| `description` | String | No | Learning component description |
| `component_type` | String | Yes | Component classification |
| `maximum_marks` | Integer | Yes | Maximum marks |
| `passing_marks` | Integer | Yes | Minimum passing marks |
| `status` | String | Yes | Lifecycle status |
| `created_at` | Timestamp | Yes | Creation timestamp |
| `updated_at` | Timestamp | Yes | Last update timestamp |
| `created_by` | UUID | No | Creating user |
| `updated_by` | UUID | No | Updating user |

---
## 3. Required Columns
- `id`
- `organization_id`
- `academic_period_id`
- `component_code`
- `name`
- `description`
- `component_type`
- `maximum_marks`
- `passing_marks`
- `status`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`

### Missing Required Columns
None

---
## 4. Missing Value Analysis
Total missing cells: **4000**
`description`, `created_by`, and `updated_by` are treated as nullable fields in this synthetic dataset.

---
## 5. Duplicate Record Analysis
### Duplicate complete rows

**0**
### Duplicate IDs

**0**
### Duplicate component codes within academic period

**0**
### Duplicate component names within academic period

**0**

---
## 6. Data Type Analysis
Pandas detected the following data types:

```text
id                    object
organization_id       object
academic_period_id    object
component_code        object
name                  object
description           object
component_type        object
maximum_marks          int64
passing_marks          int64
status                object
created_at            object
updated_at            object
created_by            object
updated_by            object
```

---
## 7. Invalid Value Analysis
### Invalid component types

**0**
Allowed component types:

- `SUBJECT`
- `COURSE`
- `MODULE`
- `UNIT`
- `COMPETENCY`
- `OTHER`

### Invalid status values

**0**
Allowed statuses:

- `ACTIVE`
- `INACTIVE`

### Invalid maximum marks

**0**

Maximum marks must be a positive numeric value.

### Invalid passing marks

**0**

Passing marks must be zero or greater.

### Passing marks exceeding maximum marks

**0**

The database rule requires `passing_marks <= maximum_marks`.

### Invalid academic period references

**0**
Every `academic_period_id` must reference an existing record in `academic_periods.csv`.

### Academic periods without components

**0**

Every academic period must have at least one learning component so that enrollments in that period can reference academic evidence.

### Organization mismatches

**0**
The component organization must match the organization of its parent academic period.

---
## 8. Target / Risk Label
No target or risk label is present in the `learning_components` dataset.
No `risk_label`, `dropout_risk`, or prediction column was created.
Component metadata and marks configuration must not be interpreted as a student risk label.

---
## 9. Academic Features
The dataset provides structural academic component information.
Potential academic attributes include:

- Academic period association
- Component code
- Component name
- Component type
- Maximum marks
- Passing marks
- Status
- Organization association

These fields describe academic structure and assessment configuration. They are not direct student performance measurements.

---
## 10. Validation Result
| Check | Result |
|---|---|
| Required columns | PASS |
| Duplicate rows | PASS |
| Duplicate IDs | PASS |
| Unique component codes | PASS |
| Unique component names | PASS |
| Component type validation | PASS |
| Status validation | PASS |
| Maximum marks validation | PASS |
| Passing marks validation | PASS |
| Passing <= maximum | PASS |
| Parent period references | PASS |
| Period coverage | PASS |
| Organization consistency | PASS |

### Overall Result

**PASS**

---
## 11. Model Training
**No model training was performed.**
This task only generates and validates synthetic development data.

---
## 12. Conclusion
The `learning_components` synthetic dataset contains 2000 records.
Every generated component references an existing academic period from `academic_periods.csv`.
Every academic period receives at least one component so enrollments can reference evidence in the same organization and academic period.
The generated marks satisfy the required `passing_marks <= maximum_marks` constraint.
The dataset is intended only for development, validation, and pipeline testing.
