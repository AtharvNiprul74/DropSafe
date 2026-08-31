# Table - users

**Schema:** Master

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `users` table represents authenticated portal users of the DropSafe platform.

Users can access the system according to their assigned roles and permissions.

Examples

- Organization Admin
- Teacher
- Mentor

Students are **not portal users** in Version 1.

Students interact only through the chatbot.

---

# Aggregate Owner

Organization Aggregate

---

# Template Type

Master Entity

---

# Business Rules

- Every User belongs to exactly one Organization.
- A User can have one or more Roles.
- Email must be unique within an Organization.
- Passwords are never stored in plain text.
- Authentication is email-based.
- Authorization is role-based.
- Users can be disabled without deleting historical records.

---

# Table Name

users

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| employee_code | VARCHAR(50) | ✅ | Employee Code |
| first_name | VARCHAR(100) | ❌ | First Name |
| last_name | VARCHAR(100) | ❌ | Last Name |
| email | VARCHAR(255) | ❌ | Login Email |
| phone | VARCHAR(20) | ✅ | Contact Number |
| password_hash | TEXT | ❌ | Encrypted Password |
| status | ENUM | ❌ | ACTIVE, LOCKED, INACTIVE |
| last_login_at | TIMESTAMP | ✅ | Last Login |
| created_at | TIMESTAMP | ❌ | Created Timestamp |
| updated_at | TIMESTAMP | ❌ | Updated Timestamp |
| created_by | UUID | ✅ | Created By |
| updated_by | UUID | ✅ | Updated By |

---

# Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

created_by → users.id (nullable)

updated_by → users.id (nullable)

## Bootstrap Rules

During the initial installation of DropSafe, the first Organization Admin is created by the bootstrap process.

Therefore:

- created_by may be NULL.
- updated_by may be NULL.

After the initial administrator account exists, all subsequent User records should reference the User that created or updated them.

---

## Unique Constraints

organization_id + email

---

## Check Constraints

Status

ACTIVE

LOCKED

INACTIVE

---

# Indexes

Primary

- id

Search

- organization_id
- email

Filtering

- status

---

# Relationships

## Belongs To

Organization

---

## Has Many

User Roles

---

## Creates

Organizations

Roles

Permission Groups

Students

Learning Programs

Academic Records

Import Sessions

---

# Lifecycle

ACTIVE

↓

LOCKED

↓

INACTIVE

---

# Security Considerations

Passwords must be stored using a strong hashing algorithm.

Passwords should never be reversible.

Authentication and authorization are handled separately.

---

# Migration Dependencies

## Must Exist Before

organizations

---

## Required Before Creating

roles

user_roles

organization_settings

students

learning_programs

academic_records

attendance_records

assessment_records

---



# Notes

Users represent authenticated system users.

Students are stored separately.

---

End of Document