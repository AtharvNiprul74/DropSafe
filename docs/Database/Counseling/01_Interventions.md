# Table - interventions

**Schema:** Counseling

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `interventions` table stores human-led intervention actions created to support a Student.

An Intervention represents the decision and planned action taken by a Mentor, Counselor, or authorized organization user.

An Intervention may be created in response to an AI Prediction, but an AI Prediction does not automatically create an Intervention.

---

# Aggregate Owner

Counseling Aggregate

---

# Template Type

Operational Entity

---

# Business Rules

- Every Intervention belongs to exactly one Organization.
- Every Intervention belongs to exactly one Student.
- An Intervention may optionally reference the Prediction that triggered the intervention.
- An Intervention must have an assigned responsible user.
- Intervention decisions are made by authorized human users.
- Multiple Interventions may exist for the same Student.
- An Intervention may contain multiple Counseling Sessions.
- Historical Interventions are preserved.

---

# Business Key

```
id
```

---

# Table Name

```
interventions
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| student_id | UUID | ❌ | Student |
| prediction_id | UUID | ✅ | Related AI Prediction |
| assigned_to | UUID | ❌ | Responsible Mentor/Counselor |
| intervention_type | ENUM | ❌ | ACADEMIC, ATTENDANCE, BEHAVIOURAL, COUNSELING, OTHER |
| priority | ENUM | ❌ | LOW, MEDIUM, HIGH, URGENT |
| objective | TEXT | ❌ | Intervention Objective |
| status | ENUM | ❌ | PLANNED, IN_PROGRESS, COMPLETED, CANCELLED |
| due_at | TIMESTAMP | ✅ | Expected Completion Time |
| completed_at | TIMESTAMP | ✅ | Actual Completion Time |
| created_at | TIMESTAMP | ❌ | Creation Timestamp |
| updated_at | TIMESTAMP | ❌ | Last Updated Timestamp |
| created_by | UUID | ❌ | User Who Created Intervention |
| updated_by | UUID | ✅ | User Who Last Updated Intervention |

---

# Business Constraints

- An Intervention must have a responsible user.
- The responsible user must belong to the same Organization.
- An Intervention may exist without an AI Prediction.
- AI predictions are recommendations and do not automatically create interventions.
- Completed Interventions must have a `completed_at` timestamp.
- Cancelled Interventions cannot be resumed.
- Intervention history must be preserved.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

student_id → students.id

prediction_id → predictions.id (nullable)

assigned_to → users.id

created_by → users.id

updated_by → users.id (nullable)

---

## Check Constraints

```
completed_at IS NULL
OR
status = COMPLETED
```

---

# Indexes

Primary

- id

Search

- organization_id
- student_id
- prediction_id
- assigned_to

Filtering

- intervention_type
- priority
- status
- due_at

---

# Relationships

Belongs To

- Organization

Belongs To

- Student

Belongs To

- Prediction (Optional)

Belongs To

- Assigned User

Has Many

- Counseling Sessions

---

# Lifecycle

```text
PLANNED

↓

IN_PROGRESS

↓

COMPLETED
```

Alternative:

```text
PLANNED

↓

CANCELLED
```

---

# Migration Dependencies

## Must Exist Before

- organizations
- students
- users

---

## Optional Dependency

- predictions

---

## Required Before

- counseling_sessions
- follow_ups

---

# Notes

Examples

Academic Intervention

```text
Type:
ACADEMIC

Priority:
HIGH

Objective:
Provide additional support for identified learning difficulties.
```

Attendance Intervention

```text
Type:
ATTENDANCE

Priority:
MEDIUM

Objective:
Discuss attendance concerns and identify barriers to regular participation.
```

Counseling Intervention

```text
Type:
COUNSELING

Priority:
HIGH

Objective:
Arrange a counseling session to understand the student's concerns.
```

An Intervention represents the organization's action.

It does not contain the complete counseling conversation.

Counseling Sessions store the actual interaction.

---

# Human-in-the-Loop Principle

```text
AI Prediction
      ↓
Human Review
      ↓
Intervention
      ↓
Counseling
```

An AI Prediction may recommend attention, but an authorized human decides whether an Intervention is appropriate.

---

# Design Principles

AI provides decision support.

Human users make intervention decisions.

Interventions are preserved as historical business records.

---

End of Document