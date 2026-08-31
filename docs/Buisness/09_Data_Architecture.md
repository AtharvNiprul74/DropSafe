# DropSafe - Data Architecture

**Version:** 1.0
**Status:** DRAFT

**Depends On**
- 01_Product_Vision.md
- 02_Business_Workflow.md
- 03_Business_Rules.md
- 04_Domain_Architecture.md
- 05_State_Machines.md
- 06_System_Events.md
- 07_Privacy_And_Access_Control.md
- 08_Authorization_Model.md

---

# Purpose

This document defines how business information is organized inside DropSafe.

It describes:

- Business Data Ownership
- Data Categories
- Aggregate Boundaries
- Relationships
- Historical Strategy
- Identity Strategy
- Versioning Strategy

This document intentionally avoids SQL implementation details.

---

# Data Philosophy

DropSafe treats data as a business asset.

Every business object must have

- Clear owner
- Clear lifecycle
- Clear relationships
- Clear history
- Clear responsibility

Historical information should never be lost.

---

# Data Categories

## 1. Master Data

Definition

Rarely changing reference information.

Examples

- Organization
- Learning Program
- Learning Level
- Academic Period
- Learning Components
- Roles
- Permission Groups
- Permissions

Persistence

CRUD

---

## 2. Transactional Data

Definition

Daily operational records.

Examples

- Attendance
- Assessment Results
- Student Enrollment
- Counseling
- Mentor Assignment
- Import Sessions

Persistence

Update when required

Maintain history where appropriate.

---

## 3. Analytical Data

Definition

AI-generated information.

Examples

- Behaviour Summary
- Student Snapshot
- Prediction
- Prediction History

Persistence

Append Only

Never overwritten.

---

## 4. System Data

Definition

Platform operational records.

Examples

- Audit Logs
- Notification History
- Import Reports
- Job History

Persistence

Append Only

---

# Aggregate Architecture

DropSafe follows a lightweight Domain-Driven Design (DDD Lite) approach.

Each Aggregate owns its business data.

---

## Aggregate 1

Organization

Owns

- Programs
- Learning Levels
- Academic Periods
- Users
- Roles
- Permission Groups
- Permissions

---

## Aggregate 2

Student

Purpose

Represents a person.

Owns

- Student Profile
- Student Identifiers

Student does NOT own academic records.

---
## Aggregate 3

Enrollment

Purpose

Represents a student's academic journey within an organization.

Owns

- Organization
- Learning Program
- Learning Level
- Academic Period
- Enrollment Status
- Admission Date
- Graduation Date

Enrollment does not store academic performance.

Academic performance belongs to the Academic Record aggregate.

---

## Aggregate 4

Academic Record

Purpose

Represents the student's academic performance during an enrollment.

Owns

- Attendance Records
- Assessment Records
- Grade Records
- Performance Metrics
- Backlogs
- Failed Components
- Academic Summary

Academic Records provide the academic evidence used by the Prediction Engine.


## Aggregate 

Behaviour

Owns

- Chatbot Conversations
- Behaviour Summaries
- Behaviour History

---

## Aggregate 5

Prediction

Owns

- Student Snapshots
- Predictions
- Prediction History

---

## Aggregate 6

Counseling

Owns

- Intervention
- Mentor Assignment
- Counseling Sessions
- Follow-up

---

## Aggregate 7

Import

Owns

- Import Sessions
- Import Files
- Import Reports

---

## Aggregate 8

Governance

Owns

- Audit Logs
- Access Logs
- Notifications

---
# Aggregate Relationships

## Academic Domain

```
                    Organization
                          │
                          ▼
                      Student
                          │
                          ▼
                     Enrollment
                          │
                          ▼
                   Academic Record
                    ├──────────────┐
                    │              │
                    ▼              ▼
          Attendance Records   Assessment Records
                    │              │
                    └──────┬───────┘
                           ▼
                  Academic Evidence
```

---

## Behaviour Domain

```
                      Student
                          │
                          ▼
               Chatbot Conversations
                          │
                          ▼
                 Behaviour Summary
                          │
                          ▼
                  Behaviour History
```

---

## AI Domain

```
              Academic Evidence
                      │
                      │
                      ├──────────────┐
                      │              │
                      ▼              ▼
             Behaviour History       │
                      │              │
                      └──────┬───────┘
                             ▼
                     Student Snapshot
                             │
                             ▼
                        Prediction
                             │
                             ▼
                     Intervention
                             │
                             ▼
                        Counseling
                             │
                             ▼
                         Follow-up
```

---

# Aggregate Responsibilities

| Aggregate | Responsibility |
|------------|----------------|
| Student | Person Identity |
| Enrollment | Academic Journey |
| Academic Record | Academic Performance |
| Behaviour | Behaviour Analysis |
| Prediction | AI Prediction |
| Counseling | Human Intervention |
| Import | Academic Data Import |
| Governance | Security, Privacy and Audit |



# Ownership Rules

Each business object belongs to exactly one Aggregate.

Aggregates communicate using Business Events.

Aggregates never directly modify each other's internal data.

---

# Transaction Boundaries

Every Aggregate defines one transaction boundary.

Example

Import Aggregate

```

Import Session

↓

Attendance

Assessment

↓

Commit

```

Either the transaction succeeds or fails together.

---

# Historical Strategy

Some records are immutable.

Immutable

- Behaviour Summary
- Prediction History
- Student Snapshot
- Audit Logs

Mutable

- Student Profile
- Enrollment
- Attendance Records
- Assessment Records
- Organization Settings

Historical corrections create new records instead of modifying history whenever possible.

---

# Identity Strategy

Every business object has a globally unique identifier (UUID).

Students additionally maintain institutional identifiers.

Student Identity

```

UUID

↓

Organization Student ID

↓

Institution Identifier

(PRN / Roll Number / Enrollment Number)

```

Institution identifiers are configurable per organization.

---

# Versioning Strategy

AI-generated data stores versions.

Examples

Prediction

- Model Version
- Feature Version
- Snapshot Version

Behaviour Summary

- AI Version
- Generated Timestamp

This ensures reproducibility.

---

# Data Flow

Academic Import

↓

Academic Evidence

↓

Student Snapshot

↓

Prediction

↓

Intervention

↓

Counseling

Behaviour Flow

↓

Chatbot Conversation

↓

Behaviour Summary

↓

Student Snapshot

↓

Prediction

---

# Data Integrity Principles

1. Every record belongs to exactly one Aggregate.
2. Historical information is preserved.
3. AI never modifies source academic data.
4. Business Events synchronize Aggregates.
5. UUIDs are internal identifiers.
6. Institution identifiers remain configurable.

---

# Scalability Principles

Future integrations

- ERP
- LMS
- Student Information Systems

should extend existing Aggregates rather than redesign them.

---

# Future Extensions

- Multi-campus Organizations
- Multiple Student Identifiers
- Feature Store
- Data Warehouse
- Real-time Analytics

---

# Freeze Status

| Component | Status |
|-----------|--------|
| Master Data | ✅ |
| Transactional Data | ✅ |
| Analytical Data | ✅ |
| System Data | ✅ |
| Aggregate Design | ✅ |
| Relationships | ✅ |
| Identity Strategy | ✅ |
| Versioning | ✅ |

---

End of Document
