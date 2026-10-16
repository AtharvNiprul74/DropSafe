# Students Dataset Validation

## 1. Dataset Identification

**Dataset:** `students.csv`

**Dataset type:** Synthetic development dataset

**Generated records:** 1000

**Random seed:** 46

**Organization IDs sourced from:** `learning_programs.csv` (1 unique organizations)

> Synthetic data only. Do not treat this dataset as real student or production data.

---

## 2. Dataset Structure

| Column | Data Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Student identifier |
| `organization_id` | UUID | Yes | Organization identifier |
| `first_name` | String | Yes | Student first name |
| `middle_name` | String | No | Student middle name |
| `last_name` | String | Yes | Student last name |
| `date_of_birth` | Date | No | Student date of birth |
| `gender` | String | No | Student gender |
| `email` | String | No | Student email address |
| `phone` | String | No | Student phone number |
| `status` | String | Yes | Student lifecycle status |
| `created_at` | Timestamp | Yes | Creation timestamp |
| `updated_at` | Timestamp | Yes | Last update timestamp |
| `created_by` | UUID | No | Creating user |
| `updated_by` | UUID | No | Updating user |

---

## 3. Required Columns
- `id`
- `organization_id`
- `first_name`
- `middle_name`
- `last_name`
- `date_of_birth`
- `gender`
- `email`
- `phone`
- `status`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`

### Missing Required Columns

None

---

## 4. Missing Value Analysis

Total missing cells: **2000**

`created_by` and `updated_by` are intentionally null. Other nullable identity fields are supported by the schema, although this generator currently supplies values for them.

---

## 5. Duplicate Record Analysis

- Duplicate complete rows: **0**
- Duplicate IDs: **0**
- Duplicate email addresses: **0**

---

## 6. Data Type Analysis

Pandas-detected data types:

```text
id                 object
organization_id    object
first_name         object
middle_name        object
last_name          object
date_of_birth      object
gender             object
email              object
phone              object
status             object
created_at         object
updated_at         object
created_by         object
updated_by         object
```

Date of birth values are additionally parsed with datetime validation.

---

## 7. Invalid Value Analysis

- Invalid gender values: **0**
- Invalid status values: **0**
- Invalid dates of birth: **0**
- Future dates of birth: **0**
- Invalid email formats: **0**
- Invalid phone formats: **1000**
- Invalid organization references: **0**

Allowed gender values: `MALE`, `FEMALE`, `OTHER`.

Allowed lifecycle statuses: `ACTIVE`, `GRADUATED`, `TRANSFERRED`, `ARCHIVED`.

---

## 8. Target / Risk Label

No target or risk label is present in the `students` dataset. No risk label, dropout prediction, attendance, assessment, or academic-performance columns were created.

---

## 9. Academic Features

This is a student identity/master dataset, not an academic performance dataset. It contains identity, organization, demographic, contact, and lifecycle information. Academic features must come from enrollment, academic record, attendance, and assessment datasets.

---

## 10. Validation Result

| Check | Result |
|---|---|
| Required columns | PASS |
| Duplicate rows | PASS |
| Duplicate IDs | PASS |
| Unique emails | PASS |
| First names | PASS |
| Last names | PASS |
| Gender values | PASS |
| Status values | PASS |
| Date of birth | PASS |
| No future dates of birth | PASS |
| Email format | PASS |
| Phone format | FAIL |
| Organization references | PASS |

### Overall Result

**FAIL**

---

## 11. Model Training

**No model training was performed.** This task only generates and validates synthetic development data.

---

## 12. Conclusion

The dataset contains 1000 synthetic student records. Organization IDs are selected from `learning_programs.csv` to support consistent organization-level relationships with downstream academic datasets. No academic performance or risk labels were invented.
