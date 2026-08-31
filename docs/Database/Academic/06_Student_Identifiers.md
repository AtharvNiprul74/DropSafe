# Table - student_identifiers

**Schema:** Academic

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `student_identifiers` table stores institution-specific identifiers assigned to a Student.

A Student may have one or more identifiers depending on the Organization's policies.

Examples

- PRN Number
- Roll Number
- Admission Number
- Registration Number
- Enrollment Number
- Student ID Card Number

Student identity and institutional identifiers are intentionally separated.

---

# Aggregate Owner

Student Aggregate

---

# Template Type

Operational Entity

---

# Business Rules

- Every Student Identifier belongs to exactly one Student.
- Every Student Identifier belongs to exactly one Organization.
- A Student may have multiple identifiers.
- Each identifier type must be unique within an Organization.
- One identifier can belong to only one Student.
- Historical identifiers should be archived instead of deleted.

---

# Business Key

```
organization_id + identifier_type + identifier_value
```

---

# Table Name

```
student_identifiers
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| student_id | UUID | ❌ | Student |
| identifier_type | VARCHAR(50) | ❌ | PRN, Roll Number, Admission Number, etc. |
| identifier_value | VARCHAR(100) | ❌ | Actual Identifier |
| is_primary | BOOLEAN | ❌ | Primary Identifier |
| status | ENUM | ❌ | ACTIVE, ARCHIVED |
| created_at | TIMESTAMP | ❌ | Created Timestamp |
| updated_at | TIMESTAMP | ❌ | Updated Timestamp |
| created_by | UUID | ✅ | Created By |
| updated_by | UUID | ✅ | Updated By |

---

# Business Constraints

- Identifier Value must be unique within the same Organization and Identifier Type.
- A Student may have multiple identifiers.
- Only one Primary Identifier is allowed per Student.
- Archived identifiers cannot be reused unless explicitly restored.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

student_id → students.id

created_by → users.id (nullable)

updated_by → users.id (nullable)

---

## Unique Constraints

- organization_id + identifier_type + identifier_value

---

# Indexes

Primary

- id

Search

- organization_id
- student_id
- identifier_value

Filtering

- identifier_type
- status

---

# Relationships

Belongs To

- Organization

Belongs To

- Student

---

# Lifecycle

```
ACTIVE

↓

ARCHIVED
```

---

# Migration Dependencies

## Must Exist Before

- organizations
- users
- students

---

## Required Before

- enrollments

---

# Notes

Examples

School

```
Admission Number
Roll Number
```

University

```
PRN
Registration Number
```

Training Institute

```
Enrollment Number
Student ID
```

The Student table should never store institution-specific identifiers directly.

This table provides flexibility for different educational organizations without changing the Student model.

---

End of Document