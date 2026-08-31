# Table - student_snapshots

**Schema:** AI

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `student_snapshots` table stores the AI-ready feature set generated for a Student after processing the latest imported academic and behavioural evidence.

A Student Snapshot is an immutable representation of a Student's academic and behavioural state at a specific point in time.

It acts as the input to the Prediction Engine.

Student Snapshots never modify business data.

---

# Aggregate Owner

AI Aggregate

---

# Template Type

Historical Entity

---

# Business Rules

- Every Student Snapshot belongs to exactly one Organization.
- Every Student Snapshot belongs to exactly one Student.
- Every Student Snapshot belongs to exactly one Enrollment.
- A Student Snapshot is generated when the system produces a new AI feature state from available academic and behavioural evidence.
- A Student Snapshot may be associated with an Import Session when imported academic data contributed to the snapshot.
- A Student Snapshot does not require an Import Session when the snapshot is generated from non-imported evidence.
- Student Snapshots are immutable.
- Predictions are generated from Student Snapshots.

---

# Business Key

```
organization_id + enrollment_id + import_session_id
```

---

# Table Name

```
student_snapshots
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| student_id | UUID | ❌ | Student |
| enrollment_id | UUID | ❌ | Enrollment |
| import_session_id | UUID | ✅ | Import Session that contributed academic evidence |
| attendance_percentage | DECIMAL(5,2) | ❌ | Derived Attendance Percentage |
| overall_marks_percentage | DECIMAL(5,2) | ❌ | Derived Overall Marks Percentage |
| failed_learning_components | INTEGER | ❌ | Derived Failed Learning Components |
| backlog_count | INTEGER | ❌ | Derived Active Backlogs |
| behaviour_score | DECIMAL(5,2) | ✅ | AI Behaviour Score |
| engagement_score | DECIMAL(5,2) | ✅ | AI Engagement Score |
| sentiment_score | DECIMAL(5,2) | ✅ | AI Sentiment Score |
| snapshot_status | ENUM | ❌ | GENERATED, PREDICTED, SUPERSEDED |
| feature_version | VARCHAR(30) | ❌ | Feature Engineering Version |
| snapshot_generated_at | TIMESTAMP | ❌ | Snapshot Generation Timestamp |

---

# Business Constraints

- One Snapshot represents one Enrollment after one Import Session.
- Snapshots are immutable.
- New Snapshots never overwrite previous Snapshots.
- Derived features must always originate from business data.
- AI-generated values never update Academic records.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

student_id → students.id

enrollment_id → enrollments.id

import_session_id → import_sessions.id (nullable)

---

## Unique Constraints

```
organization_id +
enrollment_id +
import_session_id
```

---

## Check Constraints

```
attendance_percentage >= 0

attendance_percentage <= 100

overall_marks_percentage >= 0

overall_marks_percentage <= 100

failed_learning_components >= 0

backlog_count >= 0

behaviour_score >= 0

engagement_score >= 0

sentiment_score >= 0
```

---

# Indexes

Primary

- id

Search

- organization_id
- student_id
- enrollment_id
- import_session_id

Filtering

- snapshot_status
- snapshot_generated_at

---

# Relationships

Belongs To

- Organization

Belongs To

- Student

Belongs To

- Enrollment

Belongs To

- Import Session

Has One

- Behaviour Summary

Has One

- Prediction

---

# Lifecycle

```
GENERATED

↓

PREDICTED

↓

SUPERSEDED
```

Snapshots are immutable.

A new Import Session creates a new Snapshot instead of updating an existing one.

---

# Migration Dependencies

##Must Exist Before

- organizations
- students
- enrollments

##Optional Dependency

- import_sessions

## Required Before

- behaviour_summaries
- predictions

---

# Notes
Student Snapshot

= Machine-readable AI features used by the Prediction Engine.

Behaviour Summary

= Human-readable interpretation of behavioural evidence intended for mentors and counselors.

Behavioural features must not be duplicated in Behaviour Summaries.

A Student Snapshot represents the feature state used by the AI system at a specific point in time.

Academic evidence may originate from an Import Session, while behavioural evidence may originate from ongoing behavioural interactions.

The snapshot records the feature state used for prediction, not merely the result of an import operation.

Examples of derived features include

- Attendance Percentage
- Overall Marks Percentage
- Failed Learning Components
- Backlog Count
- Behaviour Score
- Engagement Score
- Sentiment Score

Student Snapshots are consumed by the Prediction Engine.

They never modify business data.

---

# Design Principles

Business Data

↓

Feature Engineering

↓

Student Snapshot

↓

Prediction

↓

Counseling

---

End of Document