# Table - import_sessions

**Schema:** Import

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `import_sessions` table represents one complete attempt to import organizational data into DropSafe.

An Import Session tracks the lifecycle of an import from initial creation through validation, processing, completion, failure, or cancellation.

An Import Session provides traceability for academic data entering DropSafe.

---

# Aggregate Owner

Import Aggregate

---

# Template Type

Operational Entity

---

# Business Rules

- Every Import Session belongs to exactly one Organization.
- Every Import Session is initiated by one authorized User.
- An Import Session may contain one or more Import Files.
- An Import Session has one defined data type.
- An Import Session follows the Import State Machine.
- A completed Import Session may create or update academic evidence.
- Failed Import Sessions must not partially update academic data.
- Import history is preserved.

---

# Business Key

```text
id
```

---

# Table Name

```text
import_sessions
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| initiated_by | UUID | ❌ | User Who Started Import |
| import_type | ENUM | ❌ | STUDENT, ENROLLMENT, ATTENDANCE, ASSESSMENT |
| source_type | ENUM | ❌ | CSV, API |
| status | ENUM | ❌ | CREATED, VALIDATING, VALIDATED, PROCESSING, COMPLETED, FAILED, CANCELLED |
| started_at | TIMESTAMP | ❌ | Import Start Timestamp |
| completed_at | TIMESTAMP | ✅ | Import Completion Timestamp |
| error_message | TEXT | ✅ | Failure Reason |
| created_at | TIMESTAMP | ❌ | Creation Timestamp |
| updated_at | TIMESTAMP | ❌ | Last Updated Timestamp |

---

# Business Constraints

- Every Import Session belongs to one Organization.
- Only authorized users may initiate an Import Session.
- `completed_at` is populated only when the Import Session reaches COMPLETED.
- A FAILED Import Session must not partially commit academic data.
- A CANCELLED Import Session must not modify academic data.
- Import Sessions are retained for traceability.
- A successful Import Session may generate new AI Student Snapshots.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

initiated_by → users.id

---

## Check Constraints

```text
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
- initiated_by

Filtering

- import_type
- source_type
- status
- started_at

---

# Relationships

Belongs To

- Organization

Belongs To

- Initiating User

Has Many

- Import Files

Has One

- Import Report

Referenced By

- Attendance Records

- Assessment Records

- Student Snapshots

---

# Lifecycle

```text
CREATED
    ↓
VALIDATING
    ↓
VALIDATED
    ↓
PROCESSING
    ↓
COMPLETED
```

Failure path:

```text
VALIDATING
    ↓
FAILED
```

or:

```text
PROCESSING
    ↓
FAILED
```

Cancellation:

```text
CREATED / VALIDATING
    ↓
CANCELLED
```

---

# Migration Dependencies

## Must Exist Before

- organizations
- users

---

## Required Before

- import_files
- import_reports
- attendance_records
- assessment_records
- student_snapshots

---

# Notes

An Import Session represents the entire import operation, not an individual file.

Example:

```text
Organization:
ABC Institute

Import Type:
ATTENDANCE

Source:
CSV

Status:
COMPLETED
```

The Import Session provides the traceability link between the source data and the resulting academic records.

---

# Transaction Principle

Academic data must be committed only after validation succeeds.

```text
Upload
   ↓
Validate
   ↓
Preview
   ↓
Process
   ↓
Commit
```

If processing fails:

```text
No Partial Academic Commit
```

---

# Design Principles

Import Session

↓

Validation

↓

Processing

↓

Academic Evidence

↓

Student Snapshot

↓

Prediction

---

End of Document