# Table - organizations

**Schema:** Master

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `organizations` table represents an educational institution using the DropSafe platform.

Examples:

- Engineering College
- Polytechnic
- School
- University
- Training Institute

Every business record belongs to exactly one Organization.

---

# Aggregate Owner

Organization Aggregate

---

# Template Type

Master Entity

---

# Business Rules

- Every Organization has a globally unique identifier.
- Organization Code must be unique.
- Organizations are completely isolated from each other.
- Every business entity belongs to exactly one Organization.
- Organization cannot be deleted directly.
- Organization follows the Archive lifecycle.
- One Organization owns multiple Users.
- One Organization owns multiple Students.
- One Organization owns multiple Learning Programs.
- One Organization owns one Organization Settings record.

---

# Table Name

```text
organizations
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_code | VARCHAR(20) | ❌ | Unique Organization Code |
| name | VARCHAR(255) | ❌ | Organization Name |
| organization_type | ENUM | ❌ | School, College, University, Institute |
| email | VARCHAR(255) | ✅ | Official Email |
| phone | VARCHAR(20) | ✅ | Contact Number |
| website | VARCHAR(255) | ✅ | Website |
| address | TEXT | ✅ | Address |
| city | VARCHAR(100) | ✅ | City |
| state | VARCHAR(100) | ✅ | State |
| country | VARCHAR(100) | ❌ | Country |
| postal_code | VARCHAR(20) | ✅ | Postal Code |
| status | ENUM | ❌ | ACTIVE, INACTIVE, ARCHIVED |
| created_at | TIMESTAMP | ❌ | Created Timestamp |
| updated_at | TIMESTAMP | ❌ | Updated Timestamp |
| created_by | UUID | ✅ | User who created the record |
| updated_by | UUID | ✅ | User who last modified the record |
| version | INTEGER | ❌ | Version Number |

---

# Constraints

## Primary Key

- id

---

## Unique Constraints

- organization_code

---

## Required Fields

- organization_code
- name
- organization_type
- country
- status

---

## Check Constraints

Status

```text
ACTIVE
INACTIVE
ARCHIVED
```

Organization Type

```text
SCHOOL
COLLEGE
UNIVERSITY
POLYTECHNIC
TRAINING_INSTITUTE
OTHER
```

---

# Indexes

Primary

- id

Unique

- organization_code

Search

- name

Filtering

- status

---

# Relationships

## One-to-One

Organization

↓

Organization Settings

---

## One-to-Many

Organization

↓

Users

---

Organization

↓

Roles

---

Organization

↓

Students

---

Organization

↓

Learning Programs

---

Organization

↓

Learning Levels

---

Organization

↓

Academic Periods

---

Organization

↓

Import Sessions

---

Organization

↓

Predictions

---

Organization

↓

Audit Logs

---

# Lifecycle

```text
ACTIVE
    │
    ▼
INACTIVE
    │
    ▼
ARCHIVED
```

Organizations are never permanently deleted by default.

Deletion follows the Organization Retention Policy.

---

# Security Considerations

- Organizations are tenant boundaries.
- Cross-organization access is prohibited.
- Every business query must be scoped by `organization_id`.
- Organization data is accessible only to authorized users belonging to that organization.

---

    

# Example Record

| Field | Value |
|--------|-------|
| id | UUID v7 |
| organization_code | SIT001 |
| name | Sharad Institute of Technology |
| organization_type | COLLEGE |
| country | India |
| status | ACTIVE |

---

# Notes

The Organization table is the root entity of the DropSafe platform.

Every business module depends on this table.

This table should be created before any other business table.

---

# Freeze Status

| Area | Status |
|------|--------|
| Business Rules | ✅ |
| Columns | ✅ |
| Constraints | ✅ |
| Relationships | ✅ |
| Lifecycle | ✅ |
| Security | ✅ |

---

# Migration Dependencie

End of Document