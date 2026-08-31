# Table - counseling_sessions

**Schema:** Counseling

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `counseling_sessions` table stores individual counseling sessions conducted as part of an Intervention.

A Counseling Session represents an actual interaction between a Student and an authorized Mentor or Counselor.

The Intervention defines what support is planned.

The Counseling Session records what actually happened.

---

# Aggregate Owner

Counseling Aggregate

---

# Template Type

Historical Entity

---

# Business Rules

- Every Counseling Session belongs to exactly one Organization.
- Every Counseling Session belongs to exactly one Intervention.
- Every Counseling Session belongs to exactly one Student.
- Every Counseling Session has one responsible Mentor or Counselor.
- A Session may be scheduled before it occurs.
- Completed Sessions are preserved as historical records.
- Counseling Sessions must not modify the original AI Prediction.
- Session notes are accessible only to authorized users.

---

# Business Key

```
id
```

---

# Table Name

```
counseling_sessions
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| intervention_id | UUID | ❌ | Related Intervention |
| student_id | UUID | ❌ | Student |
| counselor_id | UUID | ❌ | Mentor/Counselor Conducting Session |
| session_type | ENUM | ❌ | IN_PERSON, ONLINE, PHONE, WHATSAPP |
| scheduled_at | TIMESTAMP | ✅ | Scheduled Session Time |
| started_at | TIMESTAMP | ✅ | Actual Start Time |
| ended_at | TIMESTAMP | ✅ | Actual End Time |
| status | ENUM | ❌ | SCHEDULED, COMPLETED, MISSED, CANCELLED |
| session_notes | TEXT | ✅ | Counselor Notes |
| outcome | TEXT | ✅ | Session Outcome |
| created_at | TIMESTAMP | ❌ | Creation Timestamp |
| updated_at | TIMESTAMP | ❌ | Last Updated Timestamp |
| created_by | UUID | ❌ | User Who Created Session |
| updated_by | UUID | ✅ | User Who Last Updated Session |

---

# Business Constraints

- Every Session belongs to one Intervention.
- The assigned Counselor must belong to the same Organization.
- `ended_at` cannot be earlier than `started_at`.
- A COMPLETED Session must have `started_at` and `ended_at`.
- A MISSED Session cannot have a completed outcome.
- Session Notes are visible only to authorized users.
- Completed Sessions are preserved as historical records.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

intervention_id → interventions.id

student_id → students.id

counselor_id → users.id

created_by → users.id

updated_by → users.id (nullable)

---

## Check Constraints

```
ended_at IS NULL
OR
started_at IS NULL
OR
ended_at >= started_at
```

---

# Indexes

Primary

- id

Search

- organization_id
- intervention_id
- student_id
- counselor_id

Filtering

- session_type
- status
- scheduled_at

---

# Relationships

Belongs To

- Organization

Belongs To

- Intervention

Belongs To

- Student

Belongs To

- Counselor

Has Many

- Follow-ups

---

# Lifecycle

```text
SCHEDULED
    │
    ├──→ COMPLETED
    │
    ├──→ MISSED
    │
    └──→ CANCELLED
```

Completed Sessions become historical records.

---

# Migration Dependencies

## Must Exist Before

- organizations
- students
- users
- interventions

---

## Required Before

- follow_ups

---

# Notes

Example:

```text
Session Type:
IN_PERSON

Status:
COMPLETED

Outcome:
Student identified difficulty with two learning components.
Additional academic support was recommended.
```

Session Notes and Outcomes are human-generated records.

They are not AI-generated predictions.

---

# Privacy

Counseling Sessions may contain sensitive student information.

Access must be restricted according to:

- Organization authorization rules
- Counseling access policies
- Student privacy requirements

AI systems must not automatically expose counseling notes to unauthorized users.

---

# Human-in-the-Loop Flow

```text
Prediction
    ↓
Human Review
    ↓
Intervention
    ↓
Counseling Session
    ↓
Outcome
    ↓
Follow-up
```

---

# Design Principles

Intervention = What we plan to do.

Counseling Session = What actually happened.

Follow-up = What happens next.

---

End of Document