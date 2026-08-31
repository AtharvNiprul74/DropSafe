# Table - notification_history

**Schema:** Governance

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `notification_history` table stores the history of notifications generated and sent by DropSafe.

It provides traceability for system communications such as mentor alerts, student reminders, follow-up reminders, and import notifications.

Notification History records what notification was sent, through which channel, to whom, and whether delivery succeeded.

---

# Aggregate Owner

Governance Aggregate

---

# Template Type

Historical Entity

---

# Business Rules

- Every Notification belongs to exactly one Organization.
- Every Notification has a defined recipient.
- Every Notification has a defined notification type.
- Every Notification uses one delivery channel.
- Notification History is append-only.
- Delivery status may be updated while delivery is in progress.
- Once delivery reaches a terminal state, the record is treated as historical.
- Notification content must not unnecessarily contain sensitive student information.

---

# Business Key

```text
id
Table Name
notification_history
Columns
Column	Type	Nullable	Description
id	UUID v7	❌	Primary Key
organization_id	UUID	❌	Organization
recipient_user_id	UUID	✅	Recipient User
recipient_student_id	UUID	✅	Recipient Student
notification_type	ENUM	❌	MENTOR_ALERT, STUDENT_REMINDER, FOLLOW_UP_REMINDER, IMPORT_NOTIFICATION, SYSTEM_NOTIFICATION
channel	ENUM	❌	EMAIL, SMS, WHATSAPP, IN_APP
subject	VARCHAR(255)	✅	Notification Subject
delivery_status	ENUM	❌	QUEUED, SENT, DELIVERED, FAILED
provider_reference	VARCHAR(255)	✅	External Provider Reference
sent_at	TIMESTAMP	✅	Sent Timestamp
delivered_at	TIMESTAMP	✅	Delivery Timestamp
failure_reason	VARCHAR(500)	✅	Delivery Failure Reason
created_at	TIMESTAMP	❌	Creation Timestamp
Business Constraints
Every Notification belongs to one Organization.
A Notification must have a recipient.
A recipient may be a User or Student.
Delivery status reflects the state reported by the notification provider or internal delivery system.
Failed notifications must retain the failure reason when available.
Notification records must not contain unnecessary sensitive information.
Terminal delivery records are treated as historical records.
Database Constraints
Primary Key
id
Foreign Keys

organization_id → organizations.id

recipient_user_id → users.id (nullable)

recipient_student_id → students.id (nullable)

Check Constraints

At least one recipient must be specified:

recipient_user_id IS NOT NULL
OR
recipient_student_id IS NOT NULL

For delivery timestamps:

delivered_at IS NULL
OR
delivery_status = DELIVERED
Indexes

Primary

id

Search

organization_id
recipient_user_id
recipient_student_id

Filtering

notification_type
channel
delivery_status
created_at
Relationships

Belongs To

Organization

Belongs To

User (Optional)

Belongs To

Student (Optional)

References

Intervention
Follow-up
Import Session
Lifecycle
QUEUED
   ↓
SENT
   ↓
DELIVERED

Failure path:

QUEUED / SENT
   ↓
FAILED
Migration Dependencies
Must Exist Before
organizations
Optional Dependencies
users
students
Notes

Examples:

Mentor Alert
Type:
MENTOR_ALERT

Channel:
IN_APP

Status:
DELIVERED
Student Reminder
Type:
STUDENT_REMINDER

Channel:
WHATSAPP

Status:
SENT
Import Notification
Type:
IMPORT_NOTIFICATION

Channel:
EMAIL

Status:
DELIVERED

Notification History records delivery activity.

It does not replace the business entity that caused the notification.

For example:

Follow-up
    ↓
Notification

The Follow-up remains the source of truth for the required action.

Privacy

Notification records must not unnecessarily store:

Full counseling notes
Complete chatbot conversations
Passwords
Authentication tokens
Sensitive academic details

Only the minimum information required for notification delivery and traceability should be retained.

Retention

Notification History follows the applicable platform and organization retention policy.

Terminal notification records are treated as historical records.

Design Principles
Business Event
      ↓
Notification
      ↓
Delivery
      ↓
Notification History

Notification History records communication activity.

It does not replace the business record that triggered the notification.

End of Document