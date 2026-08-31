# Table - user_roles

**Schema:** Master

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `user_roles` table assigns Roles to Users.

This table establishes a many-to-many relationship between Users and Roles.

A User may have multiple Roles.

A Role may be assigned to multiple Users.

---

# Aggregate Owner

Organization Aggregate

---

# Template Type

Operational Entity (Mapping Table)

---

# Business Rules

- Every assignment belongs to exactly one Organization.
- A User may have multiple Roles.
- A Role may be assigned to multiple Users.
- Duplicate assignments are not allowed.
- Removing an assignment immediately changes the User's effective permissions.

---

# Business Key

```
organization_id + user_id + role_id
```

---

# Table Name

```
user_roles
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| user_id | UUID | ❌ | User |
| role_id | UUID | ❌ | Role |
| assigned_at | TIMESTAMP | ❌ | Assignment Timestamp |
| assigned_by | UUID | ✅ | User who assigned the Role |

---

# Business Constraints

- A User cannot be assigned the same Role more than once.
- A Role assignment requires a valid User and Role.
- Assignments should only exist within the same Organization.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

user_id → users.id

role_id → roles.id

assigned_by → users.id (nullable)

---

## Unique Constraints

organization_id + user_id + role_id

---

# Indexes

Primary

- id

Search

- organization_id
- user_id
- role_id

---

# Relationships

Belongs To

- Organization

Connects

- Users
- Roles

---

# Lifecycle

A Role Assignment exists until it is removed.

No additional lifecycle states are maintained.

---

# Migration Dependencies

## Must Exist Before

- organizations
- users
- roles

---

## Required Before

- organization_settings

---

# Notes

This is a pure relationship table.

A User's effective permissions are calculated through:

```
User

↓

Role

↓

Permission Group

↓

Permission
```

No permission information is stored directly in this table.

---

End of Document