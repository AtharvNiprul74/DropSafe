# Table - permissions

**Schema:** Master

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `permissions` table defines the smallest unit of authorization within the DropSafe platform.

Permissions specify which actions can be performed on a specific resource.

Permissions are assigned to Permission Groups.

Permission Groups are assigned to Roles.

Roles are assigned to Users.

---

# Aggregate Owner

Organization Aggregate

---

# Template Type

Master Entity

---

# Business Rules

- Every Permission belongs to exactly one Organization.
- Permission names must be unique within an Organization.
- One Permission may belong to multiple Permission Groups.
- Permissions should represent one specific action.
- Permissions are never assigned directly to Users.

---

# Table Name

```
permissions
```

---

# Naming Convention

Every Permission follows

```
resource:action
```

Examples

```
student:create
student:update
student:delete
student:view

attendance:create
attendance:update
attendance:view

prediction:generate
prediction:view

report:export

organization:update
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| permission_key | VARCHAR(100) | ❌ | Unique Permission Key |
| resource | VARCHAR(100) | ❌ | Business Resource |
| action | VARCHAR(50) | ❌ | Allowed Action |
| description | TEXT | ✅ | Description |
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

organization_id + permission_key

---

# Indexes

Primary

- id

Search

- organization_id
- permission_key

Filtering

- resource
- action

---

# Relationships

Belongs To

- Organization

Assigned To

- Permission Groups

---

# Lifecycle

Permissions remain active until explicitly disabled.

```
ACTIVE

↓

INACTIVE
```

---

# Example Permissions

Academic

```
student:create
student:update
student:view
student:delete

attendance:create
attendance:update
attendance:view

assessment:create
assessment:update
assessment:view
```

---

Prediction

```
prediction:generate
prediction:view
prediction:history
```

---

Counseling

```
counseling:create
counseling:update
counseling:view

mentor:assign
```

---

Import

```
import:create
import:view
import:history
```

---

Reporting

```
report:view
report:export
```

---

Administration

```
organization:update

user:create
user:update
user:view

role:create
role:update
role:view
```

---

# Notes

Permissions represent a single action on a single resource.

Avoid combining multiple actions into one Permission.

Good Example

```
student:view
```

Bad Example

```
student:manage
```

---


# Migration Dependencies

## Must Exist Before

- organizations
- users

---

## Required Before

- permission_group_permissions

---

# Freeze Status

| Area | Status |
|------|--------|
| Permission Model | ✅ |
| Naming Convention | ✅ |
| Constraints | ✅ |
| Relationships | ✅ |
| Lifecycle | ✅ |

---

End of Document