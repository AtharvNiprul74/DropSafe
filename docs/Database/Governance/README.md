# DropSafe - Governance Schema

**Version:** 1.0

**Status:** DRAFT

**Depends On**

- Master Schema
- Privacy And Access Control
- Authorization Model
- System Events
- Data Architecture

---

# Purpose

The Governance Schema stores operational records required for security, accountability, privacy, and system activity tracking.

Governance records provide evidence of important actions performed within DropSafe.

---

# Scope

This schema stores:

- Audit Logs
- Access Logs
- Notification History

It does not store:

- User authentication credentials
- Academic Records
- Predictions
- Counseling Sessions
- Chatbot Conversations

Those belong to their respective schemas.

---

# Governance Philosophy

DropSafe must be able to answer:

- Who performed an important action?
- What action was performed?
- When did it happen?
- Which organization did it belong to?
- What resource was affected?
- Was access granted or denied?
- What notification was sent?

Governance records support accountability and security without becoming part of the operational business workflow.

---

# Data Flow

```text
User / System Action
        │
        ├──→ Audit Log
        │
        ├──→ Access Log
        │
        └──→ Notification History
```

---

# Data Categories

## Audit Logs

Record important business and administrative actions.

Examples:

- Student record update
- Enrollment change
- Intervention creation
- Permission change
- Import completion

---

## Access Logs

Record security-relevant access attempts.

Examples:

- Successful access
- Denied access
- Unauthorized resource request

---

## Notification History

Record notifications sent by DropSafe.

Examples:

- Mentor alert
- Student reminder
- Follow-up reminder
- Import completion notification

---

# Design Principles

## Append Only

Governance records are historical records.

They should not be silently modified or deleted.

---

## Accountability

Important actions should be traceable to the responsible User or System Actor.

---

## Organization Isolation

Governance records must remain associated with the Organization in which the action occurred.

---

## Privacy

Governance records must not unnecessarily store sensitive business content.

Only the information required for accountability and security should be recorded.

---

# Retention

Governance records follow the applicable platform and organization retention policies.

Retention must not be implemented by silently modifying historical records.

---

# Notes

Governance is an operational control layer.

It does not become a source of truth for business entities.

For example:

```text
Audit Log
    ≠
Student Record
```

The Audit Log only records that an action occurred.

---

# Design Relationship

```text
Business Operation
       ↓
Business Data Change
       ↓
Governance Event
       ↓
Audit / Access / Notification Record
```

---

End of Document