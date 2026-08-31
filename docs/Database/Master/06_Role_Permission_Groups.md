# Table - role_permission_groups

**Schema:** Master

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `role_permission_groups` table maps Roles to Permission Groups.

This table establishes a many-to-many relationship between Roles and Permission Groups.

A Role may contain multiple Permission Groups.

A Permission Group may belong to multiple Roles.

---

# Aggregate Owner

Organization Aggregate

---

# Template Type

Operational Entity

---

# Business Rules

- Every mapping belongs to exactly one Organization.
- A Role may be linked to multiple Permission Groups.
- A Permission Group may be linked to multiple Roles.
- Duplicate mappings are not allowed.
- Removing a mapping immediately changes the effective permissions of Users assigned to that Role.

---

# Table Name

```
role_permission_groups
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| role_id | UUID | ❌ | Role |
| permission_group_id | UUID | ❌ | Permission Group |
| created_at | TIMESTAMP | ❌ | Created Timestamp |
| created_by | UUID | ✅ | Created By |

---

# Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

role_id → roles.id

permission_group_id → permission_groups.id

created_by → users.id

---

## Unique Constraints

organization_id + role_id + permission_group_id

---

# Indexes

Primary

- id

Search

- organization_id
- role_id
- permission_group_id

---

# Relationships

Belongs To

- Organization

Connects

- Roles
- Permission Groups

---

# Lifecycle

Created

↓

Active

↓

Deleted (Mapping Removed)

Removing a mapping does not delete the Role or Permission Group.

---

# Example

Teacher Role

↓

Academic Management

↓

Reporting

---

Mentor Role

↓

Counseling Management

↓

Reporting

---

Organization Admin

↓

Academic Management

↓

Counseling Management

↓

Import Management

↓

System Administration

---

# Notes

This table exists only to connect Roles and Permission Groups.

No additional business information should be stored here.

---

# Migration Dependencies

## Must Exist Before

- organizations
- users
- roles
- permission_groups

---

## Required Before

- user_roles

---

# Freeze Status

| Area | Status |
|------|--------|
| Relationship Model | ✅ |
| Constraints | ✅ |
| Indexes | ✅ |
| Lifecycle | ✅ |

---

End of Document