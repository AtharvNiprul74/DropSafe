/**
 * Demo adapter seed data.
 * Realistic single-organization dataset exercising every PRD domain:
 * Master/Organization, Academic, Import, Behaviour*, AI, Counseling, Governance.
 * (*Raw chatbot messages are intentionally NOT modelled in the portal — PRD §17:
 *  no portal role may read raw chatbot conversations.)
 */
import { daysAgo } from '../../lib/format';
import type {
  AcademicPeriod,
  AiModelMetadata,
  AssessmentRecord,
  AttendanceRecord,
  AuditLog,
  AccessLog,
  BehaviourSummary,
  CounselingSession,
  Enrollment,
  FollowUp,
  Intervention,
  LearningComponent,
  LearningLevel,
  LearningProgram,
  MentorAccessRequest,
  NotificationRecord,
  Organization,
  OrganizationSettings,
  Permission,
  PermissionGroup,
  PortalUser,
  Prediction,
  PredictionHistoryEntry,
  ImportReport,
  ImportSession,
  Role,
  Student,
  StudentIdentifier,
  StudentSnapshot,
} from '../../types/models';
import { ALL_PERMISSION_CODES } from '../../lib/permissions';

const now = () => new Date().toISOString();

/* ------------------------------ Organization ------------------------------ */

export const organization: Organization = {
  id: 'org-1',
  name: 'Vidya Vikas College of Engineering',
  code: 'VVCE',
  type: 'COLLEGE',
  status: 'ACTIVE',
  contactEmail: 'admin@vvce.edu.in',
  phone: '+91 2164 555 010',
  address: 'Karad, Satara, Maharashtra 415110',
  createdAt: daysAgo(540),
};

export const settings: OrganizationSettings = {
  id: 'set-1',
  organizationId: 'org-1',
  studentIdentifierLabel: 'PRN',
  academicCalendarType: 'SEMESTER',
  defaultUploadFrequency: 'WEEKLY',
  chatbotEnabled: true,
  predictionEnabled: true,
  counselingEnabled: true,
  graduatedRetentionMonths: 24,
  retentionAction: 'ARCHIVE',
};

/* ---------------------------------- RBAC ---------------------------------- */

export const permissions: Permission[] = ALL_PERMISSION_CODES.map((code) => ({
  id: `perm-${code.replace(':', '-')}`,
  code,
}));

const permId = (code: string) => `perm-${code.replace(':', '-')}`;
const ids = (...codes: string[]) => codes.map(permId);

export const permissionGroups: PermissionGroup[] = [
  {
    id: 'pg-academic',
    name: 'Academic Management',
    description: 'Students, attendance and assessment evidence operations.',
    permissionIds: ids('student:create', 'student:update', 'student:view', 'attendance:create', 'attendance:update', 'attendance:view', 'assessment:create', 'assessment:update', 'assessment:view'),
  },
  {
    id: 'pg-prediction',
    name: 'Prediction Management',
    description: 'AI risk predictions, history and model metadata.',
    permissionIds: ids('prediction:generate', 'prediction:view', 'prediction:history'),
  },
  {
    id: 'pg-counseling',
    name: 'Counseling Management',
    description: 'Interventions, counseling sessions and follow-ups.',
    permissionIds: ids('counseling:create', 'counseling:update', 'counseling:view'),
  },
  {
    id: 'pg-import',
    name: 'Import Management',
    description: 'Academic data import sessions, files and reports.',
    permissionIds: ids('import:create', 'import:view', 'import:history'),
  },
  {
    id: 'pg-admin',
    name: 'System Administration',
    description: 'Organization, users, RBAC, mentor assignment, governance and reporting.',
    permissionIds: ids('organization:update', 'user:create', 'user:update', 'user:view', 'role:create', 'role:update', 'role:view', 'mentor:assign', 'report:view', 'report:export', 'governance:view'),
  },
];

export const roles: Role[] = [
  { id: 'role-admin', name: 'ORG_ADMIN', description: 'Full organization administration (system role).', isSystem: true, permissionGroupIds: ['pg-academic', 'pg-prediction', 'pg-counseling', 'pg-import', 'pg-admin'] },
  { id: 'role-teacher', name: 'TEACHER', description: 'Attendance and assessment evidence management (system role).', isSystem: true, permissionGroupIds: ['pg-academic', 'pg-import'] },
  { id: 'role-mentor', name: 'MENTOR', description: 'Monitoring, counseling and follow-up of assigned students (system role).', isSystem: true, permissionGroupIds: ['pg-counseling', 'pg-prediction'] },
];

export const users: PortalUser[] = [
  { id: 'u-admin', name: 'Anaya Deshpande', email: 'admin@vvce.edu.in', status: 'ACTIVE', roles: [{ id: 'role-admin', name: 'ORG_ADMIN' }], lastLoginAt: daysAgo(0), createdAt: daysAgo(540) },
  { id: 'u-teacher', name: 'Suresh Kulkarni', email: 'teacher@vvce.edu.in', status: 'ACTIVE', roles: [{ id: 'role-teacher', name: 'TEACHER' }], lastLoginAt: daysAgo(1), createdAt: daysAgo(530) },
  { id: 'u-mentor', name: 'Priya Nair', email: 'mentor@vvce.edu.in', status: 'ACTIVE', roles: [{ id: 'role-mentor', name: 'MENTOR' }], lastLoginAt: daysAgo(0), createdAt: daysAgo(520) },
  { id: 'u-locked', name: 'Kiran Shinde', email: 'kiran.shinde@vvce.edu.in', status: 'LOCKED', roles: [{ id: 'role-teacher', name: 'TEACHER' }], createdAt: daysAgo(300) },
];

/** Effective permissions per user — resolved via User → Role → Permission Group → Permission. */
export function permissionsForRoleIds(roleIds: string[]): string[] {
  const groups = roles.filter((r) => roleIds.includes(r.id)).flatMap((r) => r.permissionGroupIds);
  const perms = permissionGroups.filter((g) => groups.includes(g.id)).flatMap((g) => g.permissionIds);
  return [...new Set(perms.map((id) => permissions.find((p) => p.id === id)!.code))];
}

/* ---------------------------- Academic structure -------------------------- */

export const programs: LearningProgram[] = [
  { id: 'prog-bce', code: 'BTECH-CE', name: 'B.Tech Computer Engineering', status: 'ACTIVE', description: 'Four-year undergraduate programme.' },
  { id: 'prog-bee', code: 'BTECH-EE', name: 'B.Tech Electronics Engineering', status: 'ACTIVE' },
  { id: 'prog-dip', code: 'DIP-ME', name: 'Diploma Mechanical Engineering', status: 'ARCHIVED' },
];

export const levels: LearningLevel[] = [
  { id: 'lvl-fy', programId: 'prog-bce', levelNumber: 1, name: 'First Year', status: 'ACTIVE' },
  { id: 'lvl-sy', programId: 'prog-bce', levelNumber: 2, name: 'Second Year', status: 'ACTIVE' },
  { id: 'lvl-fy-ee', programId: 'prog-bee', levelNumber: 1, name: 'First Year', status: 'ACTIVE' },
];

export const periods: AcademicPeriod[] = [
  { id: 'per-fy-s1', levelId: 'lvl-fy', code: 'SEM-1-2025', startDate: '2025-07-15', endDate: '2025-12-20', status: 'COMPLETED' },
  { id: 'per-fy-s2', levelId: 'lvl-fy', code: 'SEM-2-2026', startDate: '2026-01-05', endDate: '2026-06-30', status: 'ACTIVE' },
  { id: 'per-sy-s3', levelId: 'lvl-sy', code: 'SEM-3-2026', startDate: '2026-01-05', endDate: '2026-06-30', status: 'ACTIVE' },
];

export const components: LearningComponent[] = [
  { id: 'cmp-mth', periodId: 'per-fy-s2', code: 'MTH201', name: 'Engineering Mathematics II', type: 'SUBJECT', maximumMarks: 100, passingMarks: 40, status: 'ACTIVE' },
  { id: 'cmp-phy', periodId: 'per-fy-s2', code: 'PHY201', name: 'Engineering Physics', type: 'SUBJECT', maximumMarks: 100, passingMarks: 40, status: 'ACTIVE' },
  { id: 'cmp-cse', periodId: 'per-fy-s2', code: 'CSE201', name: 'Data Structures', type: 'SUBJECT', maximumMarks: 100, passingMarks: 40, status: 'ACTIVE' },
  { id: 'cmp-ele', periodId: 'per-fy-s2', code: 'ELE201', name: 'Basic Electronics', type: 'SUBJECT', maximumMarks: 100, passingMarks: 40, status: 'ACTIVE' },
  { id: 'cmp-dbms', periodId: 'per-sy-s3', code: 'CSE301', name: 'Database Management Systems', type: 'SUBJECT', maximumMarks: 100, passingMarks: 40, status: 'ACTIVE' },
];

/* --------------------------------- Students ------------------------------- */

interface SeedStudent extends Student {}
export const students: SeedStudent[] = [
  { id: 'stu-1', firstName: 'Aarav', lastName: 'Pawar', status: 'ACTIVE', gender: 'M', email: 'aarav.pawar@stu.vvce.edu.in', phone: '+91 98220 10001', guardianName: 'Sunil Pawar', guardianPhone: '+91 98220 20001', createdAt: daysAgo(300) },
  { id: 'stu-2', firstName: 'Diya', lastName: 'Kulkarni', status: 'ACTIVE', gender: 'F', email: 'diya.kulkarni@stu.vvce.edu.in', guardianName: 'Meena Kulkarni', createdAt: daysAgo(300) },
  { id: 'stu-3', firstName: 'Rohan', lastName: 'Jadhav', status: 'ACTIVE', gender: 'M', email: 'rohan.jadhav@stu.vvce.edu.in', guardianName: 'Vijay Jadhav', createdAt: daysAgo(300) },
  { id: 'stu-4', firstName: 'Sneha', lastName: 'Deshmukh', status: 'ACTIVE', gender: 'F', createdAt: daysAgo(300) },
  { id: 'stu-5', firstName: 'Omkar', lastName: 'Patil', status: 'ACTIVE', gender: 'M', email: 'omkar.patil@stu.vvce.edu.in', guardianName: 'Sandip Patil', createdAt: daysAgo(300) },
  { id: 'stu-6', firstName: 'Ishita', lastName: 'Shinde', status: 'ACTIVE', gender: 'F', createdAt: daysAgo(300) },
  { id: 'stu-7', firstName: 'Aditya', lastName: 'More', status: 'ACTIVE', gender: 'M', createdAt: daysAgo(300) },
  { id: 'stu-8', firstName: 'Tanvi', lastName: 'Bhosale', status: 'ACTIVE', gender: 'F', email: 'tanvi.bhosale@stu.vvce.edu.in', createdAt: daysAgo(240) },
  { id: 'stu-9', firstName: 'Pranav', lastName: 'Kale', status: 'ACTIVE', gender: 'M', createdAt: daysAgo(240) },
  { id: 'stu-10', firstName: 'Meera', lastName: 'Chavan', status: 'ACTIVE', gender: 'F', createdAt: daysAgo(240) },
  { id: 'stu-11', firstName: 'Nikhil', lastName: 'Gaikwad', status: 'GRADUATED', gender: 'M', createdAt: daysAgo(620) },
  { id: 'stu-12', firstName: 'Riya', lastName: 'Joshi', status: 'ACTIVE', gender: 'F', createdAt: daysAgo(6) }, // insufficient evidence → prediction unavailable
];

export const identifiers: StudentIdentifier[] = students.map((s, i) => ({
  id: `idn-${s.id}`,
  studentId: s.id,
  identifierType: 'PRN',
  identifierValue: `VVCE23${String(101 + i)}`,
  isPrimary: true,
  status: 'ACTIVE',
}));

export const enrollments: Enrollment[] = [
  ...students.slice(0, 10).map((s, i) => ({
    id: `enr-${s.id}`,
    studentId: s.id,
    academicPeriodId: i < 8 ? 'per-fy-s2' : 'per-sy-s3',
    status: 'ACTIVE' as const,
    enrolledAt: daysAgo(200),
    programName: 'B.Tech Computer Engineering',
    levelName: i < 8 ? 'First Year' : 'Second Year',
    periodCode: i < 8 ? 'SEM-2-2026' : 'SEM-3-2026',
  })),
  { id: 'enr-stu-11', studentId: 'stu-11', academicPeriodId: 'per-fy-s1', status: 'COMPLETED', enrolledAt: daysAgo(600), programName: 'B.Tech Computer Engineering', levelName: 'First Year', periodCode: 'SEM-1-2025' },
  { id: 'enr-stu-12', studentId: 'stu-12', academicPeriodId: 'per-fy-s2', status: 'ACTIVE', enrolledAt: daysAgo(6), programName: 'B.Tech Computer Engineering', levelName: 'First Year', periodCode: 'SEM-2-2026' },
];

/* ---------------------- Attendance & assessment evidence ------------------- */

/** Academic profiles drive deterministic demo evidence: [attendancePct, marksPct] per student. */
const PROFILES: Record<string, [number, number]> = {
  'stu-1': [93, 82], 'stu-2': [76, 64], 'stu-3': [57, 38], 'stu-4': [88, 74],
  'stu-5': [49, 55], 'stu-6': [71, 59], 'stu-7': [95, 88], 'stu-8': [52, 34],
  'stu-9': [68, 61], 'stu-10': [84, 72], 'stu-11': [90, 79],
};

const FY_COMPONENTS = ['cmp-mth', 'cmp-phy', 'cmp-cse', 'cmp-ele'];

export const attendance: AttendanceRecord[] = [];
export const assessments: AssessmentRecord[] = [];

for (const [stuId, [attPct, markPct]] of Object.entries(PROFILES)) {
  const enr = enrollments.find((e) => e.studentId === stuId);
  if (!enr) continue;
  const comps = enr.academicPeriodId === 'per-sy-s3' ? ['cmp-dbms'] : FY_COMPONENTS;
  comps.forEach((cmp, idx) => {
    const jazz = ((idx * 7) % 11) - 5; // deterministic per-component variation
    const total = 40;
    const attended = Math.max(0, Math.min(total, Math.round(((attPct + jazz) / 100) * total)));
    attendance.push({
      id: `att-${stuId}-${cmp}`,
      enrollmentId: enr.id,
      learningComponentId: cmp,
      attendedSessions: attended,
      totalSessions: total,
      updatedAt: daysAgo(7),
      importSessionId: 'imp-1',
    });
    const max = 100;
    const obtained = Math.max(0, Math.min(max, Math.round(markPct + jazz)));
    assessments.push({
      id: `asm-${stuId}-${cmp}`,
      enrollmentId: enr.id,
      learningComponentId: cmp,
      obtainedMarks: obtained,
      maximumMarks: max,
      gradingOutcome: obtained >= 40 ? 'PASS' : 'FAIL',
      updatedAt: daysAgo(12),
    });
  });
}

/* -------------------------------- AI domain ------------------------------- */

const RISK: Record<string, { label: 'LOW' | 'MEDIUM' | 'HIGH'; score: number }> = {
  'stu-1': { label: 'LOW', score: 93 }, 'stu-2': { label: 'MEDIUM', score: 78 },
  'stu-3': { label: 'HIGH', score: 91 }, 'stu-4': { label: 'LOW', score: 85 },
  'stu-5': { label: 'HIGH', score: 87 }, 'stu-6': { label: 'MEDIUM', score: 74 },
  'stu-7': { label: 'LOW', score: 95 }, 'stu-8': { label: 'HIGH', score: 89 },
  'stu-9': { label: 'MEDIUM', score: 71 }, 'stu-10': { label: 'LOW', score: 82 },
};

export const snapshots: StudentSnapshot[] = [];
export const predictions: Prediction[] = [];
export const predictionHistory: PredictionHistoryEntry[] = [];

const BEHAVIOUR: Record<string, [number, number, number]> = {
  'stu-3': [28, 31, 22], 'stu-5': [41, 38, 45], 'stu-8': [35, 29, 30],
  'stu-2': [58, 62, 55], 'stu-6': [61, 57, 60], 'stu-9': [64, 66, 58],
};

for (const [stuId, risk] of Object.entries(RISK)) {
  const enr = enrollments.find((e) => e.studentId === stuId);
  if (!enr) continue;
  const atts = attendance.filter((a) => a.enrollmentId === enr.id);
  const asms = assessments.filter((a) => a.enrollmentId === enr.id);
  const attPct = atts.length ? Math.round((atts.reduce((s, a) => s + a.attendedSessions / a.totalSessions, 0) / atts.length) * 100) : 0;
  const markPct = asms.length ? Math.round((asms.reduce((s, a) => s + a.obtainedMarks / a.maximumMarks, 0) / asms.length) * 100) : 0;
  const failed = asms.filter((a) => a.gradingOutcome === 'FAIL').length;
  const [beh, eng, sent] = BEHAVIOUR[stuId] ?? [78, 80, 76];

  const older: StudentSnapshot = {
    id: `snp-${stuId}-0`, studentId: stuId, enrollmentId: enr.id, importSessionId: 'imp-1', status: 'SUPERSEDED',
    attendancePercentage: Math.min(100, attPct + 6), overallMarksPercentage: Math.min(100, markPct + 4),
    failedLearningComponents: Math.max(0, failed - 1), backlogCount: Math.max(0, failed - 1),
    behaviourScore: Math.min(100, beh + 9), engagementScore: Math.min(100, eng + 7), sentimentScore: Math.min(100, sent + 8),
    featureVersion: 'feat-v3', generatedAt: daysAgo(45),
  };
  const latest: StudentSnapshot = {
    id: `snp-${stuId}`, studentId: stuId, enrollmentId: enr.id, importSessionId: 'imp-1', status: 'PREDICTED',
    attendancePercentage: attPct, overallMarksPercentage: markPct,
    failedLearningComponents: failed, backlogCount: failed,
    behaviourScore: beh, engagementScore: eng, sentimentScore: sent,
    featureVersion: 'feat-v3', generatedAt: daysAgo(5),
  };
  snapshots.push(older, latest);

  predictions.push({
    id: `prd-${stuId}`, snapshotId: latest.id, studentId: stuId,
    predictionLabel: risk.label, predictionScore: risk.score,
    aiModelVersion: '1.3.0', featureVersion: 'feat-v3', generatedAt: daysAgo(5),
  });

  const trail: number[] = risk.label === 'HIGH' ? [58, 66, 78, risk.score] : risk.label === 'MEDIUM' ? [66, 70, 68, risk.score] : [88, 90, 87, risk.score];
  trail.forEach((score, i) => {
    predictionHistory.push({
      id: `prh-${stuId}-${i}`, studentId: stuId, snapshotId: i === trail.length - 1 ? latest.id : older.id,
      predictionLabel: score >= 80 ? 'HIGH' : score >= 70 ? 'MEDIUM' : 'LOW',
      riskProbability: score, predictionConfidence: Math.max(55, score - 6),
      aiModelVersion: i >= 2 ? '1.3.0' : '1.2.0', generatedAt: daysAgo(75 - i * 18),
    });
  });
}

export const behaviourSummaries: BehaviourSummary[] = [
  { id: 'bhs-1', snapshotId: 'snp-stu-3', studentId: 'stu-3', summary: 'Rising distress signals over four weeks: repeated mentions of exam anxiety and family pressure, with declining engagement on weekend check-ins. Recommend empathetic academic support conversation.', dominantSentiment: 'NEGATIVE', confidenceScore: 86, aiModelVersion: '1.3.0', generatedAt: daysAgo(5), approvedForMentor: true },
  { id: 'bhs-2', snapshotId: 'snp-stu-5', studentId: 'stu-5', summary: 'Steadily falling engagement; bot check-ins frequently unanswered. Student cites commute fatigue after timetable change.', dominantSentiment: 'NEUTRAL', confidenceScore: 72, aiModelVersion: '1.3.0', generatedAt: daysAgo(5), approvedForMentor: true },
  { id: 'bhs-3', snapshotId: 'snp-stu-8', studentId: 'stu-8', summary: 'Markedly negative sentiment trend with isolation indicators. Escalation recommended through the human review flow — mentor access requires administrator approval.', dominantSentiment: 'NEGATIVE', confidenceScore: 84, aiModelVersion: '1.3.0', generatedAt: daysAgo(5), approvedForMentor: false },
  { id: 'bhs-4', snapshotId: 'snp-stu-2', studentId: 'stu-2', summary: 'Mild stress around mathematics assessments; otherwise stable engagement and responsive check-ins.', dominantSentiment: 'NEUTRAL', confidenceScore: 68, aiModelVersion: '1.3.0', generatedAt: daysAgo(5), approvedForMentor: true },
];

export const aiModels: AiModelMetadata[] = [
  { id: 'mdl-1', modelName: 'RiskNet', modelVersion: '1.3.0', algorithm: 'Gradient Boosted Trees', featureVersion: 'feat-v3', trainingDatasetVersion: 'ds-2026.08', deployedAt: daysAgo(40), status: 'ACTIVE' },
  { id: 'mdl-2', modelName: 'RiskNet', modelVersion: '1.2.0', algorithm: 'Gradient Boosted Trees', featureVersion: 'feat-v2', trainingDatasetVersion: 'ds-2026.02', deployedAt: daysAgo(220), status: 'RETIRED' },
];

/* --------------------------------- Imports -------------------------------- */

export const importSessions: ImportSession[] = [
  { id: 'imp-1', importType: 'ATTENDANCE', sourceType: 'CSV', status: 'COMPLETED', createdByName: 'Suresh Kulkarni', createdAt: daysAgo(7), fileName: 'attendance_sem2_week04.csv', fileSizeBytes: 48_212, fileHash: 'sha256:9f2c…a41b', mimeType: 'text/csv' },
  { id: 'imp-2', importType: 'ASSESSMENT', sourceType: 'CSV', status: 'COMPLETED', createdByName: 'Suresh Kulkarni', createdAt: daysAgo(12), fileName: 'unit_test2_marks.csv', fileSizeBytes: 61_908, fileHash: 'sha256:44de…09f1', mimeType: 'text/csv' },
  { id: 'imp-3', importType: 'STUDENT', sourceType: 'CSV', status: 'FAILED', createdByName: 'Anaya Deshpande', createdAt: daysAgo(30), fileName: 'new_admissions_may.csv', fileSizeBytes: 12_040, fileHash: 'sha256:b77a…21cd', mimeType: 'text/csv', errorMessage: 'Fatal validation error: unrecognized file layout — no academic data was committed.' },
  { id: 'imp-4', importType: 'ENROLLMENT', sourceType: 'CSV', status: 'CANCELLED', createdByName: 'Anaya Deshpande', createdAt: daysAgo(60), fileName: 'sy_enrollment_draft.csv', fileSizeBytes: 8_331, fileHash: 'sha256:10ab…77ef', mimeType: 'text/csv' },
];

export const importReports: ImportReport[] = [
  { id: 'irp-1', importSessionId: 'imp-1', totalRecords: 128, validRecords: 128, rejectedRecords: 0, insertedRecords: 14, updatedRecords: 114, resultStatus: 'SUCCESS', summary: 'All rows committed. Snapshot refresh requested for affected enrollments.' },
  { id: 'irp-2', importSessionId: 'imp-2', totalRecords: 132, validRecords: 126, rejectedRecords: 6, insertedRecords: 131, updatedRecords: 0, resultStatus: 'PARTIAL_SUCCESS', summary: '6 rows rejected (marks > maximum, unknown PRN). Valid rows committed; rejected rows excluded and listed in the report.' },
];

/* -------------------------------- Counseling ------------------------------ */

export const interventions: Intervention[] = [
  { id: 'int-1', studentId: 'stu-3', predictionId: 'prd-stu-3', interventionType: 'ACADEMIC', priority: 'HIGH', status: 'IN_PROGRESS', title: 'Academic support plan — Rohan Jadhav', description: 'Human review of HIGH prediction: repeated FAIL outcomes in Mathematics and Electronics with attendance below 60%.', responsibleUserId: 'u-mentor', responsibleUserName: 'Priya Nair', studentName: 'Rohan Jadhav', createdByName: 'Anaya Deshpande', createdAt: daysAgo(18) },
  { id: 'int-2', studentId: 'stu-5', predictionId: 'prd-stu-5', interventionType: 'ATTENDANCE', priority: 'URGENT', status: 'PLANNED', title: 'Attendance recovery — Omkar Patil', description: 'Attendance at 49% and falling engagement; pending first mentor conversation.', responsibleUserId: 'u-mentor', responsibleUserName: 'Priya Nair', studentName: 'Omkar Patil', createdByName: 'Priya Nair', createdAt: daysAgo(4) },
  { id: 'int-3', studentId: 'stu-8', predictionId: 'prd-stu-8', interventionType: 'COUNSELING', priority: 'HIGH', status: 'COMPLETED', title: 'Well-being support — Tanvi Bhosale', responsibleUserId: 'u-admin', responsibleUserName: 'Anaya Deshpande', studentName: 'Tanvi Bhosale', createdByName: 'Anaya Deshpande', createdAt: daysAgo(52), completedAt: daysAgo(9) },
  { id: 'int-4', studentId: 'stu-6', interventionType: 'BEHAVIOURAL', priority: 'LOW', status: 'CANCELLED', title: 'Engagement dip — Ishita Shinde', responsibleUserId: 'u-mentor', responsibleUserName: 'Priya Nair', studentName: 'Ishita Shinde', createdByName: 'Priya Nair', createdAt: daysAgo(70) },
];

export const sessions: CounselingSession[] = [
  { id: 'ses-1', interventionId: 'int-1', studentId: 'stu-3', mentorId: 'u-mentor', mentorName: 'Priya Nair', sessionType: 'IN_PERSON', status: 'COMPLETED', scheduledAt: daysAgo(14), startedAt: daysAgo(14), endedAt: daysAgo(13), outcomeSummary: 'Student opened up about difficulty with MTH201. Agreed on peer tutoring and weekly check-in plan.' },
  { id: 'ses-2', interventionId: 'int-1', studentId: 'stu-3', mentorId: 'u-mentor', mentorName: 'Priya Nair', sessionType: 'ONLINE', status: 'SCHEDULED', scheduledAt: new Date(Date.now() + 2 * 86_400_000).toISOString() },
  { id: 'ses-3', interventionId: 'int-3', studentId: 'stu-8', mentorId: 'u-admin', mentorName: 'Anaya Deshpande', sessionType: 'IN_PERSON', status: 'COMPLETED', scheduledAt: daysAgo(40), startedAt: daysAgo(40), endedAt: daysAgo(40), outcomeSummary: 'Initial well-being conversation completed; referral options discussed with consent.' },
  { id: 'ses-4', interventionId: 'int-3', studentId: 'stu-8', mentorId: 'u-admin', mentorName: 'Anaya Deshpande', sessionType: 'PHONE', status: 'COMPLETED', scheduledAt: daysAgo(20), startedAt: daysAgo(20), endedAt: daysAgo(20), outcomeSummary: 'Follow-up call: student reports improved routine; closing intervention with a scheduled term review.' },
];

export const followUps: FollowUp[] = [
  { id: 'fup-1', interventionId: 'int-1', counselingSessionId: 'ses-1', followUpType: 'CHECK_IN', status: 'PENDING', dueDate: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10), assignedUserId: 'u-mentor', assignedUserName: 'Priya Nair', note: 'Verify peer tutoring started and attendance in MTH201.', createdAt: daysAgo(12), interventionTitle: 'Academic support plan — Rohan Jadhav', studentName: 'Rohan Jadhav' },
  { id: 'fup-2', interventionId: 'int-1', followUpType: 'REVIEW', status: 'COMPLETED', dueDate: daysAgo(6).slice(0, 10), assignedUserId: 'u-mentor', assignedUserName: 'Priya Nair', note: 'Term mark review after first session.', createdAt: daysAgo(16), completedAt: daysAgo(6), interventionTitle: 'Academic support plan — Rohan Jadhav', studentName: 'Rohan Jadhav' },
  { id: 'fup-3', interventionId: 'int-3', counselingSessionId: 'ses-4', followUpType: 'ACTION', status: 'COMPLETED', dueDate: daysAgo(10).slice(0, 10), assignedUserId: 'u-admin', assignedUserName: 'Anaya Deshpande', createdAt: daysAgo(20), completedAt: daysAgo(9), interventionTitle: 'Well-being support — Tanvi Bhosale', studentName: 'Tanvi Bhosale' },
  { id: 'fup-4', interventionId: 'int-2', followUpType: 'CHECK_IN', status: 'MISSED', dueDate: daysAgo(2).slice(0, 10), assignedUserId: 'u-mentor', assignedUserName: 'Priya Nair', createdAt: daysAgo(9), interventionTitle: 'Attendance recovery — Omkar Patil', studentName: 'Omkar Patil' },
];

/* ------------------------------- Mentor access ---------------------------- */

export const mentorAssignments: { mentorId: string; studentId: string }[] = [
  { mentorId: 'u-mentor', studentId: 'stu-2' },
  { mentorId: 'u-mentor', studentId: 'stu-3' },
  { mentorId: 'u-mentor', studentId: 'stu-5' },
  { mentorId: 'u-mentor', studentId: 'stu-6' },
  { mentorId: 'u-mentor', studentId: 'stu-9' },
];

export const mentorAccessRequests: MentorAccessRequest[] = [
  { id: 'mar-1', mentorId: 'u-mentor', mentorName: 'Priya Nair', studentId: 'stu-8', studentName: 'Tanvi Bhosale', reason: 'AI recommendation: sustained negative sentiment trend; mentor requires approved access before summaries are visible.', source: 'AI_RECOMMENDATION', status: 'PENDING', createdAt: daysAgo(3) },
  { id: 'mar-2', mentorId: 'u-mentor', mentorName: 'Priya Nair', studentId: 'stu-5', studentName: 'Omkar Patil', reason: 'Manual request during attendance review.', source: 'MANUAL', status: 'APPROVED', createdAt: daysAgo(21), decidedAt: daysAgo(20), decidedByName: 'Anaya Deshpande' },
];

/* -------------------------------- Governance ------------------------------ */

export const auditLogs: AuditLog[] = [
  { id: 'aud-1', actorType: 'USER', actorName: 'Anaya Deshpande', action: 'organization_settings.update', entityType: 'OrganizationSettings', entityId: 'set-1', outcome: 'SUCCESS', createdAt: daysAgo(2), detail: 'graduatedRetentionMonths 12 → 24' },
  { id: 'aud-2', actorType: 'USER', actorName: 'Suresh Kulkarni', action: 'import_session.create', entityType: 'ImportSession', entityId: 'imp-1', outcome: 'SUCCESS', createdAt: daysAgo(7) },
  { id: 'aud-3', actorType: 'SYSTEM', action: 'prediction.completed', entityType: 'Prediction', entityId: 'prd-stu-3', outcome: 'SUCCESS', createdAt: daysAgo(5), detail: 'model 1.3.0 · feature feat-v3' },
  { id: 'aud-4', actorType: 'USER', actorName: 'Priya Nair', action: 'intervention.create', entityType: 'Intervention', entityId: 'int-2', outcome: 'SUCCESS', createdAt: daysAgo(4) },
  { id: 'aud-5', actorType: 'USER', actorName: 'Priya Nair', action: 'counseling_session.complete', entityType: 'CounselingSession', entityId: 'ses-1', outcome: 'SUCCESS', createdAt: daysAgo(13) },
  { id: 'aud-6', actorType: 'USER', actorName: 'Anaya Deshpande', action: 'user.lock', entityType: 'User', entityId: 'u-locked', outcome: 'SUCCESS', createdAt: daysAgo(15) },
  { id: 'aud-7', actorType: 'SYSTEM', action: 'snapshot.built', entityType: 'StudentSnapshot', entityId: 'snp-stu-5', outcome: 'SUCCESS', createdAt: daysAgo(5) },
  { id: 'aud-8', actorType: 'USER', actorName: 'Anaya Deshpande', action: 'mentor_access.approve', entityType: 'MentorAccessRequest', entityId: 'mar-2', outcome: 'SUCCESS', createdAt: daysAgo(20) },
  { id: 'aud-9', actorType: 'USER', actorName: 'Suresh Kulkarni', action: 'import_session.validate', entityType: 'ImportSession', entityId: 'imp-3', outcome: 'FAILURE', createdAt: daysAgo(30), detail: 'fatal layout error' },
];

export const accessLogs: AccessLog[] = [
  { id: 'acc-1', userName: 'Priya Nair', action: 'READ', result: 'ALLOWED', resource: 'student:stu-3/summary', createdAt: daysAgo(1) },
  { id: 'acc-2', userName: 'Priya Nair', action: 'READ', result: 'DENIED', resource: 'student:stu-8/behaviour-summary', denialReason: 'Mentor access not approved for this student', createdAt: daysAgo(3) },
  { id: 'acc-3', userName: 'Suresh Kulkarni', action: 'READ', result: 'DENIED', resource: 'chatbot/conversations', denialReason: 'Raw chatbot conversations are never exposed to portal roles', createdAt: daysAgo(11) },
  { id: 'acc-4', userName: 'Anaya Deshpande', action: 'EXPORT', result: 'ALLOWED', resource: 'report:predictions', createdAt: daysAgo(4) },
  { id: 'acc-5', userName: 'Priya Nair', action: 'WRITE', result: 'ALLOWED', resource: 'intervention:int-2', createdAt: daysAgo(4) },
  { id: 'acc-6', userName: 'Suresh Kulkarni', action: 'WRITE', result: 'ALLOWED', resource: 'attendance:bulk', createdAt: daysAgo(7) },
];

export const notifications: NotificationRecord[] = [
  { id: 'ntf-1', notificationType: 'MENTOR_ALERT', channel: 'IN_APP', status: 'DELIVERED', recipientLabel: 'Priya Nair', subject: 'HIGH risk prediction reviewed — Rohan Jadhav', createdAt: daysAgo(5) },
  { id: 'ntf-2', notificationType: 'FOLLOW_UP_REMINDER', channel: 'EMAIL', status: 'DELIVERED', recipientLabel: 'Priya Nair', subject: 'Follow-up due in 3 days — Rohan Jadhav', createdAt: daysAgo(2) },
  { id: 'ntf-3', notificationType: 'IMPORT_NOTIFICATION', channel: 'EMAIL', status: 'DELIVERED', recipientLabel: 'Suresh Kulkarni', subject: 'Import imp-1 completed — 128/128 valid', createdAt: daysAgo(7) },
  { id: 'ntf-4', notificationType: 'IMPORT_NOTIFICATION', channel: 'EMAIL', status: 'FAILED', recipientLabel: 'Anaya Deshpande', subject: 'Import imp-3 failed validation', createdAt: daysAgo(30) },
  { id: 'ntf-5', notificationType: 'STUDENT_REMINDER', channel: 'WHATSAPP', status: 'SENT', recipientLabel: 'Omkar Patil', subject: 'Weekly check-in from DropSafe bot', createdAt: daysAgo(1) },
  { id: 'ntf-6', notificationType: 'SYSTEM_NOTIFICATION', channel: 'IN_APP', status: 'QUEUED', recipientLabel: 'All administrators', subject: 'Retention review window opens next month', createdAt: now() },
];

/* --------------------------------- Counters -------------------------------- */

let seq = 100;
export const nextId = (prefix: string) => `${prefix}-${++seq}-${Date.now().toString(36)}`;
export { now };
