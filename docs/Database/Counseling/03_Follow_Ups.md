# Table - follow_ups

**Schema:** Counseling

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `follow_ups` table stores actions and outcomes that occur after an Intervention or Counseling Session.

A Follow-up represents the next planned check, action, or review required to determine whether the intervention is progressing effectively.

---

# Aggregate Owner

Counseling Aggregate

---

# Template Type

Operational Entity

---

# Business Rules

- Every Follow-up belongs to exactly one Organization.
- Every Follow-up belongs to exactly one Intervention.
- A Follow-up may optionally reference a Counseling Session.
- Every Follow-up has an assigned responsible user.
- Follow-ups may be created after an Intervention or Counseling Session.
- Multiple Follow-ups may exist for one Intervention.
- Completed Follow-ups are preserved as historical records.
- Follow-up status is controlled by authorized users.

---

# Business Key

```text
id
```

---

# Table Name

```text
follow_ups
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| intervention_id | UUID | ❌ | Related Intervention |
| counseling_session_id | UUID | ✅ | Related Counseling Session |
| assigned_to | UUID | ❌ | Responsible Mentor/Counselor |
| follow_up_type | ENUM | ❌ | REVIEW, CHECK_IN, ACTION, REFERRAL, OTHER |
| due_at | TIMESTAMP | ❌ | Follow-up Due Time |
| status | ENUM | ❌ | PENDING, COMPLETED, MISSED, CANCELLED |
| outcome | TEXT | ✅ | Follow-up Outcome |
| completed_at | TIMESTAMP | ✅ | Completion Timestamp |
| created_at | TIMESTAMP | ❌ | Creation Timestamp |
| updated_at | TIMESTAMP | ❌ | Last Updated Timestamp |
| created_by | UUID | ❌ | User Who Created Follow-up |
| updated_by | UUID | ✅ | User Who Last Updated Follow-up |

---

# Business Constraints

- Every Follow-up belongs to one Intervention.
- The responsible user must belong to the same Organization.
- A Follow-up may exist without a Counseling Session.
- A COMPLETED Follow-up must have `completed_at`.
- A PENDING Follow-up must not have `completed_at`.
- A MISSED Follow-up represents a due action that was not completed.
- A CANCELLED Follow-up cannot be completed afterward.
- Follow-up outcomes are recorded by authorized users.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

intervention_id → interventions.id

counseling_session_id → counseling_sessions.id (nullable)

assigned_to → users.id

created_by → users.id

updated_by → users.id (nullable)

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
- intervention_id
- counseling_session_id
- assigned_to

Filtering

- follow_up_type
- status
- due_at

---

# Relationships

Belongs To

- Organization

Belongs To

- Intervention

Belongs To

- Counseling Session (Optional)

Belongs To

- Assigned User

---

# Lifecycle

```text
PENDING
   │
   ├──→ COMPLETED
   │
   ├──→ MISSED
   │
   └──→ CANCELLED
```

---

# Migration Dependencies

## Must Exist Before

- organizations
- users
- interventions

---

## Optional Dependency

- counseling_sessions

---

# Notes

Examples:

### Academic Follow-up

```text
Type:
REVIEW

Action:
Review student's progress after additional academic support.

Status:
PENDING
```

### Student Check-in

```text
Type:
CHECK_IN

Action:
Contact student one week after counseling session.

Status:
COMPLETED
```

### Referral

```text
Type:
REFERRAL

Action:
Follow up on referral to an appropriate support service.

Status:
PENDING
```

---

# Counseling Lifecycle

```text
Prediction
    ↓
Human Review
    ↓
Intervention
    ↓
Counseling Session
    ↓
Follow-up
    ↓
Outcome
```

A Student may have multiple Interventions over time, and each Intervention may have multiple Counseling Sessions and Follow-ups.

---

# Design Principles

Intervention

= What support is planned.

Counseling Session

= What interaction happened.

Follow-up

= What needs to happen next and what happened afterward.

---

End of Document