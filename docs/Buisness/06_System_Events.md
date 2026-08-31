# DropSafe - System Events

**Version:** 1.0  
**Status:** DRAFT

**Depends On**
- 01_Product_Vision.md
- 02_Business_Workflow.md
- 03_Business_Rules.md
- 04_Domain_Architecture.md
- 05_State_Machines.md

---

# Purpose

This document defines all business events occurring inside DropSafe.

Instead of modules directly calling each other, DropSafe communicates using business events.

This makes the platform:

- Scalable
- Loosely Coupled
- Easier to Extend
- Easier to Debug
- Easier to Integrate with ERP/LMS in the future

---

# Event Flow

```
Business Action

↓

Business Event

↓

Interested Modules

↓

Business Process
```

Example

```
Attendance Imported

↓

AttendanceImported Event

↓

Snapshot Builder

↓

Prediction Queue

↓

Prediction Generated
```

---

# Event Categories

| Prefix | Category |
|----------|------------|
| ORG | Organization |
| IMP | Import |
| ACD | Academic |
| CHAT | Chatbot |
| BEH | Behaviour |
| SNAP | Snapshot |
| PRED | Prediction |
| INT | Intervention |
| MENT | Mentor |
| COUN | Counseling |
| NOTI | Notification |
| AUD | Audit |

---

# Organization Events

## ORG-001

Organization Registered

Published By

Organization Module

Consumers

- Audit
- Notification

---

## ORG-002

Organization Activated

Consumers

- Import Module

---

# Import Events

## IMP-001

Import Session Created

Consumers

- Import Engine

---

## IMP-002

Import Validation Started

---

## IMP-003

Import Validation Completed

---

## IMP-004

Import Completed

Consumers

- Academic Domain
- Snapshot Builder
- Audit

---

## IMP-005

Import Failed

Consumers

- Notification
- Audit

---

# Academic Events

## ACD-001

Attendance Imported

Consumers

- Snapshot Builder

---

## ACD-002

Assessment Imported

Consumers

- Snapshot Builder

---

## ACD-003

Academic Period Closed

Consumers

- Prediction Queue
- Analytics

---

## ACD-004

Student Promoted

Consumers

- Student Domain

---

# ACD-005

Academic Record Updated

Consumers

Snapshot Builder
Prediction Queue
Analytics

# Chatbot Events

## CHAT-001

Conversation Started

---

## CHAT-002

Conversation Ended

---

## CHAT-003

Conversation Stored

Consumers

- Behaviour Engine

---

# Behaviour Events

## BEH-001

Weekly Behaviour Analysis Started

---

## BEH-002

Behaviour Summary Generated

Consumers

- Behaviour History
- Snapshot Builder

---

## BEH-003

Behaviour Summary Stored

Consumers

- Prediction Queue

---

# Snapshot Events

## SNAP-001

Snapshot Requested

---

## SNAP-002

Snapshot Built

Consumers

- Prediction Engine

---

## SNAP-003

Snapshot Failed

Consumers

- Audit

---

# Prediction Events

## PRED-001

Prediction Requested

---

## PRED-002

Prediction Started

---

## PRED-003

Prediction Completed

Consumers

- Intervention Engine
- Prediction History
- Analytics

---

## PRED-004

Prediction Failed

Consumers

- Audit

---

## PRED-005

Prediction History Updated

Consumers

- Analytics

---

# Intervention Events

## INT-001

Intervention Evaluation Started

---

## INT-002

Intervention Recommended

Consumers

- Organization Admin

---

## INT-003

Intervention Cancelled

---

# Mentor Events

## MENT-001

Mentor Assigned

---

## MENT-002

Mentor Access Requested

---

## MENT-003

Mentor Access Approved

Consumers

- Mentor Dashboard

---

## MENT-004

Mentor Access Revoked

---

# Counseling Events

## COUN-001

Counseling Scheduled

---

## COUN-002

Counseling Started

---

## COUN-003

Counseling Completed

Consumers

- Follow-up Engine
- Prediction Queue

---

## COUN-004

Follow-up Started

---

## COUN-005

Follow-up Completed

---

# Notification Events

## NOTI-001

Notification Created

---

## NOTI-002

Notification Delivered

---

## NOTI-003

Notification Failed

---

# Audit Events

Every important business event generates an Audit Event.

Examples

- Import Completed
- Prediction Generated
- Mentor Access Approved
- Counseling Completed

---

# Event Chains

## Attendance Import

```
Attendance Uploaded

↓

Import Completed

↓

Attendance Imported

↓

Snapshot Requested

↓

Snapshot Built

↓

Prediction Requested

↓

Prediction Completed

↓

Prediction History Updated

↓

Intervention Evaluation

↓

Notification (If Required)
```

---

## Weekly Behaviour Analysis

```
Conversation Stored

↓

Behaviour Analysis Started

↓

Behaviour Summary Generated

↓

Behaviour Summary Stored

↓

Snapshot Requested

↓

Prediction Requested
```

---

## Counseling

```
Counseling Completed

↓

Follow-up Created

↓

Observation Period

↓

Prediction Requested
```

---

# Event Rules

## Rule 1

Every event has one publisher.

---

## Rule 2

An event may have multiple consumers.

---

## Rule 3

Events never modify business data.

Business modules handle updates.

---

## Rule 4

Events are immutable.

---

## Rule 5

Events should be traceable through Audit Logs.

---

# Event Metadata

Every event contains

- Event ID
- Event Name
- Timestamp
- Organization ID
- Entity Type
- Entity ID
- Published By
- Event Version

---

# Future Events

Future versions may introduce

- ERP Synced
- LMS Activity Imported
- Parent Notification Sent
- Recommendation Generated

without changing the existing event architecture.

---

# Event Principles

1. Publish events instead of direct module calls.
2. Keep publishers unaware of consumers.
3. Events should represent completed business actions.
4. Every critical event must be auditable.
5. Future modules should subscribe to existing events instead of modifying existing workflows.

---

# Freeze Status

| Event Category | Status |
|----------------|--------|
| Organization | ✅ |
| Import | ✅ |
| Academic | ✅ |
| Chatbot | ✅ |
| Behaviour | ✅ |
| Snapshot | ✅ |
| Prediction | ✅ |
| Intervention | ✅ |
| Mentor | ✅ |
| Counseling | ✅ |
| Notification | ✅ |
| Audit | ✅ |

---

**End of Document**
