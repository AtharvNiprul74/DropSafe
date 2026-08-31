# Table - organization_settings

**Schema:** Master

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `organization_settings` table stores configurable settings for an Organization.

These settings allow each Organization to customize DropSafe according to its academic structure and operational preferences without modifying the application.

---

# Aggregate Owner

Organization Aggregate

---

# Template Type

Configuration Entity

---

# Business Rules

- Every Organization has exactly one Settings record.
- Settings are configurable only by authorized administrators.
- Changes affect future system behavior and do not modify historical records.
- Settings are organization-specific.

---

# Business Key

```
organization_id
```

---

# Table Name

```
organization_settings
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| student_identifier_label | VARCHAR(100) | ❌ | PRN, Roll Number, Enrollment Number, etc. |
| academic_calendar_type | ENUM | ❌ | Semester, Trimester, Annual |
| default_upload_frequency | ENUM | ✅ | Weekly, Monthly, Manual |
| chatbot_enabled | BOOLEAN | ❌ | Enable Chatbot Module |
| prediction_enabled | BOOLEAN | ❌ | Enable Prediction Module |
| counseling_enabled | BOOLEAN | ❌ | Enable Counseling Module |
| graduated_student_retention_months | INTEGER | ❌ | Retention Period |
| retention_action | ENUM | ❌ | ARCHIVE, ANONYMIZE, DELETE |
| updated_at | TIMESTAMP | ❌ | Last Updated Timestamp |
| updated_by | UUID | ✅ | Last Updated By |

---

# Business Constraints

- One Organization has exactly one Settings record.
- Student Identifier Label is configurable.
- Retention Policy applies only to future cleanup operations.
- Module enable/disable flags affect system behavior immediately.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

updated_by → users.id (nullable)

---

## Unique Constraints

- organization_id

---

# Indexes

Primary

- id

Search

- organization_id

---

# Relationships

Belongs To

- Organization

---

# Lifecycle

Settings remain active throughout the Organization lifecycle.

Settings are updated as organizational requirements change.

---

# Migration Dependencies

## Must Exist Before

- organizations
- users

---

## Required Before

- Academic Schema
- AI Schema
- Import Schema

---

# Notes

Organization Settings centralize configurable behavior.

Application logic should read configuration from this table instead of using hardcoded values.

---

End of Document