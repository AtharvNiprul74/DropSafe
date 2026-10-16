/**
 * Demo adapter router.
 * Matches the endpoint registry in src/api/endpoints.ts and enforces the same
 * rules the real backend must enforce (PRD §34 data integrity, §20 state
 * machines, §17 privacy). Replace by setting VITE_DEMO_MODE=false — the UI
 * then calls your Express API with identical request/response shapes.
 */
import { tokenStore } from '../../auth/token';
import { ApiError } from '../http';
import { canTransition } from '../../lib/transitions';
import * as db from './store';
import type {
  ImportPreview,
  ImportReport,
  ImportSession,
  Intervention,
  LoginResponse,
  RiskBoardRow,
  SessionUser,
  StudentDetail,
} from '../../types/models';

/* --------------------------------- plumbing -------------------------------- */

const delay = (ms = 140) => new Promise((r) => setTimeout(r, ms));
type Query = Record<string, string | number | boolean | undefined | null>;
type Handler = (ctx: { params: Record<string, string>; query: Query; body: any; user: SessionUser | null }) => unknown;

interface Route {
  method: string;
  pattern: string;
  regex: RegExp;
  keys: string[];
  handler: Handler;
  public?: boolean;
}

const routes: Route[] = [];

function route(method: string, pattern: string, handler: Handler, isPublic = false) {
  const keys: string[] = [];
  const regex = new RegExp(
    '^' + pattern.replace(/:[^/]+/g, (m) => {
      keys.push(m.slice(1));
      return '([^/]+)';
    }) + '$',
  );
  routes.push({ method, pattern, regex, keys, handler, public: isPublic });
}

function currentUser(): SessionUser | null {
  const token = tokenStore.get();
  if (!token?.startsWith('demo:')) return null;
  return sessionFor(token.replace('demo:', ''));
}

function sessionFor(userId: string): SessionUser | null {
  const u = db.users.find((x) => x.id === userId);
  if (!u || u.status !== 'ACTIVE') return null;
  const assigned = u.roles.some((r) => r.name === 'MENTOR')
    ? db.mentorAssignments.filter((m) => m.mentorId === u.id).map((m) => m.studentId)
    : undefined;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    organizationId: db.organization.id,
    organizationName: db.organization.name,
    roles: u.roles.map((r) => r.name),
    permissions: db.permissionsForRoleIds(u.roles.map((r) => r.id)),
    assignedStudentIds: assigned,
  };
}

function requireUser(user: SessionUser | null): SessionUser {
  if (!user) throw new ApiError(401, 'Not authenticated.');
  return user;
}

/* ----------------------------------- auth ---------------------------------- */

route('POST', '/auth/login', ({ body }) => {
  const { email, password } = body ?? {};
  if (!email || !password) throw new ApiError(400, 'Email and password are required.');
  const u = db.users.find((x) => x.email.toLowerCase() === String(email).toLowerCase());
  if (!u) throw new ApiError(401, 'Invalid credentials.');
  if (u.status !== 'ACTIVE') throw new ApiError(403, `Account is ${u.status.toLowerCase()}. Contact your Organization Admin.`);
  const user = sessionFor(u.id)!;
  return { token: `demo:${u.id}`, user } satisfies LoginResponse;
}, true);

route('POST', '/auth/logout', () => ({ ok: true }));

route('GET', '/auth/me', ({ user }) => requireUser(user));

/* ------------------------------ organization ------------------------------- */

route('GET', '/organization', ({ user }) => {
  requireUser(user);
  return db.organization;
});

route('PATCH', '/organization', ({ body, user }) => {
  requireUser(user);
  Object.assign(db.organization, body, { id: db.organization.id, code: db.organization.code });
  return db.organization;
});

route('GET', '/organization/settings', ({ user }) => {
  requireUser(user);
  return db.settings;
});

route('PATCH', '/organization/settings', ({ body, user }) => {
  requireUser(user);
  Object.assign(db.settings, body, { id: db.settings.id, organizationId: db.settings.organizationId });
  return db.settings;
});

/* ----------------------------------- users --------------------------------- */

route('GET', '/users', ({ user }) => {
  requireUser(user);
  return db.users.map((u) => ({ ...u, memberOf: u.roles.map((r) => r.name).join(', ') }));
});

route('POST', '/users', ({ body, user }) => {
  requireUser(user);
  const { name, email, roleIds } = body ?? {};
  if (!name || !email || !roleIds?.length) throw new ApiError(400, 'Name, email and at least one role are required.');
  if (db.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
    throw new ApiError(409, 'Email must be unique within the Organization.');
  }
  const roleRows = db.roles.filter((r) => roleIds.includes(r.id)).map((r) => ({ id: r.id, name: r.name }));
  const nu = { id: db.nextId('u'), name, email, status: 'ACTIVE' as const, roles: roleRows, createdAt: db.now() };
  db.users.push(nu);
  return nu;
});

route('PATCH', '/users/:id', ({ params, body, user }) => {
  requireUser(user);
  const u = db.users.find((x) => x.id === params.id);
  if (!u) throw new ApiError(404, 'User not found.');
  if (body?.status) {
    if (!canTransition('user', u.status, body.status)) {
      throw new ApiError(409, `Invalid user status transition ${u.status} → ${body.status}.`);
    }
    u.status = body.status;
  }
  if (body?.roleIds) u.roles = db.roles.filter((r) => body.roleIds.includes(r.id)).map((r) => ({ id: r.id, name: r.name }));
  return u;
});

/* ----------------------------------- roles --------------------------------- */

route('GET', '/roles', ({ user }) => {
  requireUser(user);
  return db.roles.map((r) => ({ ...r, memberCount: db.users.filter((u) => u.roles.some((x) => x.id === r.id)).length }));
});

route('POST', '/roles', ({ body, user }) => {
  requireUser(user);
  if (!body?.name) throw new ApiError(400, 'Role name is required.');
  const role = { id: db.nextId('role'), name: body.name, description: body.description ?? '', isSystem: false, permissionGroupIds: body.permissionGroupIds ?? [] };
  db.roles.push(role);
  return role;
});

route('PATCH', '/roles/:id', ({ params, body, user }) => {
  requireUser(user);
  const r = db.roles.find((x) => x.id === params.id);
  if (!r) throw new ApiError(404, 'Role not found.');
  if (r.isSystem) throw new ApiError(409, 'System Roles cannot be modified.');
  if (body?.name) r.name = body.name;
  if (body?.description !== undefined) r.description = body.description;
  if (body?.permissionGroupIds) r.permissionGroupIds = body.permissionGroupIds;
  return r;
});

route('GET', '/permission-groups', ({ user }) => {
  requireUser(user);
  return db.permissionGroups;
});

route('GET', '/permissions', ({ user }) => {
  requireUser(user);
  return db.permissions;
});

/* ---------------------------- academic structure --------------------------- */

route('GET', '/academic/programs', ({ user }) => (requireUser(user), db.programs));
route('GET', '/academic/levels', ({ user, query }) => (requireUser(user), db.levels.filter((l) => !query.programId || l.programId === query.programId)));
route('GET', '/academic/periods', ({ user, query }) => (requireUser(user), db.periods.filter((p) => !query.levelId || p.levelId === query.levelId)));
route('GET', '/academic/components', ({ user, query }) => (requireUser(user), db.components.filter((c) => !query.periodId || c.periodId === query.periodId)));

route('POST', '/academic/programs', ({ body, user }) => {
  requireUser(user);
  if (db.programs.some((p) => p.code === body.code || p.name === body.name)) throw new ApiError(409, 'Program code and name must be unique within the Organization.');
  const row = { id: db.nextId('prog'), code: body.code, name: body.name, status: 'ACTIVE' as const, description: body.description };
  db.programs.push(row);
  return row;
});

route('POST', '/academic/levels', ({ body, user }) => {
  requireUser(user);
  const prog = db.programs.find((p) => p.id === body.programId);
  if (!prog) throw new ApiError(404, 'Learning Program not found.');
  if (prog.status === 'ARCHIVED') throw new ApiError(409, 'Archived Programs cannot accept new Levels.');
  if (db.levels.some((l) => l.programId === prog.id && l.levelNumber === Number(body.levelNumber))) throw new ApiError(409, 'Level number must be unique within the Program.');
  const row = { id: db.nextId('lvl'), programId: prog.id, levelNumber: Number(body.levelNumber), name: body.name, status: 'ACTIVE' as const };
  db.levels.push(row);
  return row;
});

route('POST', '/academic/periods', ({ body, user }) => {
  requireUser(user);
  const lvl = db.levels.find((l) => l.id === body.levelId);
  if (!lvl) throw new ApiError(404, 'Learning Level not found.');
  if (lvl.status === 'ARCHIVED') throw new ApiError(409, 'Archived Levels cannot accept new Enrollments or Periods.');
  if (!(body.startDate < body.endDate)) throw new ApiError(400, 'start_date must be before end_date.');
  if (db.periods.some((p) => p.levelId === lvl.id && p.code === body.code)) throw new ApiError(409, 'Period code must be unique within the Level.');
  const row = { id: db.nextId('per'), levelId: lvl.id, code: body.code, startDate: body.startDate, endDate: body.endDate, status: 'PLANNED' as const };
  db.periods.push(row);
  return row;
});

route('POST', '/academic/components', ({ body, user }) => {
  requireUser(user);
  const per = db.periods.find((p) => p.id === body.periodId);
  if (!per) throw new ApiError(404, 'Academic Period not found.');
  if (per.status === 'ARCHIVED' || per.status === 'COMPLETED') throw new ApiError(409, 'This Academic Period is read-only.');
  if (Number(body.passingMarks) > Number(body.maximumMarks)) throw new ApiError(400, 'passing_marks cannot exceed maximum_marks.');
  if (db.components.some((c) => c.periodId === per.id && (c.code === body.code || c.name === body.name))) throw new ApiError(409, 'Component code and name must be unique within the Period.');
  const row = { id: db.nextId('cmp'), periodId: per.id, code: body.code, name: body.name, type: body.type, maximumMarks: Number(body.maximumMarks), passingMarks: Number(body.passingMarks), status: 'ACTIVE' as const };
  db.components.push(row);
  return row;
});

const lifecycleKinds: Record<string, { collection: { id: string; status: string }[]; kind: string }> = {
  programs: { collection: db.programs as any, kind: 'program' },
  levels: { collection: db.levels as any, kind: 'level' },
  periods: { collection: db.periods as any, kind: 'period' },
  components: { collection: db.components as any, kind: 'component' },
};

for (const [key, cfg] of Object.entries(lifecycleKinds)) {
  route('PATCH', `/academic/${key}/:id`, ({ params, body, user }) => {
    requireUser(user);
    const row = cfg.collection.find((r) => r.id === params.id) as any;
    if (!row) throw new ApiError(404, 'Record not found.');
    if (body?.status) {
      if (!canTransition(cfg.kind, row.status, body.status)) throw new ApiError(409, `Invalid transition ${row.status} → ${body.status}.`);
      // PRD §8: only one ACTIVE Period per Learning Level at a time.
      if (cfg.kind === 'period' && body.status === 'ACTIVE') {
        const levelId = row.levelId;
        if (db.periods.some((p) => p.levelId === levelId && p.status === 'ACTIVE' && p.id !== row.id)) {
          throw new ApiError(409, 'Another ACTIVE Period already exists for this Learning Level.');
        }
      }
      row.status = body.status;
    }
    return row;
  });
}

/* --------------------------------- students -------------------------------- */

route('GET', '/students', ({ user, query }) => {
  requireUser(user);
  let list = db.students.map((s) => ({
    ...s,
    primaryIdentifier: db.identifiers.find((i) => i.studentId === s.id && i.isPrimary)?.identifierValue,
    enrollment: db.enrollments.find((e) => e.studentId === s.id && e.status === 'ACTIVE'),
  }));
  if (query.status) list = list.filter((s) => s.status === query.status);
  if (query.q) {
    const q = String(query.q).toLowerCase();
    list = list.filter((s) => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || s.primaryIdentifier?.toLowerCase().includes(q));
  }
  return list;
});

route('POST', '/students', ({ body, user }) => {
  requireUser(user);
  const { firstName, lastName, identifierType, identifierValue } = body ?? {};
  if (!firstName || !lastName || !identifierType || !identifierValue) throw new ApiError(400, 'Name and a primary identifier are required.');
  if (db.identifiers.some((i) => i.identifierType === identifierType && i.identifierValue === identifierValue)) {
    throw new ApiError(409, 'Identifier type/value must be unique within the Organization.');
  }
  const student = { id: db.nextId('stu'), firstName, lastName, status: 'ACTIVE' as const, createdAt: db.now() };
  db.students.push(student);
  db.identifiers.push({ id: db.nextId('idn'), studentId: student.id, identifierType, identifierValue, isPrimary: true, status: 'ACTIVE' });
  return student;
});

route('GET', '/students/:id', ({ params, user }) => {
  requireUser(user);
  const s = db.students.find((x) => x.id === params.id);
  if (!s) throw new ApiError(404, 'Student not found.');
  const detail: StudentDetail = {
    student: s,
    identifiers: db.identifiers.filter((i) => i.studentId === s.id),
    enrollments: db.enrollments.filter((e) => e.studentId === s.id),
    attendance: db.attendance
      .filter((a) => db.enrollments.some((e) => e.studentId === s.id && e.id === a.enrollmentId))
      .map((a) => ({ ...a, componentCode: db.components.find((c) => c.id === a.learningComponentId)?.code, componentName: db.components.find((c) => c.id === a.learningComponentId)?.name })),
    assessments: db.assessments
      .filter((a) => db.enrollments.some((e) => e.studentId === s.id && e.id === a.enrollmentId))
      .map((a) => ({ ...a, componentCode: db.components.find((c) => c.id === a.learningComponentId)?.code, componentName: db.components.find((c) => c.id === a.learningComponentId)?.name })),
  };
  return detail;
});

route('GET', '/mentor/students', ({ user }) => {
  requireUser(user);
  const assigned = user!.assignedStudentIds ?? [];
  return db.students
    .filter((s) => assigned.includes(s.id))
    .map((s) => ({
      ...s,
      primaryIdentifier: db.identifiers.find((i) => i.studentId === s.id && i.isPrimary)?.identifierValue,
      enrollment: db.enrollments.find((e) => e.studentId === s.id && e.status === 'ACTIVE'),
      latestPrediction: db.predictions.find((p) => p.studentId === s.id),
    }));
});

route('GET', '/students/:id/insights', ({ params, user }) => {
  requireUser(user);
  const isAdmin = user!.roles.includes('ORG_ADMIN');
  return {
    snapshots: db.snapshots.filter((s) => s.studentId === params.id),
    predictions: db.predictions.filter((p) => p.studentId === params.id),
    history: db.predictionHistory.filter((p) => p.studentId === params.id).sort((a, b) => a.generatedAt.localeCompare(b.generatedAt)),
    // PRD §17: mentors receive APPROVED summaries only; admins see all summaries.
    behaviourSummaries: isAdmin
      ? db.behaviourSummaries.filter((b) => b.studentId === params.id)
      : db.behaviourSummaries.filter((b) => b.studentId === params.id && b.approvedForMentor),
  };
});

/* ------------------------------ record keeping ----------------------------- */

route('GET', '/academic/roster', ({ user, query }) => {
  requireUser(user);
  const { periodId } = query;
  return db.enrollments
    .filter((e) => e.academicPeriodId === periodId && e.status === 'ACTIVE')
    .map((e) => {
      const s = db.students.find((x) => x.id === e.studentId)!;
      return {
        enrollmentId: e.id,
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        primaryIdentifier: db.identifiers.find((i) => i.studentId === s.id && i.isPrimary)?.identifierValue,
        attendance: db.attendance.filter((a) => a.enrollmentId === e.id),
        assessments: db.assessments.filter((a) => a.enrollmentId === e.id),
      };
    });
});

route('POST', '/academic/attendance/bulk', ({ body, user }) => {
  requireUser(user);
  const rows = body?.rows ?? [];
  for (const r of rows) {
    if (!(Number(r.totalSessions) > 0)) throw new ApiError(400, 'total_sessions must be greater than 0.');
    if (Number(r.attendedSessions) < 0) throw new ApiError(400, 'attended_sessions cannot be negative.');
    if (Number(r.attendedSessions) > Number(r.totalSessions)) throw new ApiError(400, 'attended_sessions cannot exceed total_sessions.');
  }
  for (const r of rows) {
    const existing = db.attendance.find((a) => a.enrollmentId === r.enrollmentId && a.learningComponentId === r.learningComponentId);
    if (existing) Object.assign(existing, { attendedSessions: Number(r.attendedSessions), totalSessions: Number(r.totalSessions), updatedAt: db.now() });
    else db.attendance.push({ id: db.nextId('att'), enrollmentId: r.enrollmentId, learningComponentId: r.learningComponentId, attendedSessions: Number(r.attendedSessions), totalSessions: Number(r.totalSessions), updatedAt: db.now() });
  }
  return { updated: rows.length };
});

route('POST', '/academic/assessments/bulk', ({ body, user }) => {
  requireUser(user);
  const rows = body?.rows ?? [];
  for (const r of rows) {
    if (!(Number(r.maximumMarks) > 0)) throw new ApiError(400, 'maximum_marks must be greater than 0.');
    if (Number(r.obtainedMarks) < 0) throw new ApiError(400, 'obtained_marks cannot be negative.');
    if (Number(r.obtainedMarks) > Number(r.maximumMarks)) throw new ApiError(400, 'obtained_marks cannot exceed maximum_marks.');
  }
  for (const r of rows) {
    const existing = db.assessments.find((a) => a.enrollmentId === r.enrollmentId && a.learningComponentId === r.learningComponentId);
    const outcome = Number(r.obtainedMarks) >= 40 ? 'PASS' : 'FAIL';
    if (existing) Object.assign(existing, { obtainedMarks: Number(r.obtainedMarks), maximumMarks: Number(r.maximumMarks), gradingOutcome: outcome, updatedAt: db.now() });
    else db.assessments.push({ id: db.nextId('asm'), enrollmentId: r.enrollmentId, learningComponentId: r.learningComponentId, obtainedMarks: Number(r.obtainedMarks), maximumMarks: Number(r.maximumMarks), gradingOutcome: outcome as any, updatedAt: db.now() });
  }
  return { updated: rows.length };
});

/* ---------------------------------- imports -------------------------------- */

// In-flight preview per session (demo-only; the real API owns validation).
const previews = new Map<string, ImportPreview>();

route('GET', '/imports', ({ user }) => {
  requireUser(user);
  return db.importSessions.map((s) => ({ ...s, report: db.importReports.find((r) => r.importSessionId === s.id) }));
});

route('POST', '/imports', ({ body, user }) => {
  const u = requireUser(user);
  const { importType, fileName, fileSizeBytes, mimeType } = body ?? {};
  if (!importType || !fileName) throw new ApiError(400, 'Import type and a file are required.');
  if (mimeType && !['text/csv', 'application/vnd.ms-excel'].includes(mimeType) && !fileName.endsWith('.csv')) {
    throw new ApiError(400, 'Only CSV files are accepted in V1 imports.');
  }
  const session: ImportSession = {
    id: db.nextId('imp'), importType, sourceType: 'CSV', status: 'CREATED',
    createdByName: u.name, createdAt: db.now(), fileName, fileSizeBytes, mimeType: mimeType ?? 'text/csv',
    fileHash: `sha256:${Math.random().toString(16).slice(2, 10)}…${Math.random().toString(16).slice(2, 6)}`,
  };
  db.importSessions.unshift(session);
  return session;
});

route('GET', '/imports/:id', ({ params, user }) => {
  requireUser(user);
  const s = db.importSessions.find((x) => x.id === params.id);
  if (!s) throw new ApiError(404, 'Import session not found.');
  return { ...s, report: db.importReports.find((r) => r.importSessionId === s.id), preview: previews.get(s.id) };
});

route('POST', '/imports/:id/validate', ({ params, user }) => {
  requireUser(user);
  const s = db.importSessions.find((x) => x.id === params.id);
  if (!s) throw new ApiError(404, 'Import session not found.');
  if (!canTransition('importSession', s.status, 'VALIDATING')) throw new ApiError(409, `Cannot validate while status is ${s.status}.`);
  s.status = 'VALIDATED';
  const total = 24;
  const rejected = s.importType === 'ATTENDANCE' ? 1 : 2;
  previews.set(s.id, {
    validRecords: total - rejected,
    rejectedRecords: rejected,
    sampleValidRows: [
      ['VVCE23101', 'MTH201', '38', '40'],
      ['VVCE23102', 'MTH201', '31', '40'],
      ['VVCE23105', 'PHY201', '22', '40'],
    ],
    sampleRejectedRows: [
      { row: ['VVCE23999', 'MTH201', '30', '40'], reason: 'Unknown student identifier (PRN)' },
      { row: ['VVCE23103', 'MTH201', '45', '40'], reason: 'attended_sessions (45) exceeds total_sessions (40)' },
    ].slice(0, rejected),
  });
  return { ...s, preview: previews.get(s.id) };
});

route('POST', '/imports/:id/process', ({ params, user }) => {
  requireUser(user);
  const s = db.importSessions.find((x) => x.id === params.id);
  if (!s) throw new ApiError(404, 'Import session not found.');
  if (!canTransition('importSession', s.status, 'PROCESSING')) throw new ApiError(409, `Cannot process while status is ${s.status}.`);
  const preview = previews.get(s.id) ?? { validRecords: 24, rejectedRecords: 0, sampleValidRows: [], sampleRejectedRows: [] };
  s.status = 'COMPLETED';
  const report: ImportReport = {
    id: db.nextId('irp'),
    importSessionId: s.id,
    totalRecords: preview.validRecords + preview.rejectedRecords,
    validRecords: preview.validRecords,
    rejectedRecords: preview.rejectedRecords,
    insertedRecords: Math.floor(preview.validRecords * 0.3),
    updatedRecords: preview.validRecords - Math.floor(preview.validRecords * 0.3),
    resultStatus: preview.rejectedRecords > 0 ? 'PARTIAL_SUCCESS' : 'SUCCESS',
    summary: preview.rejectedRecords > 0
      ? `${preview.rejectedRecords} row(s) rejected and excluded from commit. No partial commit of rejected data.`
      : 'All valid rows committed. Snapshot refresh requested for affected enrollments.',
  };
  db.importReports.push(report);
  previews.delete(s.id);
  return { ...s, report };
});

route('POST', '/imports/:id/cancel', ({ params, user }) => {
  requireUser(user);
  const s = db.importSessions.find((x) => x.id === params.id);
  if (!s) throw new ApiError(404, 'Import session not found.');
  if (!canTransition('importSession', s.status, 'CANCELLED')) throw new ApiError(409, `Cannot cancel while status is ${s.status}.`);
  s.status = 'CANCELLED'; // PRD §10: cancelled imports must not modify academic data.
  previews.delete(s.id);
  return s;
});

/* ---------------------------------- AI board ------------------------------- */

route('GET', '/predictions/board', ({ user, query }) => {
  requireUser(user);
  let studentIds = db.students.filter((s) => s.status !== 'ARCHIVED').map((s) => s.id);
  if (user!.roles.includes('MENTOR') && !user!.roles.includes('ORG_ADMIN')) {
    studentIds = studentIds.filter((id) => (user!.assignedStudentIds ?? []).includes(id));
  }
  const rows: RiskBoardRow[] = studentIds.map((sid) => {
    const s = db.students.find((x) => x.id === sid)!;
    const snap = db.snapshots.filter((x) => x.studentId === sid && x.status !== 'SUPERSEDED').at(-1);
    const pred = snap ? db.predictions.find((p) => p.snapshotId === snap.id) : undefined;
    const enr = db.enrollments.find((e) => e.studentId === sid && e.status === 'ACTIVE');
    return {
      studentId: sid,
      studentName: `${s.firstName} ${s.lastName}`,
      primaryIdentifier: db.identifiers.find((i) => i.studentId === sid && i.isPrimary)?.identifierValue,
      programName: enr?.programName,
      levelName: enr?.levelName,
      snapshot: snap,
      prediction: pred,
      state: pred ? pred.predictionLabel : snap ? 'PENDING' : 'UNAVAILABLE',
      hasOpenIntervention: db.interventions.some((i) => i.studentId === sid && ['PLANNED', 'IN_PROGRESS'].includes(i.status)),
      mentorCanSeeSummary: db.behaviourSummaries.some((b) => b.studentId === sid && b.approvedForMentor),
    };
  });
  if (query.label) return rows.filter((r) => r.state === query.label);
  return rows;
});

route('GET', '/ai/models', ({ user }) => (requireUser(user), db.aiModels));

/* -------------------------------- counseling ------------------------------- */

route('GET', '/interventions', ({ user, query }) => {
  requireUser(user);
  let list = db.interventions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (user!.roles.includes('MENTOR') && !user!.roles.includes('ORG_ADMIN')) {
    list = list.filter((i) => (user!.assignedStudentIds ?? []).includes(i.studentId) || i.responsibleUserId === user!.id);
  }
  if (query.status) list = list.filter((i) => i.status === query.status);
  return list;
});

route('POST', '/interventions', ({ body, user }) => {
  const u = requireUser(user);
  // PRD §15: AI never auto-creates interventions — every record here is human-initiated.
  const { studentId, interventionType, priority, title, description, responsibleUserId, predictionId } = body ?? {};
  if (!studentId || !interventionType || !priority || !title || !responsibleUserId) throw new ApiError(400, 'Student, type, priority, title and a responsible user are required.');
  const responsible = db.users.find((uu) => uu.id === responsibleUserId);
  if (!responsible) throw new ApiError(400, 'Responsible user must belong to the same Organization.');
  const s = db.students.find((x) => x.id === studentId);
  if (!s) throw new ApiError(404, 'Student not found.');
  const row: Intervention = {
    id: db.nextId('int'), studentId, predictionId: predictionId || undefined,
    interventionType, priority, title, description,
    status: 'PLANNED', responsibleUserId, responsibleUserName: responsible.name,
    studentName: `${s.firstName} ${s.lastName}`, createdByName: u.name, createdAt: db.now(),
  };
  db.interventions.unshift(row);
  return row;
});

route('GET', '/interventions/:id', ({ params, user }) => {
  const u = requireUser(user);
  const i = db.interventions.find((x) => x.id === params.id);
  if (!i) throw new ApiError(404, 'Intervention not found.');
  return {
    intervention: i,
    student: db.students.find((s) => s.id === i.studentId),
    prediction: i.predictionId ? db.predictions.find((p) => p.id === i.predictionId) : undefined,
    sessions: db.sessions.filter((s) => s.interventionId === i.id),
    followUps: db.followUps.filter((f) => f.interventionId === i.id),
    canSeeNotes: u.roles.includes('ORG_ADMIN') || db.sessions.some((s) => s.interventionId === i.id && s.mentorId === u.id) || i.responsibleUserId === u.id,
  };
});

route('PATCH', '/interventions/:id', ({ params, body, user }) => {
  requireUser(user);
  const i = db.interventions.find((x) => x.id === params.id);
  if (!i) throw new ApiError(404, 'Intervention not found.');
  if (body?.status) {
    if (!canTransition('intervention', i.status, body.status)) throw new ApiError(409, `Invalid intervention transition ${i.status} → ${body.status}. Cancelled interventions cannot resume.`);
    i.status = body.status;
    if (body.status === 'COMPLETED') i.completedAt = db.now(); // PRD §15 integrity rule.
  }
  return i;
});

route('POST', '/interventions/:id/sessions', ({ params, body, user }) => {
  const u = requireUser(user);
  const i = db.interventions.find((x) => x.id === params.id);
  if (!i) throw new ApiError(404, 'Intervention not found.');
  const mentor = db.users.find((x) => x.id === (body.mentorId ?? u.id));
  if (!mentor) throw new ApiError(400, 'A responsible Mentor/Counselor is required.');
  const row = {
    id: db.nextId('ses'), interventionId: i.id, studentId: i.studentId,
    mentorId: mentor.id, mentorName: mentor.name,
    sessionType: body.sessionType, status: 'SCHEDULED' as const, scheduledAt: body.scheduledAt,
  };
  db.sessions.push(row);
  return row;
});

route('PATCH', '/sessions/:id', ({ params, body, user }) => {
  requireUser(user);
  const s = db.sessions.find((x) => x.id === params.id);
  if (!s) throw new ApiError(404, 'Counseling session not found.');
  if (body?.status) {
    if (!canTransition('session', s.status, body.status)) throw new ApiError(409, `Invalid session transition ${s.status} → ${body.status}.`);
    if (body.status === 'COMPLETED') {
      // PRD §15: completed sessions require started_at and ended_at; ended_at ≥ started_at.
      const started = body.startedAt ?? s.scheduledAt;
      const ended = body.endedAt ?? db.now();
      if (ended < started) throw new ApiError(400, 'ended_at cannot precede started_at.');
      s.startedAt = started;
      s.endedAt = ended;
      if (body.outcomeSummary) s.outcomeSummary = body.outcomeSummary;
    }
    s.status = body.status;
  }
  return s;
});

route('GET', '/follow-ups', ({ user, query }) => {
  requireUser(user);
  let list = db.followUps.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (query.mine === 'true' || query.mine === true) list = list.filter((f) => f.assignedUserId === user!.id);
  if (query.status) list = list.filter((f) => f.status === query.status);
  return list;
});

route('POST', '/interventions/:id/follow-ups', ({ params, body, user }) => {
  requireUser(user);
  const i = db.interventions.find((x) => x.id === params.id);
  if (!i) throw new ApiError(404, 'Intervention not found.');
  const assignee = db.users.find((x) => x.id === body.assignedUserId);
  if (!assignee) throw new ApiError(400, 'Assigned user must belong to the same Organization.');
  const row = {
    id: db.nextId('fup'), interventionId: i.id, counselingSessionId: body.counselingSessionId || undefined,
    followUpType: body.followUpType, status: 'PENDING' as const, dueDate: body.dueDate,
    assignedUserId: assignee.id, assignedUserName: assignee.name, note: body.note,
    createdAt: db.now(), interventionTitle: i.title, studentName: i.studentName,
  };
  db.followUps.push(row);
  return row;
});

route('PATCH', '/follow-ups/:id', ({ params, body, user }) => {
  requireUser(user);
  const f = db.followUps.find((x) => x.id === params.id);
  if (!f) throw new ApiError(404, 'Follow-up not found.');
  if (body?.status) {
    if (!canTransition('followUp', f.status, body.status)) throw new ApiError(409, `Invalid follow-up transition ${f.status} → ${body.status}. A cancelled follow-up cannot later be completed.`);
    f.status = body.status;
    if (body.status === 'COMPLETED') f.completedAt = db.now();
    else delete f.completedAt; // PENDING must not carry completed_at (PRD §15).
  }
  return f;
});

/* ------------------------------ mentor access ------------------------------ */

route('GET', '/mentor-access', ({ user }) => (requireUser(user), db.mentorAccessRequests));

route('POST', '/mentor-access/:id/decision', ({ params, body, user }) => {
  const u = requireUser(user);
  const r = db.mentorAccessRequests.find((x) => x.id === params.id);
  if (!r) throw new ApiError(404, 'Request not found.');
  if (r.status !== 'PENDING') throw new ApiError(409, 'This request has already been decided.');
  // PRD §17: AI recommends; the Organization Admin approves. AI never grants access.
  r.status = body.approve ? 'APPROVED' : 'REJECTED';
  r.decidedAt = db.now();
  r.decidedByName = u.name;
  if (body.approve && !db.mentorAssignments.some((m) => m.mentorId === r.mentorId && m.studentId === r.studentId)) {
    db.mentorAssignments.push({ mentorId: r.mentorId, studentId: r.studentId });
  }
  return r;
});

/* -------------------------------- governance ------------------------------- */

route('GET', '/governance/audit-logs', ({ user, query }) => {
  requireUser(user);
  let list = db.auditLogs.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (query.outcome) list = list.filter((l) => l.outcome === query.outcome);
  if (query.q) {
    const q = String(query.q).toLowerCase();
    list = list.filter((l) => `${l.action} ${l.entityType} ${l.actorName ?? ''}`.toLowerCase().includes(q));
  }
  return list;
});

route('GET', '/governance/access-logs', ({ user, query }) => {
  requireUser(user);
  let list = db.accessLogs.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (query.result) list = list.filter((l) => l.result === query.result);
  if (query.action) list = list.filter((l) => l.action === query.action);
  return list;
});

route('GET', '/governance/notifications', ({ user, query }) => {
  requireUser(user);
  let list = db.notifications.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (query.channel) list = list.filter((n) => n.channel === query.channel);
  if (query.status) list = list.filter((n) => n.status === query.status);
  if (query.type) list = list.filter((n) => n.notificationType === query.type);
  return list;
});

/* --------------------------------- reports --------------------------------- */

route('GET', '/reports/summary', ({ user }) => {
  requireUser(user);
  const open = db.interventions.filter((i) => ['PLANNED', 'IN_PROGRESS'].includes(i.status));
  return {
    students: db.students.length,
    activeStudents: db.students.filter((s) => s.status === 'ACTIVE').length,
    risk: {
      HIGH: db.predictions.filter((p) => p.predictionLabel === 'HIGH').length,
      MEDIUM: db.predictions.filter((p) => p.predictionLabel === 'MEDIUM').length,
      LOW: db.predictions.filter((p) => p.predictionLabel === 'LOW').length,
      UNAVAILABLE: db.students.length - db.predictions.length,
    },
    openInterventions: open.length,
    pendingFollowUps: db.followUps.filter((f) => f.status === 'PENDING').length,
    recentImports: db.importSessions.slice(0, 3),
    pendingMentorAccess: db.mentorAccessRequests.filter((r) => r.status === 'PENDING').length,
  };
});

route('GET', '/reports/export', ({ user, query }) => {
  requireUser(user);
  const kind = String(query.kind ?? 'predictions');
  const at = db.now();
  switch (kind) {
    case 'predictions':
      return {
        kind, title: 'Risk Predictions', generatedAt: at,
        columns: [
          { key: 'student', label: 'Student' }, { key: 'identifier', label: 'PRN' },
          { key: 'label', label: 'Risk Label' }, { key: 'score', label: 'Prediction Score' },
          { key: 'model', label: 'AI Model Version' }, { key: 'generatedAt', label: 'Generated At' },
        ],
        rows: db.predictions.map((p) => {
          const s = db.students.find((x) => x.id === p.studentId)!;
          return { student: `${s.firstName} ${s.lastName}`, identifier: db.identifiers.find((i) => i.studentId === s.id && i.isPrimary)?.identifierValue ?? '', label: p.predictionLabel, score: p.predictionScore, model: p.aiModelVersion, generatedAt: p.generatedAt.slice(0, 10) };
        }),
      };
    case 'attendance':
      return {
        kind, title: 'Attendance Evidence', generatedAt: at,
        columns: [
          { key: 'student', label: 'Student' }, { key: 'component', label: 'Learning Component' },
          { key: 'attended', label: 'Attended Sessions' }, { key: 'total', label: 'Total Sessions' },
          { key: 'pct', label: 'Attendance %' },
        ],
        rows: db.attendance.map((a) => {
          const enr = db.enrollments.find((e) => e.id === a.enrollmentId)!;
          const s = db.students.find((x) => x.id === enr.studentId)!;
          return { student: `${s.firstName} ${s.lastName}`, component: db.components.find((c) => c.id === a.learningComponentId)?.code ?? '', attended: a.attendedSessions, total: a.totalSessions, pct: Math.round((a.attendedSessions / a.totalSessions) * 100) };
        }),
      };
    case 'interventions':
      return {
        kind, title: 'Interventions', generatedAt: at,
        columns: [
          { key: 'title', label: 'Title' }, { key: 'student', label: 'Student' }, { key: 'type', label: 'Type' },
          { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' }, { key: 'responsible', label: 'Responsible' },
          { key: 'created', label: 'Created' }, { key: 'completed', label: 'Completed At' },
        ],
        rows: db.interventions.map((i) => ({ title: i.title, student: i.studentName ?? '', type: i.interventionType, priority: i.priority, status: i.status, responsible: i.responsibleUserName ?? '', created: i.createdAt.slice(0, 10), completed: i.completedAt?.slice(0, 10) ?? '—' })),
      };
    default:
      return {
        kind, title: 'Imports', generatedAt: at,
        columns: [
          { key: 'type', label: 'Import Type' }, { key: 'status', label: 'Status' }, { key: 'file', label: 'File' },
          { key: 'by', label: 'Initiated By' }, { key: 'at', label: 'Created At' },
        ],
        rows: db.importSessions.map((s) => ({ type: s.importType, status: s.status, file: s.fileName ?? '', by: s.createdByName, at: s.createdAt.slice(0, 10) })),
      };
  }
});

/* --------------------------------- dispatch -------------------------------- */

export async function demoRequest<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  await delay();
  const m = method.toUpperCase();
  for (const r of routes) {
    if (r.method !== m) continue;
    const match = r.regex.exec(path);
    if (!match) continue;
    const params: Record<string, string> = {};
    r.keys.forEach((k, i) => (params[k] = decodeURIComponent(match[i + 1])));
    const user = r.public ? null : currentUser();
    if (!r.public && !user) throw new ApiError(401, 'Not authenticated.');
    return r.handler({ params, query: query ?? {}, body, user }) as T;
  }
  throw new ApiError(404, `Demo adapter has no route for ${m} ${path}.`);
}
