# DropSafe - State Machines

**Version:** 1.0  
**Status:** DRAFT  
**Depends On:**
- 01_Product_Vision.md
- 02_Business_Workflow.md
- 03_Business_Rules.md
- 04_Domain_Architecture.md

---

# Purpose

This document defines the lifecycle of every major business object in DropSafe.

A State Machine specifies:

- Possible states
- Valid transitions
- Transition triggers
- Business rules
- Invalid transitions

The objective is to ensure every module follows consistent business behavior before implementation.

---

# State Machine Index

| ID | State Machine |
|----|---------------|
| SM-01 | Organization |
| SM-02 | Student |
| SM-03 | Academic Period |
| SM-04 | Import Session |
| SM-05 | Import File |
| SM-06 | Behaviour Summary |
| SM-07 | Prediction |
| SM-08 | Intervention |
| SM-09 | Mentor Access |
| SM-10 | Counseling |

---

# SM-01 Organization Lifecycle

## Purpose

Defines the lifecycle of an organization.

```
Registered
      │
      ▼
Verified
      │
      ▼
Configured
      │
      ▼
Active
      │
      ├──────────────► Suspended
      │                    │
      │                    ▼
      └──────────────► Reactivated
                           │
                           ▼
                        Active
```

---

Valid Transitions

- Registered → Verified
- Verified → Configured
- Configured → Active
- Active → Suspended
- Suspended → Active

Invalid

- Registered → Active
- Suspended → Verified

---

# SM-02 Student Lifecycle

## Purpose

Defines the complete student lifecycle.

```
Imported
      │
      ▼
Validated
      │
      ▼
Active
      │
      ▼
Under AI Monitoring
      │
      ▼
At Risk
      │
      ▼
AI Support
      │
      ▼
Intervention Recommended
      │
      ▼
Admin Review
      │
      ├────────────► Rejected
      │                    │
      │                    ▼
      │             Continue AI Support
      │
      ▼
Approved
      │
      ▼
Mentor Assigned
      │
      ▼
Counseling
      │
      ▼
Follow-up
      │
      ▼
Improved
      │
      ▼
Under AI Monitoring
```

Additional Exit States

```
Active
      │
      ├────────► Graduated
      │
      ├────────► Transferred
      │
      ├────────► Suspended
      │
      └────────► Archived
```

---

Business Rules

- Every Active student is monitored.
- AI Support is always before Mentor Intervention.
- Graduation never deletes history.

---

# SM-02A Enrollment Lifecycle

Created

↓

Active

↓

Completed

↓

Graduated

OR

Transferred

OR

Cancelled

# SM-02B Academic Record Lifecycle

Created

↓

Evidence Imported

↓

Updated

↓

Historical

# SM-03 Academic Period Lifecycle

```
Created
      │
      ▼
Active
      │
      ▼
Closing
      │
      ▼
Closed
      │
      ▼
Archived
```

---

Business Rules

Closing triggers:

- Promotion
- Final prediction
- History preservation

---

# SM-04 Import Session Lifecycle

```
Created
      │
      ▼
Uploading
      │
      ▼
Validating
      │
      ▼
Preview
      │
      ▼
Importing
      │
      ├────────► Failed
      │
      ▼
Completed
      │
      ▼
Archived
```

---

Business Rules

One Import Session may contain multiple files.

Example

- students.xlsx
- attendance.xlsx
- assessments.xlsx

---

# SM-05 Import File Lifecycle

```
Uploaded
      │
      ▼
Detected
      │
      ▼
Mapped
      │
      ▼
Validated
      │
      ▼
Imported
```

Possible Failures

```
Validation Failed

Duplicate File

Dependency Missing

Unsupported Format
```

---

# SM-06 Behaviour Summary Lifecycle

```
Conversation

↓

Evidence Collection

↓

Weekly Analysis

↓

Behaviour Summary Generated

↓

Stored

↓

Historical
```

---

Business Rules

- Generated weekly
- Never overwritten
- Historical summaries retained
- Used by Prediction Engine

---

# SM-07 Prediction Lifecycle

```
Prediction Requested

↓

Waiting for Snapshot

↓

Snapshot Built

↓

Feature Engineering

↓

Model Running

↓

Prediction Generated

↓

Prediction Stored

↓

Historical
```

Possible Failure

```
Waiting for Snapshot

↓

Insufficient Evidence

↓

Prediction Unavailable
```

---

Business Rules

Prediction never modifies source data.

Prediction always stores:

- Risk
- Score
- Confidence
- Contributing Factors
- Snapshot Version
- Model Version

---

# SM-08 Intervention Lifecycle

```
Prediction

↓

AI Support

↓

Observation

↓

Trend Evaluation

↓

Intervention Priority

↓

Recommended?

      │

 NO ─────────► Continue Monitoring

      │

 YES

      ▼

Admin Review

↓

Approved?

      │

 NO ─────────► Continue AI Support

      │

 YES

      ▼

Mentor Assignment

↓

Counseling
```

---

Business Rules

High Risk does not automatically trigger counseling.

---

# SM-09 Mentor Access Lifecycle

```
Requested

↓

Pending Review

↓

Approved

↓

Active

↓

Revoked
```

---

Business Rules

Mentor receives only

- Behaviour Summary
- Academic Summary
- Risk Trend

Mentor never receives

- Raw chats
- WhatsApp history

---

# SM-10 Counseling Lifecycle

```
Scheduled

↓

Accepted

↓

In Progress

↓

Completed

↓

Follow-up

↓

Closed
```

Alternative

```
Scheduled

↓

Student Declined

↓

Closed
```

---

Business Rules

After Follow-up

↓

Student returns to

Under AI Monitoring

---

# Event Summary

| Event | Trigger |
|--------|----------|
| Attendance Imported | Teacher |
| Assessment Imported | Teacher |
| Weekly Behaviour Generated | AI |
| Prediction Requested | System |
| Intervention Recommended | AI |
| Mentor Approved | Admin |
| Counseling Completed | Mentor |
| Academic Period Closed | Admin |

---

# General State Rules

- Every state transition must be auditable.
- Invalid transitions must be rejected.
- Historical states are preserved.
- State transitions should never delete historical records.
- Every transition records timestamp and actor.

---

# Future State Machines

Future versions may include

- LMS Activity
- ERP Synchronization
- Parent Communication
- Notification Delivery
- Recommendation Engine

---

# Freeze Status

| State Machine | Status |
|---------------|--------|
| Organization | ✅ |
| Student | ✅ |
| Academic Period | ✅ |
| Import Session | ✅ |
| Import File | ✅ |
| Behaviour Summary | ✅ |
| Prediction | ✅ |
| Intervention | ✅ |
| Mentor Access | ✅ |
| Counseling | ✅ |

---

**End of Document**