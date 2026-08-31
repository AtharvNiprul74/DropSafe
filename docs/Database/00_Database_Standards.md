# DropSafe - Database Standards

**Version:** 1.0

**Status:** DRAFT

**Depends On**

- 09_Data_Architecture.md

---

# Purpose

This document defines the database design standards used throughout the DropSafe platform.

Every database table must follow these standards unless an explicit exception is documented.

These standards ensure consistency, maintainability, scalability, and performance.

---

# Database Engine

Database

- PostgreSQL

Character Encoding

- UTF-8

Time Zone

- UTC

---

# Database Philosophy

The database follows these principles:

- Multi-Tenant Architecture
- Aggregate-Oriented Design
- Hybrid Normalization
- Immutable Historical Data
- Strong Referential Integrity
- Business-Driven Schema Design

---

# Naming Convention

## Tables

Use

Plural

Examples

```
students

organizations

academic_records

attendance_records

predictions
```

---

## Columns

Use

Snake Case

Examples

```
organization_id

student_id

created_at

generated_at
```

---

## Primary Keys

Every table uses

```
id
```

Never use

```
student_id

organization_pk

prediction_key
```

---

## Foreign Keys

Always

```
entity_id
```

Examples

```
organization_id

student_id

enrollment_id

academic_record_id

prediction_id
```

---

# UUID Strategy

Primary Keys

UUID Version 7

Reason

- Better Index Locality
- Time Ordered
- Distributed Generation
- Future Scalability

Every business entity should use UUID v7.

---

# Multi-Tenant Strategy

Every organization owns its own data.

Business tables should contain

```
organization_id
```

unless ownership is inherited and storing it provides no practical benefit.

Every business query must be scoped by Organization.

---

# Table Templates

## Master Entity

Purpose

Reference Data

Examples

- Organization
- Learning Program
- Learning Level
- Roles
- Permission Groups

Standard Fields

```
id

organization_id (if applicable)

status

created_at

updated_at

created_by

updated_by

version
```

---

## Operational Entity

Purpose

Business Operations

Examples

- Student
- Enrollment
- Academic Record
- Attendance Record
- Assessment Record
- Counseling

Standard Fields

```
id

organization_id

created_at

updated_at

created_by

updated_by
```

Status is included only if the entity has a lifecycle.

---

## Historical Entity

Purpose

Immutable Business History

Examples

- Behaviour Summary
- Student Snapshot
- Prediction
- Prediction History
- Audit Log

Standard Fields

```
id

organization_id

generated_at

generated_by
```

Historical entities are append-only.

---

## Configuration Entity

Purpose

Organization Configuration

Examples

- Organization Settings
- AI Settings
- Notification Settings

Standard Fields

```
id

organization_id

created_at

updated_at

updated_by

version
```

---

# Delete Strategy

Business records should never be immediately deleted.

Lifecycle

```
ACTIVE

↓

INACTIVE

↓

ARCHIVED

↓

Retention Policy

↓

Archive

OR

Anonymize

OR

Delete
```

Retention rules are configurable per organization.

---

# Versioning Strategy

Use version numbers only for mutable entities.

Examples

- Organization
- Roles
- Settings

Do not version immutable historical records.

---

# Timestamp Standards

Creation

```
created_at
```

Modification

```
updated_at
```

Generated Records

```
generated_at
```

Never use inconsistent names such as

```
createdOn

creation_date

date_created
```

---

# Status Standards

Status should exist only when the entity has a lifecycle.

Examples

Student

```
ACTIVE

GRADUATED

TRANSFERRED

ARCHIVED
```

Import Session

```
PENDING

PROCESSING

COMPLETED

FAILED
```

Historical tables should not have status.

---

# JSON Usage

Business data should always use structured columns.

JSON is allowed only for

- Metadata
- Import Diagnostics
- External API Payloads
- Future Extensions

Business-critical information should never be stored only in JSON.

---

# Normalization Strategy

Hybrid Normalization

Master Data

Fully Normalized

Operational Data

Limited Denormalization is acceptable for performance.

Historical Data

Append Only

---

# Transaction Strategy

Each Aggregate defines one transaction boundary.

Transactions should never span unrelated Aggregates.

Example

Import Aggregate

```
Import Session

↓

Attendance Records

↓

Assessment Records

↓

Commit
```

---

# History Strategy

Historical records are immutable.

Examples

- Behaviour Summary
- Student Snapshot
- Prediction History
- Audit Log

Corrections should generate new records instead of modifying history.

---

# Constraint Standards

Database constraints should enforce business rules whenever possible.

Examples

- NOT NULL
- UNIQUE
- CHECK
- FOREIGN KEY

Business validation should not rely only on application code.

## Bootstrap Rule

During the initial system setup, some audit fields may be NULL.

Examples

- organizations.created_by
- organizations.updated_by
- users.created_by
- users.updated_by

Reason

The first Organization and the first Organization Admin are created during the bootstrap process.

After bootstrap, all new records should populate these fields normally.

---

# Index Strategy

Every major table should have indexes on

- id
- organization_id
- created_at or generated_at

Additional indexes should be defined based on query patterns.

---

# Database Security Principles

- Every query must respect Organization boundaries.
- Historical records should never be modified.
- Soft deletion is preferred over immediate deletion.
- Sensitive information should remain encrypted where applicable.

---

# Future Standards

Future versions may include

- Table Partitioning
- Read Replicas
- Data Warehouse
- Feature Store
- Row-Level Security (RLS)

---

# Database Design Checklist

Before creating any new table, verify:

- Appropriate table template selected
- Correct naming convention
- UUID v7 used
- Correct aggregate ownership
- Organization scope defined
- Required indexes added
- Business constraints enforced
- Audit fields included where applicable
- History strategy defined
- Relationships documented

---

# Freeze Status

| Area | Status |
|------|--------|
| Naming Standards | ✅ |
| UUID Strategy | ✅ |
| Multi-Tenant Strategy | ✅ |
| Table Templates | ✅ |
| History Strategy | ✅ |
| Delete Strategy | ✅ |
| Versioning | ✅ |
| Index Strategy | ✅ |
| Constraint Strategy | ✅ |

---

End of Document
