# Table - enrollments

**Schema:** Academic

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `enrollments` table represents a Student's participation in an Academic Period.

An Enrollment connects a Student to the academic structure for a specific period.

It does not store academic performance.

Academic performance is stored in Academic Records.

---

# Aggregate Owner

Student Aggregate

---

# Template Type

Operational Entity

---

# Business Rules

- Every Enrollment belongs to exactly one Student.
- Every Enrollment belongs to exactly one Academic Period.
- A Student may have multiple Enrollments throughout their academic journey.
- A Student cannot have duplicate Enrollments for the same Academic Period.
- Historical Enrollments are preserved.
- Enrollments are archived instead of deleted.

---

# Business Key

```
organization_id + student_id + academic_period_id
```

---

# Table Name

```
enrollments
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| student_id | UUID | ❌ | Student |
| academic_period_id | UUID | ❌ | Academic Period |
| enrollment_date | DATE | ❌ | Enrollment Date |
| completion_date | DATE | ✅ | Completion Date |
| status | ENUM | ❌ | ACTIVE, COMPLETED, WITHDRAWN, TRANSFERRED, ARCHIVED |
| created_at | TIMESTAMP | ❌ | Created Timestamp |
| updated_at | TIMESTAMP | ❌ | Updated Timestamp |
| created_by | UUID | ✅ | Created By |
| updated_by | UUID | ✅ | Updated By |

---

# Business Constraints

- A Student can have only one Enrollment for the same Academic Period.
- Academic Period determines the Learning Program and Learning Level.
- Enrollment does not store academic performance.
- Historical Enrollments remain available after completion.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

student_id → students.id

academic_period_id → academic_periods.id

created_by → users.id (nullable)

updated_by → users.id (nullable)

---

## Unique Constraints

- organization_id + student_id + academic_period_id

---

# Check Constraints

- completion_date >= enrollment_date (when completion_date is provided)

---

# Indexes

Primary

- id

Search

- organization_id
- student_id
- academic_period_id

Filtering

- status

---

# Relationships

Belongs To

- Organization

Belongs To

- Student

Belongs To

- Academic Period

Has One

- Academic Record

---

# Lifecycle

```
ACTIVE

↓

COMPLETED

↓

ARCHIVED
```

or

```
ACTIVE

↓

WITHDRAWN

↓

ARCHIVED
```

or

```
ACTIVE

↓

TRANSFERRED

↓

ARCHIVED
```

---

# Migration Dependencies

## Must Exist Before

- organizations
- users
- students
- academic_periods

---

## Required Before

- academic_records

---

# Notes

Enrollment represents a student's participation in an Academic Period.

Academic Period already defines:

- Learning Program
- Learning Level

Therefore, Enrollment does not store:

- learning_program_id
- learning_level_id

This avoids redundant data and ensures consistency across the Academic Schema.

---

End of Document