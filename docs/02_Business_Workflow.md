# DropSafe - Business Workflow

**Version:** 1.1
**Status:** DRAFT
**Depends On:** 01_Product_Vision.md

---

# Purpose

This document defines the complete business workflow of DropSafe.

It focuses on business behavior rather than technical implementation.

The workflow describes:

- Happy paths
- Alternate paths
- Failure scenarios
- Business rules
- System responsibilities

---

# Workflow Index

| ID | Workflow |
|----|----------|
| WF-01 | Organization Onboarding |
| WF-02 | Academic Structure Setup |
| WF-03 | Student Import |
| WF-04 | Mentor Import |
| WF-05 | Academic Data Import |
| WF-06 | Chatbot Communication |
| WF-07 | Behaviour Analysis |
| WF-08 | Prediction Engine |
| WF-09 | Privacy & Escalation |
| WF-10 | Counseling |
| WF-11 | Academic Period Transition |

---

# WF-01 Organization Onboarding

## Actor

Organization Admin

## Goal

Prepare the organization for DropSafe.

---

### Workflow

```
Register

↓

Verify Email

↓

Create Organization

↓

Basic Configuration

↓

Ready
```

---

## Business Rules

- Organization name must be unique.
- One organization has one isolated workspace.
- Every organization has at least one Organization Admin.

---

# WF-02 Academic Structure Setup

## Actor

Organization Admin

---

### Workflow

```
Create Learning Program

↓

Create Learning Levels

↓

Create Academic Periods

↓

Create Assessable Learning Components
```

---

## Business Rules

Academic Structure must exist before importing students.

Curriculum updates create new versions.

Old curriculum remains available.

---

# WF-03 Student Import

## Actor

Organization Admin

---

### Supported Formats

- CSV
- Excel
- ZIP

---

### Workflow

```
Upload

↓

Detect File Type

↓

Column Mapping

↓

Validation

↓

Preview

↓

Import

↓

Import Report

↓

Import History
```

---

## Validation

- Student Identifier required
- Duplicate Identifier
- Invalid Learning Program
- Invalid Learning Level
- Missing Academic Period

---

## Import Strategy

UPSERT

Existing Student

↓

Update

New Student

↓

Create

---

# WF-04 Mentor Import

## Actor

Organization Admin

---

### Workflow

```
Upload

↓

Validate

↓

Import

↓

Assign Learning Level
```

---
# WF-05 Academic Data Import

## Actor

Teacher / Organization Admin

---

## Goal

Import academic evidence into DropSafe while ensuring data integrity, auditability, and compatibility across different institutions.

---

## Supported Formats

- CSV
- Excel (.xlsx)
- ZIP (Multiple Files)

---

## Supported Data

- Attendance
- Assessment Results

> Future Versions
>
> - ERP Integration
> - LMS Integration
> - REST API Integration

---

## Workflow

```text
Create Import Session

↓

Upload Files

↓

Detect File Type

↓

Extract Files (if ZIP)

↓

Identify Dataset Type

↓

Column Mapping

↓

Dependency Validation

↓

Data Validation

↓

Preview Changes

↓

Conflict Detection

↓

Import (UPSERT)

↓

Generate Import Report

↓

Store Import History

↓

Trigger Prediction Queue (if applicable)
```

---

## Dependency Validation

The system validates whether prerequisite data already exists.

Examples

Attendance

↓

Students Imported?

↓

YES → Continue

NO → Reject Import

---

Assessment Results

↓

Learning Component Exists?

↓

YES → Continue

NO → Reject Import

---

## Validation Rules

- Required columns
- Student Identifier exists
- Duplicate rows
- Invalid academic period
- Invalid learning component
- Invalid marks
- Invalid attendance values
- Future dates
- Empty mandatory fields

---

## Conflict Resolution

Existing Student

↓

Update

---

New Student

↓

Insert

---

Duplicate Import

↓

Warn User

---

## Business Rules

DropSafe never decides upload frequency.

Each institution defines its own Academic Update Cycle.

Examples

- Weekly
- Monthly
- After Assessment
- End of Academic Period
- Manual

DropSafe adapts to the institution.

---

Imports use UPSERT.

- Existing records are updated.
- New records are inserted.
- Historical records are never deleted.

---

Every import belongs to one Import Session.

Every Import Session generates an Import Report.

---

## Failure Scenarios

### Invalid File Format

↓

Reject

---

### Missing Required Columns

↓

Reject

---

### Student Not Found

↓

Reject affected rows

↓

Continue valid rows

---

### Duplicate Upload

↓

Warn

↓

Allow administrator to continue

---

### Partial Upload

↓

Import valid rows

↓

Generate Error Report

↓

Log failed rows

---

### Dependency Missing

↓

Reject Import

↓

Display Missing Dependency

Example

Attendance cannot be imported before Students.

---

## Output

Successful Import

↓

Academic Database Updated

↓

Import History Updated

↓

Prediction Queue Updated (if academic evidence changed)


# WF-06 Chatbot Communication

## Actor

Student

---

### Workflow

```
Student Starts Conversation

OR

Chatbot Starts Conversation

↓

Conversation

↓

Store Conversation

↓

Behaviour Queue
```

---

## Rules

The chatbot:

- Never spams.
- Never repeatedly asks the same questions.
- Never exposes predictions.
- Never exposes mentor actions.
- Supports students naturally.

---

## Failure Cases

Student blocks chatbot

↓

Stop proactive conversations

---

Student ignores chatbot

↓

No reminders

↓

Wait

---

# WF-07 Behaviour Analysis

## Actor

AI

---

### Workflow

```
Conversation

↓

Enough Evidence?

↓

YES

↓

Generate Behaviour Summary

↓

Store Behaviour History

↓

Prediction Queue

↓

NO

↓

Wait
```

---

## Behaviour Analysis does NOT require

Academic updates.

It is completely independent.

---

# WF-08 Prediction Engine

## Actor

AI

---

## Trigger

Prediction is EVENT DRIVEN.

Not calendar driven.

Examples

- Attendance Imported
- Assessment Imported
- Behaviour Updated
- Counseling Completed
- Academic Period Completed

---

### Workflow

```
Prediction Requested

↓

Collect Latest Evidence

↓

Build Student Snapshot

↓

Feature Engineering

↓

ML Model

↓

Prediction

↓

Prediction History
```

---

## Evidence

Prediction may use

- Attendance
- Assessment
- Behaviour Summary
- Previous Prediction
- Historical Performance

It does NOT require every source.

---

## Possible Results

LOW

MEDIUM

HIGH

Prediction Unavailable

Low Confidence

---

## Failure Cases

Insufficient Evidence

↓

Prediction Unavailable

---

Model Failure

↓

Retry

↓

Log

---

# WF-08A Intervention Engine

## Purpose

The Intervention Engine determines whether a prediction requires mentor involvement.

High Risk alone is not sufficient.

---

### Workflow

```text
Prediction

↓

Risk Trend

↓

Behaviour Progress

↓

Academic Progress

↓

Previous Counseling

↓

Time Since Last Intervention

↓

Intervention Priority

↓

Recommend Mentor?
```

---

## Possible Priorities

- None
- Low
- Medium
- High
- Immediate

---

## Business Rules

The Intervention Engine exists to:

- Prevent mentor overload.
- Prevent unnecessary counseling.
- Give AI an opportunity to stabilize the student.
- Recommend human intervention only when required.


# WF-09 Privacy & Intelligent Escalation

## Principle

Student Privacy First

AI Supports

Humans Decide

---

### Workflow

```text
Prediction

↓

Risk Level

↓

AI Chatbot Support

↓

Continuous Monitoring

↓

Next Prediction

↓

Risk Improving?

        │

   YES ─────────────► Continue AI Support

        │

        NO

        ▼

Risk Stable or Declining

↓

Intervention Engine

↓

Intervention Priority Calculation

↓

Immediate Human Intervention Required?

        │

   NO ─────────────► Continue AI Support

        │

        YES

        ▼

AI Recommendation

↓

Organization Admin Review

↓

Approve Mentor Access?

        │

   NO ─────────────► Continue AI Support

        │

        YES

        ▼

Limited Mentor Access

↓

Counseling

↓

Follow-up Window

↓

Continue Monitoring
```

---

## Business Rules

- AI never grants mentor access.
- AI only recommends.
- Organization Admin approves mentor access.
- Mentor receives only summarized information.
- Student conversations remain private.
- AI support continues throughout the process.

---

## Mentor receives

- Academic Summary
- Behaviour Summary
- Risk Trend
- Contributing Factors

---

## Mentor never receives

- Raw WhatsApp messages
- Private conversations
- Chat history

---

## Goal

Reduce unnecessary mentor intervention while ensuring students receive continuous support.

# WF-10 Counseling

## Actor

Mentor

---

### Workflow

```
Schedule

↓

Student Accepts

↓

Counseling

↓

Record Summary

↓

Follow-up

↓

Prediction Queue
```

---

## Failure Cases

Student Rejects

↓

Continue AI Support

---

Student Absent

↓

Reschedule

---

# WF-11 Academic Period Transition

## Trigger

Organization closes Academic Period.

---

### Workflow

```
Close Current Academic Period

↓

Archive Academic Records

↓

Create Next Academic Period

↓

Promote Learning Level

↓

Carry Historical Data

↓

Continue Monitoring
```

---

## Student Status

May become

- Active
- Graduated
- Suspended
- Transferred
- Archived

---

# System Principles

- Historical data is never deleted.
- Imports use UPSERT.
- Chatbot is independent from academic uploads.
- AI recommendations never override human decisions.
- Student privacy is always preserved.
- Predictions are reproducible.
- Every import is auditable.
- Every prediction is traceable.

---

# Future Extensions

- ERP Integration
- LMS Integration
- REST APIs
- Parent Portal
- Mobile Application

---

# Workflow Status

| Workflow | Status |
|----------|--------|
| Organization | ✅ Frozen |
| Academic Structure | ✅ Frozen |
| Student Import | ✅ Frozen |
| Mentor Import | ✅ Frozen |
| Academic Import | ✅ Frozen |
| Chatbot | ✅ Frozen |
| Behaviour | ✅ Frozen |
| Prediction | ✅ Frozen |
| Privacy | ✅ Frozen |
| Counseling | ✅ Frozen |
| Academic Period | ✅ Frozen |

---

End of Document
