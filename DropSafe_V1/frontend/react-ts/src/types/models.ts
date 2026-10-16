/**
 * DropSafe V1 — Domain models (frontend view types).
 * Field names follow the PRD database specifications. where the backend adds
 * server fields (ids/audit columns) they are optional here so the UI never
 * depends on unfrozen API contracts.
 */
import type {
  AccessAction,
  AccessResult,
  AuditOutcome,
  ComponentType,
  EnrollmentStatus,
  FollowUpStatus,
  FollowUpType,
  GradingOutcome,
  IdentifierType,
  ImportReportStatus,
  ImportSource,
  ImportStatus,
  ImportType,
  InterventionStatus,
  InterventionType,
  MentorAccessStatus,
  ModelStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  OrgType,
  PeriodStatus,
  PredictionLabel,
  PredictionState,
  Priority,
  RetentionAction,
  Sentiment,
  SessionStatus,
  SessionType,
  SimpleStatus,
  SnapshotStatus,
  StudentStatus,
  UserStatus,
} from './enums';

/* ---------------------------------- Auth --------------------------------- */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  organizationName: string;
  roles: string[];
  /** Effective permissions resolved via Role → Permission Group → Permission */
  permissions: string[];
  /** Set for mentor accounts — ids of students assigned to this mentor. */
  assignedStudentIds?: string[];
}

export interface LoginResponse {
  token: string;
  user: SessionUser;
}

/* ------------------------------- Master data ------------------------------ */

export interface Organization {
  id: string;
  name: string;
  code: string;
  type: OrgType;
  status: SimpleStatus;
  contactEmail?: string;
  phone?: string;
  address?: string;
  createdAt: string;
}

export interface OrganizationSettings {
  id: string;
  organizationId: string;
  studentIdentifierLabel: string;
  academicCalendarType: string;
  defaultUploadFrequency: string;
  chatbotEnabled: boolean;
  predictionEnabled: boolean;
  counselingEnabled: boolean;
  graduatedRetentionMonths: number;
  retentionAction: RetentionAction;
}

export interface PortalUser {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  roles: { id: string; name: string }[];
  lastLoginAt?: string;
  createdAt: string;
}

export interface Permission {
  id: string;
  code: string;
  description?: string;
}

export interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  permissionIds: string[];
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissionGroupIds: string[];
  memberCount?: number;
}

/* ------------------------------- Academic --------------------------------- */

export interface LearningProgram {
  id: string;
  code: string;
  name: string;
  status: SimpleStatus;
  description?: string;
}

export interface LearningLevel {
  id: string;
  programId: string;
  levelNumber: number;
  name: string;
  status: SimpleStatus;
}

export interface AcademicPeriod {
  id: string;
  levelId: string;
  code: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
}

export interface LearningComponent {
  id: string;
  periodId: string;
  code: string;
  name: string;
  type: ComponentType;
  maximumMarks: number;
  passingMarks: number;
  status: SimpleStatus;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  status: StudentStatus;
  dateOfBirth?: string;
  gender?: string;
  email?: string;
  phone?: string;
  guardianName?: string;
  guardianPhone?: string;
  createdAt: string;
}

export interface StudentIdentifier {
  id: string;
  studentId: string;
  identifierType: IdentifierType;
  identifierValue: string;
  isPrimary: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface Enrollment {
  id: string;
  studentId: string;
  academicPeriodId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  /* display helpers resolved by the API/demo adapter */
  programName?: string;
  levelName?: string;
  periodCode?: string;
}

export interface AttendanceRecord {
  id: string;
  enrollmentId: string;
  learningComponentId: string;
  attendedSessions: number;
  totalSessions: number;
  updatedAt: string;
  importSessionId?: string;
}

export interface AssessmentRecord {
  id: string;
  enrollmentId: string;
  learningComponentId: string;
  obtainedMarks: number;
  maximumMarks: number;
  gradingOutcome: GradingOutcome;
  updatedAt: string;
}

/** Student 360 bundle returned by GET /students/:id */
export interface StudentDetail {
  student: Student;
  identifiers: StudentIdentifier[];
  enrollments: Enrollment[];
  attendance: (AttendanceRecord & { componentCode?: string; componentName?: string })[];
  assessments: (AssessmentRecord & { componentCode?: string; componentName?: string })[];
}

/* --------------------------------- Imports -------------------------------- */

export interface ImportSession {
  id: string;
  importType: ImportType;
  sourceType: ImportSource;
  status: ImportStatus;
  createdByName: string;
  createdAt: string;
  fileName?: string;
  fileSizeBytes?: number;
  fileHash?: string;
  mimeType?: string;
  errorMessage?: string;
}

export interface ImportReport {
  id: string;
  importSessionId: string;
  totalRecords: number;
  validRecords: number;
  rejectedRecords: number;
  insertedRecords: number;
  updatedRecords: number;
  resultStatus: ImportReportStatus;
  summary?: string;
}

/** Validation preview produced after VALIDATED, before PROCESSING (Upload → Validate → Preview → Process → Commit). */
export interface ImportPreview {
  validRecords: number;
  rejectedRecords: number;
  sampleValidRows: string[][];
  sampleRejectedRows: { row: string[]; reason: string }[];
}

/* ------------------------------ AI intelligence --------------------------- */

export interface StudentSnapshot {
  id: string;
  studentId: string;
  enrollmentId: string;
  importSessionId?: string;
  status: SnapshotStatus;
  attendancePercentage: number;
  overallMarksPercentage: number;
  failedLearningComponents: number;
  backlogCount: number;
  behaviourScore: number;
  engagementScore: number;
  sentimentScore: number;
  featureVersion: string;
  generatedAt: string;
}

export interface BehaviourSummary {
  id: string;
  snapshotId: string;
  studentId: string;
  summary: string;
  dominantSentiment: Sentiment;
  confidenceScore: number;
  aiModelVersion: string;
  generatedAt: string;
  /** Mentor access only ever sees approved summaries (PRD §17). */
  approvedForMentor: boolean;
}

export interface Prediction {
  id: string;
  snapshotId: string;
  studentId: string;
  predictionLabel: PredictionLabel;
  predictionScore: number; // supplied schema: prediction confidence percentage (0–100)
  aiModelVersion: string;
  featureVersion: string;
  generatedAt: string;
}

export interface PredictionHistoryEntry {
  id: string;
  studentId: string;
  snapshotId: string;
  predictionLabel: PredictionLabel;
  riskProbability: number;
  predictionConfidence: number;
  aiModelVersion: string;
  generatedAt: string;
}

export interface AiModelMetadata {
  id: string;
  modelName: string;
  modelVersion: string;
  algorithm: string;
  featureVersion: string;
  trainingDatasetVersion: string;
  deployedAt: string;
  status: ModelStatus;
}

/** One row on the risk-monitoring board. */
export interface RiskBoardRow {
  studentId: string;
  studentName: string;
  primaryIdentifier?: string;
  programName?: string;
  levelName?: string;
  snapshot?: StudentSnapshot;
  prediction?: Prediction;
  /** UNAVAILABLE when evidence is insufficient — never a guessed label (PRD §14). */
  state: PredictionState;
  hasOpenIntervention: boolean;
  mentorCanSeeSummary: boolean;
}

/* -------------------------------- Counseling ------------------------------ */

export interface Intervention {
  id: string;
  studentId: string;
  predictionId?: string;
  interventionType: InterventionType;
  priority: Priority;
  status: InterventionStatus;
  title: string;
  description?: string;
  responsibleUserId: string;
  responsibleUserName?: string;
  studentName?: string;
  createdByName?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CounselingSession {
  id: string;
  interventionId: string;
  studentId: string;
  mentorId: string;
  mentorName?: string;
  sessionType: SessionType;
  status: SessionStatus;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  /** Restricted — visible only to authorized users (counseling:view). */
  outcomeSummary?: string;
}

export interface FollowUp {
  id: string;
  interventionId: string;
  counselingSessionId?: string;
  followUpType: FollowUpType;
  status: FollowUpStatus;
  dueDate: string;
  assignedUserId: string;
  assignedUserName?: string;
  note?: string;
  createdAt: string;
  completedAt?: string;
  interventionTitle?: string;
  studentName?: string;
}

/* -------------------------------- Governance ------------------------------ */

export interface AuditLog {
  id: string;
  actorType: 'USER' | 'SYSTEM';
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  outcome: AuditOutcome;
  createdAt: string;
  detail?: string;
}

export interface AccessLog {
  id: string;
  userName: string;
  action: AccessAction;
  result: AccessResult;
  denialReason?: string;
  resource: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipientLabel: string;
  subject: string;
  createdAt: string;
}

export interface MentorAccessRequest {
  id: string;
  mentorId: string;
  mentorName: string;
  studentId: string;
  studentName: string;
  reason: string;
  source: 'AI_RECOMMENDATION' | 'MANUAL';
  status: MentorAccessStatus;
  createdAt: string;
  decidedAt?: string;
  decidedByName?: string;
}

/* --------------------------------- Reports -------------------------------- */

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportResult {
  kind: string;
  title: string;
  generatedAt: string;
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
}
