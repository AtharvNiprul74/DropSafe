# DropSafe - Counseling Schema

**Version:** 1.0

**Status:** DRAFT

**Depends On**

- Master Schema
- Academic Schema
- AI Schema
- Behaviour Schema
- Data Architecture
- Privacy And Access Control
- Authorization Model

---

# Purpose

The Counseling Schema stores human-led intervention and counseling activities performed in response to student needs.

The Counseling Schema represents the human intervention layer of DropSafe.

AI identifies potential risk.

Mentors or counselors decide and perform appropriate interventions.

---

# Scope

This schema stores:

- Interventions
- Counseling Sessions
- Follow-ups

It does not store:

- Predictions
- AI Features
- Chatbot Conversations
- Academic Records

Those belong to their respective schemas.

---

# Counseling Philosophy

AI provides decision support.

Human mentors and counselors remain responsible for intervention decisions.

The system must never treat an AI prediction as a final determination about a Student.

---

# Counseling Flow

```text
Prediction
    ↓
Intervention
    ↓
Counseling Session
    ↓
Follow-up
```

A Student may receive multiple interventions over time.

---

# Design Principles

## Human-in-the-Loop

AI identifies potential risk.

Human users review the situation and decide the appropriate action.

---

## Historical Preservation

Counseling activities are retained as historical records.

Previous counseling sessions must not be silently overwritten.

---

## Privacy

Counseling information may contain sensitive student information.

Access must follow the organization's privacy and authorization policies.

---

## Separation of Concerns

AI Schema

↓

Risk Assessment

Counseling Schema

↓

Human Intervention

---

# Relationships

```text
Student
    │
    ▼
Prediction
    │
    ▼
Intervention
    │
    ▼
Counseling Session
    │
    ▼
Follow-up
```

---

# Notes

The Counseling Schema intentionally does not define detailed clinical or medical workflows.

DropSafe V1 focuses on educational intervention and student support.

---

End of Document