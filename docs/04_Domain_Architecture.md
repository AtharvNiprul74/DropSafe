# DropSafe - Domain Architecture

**Version:** 1.0  
**Status:** DRAFT  
**Depends On:**
- 01_Product_Vision.md
- 02_Business_Workflow.md
- 03_Business_Rules.md

---

# Purpose

This document defines the core business domains of DropSafe.

It explains the responsibilities of each domain, how they interact, and the business objects they manage.

This document intentionally avoids implementation details such as:

- Database Tables
- APIs
- Programming Languages
- Frameworks

Instead, it defines the business architecture that will later drive database design and system implementation.

---

# Why Domain Architecture?

DropSafe consists of multiple independent business areas.

Instead of treating the system as one large application, it is divided into independent domains.

Each domain has its own responsibilities while collaborating with other domains.

Benefits

- Easier maintenance
- Better scalability
- Easier future integrations
- Cleaner database design
- Independent evolution of modules

---

# System Overview

```
                    DropSafe Platform

                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
 Academic Domain     Student Support      AI Domain
                           Domain
        │                   │                   │
        └──────────────┬────┴──────────────┬────┘
                       ▼                   ▼
                 Prediction Engine   Governance Domain
```

---

# Domain 1 — Academic Domain

## Purpose

Manage all academic information provided by educational institutions.

This domain acts as the source of academic evidence.

---

## Business Objects

Organization

Learning Program

Learning Level

Academic Period

Assessable Learning Component

Academic Evidence

Student

Mentor

---

## Responsibilities

- Organization configuration
- Academic structure
- Student management
- Mentor management
- Attendance
- Assessment Results
- Historical academic records

---

## Does NOT Handle

- Chatbot
- Predictions
- Counseling

---

# Domain 2 — Student Support Domain

## Purpose

Provide continuous AI-assisted student support while preserving privacy.

---

## Business Objects

Chatbot Conversation

Behaviour Summary

Behaviour History

Intervention

Counseling

---

## Responsibilities

- Student conversations
- Weekly Behaviour Summary
- AI support
- Counseling workflow
- Student engagement

---

## Does NOT Handle

- Academic imports
- Prediction model training
- Database administration

---

# Domain 3 — AI Domain

## Purpose

Transform academic and behavioural evidence into risk predictions.

---

## Business Objects

Student Snapshot

Feature Engineering

Prediction

Prediction History

Model Version

---

## Responsibilities

- Snapshot building
- Feature engineering
- ML prediction
- Explainability
- Prediction history
- Model versioning

---

## AI Models

### Behaviour Analysis Model

Input

- Chatbot conversations

Output

- Weekly Behaviour Summary

---

### Prediction Model

Input

- Academic Evidence
- Behaviour Summary
- Historical Performance
- Previous Predictions

Output

- Risk Level
- Risk Score
- Contributing Factors

---

## Does NOT Handle

- Chatbot conversations
- Student counseling
- Academic imports

---

# Domain 4 — Governance Domain

## Purpose

Control security, permissions, auditing and privacy.

---

## Business Objects

Users

Roles

Permissions

Import Session

Import Report

Audit Log

Access Requests

---

## Responsibilities

- Authentication
- Authorization
- Privacy
- Mentor access approval
- Audit logging
- Import history

---

## Does NOT Handle

- ML prediction
- Student conversations

---

# Domain Relationships

```
Academic Domain

↓

Provides Academic Evidence

↓

AI Domain

↓

Prediction

↓

Student Support Domain

↓

Counseling

↓

Academic Domain
```

---

# Data Ownership

| Data | Domain |
|--------|---------|
| Academic Structure | Academic |
| Attendance | Academic |
| Assessment | Academic |
| Students | Academic |
| Mentors | Academic |
| Chatbot Conversation | Student Support |
| Behaviour Summary | Student Support |
| Prediction | AI |
| Student Snapshot | AI |
| Import Session | Governance |
| Audit Logs | Governance |
| Permissions | Governance |

---

# Domain Boundaries

## Academic Domain

Can communicate with

- AI Domain

Cannot communicate directly with

- Chatbot

---

## Student Support Domain

Can communicate with

- AI Domain

Cannot modify

- Academic Records

---

## AI Domain

Reads

Academic Domain

Student Support Domain

Writes

Prediction History

Never modifies

Academic Evidence

---

## Governance Domain

Can observe every domain.

Cannot change business data automatically.

---

# Domain Events

Examples

Academic Domain

```
Attendance Imported
```

↓

AI Domain receives event

↓

Prediction Queue

---

Student Support Domain

```
Weekly Behaviour Summary Generated
```

↓

AI Domain receives event

↓

Prediction Queue

---

Governance Domain

```
Import Completed
```

↓

Audit Log Updated

---

# Shared Concepts

Some concepts are shared across domains.

Student

Organization

Academic Period

These concepts should have a single source of truth.

---

# Domain Principles

## Principle 1

Domains should remain loosely coupled.

---

## Principle 2

Each domain owns its own business logic.

---

## Principle 3

Communication between domains occurs through business events.

---

## Principle 4

No domain should directly modify another domain's internal data.

---

## Principle 5

Future integrations should extend domains rather than redesign them.

---

# Future Extensions

Academic Domain

- ERP
- LMS
- REST APIs

---

Student Support Domain

- Mobile App
- Parent Portal

---

AI Domain

- Personalized Recommendations
- Explainable AI
- Early Warning Analytics

---

Governance Domain

- Multi-campus Support
- Advanced RBAC
- Compliance Reporting

---

# Architecture Summary

```
                Governance Domain
                        ▲
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
 Academic Domain   Student Support   AI Domain
                        │
                        ▼
                 Student Success
```

---

# Freeze Status

| Domain | Status |
|----------|--------|
| Academic | ✅ |
| Student Support | ✅ |
| AI | ✅ |
| Governance | ✅ |

---

**End of Document**