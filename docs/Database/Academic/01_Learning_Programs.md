# Table - learning_programs

**Schema:** Academic

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `learning_programs` table represents the academic programs offered by an Organization.

A Learning Program defines the overall course of study in which students enroll.

Examples

- B.Tech Computer Science
- B.Tech Artificial Intelligence & Machine Learning
- Diploma Mechanical Engineering
- MBA
- BCA

Every Enrollment belongs to one Learning Program.

---

# Aggregate Owner

Organization Aggregate

---

# Template Type

Master Entity

---

# Business Rules

- Every Learning Program belongs to exactly one Organization.
- Program names must be unique within an Organization.
- One Organization may offer multiple Learning Programs.
- One Learning Program may have multiple Learning Levels.
- One Learning Program may have multiple Student Enrollments.
- Learning Programs should not be deleted if historical Enrollments exist.
- Programs should be archived instead of deleted.

---

# Business Key

```
organization_id + program_code
```

---

# Table Name

```
learning_programs
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| program_code | VARCHAR(30) | ❌ | Unique Program Code |
| name | VARCHAR(255) | ❌ | Program Name |
| description | TEXT | ✅ | Program Description |
| duration | INTEGER | ❌ | Duration (Number of Levels/Semesters/Years) |
| status | ENUM | ❌ | ACTIVE, INACTIVE, ARCHIVED |
| created_at | TIMESTAMP | ❌ | Created Timestamp |
| updated_at | TIMESTAMP | ❌ | Updated Timestamp |
| created_by | UUID | ✅ | Created By |
| updated_by | UUID | ✅ | Updated By |

---

# Business Constraints

- Program Code must be unique within an Organization.
- Program Name must be unique within an Organization.
- A Program belongs to only one Organization.
- Archived Programs cannot accept new Enrollments.
- Existing historical records remain accessible after archiving.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

created_by → users.id (nullable)

updated_by → users.id (nullable)

---

## Unique Constraints

- organization_id + program_code
- organization_id + name

---

# Indexes

Primary

- id

Search

- organization_id
- program_code
- name

Filtering

- status

---

# Relationships

Belongs To

- Organization

Has Many

- Learning Levels

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

Archived Programs remain available for historical reporting.

---

# Migration Dependencies

## Must Exist Before

- organizations
- users

---

## Required Before

- learning_levels
- enrollments

---

# Notes

A Learning Program defines the overall academic course.

Examples

Engineering

Primary Education

Secondary Education

Artificial Intelligence

Mechanical Engineering

Business Administration

Python Full Stack

Healthcare Assistant

Students never directly belong to a Learning Program.

Students belong to a Learning Program through an Enrollment.

---

End of Document