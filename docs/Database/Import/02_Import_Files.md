# Table - import_files

**Schema:** Import

**Version:** 1.0

**Status:** DRAFT

---

# Purpose

The `import_files` table stores metadata about files submitted as part of an Import Session.

It represents the source artifact used by DropSafe during data import.

The actual file content is stored outside the database or in object storage. This table stores only the metadata and reference required to identify, validate, and process the file.

---

# Aggregate Owner

Import Aggregate

---

# Template Type

Operational Entity

---

# Business Rules

- Every Import File belongs to exactly one Import Session.
- An Import Session may contain one or more Import Files.
- Every file has a recorded original filename.
- Every file has a recorded storage reference.
- File metadata is preserved for traceability.
- The same physical file must not be processed multiple times within the same Import Session.
- File content is not stored directly inside the relational database.

---

# Business Key

```text
id
```

---

# Table Name

```text
import_files
```

---

# Columns

| Column | Type | Nullable | Description |
|---------|------|----------|-------------|
| id | UUID v7 | ❌ | Primary Key |
| import_session_id | UUID | ❌ | Import Session |
| original_file_name | VARCHAR(255) | ❌ | Original Uploaded Filename |
| storage_key | VARCHAR(500) | ❌ | Object Storage Reference |
| file_size_bytes | BIGINT | ❌ | File Size |
| file_hash | VARCHAR(128) | ❌ | File Integrity Hash |
| mime_type | VARCHAR(100) | ❌ | File MIME Type |
| created_at | TIMESTAMP | ❌ | Upload Timestamp |

---

# Business Constraints

- Every Import File belongs to one Import Session.
- `file_size_bytes` must be greater than zero.
- `storage_key` must uniquely identify the stored file.
- `file_hash` is used to verify file integrity.
- Uploaded files must pass file-type and size validation before processing.
- Original files must not be modified after upload.

---

# Database Constraints

## Primary Key

- id

---

## Foreign Keys

import_session_id → import_sessions.id

---

## Unique Constraints

```text
import_session_id + file_hash
```

---

## Check Constraints

```text
file_size_bytes > 0
```

---

# Indexes

Primary

- id

Search

- import_session_id
- file_hash

Filtering

- created_at

---

# Relationships

Belongs To

- Import Session

---

# Lifecycle

```text
UPLOADED
   ↓
VALIDATED
   ↓
PROCESSED
```

Failure path:

```text
UPLOADED
   ↓
REJECTED
```

---

# Migration Dependencies

## Must Exist Before

- import_sessions

---

## Required Before

- import_reports

---

# Notes

This table does not store the actual file contents.

Example:

```text
Original File Name:
attendance_august.csv

Storage Key:
imports/org-123/session-456/attendance_august.csv

File Size:
245 KB

MIME Type:
text/csv
```

The storage key points to the configured object/file storage system.

---

# Security

Uploaded files may contain sensitive student information.

Access to stored files must follow:

- Organization isolation
- Authorization rules
- Data privacy policies
- Retention policies

File storage references must not be exposed directly to unauthorized users.

---

# Integrity

The `file_hash` allows DropSafe to verify that the file being processed is the same file that was originally uploaded.

Example:

```text
Uploaded File
     ↓
SHA-256 Hash
     ↓
Stored Metadata
     ↓
Processing
```

---

# Design Principles

Import Session

↓

Import File

↓

Validation

↓

Processing

↓

Academic Evidence

---

End of Document