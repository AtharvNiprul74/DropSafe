# Table - permission_groups

**Schema:** Master

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `permission_groups` table represents logical collections of related permissions.

Permission Groups simplify authorization management by grouping multiple permissions under a single business capability.

Instead of assigning individual permissions to Roles, DropSafe assigns Permission Groups.

---

# Aggregate Owner

Organization Aggregate

---

# Template Type

Master Entity

---

# Business Rules

- Every Permission Group belongs to exactly one Organization.
- Permission Group names must be unique within an Organization.
- One Permission Group contains multiple Permissions.
- One Permission Group may be assigned to multiple Roles.
- Organizations may create custom Permission Groups.
- Permission Groups simplify Role management.

---

# Table Name

```
permission_groups
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| name | VARCHAR(100) | ❌ | Permission Group Name |
| description | TEXT | ✅ | Description |
| status | ENUM | ❌ | ACTIVE, INACTIVE |
| created_at | TIMESTAMP | ❌ | Created Timestamp |
| created_by | UUID | ✅ | Created By |
---

# Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

created_by → users.id

updated_by → users.id

---

## Unique Constraints

organization_id + name

---

## Check Constraints

Status

```
ACTIVE

INACTIVE
```

---

# Indexes

Primary

- id

Search

- organization_id
- name

Filtering

- status

---

# Relationships

Belongs To

- Organization

Contains

- Permissions

Assigned To

- Roles

---

# Lifecycle

```
ACTIVE

↓

INACTIVE
```

---

# Example Permission Groups

Academic Management

- Student Management
- Attendance
- Assessment
- Academic Records

---

Prediction Management

- View Predictions
- Generate Predictions
- Prediction Reports

---

Counseling Management

- Mentor Assignment
- Counseling Sessions
- Follow-up

---

Import Management

- CSV Upload
- Import History
- Import Reports

---

System Administration

- User Management
- Role Management
- Organization Settings

---

# Notes

Permission Groups should represent business capabilities rather than technical operations.

Keep groups meaningful and easy for administrators to understand.

---


# Migration Dependencies

## Must Exist Before

- organizations
- users

---

## Required Before

- permissions
- role_permission_groups
- permission_group_permissions

---

# Freeze Status

| Area | Status |
|------|--------|
| Business Rules | ✅ |
| Columns | ✅ |
| Constraints | ✅ |
| Relationships | ✅ |
| Lifecycle | ✅ |

---

End of Document