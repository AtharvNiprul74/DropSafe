# Table - academic_records

**Schema:** Academic

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `academic_records` table represents the academic performance record for a Student's Enrollment.

It acts as the parent entity for all academic evidence collected during an Enrollment.

Academic Records do not store individual attendance or assessment entries.

Instead, they summarize the academic performance while Attendance and Assessment records provide supporting evidence.

---

# Aggregate Owner

Academic Record Aggregate

---

# Template Type

Operational Entity

---

# Business Rules

- Every Academic Record belongs to exactly one Enrollment.
- Every Enrollment has exactly one Academic Record.
- Academic Record represents the official academic record for an Enrollment.
- It acts as the parent entity for all academic evidence.
- Academic performance metrics are derived from Attendance and Assessment records rather than stored directly.
- Attendance Records belong to an Academic Record.
- Assessment Records belong to an Academic Record.
- Academic Records are updated whenever new academic evidence is imported.
- Historical corrections are recorded through Import History.
- Every Academic Record belongs to exactly one Enrollment and exactly one Learning Component.

---

# Business Key

```
organization_id + enrollment_id
```

---

# Table Name

```
academic_records
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| enrollment_id | UUID | ❌ | Enrollment |
| learning_component_id | UUID |        ❌ | Learning Component for this academic record |
| academic_status | ENUM | ❌ | ACTIVE, COMPLETED, WITHDRAWN, ARCHIVED |
| last_evidence_update_at | TIMESTAMP | ✅ | Last Academic Evidence Update |
| created_at | TIMESTAMP | ❌ | Created Timestamp |
| updated_at | TIMESTAMP | ❌ | Last Updated Timestamp |

---

# Business Constraints

- One Enrollment has exactly one Academic Record.
- Academic Record summarizes academic performance only.
- Attendance and Assessment details are stored separately.
- Academic Summary must always be derived from available evidence.
- Academic Record cannot exist without an Enrollment.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

enrollment_id → enrollments.id

---

## Unique Constraints

- organization_id + enrollment_id

---

# Check Constraints

Attendance Percentage

```
0 <= overall_attendance_percentage <= 100
```

Marks Percentage

```
0 <= overall_marks_percentage <= 100
```

Component Counts

```
completed_learning_components <= total_learning_components

failed_learning_components <= total_learning_components
```

---

# Indexes

Primary

- id

Search

- organization_id
- enrollment_id

Filtering

- academic_status

---

# Relationships

Belongs To

- Organization

Belongs To

- Enrollment

Has Many

- Attendance Records

Has Many

- Assessment Records

Used By

- Student Snapshot
- Prediction Engine
- Reports

---

# Lifecycle

```
ACTIVE

↓

COMPLETED

↓

ARCHIVED
```

---

# Migration Dependencies

## Must Exist Before

- organizations
- enrollments
- learning_components

---

## Required Before

- attendance_records
- assessment_records
- student_snapshot

---

# Notes

Academic Record is the central academic entity within DropSafe.

It summarizes a student's academic progress for a specific Enrollment.

Individual Attendance and Assessment entries are stored separately.

AI modules consume Academic Records together with detailed academic evidence to generate predictions.

Academic Records should never store AI-generated values such as:

- Risk Score
- Stress Score
- Engagement Score
- Prediction Result
- Academic lifecycle status is independent of AI risk prediction.

Those belong to the AI Schema.

---

End of Document