# DropSafe - Business Rules Register

**Version:** 1.0  
**Status:** DRAFT  
**Depends On:**
- 01_Product_Vision.md
- 02_Business_Workflow.md

---

# Purpose

This document defines all business rules used throughout DropSafe.

Business Rules represent the core decisions that govern system behavior.

Every workflow, database constraint, API, state machine, and ML pipeline must comply with these rules.

---

# Rule Categories

| Category | Description |
|----------|-------------|
| BR-1xx | Organization |
| BR-2xx | Academic Structure |
| BR-3xx | Student |
| BR-4xx | Academic Data |
| BR-5xx | Chatbot |
| BR-6xx | AI & Prediction |
| BR-7xx | Privacy |
| BR-8xx | Import |
| BR-9xx | Counseling |
| BR-10xx | System |

---

# Organization Rules

## BR-101

Each organization is completely isolated.

Organizations cannot access data belonging to other organizations.

---

## BR-102

Every organization must have at least one Organization Admin.

---

## BR-103

Every record inside the database belongs to exactly one organization.

---

# Academic Structure Rules

## BR-201

Academic Structure must exist before importing students.

---

## BR-202

DropSafe uses generic academic concepts.

The platform must never depend on:

- Semester
- SGPA
- CGPA
- Grade

Instead it uses:

- Learning Program
- Learning Level
- Academic Period
- Assessable Learning Component

---

## BR-203

Curriculum changes create new versions.

Historical curriculum is never deleted.

---

# Student Rules

## BR-301

Every student must have one permanent institutional identifier.

Examples:

- PRN
- Registration Number
- Admission Number

---

## BR-302

Student Identifier cannot change during normal operations.

If correction is required, it must follow an administrative identity correction workflow.

---

## BR-303

The following information may change:

- Name
- Email
- Phone
- Learning Program
- Learning Level
- Department
- Mentor

---

## BR-304

Student history must remain available even after:

- Graduation
- Transfer
- Suspension

---

# Academic Data Rules

## BR-401

Attendance records are append-only.

Existing attendance history is never deleted.

---

## BR-402

Assessment Results are append-only.

---

## BR-403

Organizations decide how frequently academic data is uploaded.

DropSafe adapts to the institution.

---

## BR-404

Academic data imports never remove existing historical records.

---

# Chatbot Rules

## BR-501

Students communicate only through WhatsApp in Version 1.

---

## BR-502

Students do not access a web dashboard.

---

## BR-503

The chatbot must never spam students.

---

## BR-504

The chatbot must never reveal:

- Prediction results
- Internal AI decisions
- Mentor actions

---

## BR-505

Students may start conversations at any time.

---

## BR-506

The chatbot may start conversations according to the support strategy.

It should remain supportive rather than intrusive.

---

# AI & Prediction Rules

## BR-601

The prediction engine never changes source data.

---

## BR-602

Predictions are generated from the latest available evidence.

---

## BR-603

Every prediction must be stored in Prediction History.

Predictions are never overwritten.

---

## BR-604

The prediction engine may produce:

- LOW
- MEDIUM
- HIGH
- Prediction Unavailable

---

## BR-605

Prediction must remain reproducible.

The system must know which evidence generated every prediction.

---

## BR-606

AI only recommends.

AI never makes governance decisions.

---

## BR-607

High Risk does not automatically result in mentor intervention.

Every prediction must first pass through the Intervention Engine.

---

## BR-608

The Intervention Engine determines whether human intervention is required based on:

- Risk trend
- Behaviour progression
- Previous counseling
- AI support effectiveness

---

## BR-609

Mentor intervention should be minimized whenever AI support is sufficient.

---

## BR-610

The platform must protect mentor capacity.

Not every High Risk student requires immediate counseling.

Priority should be given to students requiring immediate human support.

---

## BR-611

Following counseling, the student enters a follow-up period.

During this period, AI continues monitoring and additional mentor recommendations should be avoided unless significant deterioration occurs.

## BR-612

Behaviour Analysis and Dropout Prediction are independent AI systems.

The Behaviour Analysis model generates periodic Behaviour Summaries from chatbot conversations.

The Dropout Prediction model consumes Behaviour Summaries together with academic evidence to generate student risk predictions.

Neither model directly depends on the internal implementation of the other.

---

## BR-613

Behaviour Summaries are historical records.

Every generated summary is preserved to enable behavioural trend analysis and improve future predictions.

Existing Behaviour Summaries must never be overwritten.



# Privacy Rules

## BR-701

Student privacy has the highest priority.

---

## BR-702

Mentors must never access raw chatbot conversations.

---

## BR-703

Mentors receive only:

- Behaviour Summary
- Academic Summary
- Risk Trend

---

## BR-704

Mentor access requires Organization Admin approval.

---

## BR-705

The AI cannot directly grant mentor access.

---

# Import Rules

## BR-801

Supported import formats:

- CSV
- Excel
- ZIP

---

## BR-802

Imports follow:

Validate

↓

Preview

↓

Import

↓

History

---

## BR-803

Imports use UPSERT.

Existing records are updated.

New records are inserted.

---

## BR-804

Historical records are never removed during import.

---

## BR-805

Every import generates an Import Report.

---

## BR-806

Imports must support column mapping.

---

## BR-807

The system must detect duplicate imports.

---

# Counseling Rules

## BR-901

Counseling sessions are historical records.

---

## BR-902

Counseling never modifies chatbot conversations.

---

## BR-903

Counseling may trigger a new prediction.

---

# System Rules

## BR-1001

Every important action must be auditable.

---

## BR-1002

Historical records are never deleted.

Soft deletion is preferred.

---

## BR-1003

Every business operation must be traceable.

---

## BR-1004

System modules should remain loosely coupled.

Changes in one module should have minimal impact on others.

---

## BR-1005

Future integrations must not require redesigning the core database.

Examples:

- ERP
- LMS
- REST APIs

---

# Future Rules

These are intentionally postponed.

- Parent Portal
- LMS Analytics
- ERP Sync
- Mobile App
- Recommendation Engine

---

# Rule References

Example

Workflow:

WF-03 Student Import

Uses

- BR-301
- BR-302
- BR-803

---

Database

Student Table

Uses

- BR-301
- BR-302

---

Prediction Engine

Uses

- BR-601
- BR-602
- BR-603
- BR-606

---

# Freeze Status

| Category | Status |
|----------|--------|
| Organization | ✅ |
| Academic Structure | ✅ |
| Student | ✅ |
| Academic Data | ✅ |
| Chatbot | ✅ |
| AI | ✅ |
| Privacy | ✅ |
| Import | ✅ |
| Counseling | ✅ |
| System | ✅ |

---

**End of Document**
