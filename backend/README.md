# DropSafe V1 — Backend Platform

> **Student Risk Detection and Early Intervention Platform**  
> Built with Node.js, Express, TypeScript, Prisma, and PostgreSQL.

---

## Module 1 — Core Platform, Database Schemas, Authentication & Multi-Tenant Governance

This module establishes the foundational layer of the DropSafe modular monolith backend in strict compliance with the DropSafe V1 PRD.

### Architecture Overview

```text
src/
├── config/             # Strict Zod environment variables, database lifecycle, security constants
├── core/               # Domain errors, response helpers, context typing, JWT & password utils
├── middlewares/        # Authentication, Tenant Isolation, RBAC, Governance Logging, Error Handler
├── modules/
│   ├── auth/           # Login, token refresh, profile, password change
│   ├── organization/   # Organization profile, settings, user provisioning
│   └── governance/     # Immutable Audit Logs and Access Logs APIs
└── prisma/             # Complete Prisma schema (35 models across 7 PRD domains) & Seed script
```

---

## 1. Relational Database Schema (`prisma/schema.prisma`)

Defined across 7 logical PRD domains containing all 35 models:

1. **Master / Organization**: `organizations`, `organization_settings`, `users`, `roles`, `permission_groups`, `permissions`, `role_permission_groups`, `permission_group_permissions`, `user_roles`
2. **Academic**: `learning_programs`, `learning_levels`, `academic_periods`, `learning_components`, `students`, `student_identifiers`, `enrollments`, `academic_records`, `attendance_records`, `assessment_records`
3. **Import**: `import_sessions`, `import_files`, `import_reports`
4. **Behaviour**: `chatbot_conversations`, `chatbot_messages`
5. **AI**: `ai_model_metadata`, `student_snapshots`, `behaviour_summaries`, `predictions`, `prediction_history`
6. **Counseling**: `interventions`, `counseling_sessions`, `follow_ups`
7. **Governance**: `audit_logs`, `access_logs`, `notification_history`

---

## 2. Security & Multi-Tenancy Engine

- **Strict Tenant Isolation (`enforceTenantIsolation`)**: Every request is verified against the authenticated user's `organization_id`. Any query parameter, route parameter, or request body containing a mismatched organization ID is blocked with a `403 TENANT_SCOPE_VIOLATION`.
- **RBAC Authorization (`requirePermission`)**: Permissions flow through `User -> Role -> Permission Group -> Permission`.
- **Governance Audit Logging (`recordAuditLog` / `autoAuditLogger`)**: State-changing operations (`POST`, `PUT`, `PATCH`, `DELETE`) are logged to append-only `audit_logs`.
- **Governance Access Logging (`logAccessAttempt` / `accessTracker`)**: Security-relevant access attempts (`READ`, `WRITE`, `EXPORT`) are tracked. Denied attempts record a required denial reason in `access_logs`.
- **Authentication**: Salted password hashing with bcrypt, JWT access tokens (`1h`), refresh tokens (`7d`), and endpoint-specific rate-limiting.

---

## 3. Seeded Baseline Data (`prisma/seed.ts`)

- **30 Baseline Permissions**: Across student, attendance, assessment, prediction, counseling, import, reports, organization, users, roles, audit, and access domains.
- **6 Permission Groups**: Academic Management, Prediction Management, Counseling Management, Import Management, Reporting, and System Administration.
- **3 Standard System Roles**:
  - `Organization Admin`
  - `Teacher`
  - `Mentor`
- **Bootstrap Tenant & Super Admin**:
  - Organization: `DropSafe Demonstration Academy` (`DROPSAFE-DEMO-01`)
  - Super Admin: `admin@dropsafe.demo` / `Admin@DropSafe2026!`

---

## 4. Getting Started

### Prerequisites
- Node.js >= 18
- PostgreSQL server running on `localhost:5432`

### Setup & Run

1. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and verify database credentials:
   ```env
   DATABASE_URL="postgresql://postgres:root@localhost:5432/dropsafe_v1?schema=public"
   ```

2. **Generate Prisma Client & Sync Database**:
   ```bash
   npm run prisma:generate
   npm run prisma:push
   ```

3. **Seed Database**:
   ```bash
   npm run prisma:seed
   ```

4. **Run Integration Tests**:
   ```bash
   npm test
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

6. **Production Build & Start**:
   ```bash
   npm run build
   npm start
   ```

---

## 5. Module 1 API Reference

| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Platform health ping |
| `GET` | `/api/v1/health` | Public | Deep health check (PostgreSQL connectivity) |
| `POST` | `/api/v1/auth/login` | Rate-limited | Authenticate user and issue JWT access & refresh tokens |
| `POST` | `/api/v1/auth/refresh` | Rate-limited | Exchange refresh token for fresh access token |
| `GET` | `/api/v1/auth/me` | Bearer Auth | Current user profile, roles, and effective permissions |
| `POST` | `/api/v1/auth/change-password` | Bearer Auth | Change current user password |
| `GET` | `/api/v1/organization` | Tenant Scoped | View active organization profile & statistics |
| `PATCH` | `/api/v1/organization` | `organization:update` | Update organization metadata |
| `GET` | `/api/v1/organization/settings` | Tenant Scoped | View organization configuration settings |
| `PATCH` | `/api/v1/organization/settings` | `organization:update` | Update organization settings |
| `GET` | `/api/v1/organization/users` | `user:view` | List users within the active tenant |
| `POST` | `/api/v1/organization/users` | `user:create` | Provision new user and assign roles |
| `GET` | `/api/v1/governance/audit-logs` | `audit:view` | Query tenant-scoped audit logs with pagination & filters |
| `GET` | `/api/v1/governance/access-logs` | `access:view` | Query security access logs (ALLOWED/DENIED) with filters |

---

## Module 2 — Academic Domain & Organization Management

Module 2 implements the core business entities for managing institutions, academic structure hierarchy, student identities, enrollments, attendance, and assessment records.

### Module 2 Architecture

```text
src/modules/
├── organization/         # Organization & Settings APIs (feature flags, identifier label, retention policies)
├── academic/             # Programs, Levels, Periods, Components & Hierarchy Tree
└── student/              # Students, Identifiers, Enrollments & Academic Records (Attendance + Assessments)
```

### Domain Rules & State Machines

#### 1. Academic Structure Hierarchy
- **Learning Program**: Lifecycle follows `ACTIVE` <-> `INACTIVE` -> `ARCHIVED`. `ARCHIVED` is a terminal state. Program codes and names are uniquely enforced within the organization.
- **Learning Level**: Numbered sequence (Year 1, Year 2) with uniqueness enforced on `[organization_id, learning_program_id, level_number]`.
- **Academic Period**: Strict lifecycle progression `PLANNED` -> `ACTIVE` -> `COMPLETED` -> `ARCHIVED`. Chronological date constraint strictly enforces `end_date > start_date`.
- **Learning Component**: Subjects/modules attached to academic periods with domain constraints `passing_marks <= maximum_marks` and `maximum_marks > 0`.
- **Academic Hierarchy Tree**: `/api/v1/academic/hierarchy` aggregates programs -> levels -> periods -> components into an optimized nested graph.

#### 2. Student Identity & Identifiers
- **Decoupled Identity**: Student profile records basic personal identity, decoupled from enrollments and academic performance.
- **Tenant-Unique Identifiers**: Business keys (PRN, Roll Number, Enrollment ID) enforce tenant-wide uniqueness on `[organization_id, identifier_type, identifier_value]`.
- **Primary Identifier Management**: Supports setting primary identifiers with automatic demotion of previous primary records.
- **Business Identifier Lookup**: Quick lookup `/api/v1/students/lookup/identifier` to resolve students by identifier type and value.

#### 3. Enrollments Engine & Automatic Academic Records
- **Enrollment Lifecycle**: Connects a Student to an Academic Period (`ACTIVE` -> `COMPLETED` / `WITHDRAWN` / `TRANSFERRED` -> `ARCHIVED`).
- **Uniqueness**: A student can only be enrolled once in a given academic period (`[organization_id, student_id, academic_period_id]`).
- **Automatic Provisioning**: Every enrollment atomically creates an associated `AcademicRecord` to track performance metrics.

#### 4. Attendance & Assessment Domain Rules
- **Attendance Records**:
  - Domain constraint: `attended_sessions <= total_sessions`.
  - Automated metric: Attendance percentage is computed dynamically (`(attended / total) * 100`).
  - Relational check: Component must belong to the academic period of the enrollment.
- **Assessment Records**:
  - Domain constraint: `obtained_marks <= maximum_marks` and `maximum_marks > 0`.
  - Automated metric: Score percentage is computed dynamically (`(obtained / maximum) * 100`).
  - Automated evaluation: `grading_outcome` defaults to `PASS` if `obtained_marks >= component.passing_marks`, otherwise `FAIL`.
  - Relational check: Component must belong to the academic period of the enrollment.

---

## 6. Module 2 API Reference

### Organization & Settings
| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `GET` | `/api/v1/organization` | Tenant Scoped | View active organization details and statistics |
| `PATCH` | `/api/v1/organization` | `organization:update` | Update organization name, type, or status |
| `GET` | `/api/v1/organization/settings` | Tenant Scoped | View organization settings |
| `PATCH` | `/api/v1/organization/settings` | `organization:update` | Update settings (identifier label, retention policy, feature flags) |

### Academic Structure Hierarchy
| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `GET` | `/api/v1/academic/hierarchy` | `academic:view` | View complete nested hierarchy (Programs -> Levels -> Periods -> Components) |
| `POST` | `/api/v1/academic/programs` | `academic:create` | Create learning program |
| `GET` | `/api/v1/academic/programs` | `academic:view` | List learning programs with filters & pagination |
| `GET` | `/api/v1/academic/programs/:id` | `academic:view` | Get learning program details with levels |
| `PATCH` | `/api/v1/academic/programs/:id` | `academic:update` | Update learning program name & description |
| `PATCH` | `/api/v1/academic/programs/:id/status` | `academic:update` | Transition program status (`ACTIVE`, `INACTIVE`, `ARCHIVED`) |
| `DELETE` | `/api/v1/academic/programs/:id` | `academic:update` | Delete learning program (if no historical enrollments) |
| `POST` | `/api/v1/academic/levels` | `academic:create` | Create learning level under program |
| `GET` | `/api/v1/academic/levels` | `academic:view` | List learning levels |
| `GET` | `/api/v1/academic/levels/:id` | `academic:view` | Get learning level details with periods |
| `PATCH` | `/api/v1/academic/levels/:id` | `academic:update` | Update learning level |
| `PATCH` | `/api/v1/academic/levels/:id/status` | `academic:update` | Transition level status |
| `POST` | `/api/v1/academic/periods` | `academic:create` | Create academic period (`end_date > start_date`) |
| `GET` | `/api/v1/academic/periods` | `academic:view` | List academic periods |
| `GET` | `/api/v1/academic/periods/:id` | `academic:view` | Get academic period with components & enrollments |
| `PATCH` | `/api/v1/academic/periods/:id` | `academic:update` | Update academic period name & dates |
| `PATCH` | `/api/v1/academic/periods/:id/status` | `academic:update` | Transition period status (`PLANNED` -> `ACTIVE` -> `COMPLETED` -> `ARCHIVED`) |
| `POST` | `/api/v1/academic/components` | `academic:create` | Create learning component (`passing_marks <= maximum_marks`) |
| `GET` | `/api/v1/academic/components` | `academic:view` | List learning components |
| `GET` | `/api/v1/academic/components/:id` | `academic:view` | Get learning component details |
| `PATCH` | `/api/v1/academic/components/:id` | `academic:update` | Update learning component name, type, or marks |
| `PATCH` | `/api/v1/academic/components/:id/status` | `academic:update` | Transition component status |

### Student Identity, Identifiers & Enrollments
| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `POST` | `/api/v1/students` | `student:create` | Create decoupled student profile (with optional inline identifier) |
| `GET` | `/api/v1/students` | `student:view` | Search and list student profiles with pagination |
| `GET` | `/api/v1/students/:id` | `student:view` | Get student profile with all identifiers & enrollments |
| `PATCH` | `/api/v1/students/:id` | `student:update` | Update student profile details |
| `PATCH` | `/api/v1/students/:id/status` | `student:update` | Transition student status (`ACTIVE`, `GRADUATED`, `TRANSFERRED`, `ARCHIVED`) |
| `DELETE` | `/api/v1/students/:id` | `student:update` | Delete student profile (if no active enrollments) |
| `POST` | `/api/v1/students/:id/identifiers` | `student:update` | Assign identifier (PRN, Roll Number) with tenant-uniqueness check |
| `GET` | `/api/v1/students/:id/identifiers` | `student:view` | List identifiers for student |
| `PATCH` | `/api/v1/students/:id/identifiers/:identifierId` | `student:update` | Update identifier value or primary flag |
| `DELETE` | `/api/v1/students/:id/identifiers/:identifierId` | `student:update` | Remove identifier from student |
| `GET` | `/api/v1/students/lookup/identifier` | `student:view` | Lookup student by identifier type and value |
| `POST` | `/api/v1/students/:id/enrollments` | `student:create` | Enroll student into period (auto-provisions linked `AcademicRecord`) |
| `GET` | `/api/v1/students/enrollments` | `student:view` | List enrollments across active organization |
| `GET` | `/api/v1/students/enrollments/:enrollmentId` | `student:view` | Get enrollment details with components & records |
| `PATCH` | `/api/v1/students/enrollments/:enrollmentId/status` | `student:update` | Transition enrollment status (`ACTIVE` -> `COMPLETED`, `WITHDRAWN`, `TRANSFERRED`) |

### Academic Records (Attendance & Assessments)
| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `GET` | `/api/v1/students/academic-records/:recordId` | `student:view` | Get academic record with aggregate attendance & score metrics |
| `POST` | `/api/v1/students/academic-records/:recordId/attendance` | `attendance:create` | Record attendance (`attended_sessions <= total_sessions`) |
| `PATCH` | `/api/v1/students/academic-records/attendance/:attendanceId` | `attendance:update` | Update attendance sessions |
| `POST` | `/api/v1/students/academic-records/:recordId/assessments` | `assessment:create` | Record assessment marks (`obtained_marks <= maximum_marks`, auto PASS/FAIL) |
| `PATCH` | `/api/v1/students/academic-records/assessments/:assessmentId` | `assessment:update` | Update assessment marks |

---

## Module 3 — Data Import Engine & Bulk Validation Pipeline

Module 3 delivers an enterprise-grade, resilient, transactional bulk data import engine capable of ingesting high-volume CSV datasets across Students, Enrollments, Attendance, and Assessments in strict compliance with the DropSafe V1 PRD.

### Module 3 Architecture

```text
src/modules/import/
├── controllers/
│   └── import.controller.ts            # REST endpoints for session lifecycle, uploads, validation, commit, and reports
├── services/
│   ├── csvParser.service.ts            # RFC 4180 compliant streaming/tokenized CSV parser (BOM, CRLF, escaped quotes)
│   ├── importSession.service.ts        # Finite state machine lifecycle engine & session query manager
│   ├── importStorage.service.ts        # Multipart upload handler, disk storage, and SHA-256 integrity verification
│   ├── validationPipeline.service.ts   # Two-Stage Validation Pipeline (Fatal Structural vs Row-Level Logical)
│   └── importExecution.service.ts      # Atomic transactional commit engine (Zero Partial Academic Commit guarantee)
├── validators/
│   ├── import.validation.ts            # HTTP request payload schemas (session, commit, cancel, pagination)
│   ├── student.row.validator.ts        # Stage 1 header checks & Stage 2 schema validation for Student profiles
│   ├── enrollment.row.validator.ts     # Header & row schema validation for Period Enrollments
│   ├── attendance.row.validator.ts     # Header & row schema validation (attended <= total logical rule)
│   └── assessment.row.validator.ts     # Header & row schema validation (obtained <= max & auto PASS/FAIL)
└── routes/
    └── import.routes.ts                # Express routes with Multer in-memory upload, RBAC, and tenant isolation
```

---

### Key Capabilities & Domain Rules

#### 1. Lifecycle State Machine
Strict transitions enforce import reliability and auditability:
- Progression: `CREATED` -> `VALIDATING` -> `VALIDATED` -> `PROCESSING` -> `COMPLETED`
- Exception handling: `FAILED` (fatal structural error, unrecoverable exception, or strict rejection) and `CANCELLED` (user abort)
- Terminal state safety: Terminal states (`COMPLETED`, `FAILED`, `CANCELLED`) cannot transition out. Illegal state flows are rejected with `400 ValidationError`.

#### 2. File Storage & SHA-256 Integrity Engine
- Uploaded files are verified, SHA-256 digested, and saved to `uploads/imports/<session_id>/`.
- Unique constraint `[import_session_id, file_hash]` prevents duplicate file uploads to the same import session (rejects with `409 Conflict`).
- Tracks metadata: original filename, storage key, file size, MIME type, and cryptographic hash in `import_files`.

#### 3. Two-Stage Validation Pipeline
- **Stage 1 (Fatal Structural Checks)**:
  - Detects corrupted/binary files and strips UTF-8 BOM.
  - Verifies presence of required headers per `import_type`.
  - On fatal error: Session transitions immediately to `FAILED`, an error report is created, and **Zero Partial Academic Commit** is strictly guaranteed.
- **Stage 2 (Row-Level Validation)**:
  - Student: Required names, PRN/Roll No, duplicate checks within file.
  - Enrollment: Resolves student PRN and period code against active tenant database; rejects enrollment into `COMPLETED` or `ARCHIVED` periods.
  - Attendance: Resolves student enrollment and linked `AcademicRecord`; enforces domain rule `attended_sessions <= total_sessions`.
  - Assessment: Resolves student enrollment and linked `AcademicRecord`; enforces domain rule `obtained_marks <= maximum_marks`; dynamically determines `PASS`/`FAIL` outcome based on component passing marks.

#### 4. Transactional Commit & Partial Success
- Commits valid records inside an atomic `prisma.$transaction`.
- Supports `allow_partial: true` (`PARTIAL_SUCCESS`: commits valid records and logs row-level errors) or `allow_partial: false` (strict mode: aborts and rejects entire batch if even one row is invalid).
- Automatically provisions `AcademicRecord` (1:1) upon committing new `Enrollment` records.
- Records append-only Governance Audit Log for all commit operations.

---

### Module 3 API Reference

| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `POST` | `/api/v1/import/sessions` | `import:create` | Initialize import session (`import_type`, `source_type`) in `CREATED` status |
| `GET` | `/api/v1/import/sessions` | `import:view` | List import sessions with pagination and type/status filters |
| `GET` | `/api/v1/import/sessions/:sessionId` | `import:view` | Get import session details, attached files, and report summary |
| `POST` | `/api/v1/import/sessions/:sessionId/upload` | `import:create` | Upload CSV file via multipart form-data (SHA-256 hash verified) |
| `POST` | `/api/v1/import/sessions/:sessionId/validate` | `import:create` | Trigger Two-Stage Validation Pipeline (`Stage 1` & `Stage 2`) |
| `POST` | `/api/v1/import/sessions/:sessionId/commit` | `import:create` | Transactionally commit validated records (`allow_partial` support) |
| `POST` | `/api/v1/import/sessions/:sessionId/cancel` | `import:create` | Cancel an active import session (`CREATED` / `VALIDATED`) |
| `GET` | `/api/v1/import/sessions/:sessionId/report` | `import:history` | Retrieve complete import execution report with row error details |
| `POST` | `/api/v1/import/quick-import` | `import:create` | All-in-one multipart upload, validation, and commit in a single call |

---

## Module 4 — Behaviour Domain & AI Integration Engine

Module 4 implements the behavioural data ingestion pipeline, student privacy enforcement, point-in-time snapshot aggregation engine, and AI model risk prediction framework in strict compliance with the DropSafe V1 PRD.

### Module 4 Architecture

```text
src/modules/
├── behaviour/
│   ├── controllers/
│   │   └── behaviour.controller.ts     # WhatsApp webhook, conversation lifecycle, and privacy-restricted message APIs
│   ├── services/
│   │   └── behaviour.service.ts        # Student resolution, immutable message ingestion, and conversation manager
│   ├── validators/
│   │   └── behaviour.validation.ts     # Webhook, conversation, message, and status schemas
│   └── routes/
│       └── behaviour.routes.ts         # Express router with privacy middleware, RBAC, and tenant isolation
└── ai/
    ├── controllers/
    │   └── ai.controller.ts            # AI models, snapshots, predictions, and behaviour summaries endpoints
    ├── services/
    │   ├── aiModel.service.ts          # AI model metadata management and version lifecycle (ACTIVE / RETIRED)
    │   ├── snapshot.service.ts         # Immutable point-in-time student snapshot aggregator
    │   └── prediction.service.ts       # Risk prediction ingestion, automated inference, and prediction history
    ├── validators/
    │   └── ai.validation.ts            # AI model, snapshot generation, prediction, and summary validation schemas
    └── routes/
        └── ai.routes.ts                # Express router for AI domain APIs
```

---

### Key Capabilities & Domain Rules

#### 1. Behaviour Ingestion & Strict Privacy Rules
- **WhatsApp Webhook Ingestion**: Ingests incoming student messages and bot responses via `/api/v1/behaviour/webhook/whatsapp`. Automatically resolves student by phone, PRN, or student ID.
- **Strict Privacy Enforcement**: Raw student chatbot interaction messages (`ChatbotMessage`) are stored immutably and **MUST NOT** be readable by Mentors or Organization Admins (`403 FORBIDDEN`).
- **Privacy-Preserving Queries**: The conversations list API returns conversation metadata, timestamps, and message counts without exposing raw message text.

#### 2. Student Snapshot Engine (`student_snapshots`)
- Aggregates point-in-time, immutable student data across multiple dimensions:
  - `attendance_percentage`: Dynamically computed as $\frac{\sum \text{attended\_sessions}}{\sum \text{total\_sessions}} \times 100$.
  - `overall_marks_percentage`: Dynamically computed as $\frac{\sum \text{obtained\_marks}}{\sum \text{maximum\_marks}} \times 100$.
  - `failed_learning_components`: Count of components where outcome is `FAIL`.
  - `backlog_count`: Count of unresolved failed components.
  - `behaviour_score`, `engagement_score`, `sentiment_score`: Interaction frequency and engagement metrics.
- **Snapshot Lifecycle State Machine**:
  $$\text{GENERATED} \longrightarrow \text{PREDICTED} \longrightarrow \text{SUPERSEDED}$$
  Generating a new snapshot for an active enrollment automatically marks preceding active snapshots as `SUPERSEDED`.

#### 3. AI Metadata & Prediction Ingestion
- **AI Model Metadata**: Version-controlled registry (`model_name`, `model_version`, `algorithm`, `feature_version`, `training_dataset_version`, `status`). Predictions cannot be generated using `RETIRED` models.
- **Prediction Ingestion**: Attaches risk classification (`LOW`, `MEDIUM`, `HIGH`) and confidence percentage (0-100) to a snapshot.
- **Automatic Prediction History**: Ingesting a prediction atomically writes a historical snapshot record into `prediction_history` for longitudinal tracking and auditability.
- **Automated Inference Engine**: Built-in multi-factor risk inference evaluating attendance and academic failure indicators.

#### 4. Behaviour Summaries (`behaviour_summaries`)
- Stores human-readable, privacy-preserving AI behavioural summaries (`summary`, `dominant_sentiment`, `confidence_score`).
- Mentors and educators can safely review these high-level qualitative summaries to plan counseling interventions without breaching student conversation privacy.

---

### Module 4 API Reference

#### Behaviour Domain
| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `POST` | `/api/v1/behaviour/webhook/whatsapp` | `student:update` | Ingest incoming WhatsApp student message or bot response |
| `POST` | `/api/v1/behaviour/conversations` | `student:update` | Start new chatbot conversation for a student |
| `GET` | `/api/v1/behaviour/conversations` | `student:view` | List conversations (metadata & message counts only) |
| `GET` | `/api/v1/behaviour/conversations/:id` | `student:view` | Get conversation metadata by ID |
| `PATCH` | `/api/v1/behaviour/conversations/:id/status` | `student:update` | Transition conversation status (`ACTIVE` -> `COMPLETED` / `ARCHIVED`) |
| `POST` | `/api/v1/behaviour/conversations/:id/messages` | `student:update` | Append immutable message to an active conversation |
| `GET` | `/api/v1/behaviour/conversations/:id/messages` | `student:view` + Privacy | Query raw messages (**Mentors & Admins strictly blocked with 403**) |

#### AI & Prediction Domain
| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `POST` | `/api/v1/ai/models` | `prediction:generate` | Register AI Model Metadata (`model_version`, algorithm, dataset) |
| `GET` | `/api/v1/ai/models` | `prediction:view` | List registered AI models with status filter |
| `GET` | `/api/v1/ai/models/:version` | `prediction:view` | Get AI model details by version |
| `PATCH` | `/api/v1/ai/models/:version/status` | `prediction:generate` | Transition model status (`ACTIVE` <-> `RETIRED`) |
| `POST` | `/api/v1/ai/snapshots/generate` | `prediction:generate` | Generate point-in-time student snapshot (supersedes older snapshots) |
| `GET` | `/api/v1/ai/snapshots` | `prediction:view` | List student snapshots with filters (`student_id`, `status`) |
| `GET` | `/api/v1/ai/snapshots/:id` | `prediction:view` | Get snapshot details with predictions and behaviour summary |
| `POST` | `/api/v1/ai/predictions` | `prediction:generate` | Ingest risk prediction (auto-appends to `prediction_history`) |
| `POST` | `/api/v1/ai/predictions/predict/:snapshotId` | `prediction:generate` | Run automated multi-factor risk inference for a snapshot |
| `GET` | `/api/v1/ai/predictions/:id` | `prediction:view` | Get prediction details |
| `GET` | `/api/v1/ai/predictions/history` | `prediction:history` | Query longitudinal prediction history with pagination & filters |
| `POST` | `/api/v1/ai/behaviour-summaries` | `prediction:generate` | Ingest privacy-preserving behaviour summary for a snapshot |
| `GET` | `/api/v1/ai/behaviour-summaries/:snapshotId` | `prediction:view` | Retrieve behaviour summary (safe for Mentor viewing) |

---

## Module 5: Counseling & Human Intervention Domain

### Overview
Module 5 completes the DropSafe V1 core backend by establishing the human-in-the-loop support, mentorship, and post-prediction remediation pipeline. It closes the loop between AI early warnings and structured educator interventions.

### Key Capabilities & Domain Rules

#### 1. Interventions Engine (`interventions`)
- **Support Action Management**: Mentors and educators initiate targeted support actions created after reviewing student risk predictions or academic alerts.
- **Intervention Types**: `ACADEMIC`, `ATTENDANCE`, `BEHAVIOURAL`, `COUNSELING`, `OTHER`.
- **Priority Matrix**: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- **Relational Integrity**: `responsible_user_id` and `student_id` must belong to the caller's organization. Optional `prediction_id` must link to a valid prediction for that student.
- **Intervention Lifecycle State Machine**:
  $$\text{PLANNED} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{COMPLETED} \quad (\text{or } \text{CANCELLED})$$
- **Terminal State Constraints**: Once an intervention is `COMPLETED` or `CANCELLED`, it cannot be re-opened, modified, or transitioned. Transitioning to `COMPLETED` requires a valid `completed_at` timestamp.

#### 2. Counseling Sessions (`counseling_sessions`)
- **Direct Counselor-Student Interaction**: Record and track scheduled mentorship sessions under an active intervention.
- **Session Types**: `IN_PERSON`, `ONLINE`, `PHONE`, `WHATSAPP`.
- **Session Lifecycle**:
  $$\text{SCHEDULED} \longrightarrow \text{COMPLETED} \quad / \quad \text{MISSED} \quad / \quad \text{CANCELLED}$$
- **Timestamp Integrity Rules**:
  - `COMPLETED` sessions strictly require both `started_at` and `ended_at`.
  - `ended_at` **CANNOT** precede `started_at` (`ended_at >= started_at`).
  - `SCHEDULED` sessions must not have an `ended_at` timestamp.
  - Sessions cannot be scheduled under a `COMPLETED` or `CANCELLED` intervention.
- **Privacy & Note Restrictions**: Session notes and outcome assessments are human-authored and restricted to authorized counselors, mentors, and administrators.

#### 3. Follow-Ups Engine (`follow_ups`)
- **Post-Session & Post-Intervention Monitoring**: Track subsequent milestones, checks, and action items.
- **Follow-Up Types**: `REVIEW`, `CHECK_IN`, `ACTION`, `REFERRAL`, `OTHER`.
- **Follow-Up Lifecycle**:
  $$\text{PENDING} \longrightarrow \text{COMPLETED} \quad / \quad \text{MISSED} \quad / \quad \text{CANCELLED}$$
- **State Machine Rules**:
  - `PENDING` follow-ups must **NOT** have a `completed_at` timestamp.
  - `COMPLETED` follow-ups require a valid `completed_at` timestamp (defaulted if omitted).
  - **Terminal Cancellation Rule**: Cancelled follow-ups **CANNOT** later be marked completed (`Cancelled follow-ups cannot later be marked completed`).

#### 4. Governance & Notification Integration
- **Notification History (`notification_history`)**:
  - Automatically records `MENTOR_ALERT` when an intervention is assigned or counseling session is scheduled.
  - Records `FOLLOW_UP_REMINDER` when a follow-up task is scheduled.
- **Immutable Audit Logging (`audit_logs`)**:
  - Logs state transitions (`intervention:create`, `intervention:status_change`, `counseling_session:schedule`, `counseling_session:status_change`, `follow_up:create`, `follow_up:status_change`).

---

### Module 5 API Reference

| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `POST` | `/api/v1/counseling/interventions` | `counseling:create` | Create a new intervention (PLANNED status, triggers MENTOR_ALERT) |
| `GET` | `/api/v1/counseling/interventions` | `counseling:view` | Query interventions with pagination & filters (`student_id`, `status`, `priority`) |
| `GET` | `/api/v1/counseling/interventions/:id` | `counseling:view` | Get intervention details with student, mentor, prediction & session counts |
| `PUT` | `/api/v1/counseling/interventions/:id` | `counseling:update` | Update intervention details (allowed while not completed/cancelled) |
| `PATCH` | `/api/v1/counseling/interventions/:id/status` | `counseling:update` | Transition intervention status (`PLANNED` -> `IN_PROGRESS` -> `COMPLETED` / `CANCELLED`) |
| `POST` | `/api/v1/counseling/sessions` | `counseling:create` | Schedule counseling session under active intervention |
| `GET` | `/api/v1/counseling/sessions` | `counseling:view` | Query counseling sessions with filters (`intervention_id`, `student_id`, `status`) |
| `GET` | `/api/v1/counseling/sessions/:id` | `counseling:view` | Get counseling session details, notes, outcomes & follow-ups |
| `PUT` | `/api/v1/counseling/sessions/:id` | `counseling:update` | Update scheduled session details |
| `PATCH` | `/api/v1/counseling/sessions/:id/status` | `counseling:update` | Transition session status (`SCHEDULED` -> `COMPLETED` / `MISSED` / `CANCELLED`) |
| `POST` | `/api/v1/counseling/follow-ups` | `counseling:create` | Create follow-up check (pending must not have completed_at) |
| `GET` | `/api/v1/counseling/follow-ups` | `counseling:view` | Query follow-ups with filters (`intervention_id`, `status`, `type`) |
| `GET` | `/api/v1/counseling/follow-ups/:id` | `counseling:view` | Get follow-up details |
| `PUT` | `/api/v1/counseling/follow-ups/:id` | `counseling:update` | Update follow-up task details |
| `PATCH` | `/api/v1/counseling/follow-ups/:id/status` | `counseling:update` | Transition follow-up status (cancelled cannot later be completed) |
| `GET` | `/api/v1/counseling/notifications` | `counseling:view` | Query tenant notification history (`MENTOR_ALERT`, `FOLLOW_UP_REMINDER`) |

