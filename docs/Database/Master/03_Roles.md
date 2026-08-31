# Table - roles

**Schema:** Master

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `roles` table defines business roles within an Organization.

Roles determine what responsibilities a User has inside the DropSafe platform.

Examples

- Organization Admin
- Teacher
- Mentor

Organizations may also create custom roles.

---

# Aggregate Owner

Organization Aggregate

---

# Template Type

Master Entity

---

# Business Rules

- Every Role belongs to exactly one Organization.
- Role names must be unique within an Organization.
- One Role may be assigned to multiple Users.
- One Role may contain multiple Permission Groups.
- System Roles cannot be deleted.
- Custom Roles may be modified by Organization Admins.

---

# Table Name

```
roles
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| name | VARCHAR(100) | ❌ | Role Name |
| description | TEXT | ✅ | Role Description |
| is_system_role | BOOLEAN | ❌ | System or Custom Role |
| status | ENUM | ❌ | ACTIVE, INACTIVE |
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

created_by → users.id

updated_by → users.id

---

## Unique Constraints

organization_id + name

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

Has Many

- User Roles

Has Many

- Role Permission Groups

---

# Lifecycle

```
ACTIVE

↓

INACTIVE
```

---

# Notes

Roles define responsibilities.

Roles do not contain individual permissions directly.

Authorization is managed through Permission Groups.

---


# Migration Dependencies

Must Exist Before

- organizations
- users

Required Before

- role_permission_groups
- user_roles

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