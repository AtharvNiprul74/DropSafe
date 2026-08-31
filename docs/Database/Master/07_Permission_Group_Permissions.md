# Table - permission_group_permissions

**Schema:** Master

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `permission_group_permissions` table maps Permission Groups to Permissions.

This table establishes a many-to-many relationship between Permission Groups and Permissions.

A Permission Group may contain multiple Permissions.

A Permission may belong to multiple Permission Groups.

---

# Aggregate Owner

Organization Aggregate

---

# Template Type

Operational Entity (Mapping Table)

---

# Business Rules

- Every mapping belongs to exactly one Organization.
- A Permission Group may contain multiple Permissions.
- A Permission may belong to multiple Permission Groups.
- Duplicate mappings are not allowed.
- Removing a mapping immediately updates the effective permissions of every Role using that Permission Group.

---

# Business Key

```
organization_id + permission_group_id + permission_id
```

---

# Table Name

```
permission_group_permissions
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| permission_group_id | UUID | ❌ | Permission Group |
| permission_id | UUID | ❌ | Permission |
| created_at | TIMESTAMP | ❌ | Assignment Timestamp |

---

# Business Constraints

- One Permission cannot be assigned twice to the same Permission Group.
- A mapping cannot exist without both a valid Permission Group and Permission.
- Mappings do not store additional business data.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

permission_group_id → permission_groups.id

permission_id → permissions.id

---

## Unique Constraints

organization_id + permission_group_id + permission_id

---

# Indexes

Primary

- id

Search

- organization_id
- permission_group_id
- permission_id

---

# Relationships

Belongs To

- Organization

Connects

- Permission Groups
- Permissions

---

# Lifecycle

This mapping exists until it is removed.

No additional lifecycle states are maintained.

---

# Migration Dependencies

## Must Exist Before

- organizations
- permission_groups
- permissions

---

## Required Before

- None

---

# Notes

This is a pure relationship table.

It should remain lightweight and contain no business logic beyond the association itself.

---

End of Document