# DropSafe - Authorization Model

**Version:** 1.0  
**Status:** DRAFT

**Depends On**
- 01_Product_Vision.md
- 02_Business_Workflow.md
- 03_Business_Rules.md
- 04_Domain_Architecture.md
- 05_State_Machines.md
- 06_System_Events.md
- 07_Privacy_And_Access_Control.md

---

# Purpose

This document defines how authorization works inside DropSafe.

Authorization determines:

- Who can perform actions.
- Which resources they can access.
- Under what conditions access is granted.
- What approval is required.

Authentication answers:

"Who are you?"

Authorization answers:

"What are you allowed to do?"

---

# Authorization Principles

## Principle 1

DropSafe follows Role-Based Access Control (RBAC).

Permissions are assigned to Roles.

Users receive permissions through their assigned Role.

---

## Principle 2

Permissions should never be hardcoded.

Roles can evolve without changing business logic.

---

## Principle 3

Authorization is always evaluated within an Organization.

Every permission is scoped to one Organization.

---

## Principle 4

Some permissions require additional business approval.

Example

Mentor Access

↓

Admin Approval

↓

Permission Granted

---

# Authorization Architecture

DropSafe follows a layered Role-Based Access Control (RBAC) model.

```
Organization
        │
        ▼
Permissions
        │
        ▼
Permission Groups
        │
        ▼
Roles
        │
        ▼
Users
```

### Description

- **Permissions** represent the smallest unit of authorization.
- **Permission Groups** bundle related permissions.
- **Roles** are created using one or more Permission Groups.
- **Users** receive one or more Roles.
- Every Role belongs to an Organization.

This architecture allows organizations to create custom roles without requiring backend code changes.
---

# Roles

A Role is composed of one or more Permission Groups.

Examples

Organization Admin

- Academic Management
- Student Management
- Reporting
- Import Management

---

Teacher

- Academic Management

---

Mentor

- Counseling

---

Future

Organizations may create custom roles.

Examples

- Principal
- Dean
- HOD
- Academic Coordinator
- Examination Officer
- Placement Officer

No backend code changes are required.

# Resources

Examples

Organization

Student

Academic Record

Attendance

Assessment

Behaviour Summary

Prediction

Counseling

Import Session

Reports

Users

---

# Actions

Every permission consists of an action.

Examples

Create

Read

Update

Delete

Approve

Assign

Import

Export

Generate

Schedule

Close

Archive

---

# Permissions

A Permission is the smallest authorization unit.

Naming Convention

```
resource:action
```

Examples

```
attendance:create

attendance:update

attendance:read

student:read

prediction:read

report:export

mentor:assign

counseling:create
```

Permissions should remain generic and reusable across organizations.

# Permission Groups

Permission Groups simplify Role management by grouping related permissions.

Examples

## Academic Management

- attendance:create
- attendance:update
- attendance:read
- assessment:create
- assessment:update
- assessment:read

---

## Student Management

- student:create
- student:update
- student:read

---

## Counseling

- prediction:read
- behaviour_summary:read
- counseling:create
- counseling:update

---

## Reporting

- report:read
- report:export

---

## Import Management

- import:create
- import:validate
- import:execute

Permission Groups may evolve without changing application code.


# Permission Naming Convention

Format

```
resource:action
```

Examples

```
student:read

student:update

attendance:create

attendance:update

prediction:read

prediction:generate

mentor:assign

counseling:schedule

report:export

user:create
```

---

# Permission Matrix

| Resource | Admin | Teacher | Mentor | Student |
|----------|-------|----------|---------|----------|
| Organization | CRUD | ❌ | ❌ | ❌ |
| Student | CRUD | Read Assigned | Read Assigned | Own Profile (Future) |
| Attendance | CRUD | CRUD Assigned | Read Summary | ❌ |
| Assessment | CRUD | CRUD Assigned | Read Summary | ❌ |
| Behaviour Summary | Read | ❌ | Read Assigned | ❌ |
| Prediction | Read | ❌ | Read Assigned | ❌ |
| Counseling | Read | ❌ | CRUD Assigned | Own Schedule (Future) |
| Users | CRUD | ❌ | ❌ | ❌ |
| Reports | Read/Export | Limited | Own Cases | ❌ |
| Import Session | CRUD | Upload Academic (Optional) | ❌ | ❌ |

---

# Resource Scope

Permissions are always evaluated within scope.

Example

Teacher

↓

Assigned Students Only

Mentor

↓

Assigned Cases Only

Organization Admin

↓

Entire Organization

---

# Approval-Based Permissions

Some actions require approval before becoming active.

Example

Mentor Access

```
Recommendation

↓

Admin Approval

↓

Access Granted
```

---

Other examples

- Export Reports
- Sensitive Data Access
- Future Parent Access

---

# Temporary Permissions

Some permissions expire automatically.

Examples

Mentor Case Access

↓

Granted

↓

Counseling Completed

↓

Follow-up Period Ends

↓

Permission Revoked

---

# Ownership Rules

Users may only modify resources they own or are authorized to manage.

Examples

Teacher

May modify

Assigned Attendance

Cannot modify

Predictions

---

Mentor

May modify

Own Counseling Notes

Cannot modify

Behaviour Summary

Cannot modify

Prediction History

---

Organization Admin

May manage

Organization Resources

Cannot modify

Historical Predictions

Historical Behaviour Summaries

---

# Immutable Resources

The following resources are immutable once generated.

- Behaviour Summary
- Prediction History
- Student Snapshot
- Audit Logs

Corrections create new records instead of editing history.

---

# Authorization Flow

```
Request

↓

Authentication

↓

Organization Validation

↓

Role Lookup

↓

Permission Check

↓

Scope Validation

↓

Approval Required?

↓

YES

↓

Approval Workflow

↓

Access Granted

↓

Execute Action
```

---

# Audit Requirements

Every authorization decision should record

- User ID
- Organization ID
- Resource
- Action
- Result
- Timestamp
- IP Address (Future)

---

# Future Authorization Features

- Custom Roles
- Permission Groups
- Attribute-Based Access Control (ABAC)
- Multi-Campus Administration
- Delegated Administration
- Single Sign-On (SSO)

---

# Authorization Principles

1. Role-Based Access Control.
2. Least Privilege.
3. Organization Isolation.
4. Approval Before Sensitive Access.
5. Immutable Historical Records.
6. Every Authorization Decision is Auditable.

---

# Examples

## Teacher

Allowed

```
attendance:create

attendance:update

assessment:create

assessment:update

student:read
```

Denied

```
prediction:generate

prediction:update

behaviour:update

mentor:assign
```

---

## Mentor

Allowed

```
prediction:read

behaviour_summary:read

counseling:create

counseling:update

student:read
```

Denied

```
attendance:update

assessment:update

prediction:update

behaviour_summary:update
```

---

## Organization Admin

Allowed

Everything inside their organization except modifying immutable AI-generated historical records.

---

# Authorization Design Principles

1. Organizations own their Roles.

2. Organizations may create custom Roles.

3. Permissions are reusable.

4. Permission Groups reduce duplication.

5. Roles should never contain hardcoded business logic.

6. Backend authorization checks Permissions rather than Role names.

7. Future modules should introduce new Permissions instead of modifying existing ones.

# Freeze Status

| Module | Status |
|---------|--------|
| Roles | ✅ |
| Permissions | ✅ |
| Resources | ✅ |
| Scope | ✅ |
| Approval | ✅ |
| Temporary Access | ✅ |
| Audit | ✅ |

---

End of Document
