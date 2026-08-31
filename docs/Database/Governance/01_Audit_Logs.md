# Table - audit_logs

**Schema:** Governance

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `audit_logs` table stores a permanent record of important business and administrative actions performed within DropSafe.

Audit Logs provide accountability by recording who performed an action, what was affected, when it occurred, and the result of the operation.

Audit Logs are historical records and are append-only.

---

# Aggregate Owner

Governance Aggregate

---

# Template Type

Historical Entity

---

# Business Rules

- Every Audit Log belongs to exactly one Organization.
- An Audit Log may be associated with a User.
- System-generated actions may have no User.
- Audit Logs record important business, administrative, and security-relevant actions.
- Audit Logs are immutable.
- Audit Logs must never be used as the primary source of business data.
- Sensitive data must not be stored unnecessarily in Audit Logs.

---

# Business Key

```text
id
Table Name
audit_logs
Columns
Column	Type	Nullable	Description
id	UUID v7	❌	Primary Key
organization_id	UUID	❌	Organization
actor_user_id	UUID	✅	User Who Performed the Action
actor_type	ENUM	❌	USER, SYSTEM
action	VARCHAR(100)	❌	Action Performed
resource_type	VARCHAR(100)	❌	Affected Resource Type
resource_id	UUID	✅	Affected Resource Identifier
outcome	ENUM	❌	SUCCESS, FAILURE
occurred_at	TIMESTAMP	❌	Action Timestamp
metadata	JSONB	✅	Non-sensitive Contextual Metadata
Business Constraints
Every Audit Log must identify an Organization.
Every Audit Log must identify whether the actor was a User or System.
USER actions should reference the responsible User.
SYSTEM actions may have a null actor_user_id.
Audit Logs cannot be updated after creation.
Audit Logs cannot be used to reconstruct sensitive business data that should remain in the owning Aggregate.
Metadata must contain only information necessary for auditability.
Database Constraints
Primary Key
id
Foreign Keys

organization_id → organizations.id

actor_user_id → users.id (nullable)

Check Constraints

For USER actions:

actor_type = USER
→ actor_user_id IS NOT NULL

For SYSTEM actions:

actor_type = SYSTEM
→ actor_user_id IS NULL
Indexes

Primary

id

Search

organization_id
actor_user_id
resource_type
resource_id

Filtering

action
outcome
occurred_at
Relationships

Belongs To

Organization

Belongs To

User (Optional)

References

Business Resource
Lifecycle
CREATED
    ↓
IMMUTABLE
    ↓
HISTORICAL

Audit Logs have no update lifecycle.

Migration Dependencies
Must Exist Before
organizations
Optional Dependency
users
Notes

Examples:

Student Update
Actor Type:
USER

Action:
UPDATE_STUDENT

Resource Type:
STUDENT

Outcome:
SUCCESS
Import Completion
Actor Type:
SYSTEM

Action:
IMPORT_COMPLETED

Resource Type:
IMPORT_SESSION

Outcome:
SUCCESS
Permission Change
Actor Type:
USER

Action:
UPDATE_ROLE

Resource Type:
ROLE

Outcome:
SUCCESS

The Audit Log records that an action occurred.

The actual Student, Import Session, Role, or other business record remains the source of truth in its respective schema.

Privacy

Audit Logs must not contain:

Passwords
Authentication tokens
Full chatbot messages
Counseling session contents
Unnecessary personal information
Sensitive data copied from business records

Metadata should contain only the minimum information required for auditability.

Retention

Audit Logs are retained according to the applicable platform and organization retention policy.

Historical records must not be modified to change their meaning.

Deletion, when legally or operationally required, must follow the approved retention and privacy process.

Design Principles
Business Action
      ↓
Audit Event
      ↓
Audit Log

Audit Logs provide accountability.

They do not replace business records.

End of Document