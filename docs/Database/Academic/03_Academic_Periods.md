# Table - academic_periods

**Schema:** Academic

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `academic_periods` table represents the time-based academic divisions within a Learning Level.

Academic Periods organize academic activities such as attendance, assessments, academic records, and reporting.

Examples

Semester

Trimester

Academic Year

Batch

Learning Cycle

---

# Aggregate Owner

Organization Aggregate

---

# Template Type

Master Entity

---

# Business Rules

- Every Academic Period belongs to exactly one Learning Level.
- One Learning Level may contain one or more Academic Periods.
- An Academic Period represents a time-bound delivery cycle for a Learning Level.
- Academic Period names must be unique within a Learning Level.
- Only one Academic Period can be active for the same Learning Level at a given time.
- Completed Academic Periods become read-only for academic data entry unless explicitly reopened.

---

# Business Key

```
organization_id + learning_level_id + period_code
```

---

# Table Name

```
academic_periods
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| learning_level_id | UUID | ❌ | Learning Level |
| period_code | VARCHAR(30) | ❌ | Unique Period Code |
| name | VARCHAR(100) | ❌ | Academic Period Name |
| start_date | DATE | ❌ | Start Date |
| end_date | DATE | ❌ | End Date |
| status | ENUM | ❌ | PLANNED, ACTIVE, COMPLETED, ARCHIVED |
| created_at | TIMESTAMP | ❌ | Created Timestamp |
| updated_at | TIMESTAMP | ❌ | Updated Timestamp |
| created_by | UUID | ✅ | Created By |
| updated_by | UUID | ✅ | Updated By |

---

# Business Constraints

- Period Code must be unique within a Learning Level.
- Start Date must be before End Date.
- A Learning Level cannot have overlapping ACTIVE Academic Periods.
- Archived Academic Periods remain available for historical reporting.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

learning_level_id → learning_levels.id

created_by → users.id (nullable)

updated_by → users.id (nullable)

---

## Unique Constraints

- organization_id + learning_level_id + period_code

---

## Check Constraints

- start_date < end_date

---

# Indexes

Primary

- id

Search

- organization_id
- learning_level_id
- period_code

Filtering

- status
- start_date
- end_date

---

# Relationships

Belongs To

- Organization

Belongs To

- Learning Level

Has Many

- Learning Components

Has Many

- Enrollments

Has Many

- Academic Records

---

# Lifecycle

```
PLANNED

↓

ACTIVE

↓

COMPLETED

↓

ARCHIVED
```

Archived Academic Periods remain available for reporting and historical analysis.

---

# Migration Dependencies

## Must Exist Before

- organizations
- users
- learning_levels

---

## Required Before

- learning_components
- enrollments
- academic_records

---

# Notes

Academic Periods represent the scheduling structure used by an institution.

Examples

Engineering College

```
Semester 1
Semester 2
Semester 3
```

School

```
Academic Year 2026
Academic Year 2027
```

Training Institute

```
Batch 1
Batch 2
```

Attendance, Assessments, and Academic Records are always associated with an Academic Period.

---

End of Document