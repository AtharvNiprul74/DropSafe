# Table - students

**Schema:** Academic

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `students` table stores the identity and personal information of learners enrolled in an Organization.

This table represents a person, not an academic record.

Academic information is stored separately through Enrollments and Academic Records.

---

# Aggregate Owner

Student Aggregate

---

# Template Type

Operational Entity

---

# Business Rules

- Every Student belongs to exactly one Organization.
- A Student represents a person.
- A Student may have multiple Enrollments throughout their academic journey.
- Student identity remains constant even if academic information changes.
- Students are archived instead of deleted.

---

# Business Key

```
organization_id + primary_student_identifier
```

> Note: The primary identifier is stored in the `student_identifiers` table.

---

# Table Name

```
students
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| first_name | VARCHAR(100) | ❌ | First Name |
| middle_name | VARCHAR(100) | ✅ | Middle Name |
| last_name | VARCHAR(100) | ❌ | Last Name |
| date_of_birth | DATE | ✅ | Date of Birth |
| gender | ENUM | ✅ | Gender |
| email | VARCHAR(255) | ✅ | Email Address |
| phone | VARCHAR(20) | ✅ | Mobile Number |
| status | ENUM | ❌ | ACTIVE, GRADUATED, TRANSFERRED, ARCHIVED |
| created_at | TIMESTAMP | ❌ | Created Timestamp |
| updated_at | TIMESTAMP | ❌ | Updated Timestamp |
| created_by | UUID | ✅ | Created By |
| updated_by | UUID | ✅ | Updated By |

---

# Business Constraints

- Every Student belongs to one Organization.
- Student identity is independent of academic information.
- Students may have multiple Enrollments over time.
- Historical records remain available after Graduation or Transfer.

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

# Indexes

Primary

- id

Search

- organization_id
- first_name
- last_name
- email

Filtering

- status

---

# Relationships

Belongs To

- Organization

Has Many

- Student Identifiers

Has Many

- Enrollments

Has Many

- Chatbot Conversations

Has Many

- Counseling Sessions

---

# Lifecycle

```
ACTIVE

↓

GRADUATED

↓

ARCHIVED
```

or

```
ACTIVE

↓

TRANSFERRED

↓

ARCHIVED
```

---

# Migration Dependencies

## Must Exist Before

- organizations
- users

---

## Required Before

- student_identifiers
- enrollments
- chatbot_conversations
- counseling_sessions

---

# Notes

The Student table stores only personal identity.

It does **not** store:

- Learning Program
- Learning Level
- Academic Period
- Academic Performance
- Attendance
- Assessment
- Prediction

Those belong to their respective business entities.

---

End of Document