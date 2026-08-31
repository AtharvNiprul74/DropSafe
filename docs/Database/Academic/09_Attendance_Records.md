# Table - attendance_records

**Schema:** Academic

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `attendance_records` table stores attendance evidence imported for a Learning Component within an Academic Record.

Attendance Records represent academic evidence received from an Organization's existing academic systems.

DropSafe stores attendance evidence rather than individual classroom attendance events.

Attendance percentages are derived by AI and Reporting modules and are never stored in this table.

---

# Aggregate Owner

Academic Record Aggregate

---

# Template Type

Operational Entity

---

# Business Rules

- Every Attendance Record belongs to exactly one Academic Record.
- Every Attendance Record belongs to exactly one Learning Component.
- Attendance represents imported academic evidence.
- Organizations decide the attendance reporting frequency.
- One Attendance Record exists for each Learning Component within an Academic Record.
- Attendance evidence may be updated through subsequent Import Sessions.

---

# Business Key

```
organization_id + academic_record_id + learning_component_id
```

---

# Table Name

```
attendance_records
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| academic_record_id | UUID | ❌ | Academic Record |
| learning_component_id | UUID | ❌ | Learning Component |
| attended_sessions | INTEGER | ❌ | Number of Sessions Attended |
| total_sessions | INTEGER | ❌ | Total Sessions Conducted |
| import_session_id | UUID | ✅ | Import Session |
| created_at | TIMESTAMP | ❌ | Record Created Timestamp |
| updated_at | TIMESTAMP | ❌ | Last Updated Timestamp |

---

# Business Constraints

- One Attendance Record represents attendance evidence for one Learning Component.
- Attendance evidence belongs to one Academic Record.
- Attended Sessions cannot exceed Total Sessions.
- Attendance evidence is updated only through approved academic imports.
- Attendance percentages are calculated from stored values and are never persisted.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

academic_record_id → academic_records.id

learning_component_id → learning_components.id

import_session_id → import_sessions.id (nullable)

---

## Unique Constraints

```
organization_id +
academic_record_id +
learning_component_id
```

---

## Check Constraints

```
attended_sessions >= 0

total_sessions > 0

attended_sessions <= total_sessions
```

---

# Indexes

Primary

- id

Search

- organization_id
- academic_record_id
- learning_component_id

---

# Relationships

Belongs To

- Organization

Belongs To

- Academic Record

Belongs To

- Learning Component

Belongs To

- Import Session (Optional)

---

# Lifecycle

Attendance Records remain active throughout the Academic Record lifecycle.

When new attendance evidence is imported, the existing Attendance Record is updated.

Import Sessions preserve the history of changes.

---

# Migration Dependencies

## Must Exist Before

- organizations
- academic_records
- learning_components
- import_sessions

---

## Required Before

- Student Snapshot
- Prediction

---

# Notes

Attendance Records store attendance evidence only.

Examples

University

```
Machine Learning

Attended Sessions : 28

Total Sessions : 30
```

School

```
Mathematics

Attended Sessions : 145

Total Sessions : 150
```

Training Institute

```
Python Module

Attended Sessions : 18

Total Sessions : 20
```

This table never stores:

- Attendance Percentage
- Risk Score
- Engagement Score
- Prediction Result

These values are calculated by downstream AI and Reporting modules.

---

End of Document