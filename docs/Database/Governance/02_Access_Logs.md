# Table - access_logs

**Schema:** Governance

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `access_logs` table stores security-relevant access attempts made against DropSafe resources.

Access Logs provide visibility into whether a user or system actor was allowed or denied access to a protected resource.

Access Logs are historical and append-only.

---

# Aggregate Owner

Governance Aggregate

---

# Template Type

Historical Entity

---

# Business Rules

- Every Access Log belongs to exactly one Organization.
- Every Access Log identifies the actor making the access attempt.
- Access attempts may be successful or denied.
- Access Logs record access activity, not business changes.
- Access Logs are immutable.
- Sensitive resource content must never be stored in the Access Log.
- Both successful and denied access attempts may be recorded.

---

# Business Key

```text
id
Table Name
access_logs
Columns
Column	Type	Nullable	Description
id	UUID v7	❌	Primary Key
organization_id	UUID	❌	Organization
actor_user_id	UUID	✅	User Attempting Access
actor_type	ENUM	❌	USER, SYSTEM
resource_type	VARCHAR(100)	❌	Accessed Resource Type
resource_id	UUID	✅	Accessed Resource Identifier
access_action	VARCHAR(50)	❌	READ, WRITE, EXPORT
result	ENUM	❌	ALLOWED, DENIED
denial_reason	VARCHAR(255)	✅	Reason Access Was Denied
occurred_at	TIMESTAMP	❌	Access Attempt Timestamp
ip_address	INET	✅	Source IP Address
user_agent	TEXT	✅	Client Information
Business Constraints
Every Access Log belongs to one Organization.
USER access attempts should reference the responsible User.
SYSTEM access attempts may have no User.
A denied access attempt should contain a denial reason when available.
Access Logs cannot be updated after creation.
Access Logs must not contain the accessed resource's sensitive content.
Database Constraints
Primary Key
id
Foreign Keys

organization_id → organizations.id

actor_user_id → users.id (nullable)

Check Constraints

For USER actors:

actor_type = USER
→ actor_user_id IS NOT NULL

For SYSTEM actors:

actor_type = SYSTEM
→ actor_user_id IS NULL

For denied access:

result = DENIED
→ denial_reason IS NOT NULL
Indexes

Primary

id

Search

organization_id
actor_user_id
resource_type
resource_id

Filtering

access_action
result
occurred_at
Relationships

Belongs To

Organization

Belongs To

User (Optional)

References

Protected Resource
Lifecycle
CREATED
    ↓
IMMUTABLE
    ↓
HISTORICAL

Access Logs have no update lifecycle.

Migration Dependencies
Must Exist Before
organizations
Optional Dependency
users
Notes

Example: Allowed Access

Actor:
USER

Resource:
STUDENT

Action:
READ

Result:
ALLOWED

Example: Denied Access

Actor:
USER

Resource:
COUNSELING_SESSION

Action:
READ

Result:
DENIED

Reason:
INSUFFICIENT_PERMISSION

The Access Log records the access attempt.

It does not store the contents of the accessed resource.

Privacy

Access Logs themselves may contain security-sensitive information.

They must not store:

Passwords
Authentication Tokens
Chatbot Message Content
Counseling Notes
Academic Record Content
Other unnecessary sensitive information

IP addresses and user-agent information should be retained only according to applicable security and privacy requirements.

Retention

Access Logs follow the applicable security and organization retention policy.

Historical access records must remain immutable.

Design Principles
Access Attempt
      ↓
Authorization Decision
      ↓
Access Log

Access Logs provide security visibility.

They do not replace the Authorization Model.

End of Document