/**
 * DropSafe V1 — Enumerations
 * Every value below is taken verbatim from the Final PRD (§7–§20).
 * Do not rename values; the PRD forbids silently changing terminology.
 */

export const ORG_TYPES = ['SCHOOL', 'COLLEGE', 'UNIVERSITY', 'POLYTECHNIC', 'TRAINING_INSTITUTE', 'OTHER'] as const;
export type OrgType = (typeof ORG_TYPES)[number];

/** Shared simple lifecycle: Organization, Learning Program, Learning Level, Learning Component */
export const SIMPLE_LIFECYCLE = ['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
export type SimpleStatus = (typeof SIMPLE_LIFECYCLE)[number];

export const USER_STATUSES = ['ACTIVE', 'LOCKED', 'INACTIVE'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const PERIOD_STATUSES = ['PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] as const;
export type PeriodStatus = (typeof PERIOD_STATUSES)[number];

export const COMPONENT_TYPES = ['SUBJECT', 'COURSE', 'MODULE', 'UNIT', 'COMPETENCY', 'OTHER'] as const;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

export const STUDENT_STATUSES = ['ACTIVE', 'GRADUATED', 'TRANSFERRED', 'ARCHIVED'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const IDENTIFIER_TYPES = [
  'PRN',
  'ROLL_NUMBER',
  'ADMISSION_NUMBER',
  'REGISTRATION_NUMBER',
  'ENROLLMENT_NUMBER',
  'STUDENT_ID',
] as const;
export type IdentifierType = (typeof IDENTIFIER_TYPES)[number];

export const ENROLLMENT_STATUSES = ['ACTIVE', 'COMPLETED', 'WITHDRAWN', 'TRANSFERRED', 'ARCHIVED'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const IMPORT_TYPES = ['STUDENT', 'ENROLLMENT', 'ATTENDANCE', 'ASSESSMENT'] as const;
export type ImportType = (typeof IMPORT_TYPES)[number];

export const IMPORT_SOURCES = ['CSV', 'API'] as const;
export type ImportSource = (typeof IMPORT_SOURCES)[number];

export const IMPORT_STATUSES = [
  'CREATED',
  'VALIDATING',
  'VALIDATED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export const IMPORT_REPORT_STATUSES = ['SUCCESS', 'PARTIAL_SUCCESS', 'FAILED'] as const;
export type ImportReportStatus = (typeof IMPORT_REPORT_STATUSES)[number];

export const SENTIMENTS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const SNAPSHOT_STATUSES = ['GENERATED', 'PREDICTED', 'SUPERSEDED'] as const;
export type SnapshotStatus = (typeof SNAPSHOT_STATUSES)[number];

export const PREDICTION_LABELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type PredictionLabel = (typeof PREDICTION_LABELS)[number];

/**
 * PRD Q6: business rules allow "Prediction Unavailable" when evidence is insufficient,
 * but the predictions table only defines LOW/MEDIUM/HIGH. The UI therefore represents
 * unavailability WITHOUT a label instead of inventing a schema value.
 */
export type PredictionState = PredictionLabel | 'UNAVAILABLE' | 'PENDING';

export const MODEL_STATUSES = ['ACTIVE', 'RETIRED'] as const;
export type ModelStatus = (typeof MODEL_STATUSES)[number];

export const INTERVENTION_TYPES = ['ACADEMIC', 'ATTENDANCE', 'BEHAVIOURAL', 'COUNSELING', 'OTHER'] as const;
export type InterventionType = (typeof INTERVENTION_TYPES)[number];

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const INTERVENTION_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type InterventionStatus = (typeof INTERVENTION_STATUSES)[number];

export const SESSION_TYPES = ['IN_PERSON', 'ONLINE', 'PHONE', 'WHATSAPP'] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const SESSION_STATUSES = ['SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const FOLLOW_UP_TYPES = ['REVIEW', 'CHECK_IN', 'ACTION', 'REFERRAL', 'OTHER'] as const;
export type FollowUpType = (typeof FOLLOW_UP_TYPES)[number];

export const FOLLOW_UP_STATUSES = ['PENDING', 'COMPLETED', 'MISSED', 'CANCELLED'] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const RETENTION_ACTIONS = ['ARCHIVE', 'ANONYMIZE', 'DELETE'] as const;
export type RetentionAction = (typeof RETENTION_ACTIONS)[number];

export const AUDIT_OUTCOMES = ['SUCCESS', 'FAILURE'] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

export const ACCESS_ACTIONS = ['READ', 'WRITE', 'EXPORT'] as const;
export type AccessAction = (typeof ACCESS_ACTIONS)[number];

export const ACCESS_RESULTS = ['ALLOWED', 'DENIED'] as const;
export type AccessResult = (typeof ACCESS_RESULTS)[number];

export const NOTIFICATION_TYPES = [
  'MENTOR_ALERT',
  'STUDENT_REMINDER',
  'FOLLOW_UP_REMINDER',
  'IMPORT_NOTIFICATION',
  'SYSTEM_NOTIFICATION',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP', 'IN_APP'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ['QUEUED', 'SENT', 'DELIVERED', 'FAILED'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const MENTOR_ACCESS_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type MentorAccessStatus = (typeof MENTOR_ACCESS_STATUSES)[number];

export const GRADING_OUTCOMES = ['PASS', 'FAIL', 'PENDING'] as const;
export type GradingOutcome = (typeof GRADING_OUTCOMES)[number];

export const SYSTEM_ROLES = ['ORG_ADMIN', 'TEACHER', 'MENTOR'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];
