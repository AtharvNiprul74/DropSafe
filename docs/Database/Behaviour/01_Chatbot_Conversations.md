# Table - chatbot_conversations

**Schema:** Behaviour

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `chatbot_conversations` table stores conversation-level metadata for interactions between Students and the DropSafe chatbot.

A Conversation represents a logical interaction session.

Individual messages are stored separately in `chatbot_messages`.

---

# Aggregate Owner

Behaviour Aggregate

---

# Template Type

Operational Entity

---

# Business Rules

- Every Conversation belongs to exactly one Organization.
- Every Conversation belongs to exactly one Student.
- A Conversation may optionally be associated with an Enrollment.
- A Conversation contains one or more Chatbot Messages.
- Conversation metadata is not AI-generated.
- Original conversation history is preserved.
- AI analysis never modifies Conversation records.

---

# Business Key

```
id
```

---

# Table Name

```
chatbot_conversations
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| organization_id | UUID | ❌ | Organization |
| student_id | UUID | ❌ | Student |
| enrollment_id | UUID | ✅ | Related Enrollment |
| conversation_source | ENUM | ❌ | WEB, MOBILE, WHATSAPP |
| started_at | TIMESTAMP | ❌ | Conversation Start Time |
| ended_at | TIMESTAMP | ✅ | Conversation End Time |
| status | ENUM | ❌ | ACTIVE, COMPLETED, ARCHIVED |
| created_at | TIMESTAMP | ❌ | Creation Timestamp |

---

# Business Constraints

- A Conversation must belong to one Student.
- A Conversation must belong to one Organization.
- `ended_at` cannot be earlier than `started_at`.
- Conversation records are not modified by AI processing.
- Conversations remain available according to the organization's retention policy.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

organization_id → organizations.id

student_id → students.id

enrollment_id → enrollments.id (nullable)

---

## Check Constraints

```
ended_at >= started_at
```

when `ended_at` is provided.

---

# Indexes

Primary

- id

Search

- organization_id
- student_id
- enrollment_id

Filtering

- conversation_source
- status
- started_at

---

# Relationships

Belongs To

- Organization

Belongs To

- Student

Belongs To

- Enrollment (Optional)

Has Many

- Chatbot Messages

Consumed By

- AI Feature Engineering

---

# Lifecycle

```
ACTIVE

↓

COMPLETED

↓

ARCHIVED
```

Conversation content is preserved throughout its lifecycle.

---

# Migration Dependencies

## Must Exist Before

- organizations
- students
- enrollments

---

## Required Before

- chatbot_messages
- student_snapshots

---

# Notes

This table stores conversation metadata only.

It does not store:

- Message Text
- Sentiment
- Emotion
- Behaviour Score
- Engagement Score
- Risk Score
- AI Summary

Individual messages are stored in `chatbot_messages`.

AI-derived information belongs to the AI Schema.

---

# Design Principles

Student

↓

Chatbot Conversation

↓

Chatbot Messages

↓

AI Feature Engineering

↓

Student Snapshot

---

End of Document