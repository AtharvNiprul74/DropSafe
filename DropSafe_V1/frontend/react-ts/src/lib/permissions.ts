/**
 * Permission codes (PRD §7, naming convention `resource:action`).
 * The PRD list is explicitly non-exhaustive ("Examples"), so the portal adds
 * `governance:view` for the Governance domain and keeps everything else verbatim.
 * Effective permissions flow User → Role → Permission Group → Permission.
 */
export const P = {
  studentCreate: 'student:create',
  studentUpdate: 'student:update',
  studentView: 'student:view',
  attendanceCreate: 'attendance:create',
  attendanceUpdate: 'attendance:update',
  attendanceView: 'attendance:view',
  assessmentCreate: 'assessment:create',
  assessmentUpdate: 'assessment:update',
  assessmentView: 'assessment:view',
  predictionGenerate: 'prediction:generate',
  predictionView: 'prediction:view',
  predictionHistory: 'prediction:history',
  counselingCreate: 'counseling:create',
  counselingUpdate: 'counseling:update',
  counselingView: 'counseling:view',
  mentorAssign: 'mentor:assign',
  importCreate: 'import:create',
  importView: 'import:view',
  importHistory: 'import:history',
  reportView: 'report:view',
  reportExport: 'report:export',
  organizationUpdate: 'organization:update',
  userCreate: 'user:create',
  userUpdate: 'user:update',
  userView: 'user:view',
  roleCreate: 'role:create',
  roleUpdate: 'role:update',
  roleView: 'role:view',
  governanceView: 'governance:view',
} as const;

export const ALL_PERMISSION_CODES: string[] = Object.values(P);

/** Permission groups as named in PRD §7 (business capabilities). */
export const PERMISSION_GROUP_NAMES = [
  'Academic Management',
  'Prediction Management',
  'Counseling Management',
  'Import Management',
  'System Administration',
] as const;
