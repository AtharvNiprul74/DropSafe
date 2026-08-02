# DropSafe - Product Vision & Business Workflow
**Version:** 1.0  
**Status:** FROZEN  
**Date:** 01 August 2026

---

# 1. Purpose

This document defines the vision, scope, principles, and high-level business workflow of DropSafe.

It serves as the primary reference for future architectural decisions, including database design, backend services, AI modules, chatbot integration, and user interfaces.

---

# 2. Product Vision

## What is DropSafe?

DropSafe is an AI-powered Student Risk Detection and Early Intervention Platform designed to help educational institutions identify students who may require academic or personal support before they disengage from learning.

Instead of focusing only on predicting dropout, DropSafe continuously combines academic evidence and behavioral insights to assist mentors in providing timely interventions while preserving student privacy.

---

# 3. Problem Statement

Educational institutions often identify struggling students only after academic performance has significantly declined.

Common challenges include:

- Delayed identification of at-risk students.
- Lack of continuous monitoring.
- Limited mentor visibility.
- No behavioral support system.
- Privacy concerns when monitoring students.

DropSafe aims to solve these challenges through responsible AI-assisted monitoring and intervention.

---

# 4. Product Goals

## Primary Goals

- Reduce student dropout.
- Improve academic performance.
- Support mentors with early intervention.
- Improve mentor monitoring.
- Generate institutional reports useful for accreditation (NBA / NAAC).

---

## Secondary Goals

- Improve student well-being.
- Provide AI-assisted behavioral support.
- Maintain student privacy.
- Build a scalable platform supporting multiple institution types.

---

# 5. Target Institutions

DropSafe is designed for:

- Schools
- Colleges
- Universities
- Coaching Centers
- Training Institutes
- Professional Training Organizations (CDAC, etc.)

The platform should adapt to the institution rather than forcing institutions to change their workflow.

---

# 6. User Roles

## Organization Admin

Responsible for:

- Organization setup
- Academic structure
- CSV imports
- Mentor management
- Permission approvals

---

## Teacher

Responsible for:

- Uploading attendance
- Uploading assessment results

---

## Mentor

Responsible for:

- Monitoring assigned students
- Counseling
- Reviewing AI summaries
- Following intervention workflow

Mentors never receive unrestricted student data.

---

## Student

Students do **not** access a web dashboard in Version 1.

Students interact only through the WhatsApp chatbot.

---

# 7. Core Principles

## Principle 1

Student privacy comes first.

---

## Principle 2

AI recommends.

Humans make decisions.

---

## Principle 3

The chatbot exists to support students.

It must never become intrusive or spam users.

---

## Principle 4

DropSafe adapts to institutional workflows.

Institutions should not change their existing academic processes to use the platform.

---

## Principle 5

Historical data is never deleted.

Historical records improve analytics and future model retraining.

---

## Principle 6

The prediction engine never guesses.

If required data is unavailable, the system communicates that prediction confidence is reduced or prediction is unavailable.

---

## Principle 7

The system should remain generic.

The platform should never depend on concepts specific to colleges such as SGPA or Semester.

Instead it should use generic concepts such as:

- Learning Program
- Learning Level
- Academic Period
- Assessable Learning Component
- Performance Score

---

# 8. Data Ownership

| Data | Owner |
|-------|-------|
| Academic Records | Organization |
| Attendance | Organization |
| Assessment Results | Organization |
| Chat Conversations | Student |
| Behavior Summary | AI System |
| Prediction History | System |
| Counseling Records | Organization (Access Controlled) |

---

# 9. High-Level Business Workflow

```text
Organization Registration
        │
        ▼
Academic Structure Setup
        │
        ▼
Student Import
        │
        ▼
Mentor Import
        │
        ▼
Mentor Assignment
        │
        ▼
Academic Data Import
        │
        ▼
Student ↔ WhatsApp Chatbot
        │
        ▼
Behavior Analysis
        │
        ▼
Prediction Engine
        │
        ▼
Risk Assessment
        │
        ▼
AI Student Support
        │
        ▼
(If Required)
        │
        ▼
Admin Approved Mentor Intervention
        │
        ▼
Counseling
        │
        ▼
Continuous Monitoring
```

---

# 10. MVP Scope

Included in Version 1:

- Organization Management
- Academic Structure
- Student Management
- Mentor Management
- CSV Import
- Attendance Import
- Assessment Import
- WhatsApp Chatbot
- Behavior Analysis
- ML Prediction
- Mentor Dashboard
- Counseling Workflow

---

# 11. Out of Scope

The following features are intentionally excluded from Version 1.

- ERP Integration
- LMS Integration
- Parent Portal
- Student Dashboard
- Fee Management
- Library Management
- Hostel Management
- Examination Management
- Automatic Attendance Systems
- Mobile Application

These features may be considered in future releases.

---

# 12. Design Philosophy

DropSafe is designed around five architectural principles.

1. Privacy First
2. Human-Centered AI
3. Generic Educational Model
4. Scalable Architecture
5. Incremental Extensibility

Every future architectural decision should align with these principles.

---

# 13. Success Criteria

The MVP is considered successful if it can:

- Import institutional academic data.
- Analyze behavioral conversations.
- Predict student risk.
- Support mentors in early intervention.
- Preserve student privacy.
- Operate across different types of educational institutions without changing the core architecture.

---

# 14. Future Vision

Future versions may include:

- ERP Integration
- LMS Integration
- Learning Analytics
- Parent Portal
- Mobile Applications
- Real-Time Academic Synchronization
- Multi-language AI Chatbot
- Advanced Explainable AI
- Recommendation Engine
- Personalized Student Success Plans

---

# Freeze Status

| Item | Status |
|------|--------|
| Product Vision | ✅ Frozen |
| User Roles | ✅ Frozen |
| Product Scope | ✅ Frozen |
| Core Principles | ✅ Frozen |
| Business Workflow | ✅ Frozen |
| Future Scope | ✅ Frozen |

---

**End of Document**
