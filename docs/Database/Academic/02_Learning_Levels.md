# Table - learning_levels

**Schema:** Academic

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `learning_levels` table represents the progression stages within a Learning Program.

A Learning Level defines the student's position in the academic journey.

Examples

- First Year
- Second Year
- Third Year
- Final Year

or

- Grade 1
- Grade 2
- Grade 3

or

- Level 1
- Level 2

Each Learning Program contains one or more Learning Levels.

---

# Aggregate Owner

Organization Aggregate

---

# Template Type

Master Entity

---

# Business Rules

- Every Learning Level belongs to exactly one Learning Program.
- Learning Level names must be unique within a Learning Program.
- One Learning Program may contain multiple Learning Levels.
- One Learning Level may contain multiple Academic Periods.
- Learning Levels should be archived instead of deleted if historical records exist.

---

# Business Key

```
organization_id + learning_program_id + level_number
```

---

# Table Name

```
learning_levels
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| learning_program_id | UUID | ❌ | Learning Program |
| level_number | INTEGER | ❌ | Level Sequence |
| name | VARCHAR(100) | ❌ | Level Name |
| description | TEXT | ✅ | Description |
| status | ENUM | ❌ | ACTIVE, INACTIVE, ARCHIVED |
| created_at | TIMESTAMP | ❌ | Created Timestamp |
| updated_at | TIMESTAMP | ❌ | Updated Timestamp |
| created_by | UUID | ✅ | Created By |
| updated_by | UUID | ✅ | Updated By |

---

# Business Constraints

- Level Number must be unique within a Learning Program.
- Level Name must be unique within a Learning Program.
- Every Learning Level belongs to one Learning Program.
- Archived Learning Levels cannot accept new Enrollments.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

learning_program_id → learning_programs.id

created_by → users.id (nullable)

updated_by → users.id (nullable)

---

## Unique Constraints

- organization_id + learning_program_id + level_number

- organization_id + learning_program_id + name

---

# Indexes

Primary

- id

Search

- organization_id
- learning_program_id
- level_number

Filtering

- status

---

# Relationships

Belongs To

- Organization

Belongs To

- Learning Program

Has Many

- Academic Periods

Has Many

- Enrollments

---

# Lifecycle

```
ACTIVE

↓

INACTIVE

↓

ARCHIVED
```

Archived Learning Levels remain available for historical reporting.

---

# Migration Dependencies

## Must Exist Before

- organizations
- users
- learning_programs

---

## Required Before

- academic_periods
- enrollments

---

# Notes

Learning Levels represent the progression within a Learning Program.

Examples

Engineering

```
First Year

Second Year

Third Year

Final Year
```

School

```
Grade 1

Grade 2

Grade 3
```

Training Institute

```
Level 1

Level 2

Level 3
```

Students never directly belong to a Learning Level.

Students belong to a Learning Level through an Enrollment.

---

End of Document