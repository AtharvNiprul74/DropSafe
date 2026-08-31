# Table - learning_components

**Schema:** Academic

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `learning_components` table represents the educational units delivered during an Academic Period.

A Learning Component is the smallest planned unit of learning that can be evaluated.

Different organizations may use different names.

Examples

- Subject
- Course
- Module
- Unit
- Competency

DropSafe uses the generic term **Learning Component**.

---

# Aggregate Owner

Organization Aggregate

---

# Template Type

Master Entity

---

# Business Rules

- Every Learning Component belongs to exactly one Academic Period.
- One Academic Period may contain multiple Learning Components.
- Learning Component names must be unique within an Academic Period.
- Learning Components should be archived instead of deleted if historical Academic Records exist.

---

# Business Key

```
organization_id + academic_period_id + component_code
```

---

# Table Name

```
learning_components
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| academic_period_id | UUID | ❌ | Academic Period |
| component_code | VARCHAR(30) | ❌ | Component Code |
| name | VARCHAR(255) | ❌ | Learning Component Name |
| description | TEXT | ✅ | Description |
| component_type | ENUM | ❌ | SUBJECT, COURSE, MODULE, UNIT, COMPETENCY, OTHER |
| maximum_marks | DECIMAL(5,2) | ✅ | Maximum Assessment Marks |
| passing_marks | DECIMAL(5,2) | ✅ | Passing Marks |
| status | ENUM | ❌ | ACTIVE, INACTIVE, ARCHIVED |
| created_at | TIMESTAMP | ❌ | Created Timestamp |
| updated_at | TIMESTAMP | ❌ | Updated Timestamp |
| created_by | UUID | ✅ | Created By |
| updated_by | UUID | ✅ | Updated By |

---

# Business Constraints

- Component Code must be unique within an Academic Period.
- Component Name must be unique within an Academic Period.
- Passing Marks cannot exceed Maximum Marks.
- Archived Learning Components cannot receive new Assessments.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

academic_period_id → academic_periods.id

created_by → users.id (nullable)

updated_by → users.id (nullable)

---

## Unique Constraints

- organization_id + academic_period_id + component_code

- organization_id + academic_period_id + name

---

## Check Constraints

- passing_marks <= maximum_marks

---

# Indexes

Primary

- id

Search

- organization_id
- academic_period_id
- component_code
- name

Filtering

- status
- component_type

---

# Relationships

Belongs To

- Organization

Belongs To

- Academic Period

Has Many

- Attendance Records

Has Many

- Assessment Records

---

# Lifecycle

```
ACTIVE

↓

INACTIVE

↓

ARCHIVED
```

Archived Learning Components remain available for historical reporting.

---

# Migration Dependencies

## Must Exist Before

- organizations
- users
- academic_periods

---

## Required Before

- academic_records
- attendance_records
- assessment_records

---

# Notes

Learning Components represent the educational units delivered during an Academic Period.

Examples

School

- Mathematics
- English
- Science

University

- Data Structures
- Operating Systems
- Machine Learning

Training Institute

- Python Basics
- Database Design
- Final Project

The term "Learning Component" keeps the model independent of any specific educational system.

---

End of Document