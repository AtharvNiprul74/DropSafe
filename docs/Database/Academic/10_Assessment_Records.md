# Table - assessment_records

**Schema:** Academic

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `assessment_records` table stores assessment evidence imported for a Learning Component within an Academic Record.

Assessment Records represent academic performance evidence provided by an Organization.

DropSafe stores assessment evidence rather than individual examination events.

Derived metrics such as GPA, CGPA, Overall Marks, Risk Indicators, and AI Features are calculated by downstream modules and are never stored in this table.

---

# Aggregate Owner

Academic Record Aggregate

---

# Template Type

Operational Entity

---

# Business Rules

- Every Assessment Record belongs to exactly one Academic Record.
- Every Assessment Record belongs to exactly one Learning Component.
- Assessment represents imported academic evidence.
- Organizations define their own grading methodology.
- DropSafe stores the grading outcome without interpreting it.
- One Assessment Record exists for each Learning Component within an Academic Record.
- Assessment evidence may be updated through subsequent Import Sessions.

---

# Business Key

```
organization_id + academic_record_id + learning_component_id
```

---

# Table Name

```
assessment_records
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| academic_record_id | UUID | ❌ | Academic Record |
| learning_component_id | UUID | ❌ | Learning Component |
| obtained_marks | DECIMAL(6,2) | ❌ | Marks Obtained |
| maximum_marks | DECIMAL(6,2) | ❌ | Maximum Marks |
| grading_outcome | VARCHAR(50) | ✅ | Organization-defined grading outcome |
| import_session_id | UUID | ✅ | Import Session |
| created_at | TIMESTAMP | ❌ | Record Created Timestamp |
| updated_at | TIMESTAMP | ❌ | Last Updated Timestamp |

---

# Business Constraints

- One Assessment Record represents assessment evidence for one Learning Component.
- Obtained Marks cannot exceed Maximum Marks.
- Assessment evidence belongs to one Academic Record.
- Assessment evidence is updated only through approved academic imports.
- Derived academic metrics are never stored in this table.
- Grading outcomes are treated as source data provided by the Organization.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

academic_record_id → academic_records.id

learning_component_id → learning_components.id

import_session_id → import_sessions.id (nullable)

---

## Unique Constraints

```
organization_id +
academic_record_id +
learning_component_id
```

---

## Check Constraints

```
obtained_marks >= 0

maximum_marks > 0

obtained_marks <= maximum_marks
```

---

# Indexes

Primary

- id

Search

- organization_id
- academic_record_id
- learning_component_id

Filtering

- result_status

---

# Relationships

Belongs To

- Organization

Belongs To

- Academic Record

Belongs To

- Learning Component

Belongs To

- Import Session (Optional)

---

# Lifecycle

Assessment Records remain active throughout the Academic Record lifecycle.

When new assessment evidence is imported, the existing Assessment Record is updated.

Import Sessions preserve the history of changes.

---

# Migration Dependencies

## Must Exist Before

- organizations
- academic_records
- learning_components
- import_sessions

---

## Required Before

- Student Snapshot
- Prediction

---

# Notes

Assessment Records store assessment evidence only.

Examples

University

```
Machine Learning

Obtained Marks : 84

Maximum Marks : 100

PASS
```

School

```
Mathematics

Obtained Marks : 72

Maximum Marks : 80

PASS
```

Training Institute

```
Python Module

Obtained Marks : 45

Maximum Marks : 50

PASS
```

PASS

FAIL

A+

A

B+

DISTINCTION

MERIT

COMPETENT

NOT YET COMPETENT

This table never stores:

- Overall Percentage
- GPA
- CGPA
- Risk Score
- Prediction Result
- Behaviour Score

These values are calculated by downstream AI and Reporting modules.

---

End of Document