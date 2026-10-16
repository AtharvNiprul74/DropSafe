import { EP } from '../endpoints';
import { get, patch, post } from '../http';
import type {
  AcademicPeriod,
  LearningComponent,
  LearningLevel,
  LearningProgram,
} from '../../types/models';

export const listPrograms = () => get<LearningProgram[]>(EP.programs.path);
export const createProgram = (body: { code: string; name: string; description?: string }) =>
  post<LearningProgram>(EP.createProgram.path, body);
export const updateProgram = (id: string, body: { status?: string }) => patch<LearningProgram>(EP.updateProgram(id).path, body);

export const listLevels = (programId?: string) => get<LearningLevel[]>(EP.levels.path, programId ? { programId } : undefined);
export const createLevel = (body: { programId: string; levelNumber: number; name: string }) =>
  post<LearningLevel>(EP.createLevel.path, body);
export const updateLevel = (id: string, body: { status?: string }) => patch<LearningLevel>(EP.updateLevel(id).path, body);

export const listPeriods = (levelId?: string) => get<AcademicPeriod[]>(EP.periods.path, levelId ? { levelId } : undefined);
export const createPeriod = (body: { levelId: string; code: string; startDate: string; endDate: string }) =>
  post<AcademicPeriod>(EP.createPeriod.path, body);
export const updatePeriod = (id: string, body: { status?: string }) => patch<AcademicPeriod>(EP.updatePeriod(id).path, body);

export const listComponents = (periodId?: string) =>
  get<LearningComponent[]>(EP.components.path, periodId ? { periodId } : undefined);
export const createComponent = (body: {
  periodId: string;
  code: string;
  name: string;
  type: string;
  maximumMarks: number;
  passingMarks: number;
}) => post<LearningComponent>(EP.createComponent.path, body);
export const updateComponent = (id: string, body: { status?: string }) =>
  patch<LearningComponent>(EP.updateComponent(id).path, body);

/* ------------------------------- roster/evidence --------------------------- */

export interface RosterRow {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  primaryIdentifier?: string;
  attendance: { id: string; learningComponentId: string; attendedSessions: number; totalSessions: number }[];
  assessments: { id: string; learningComponentId: string; obtainedMarks: number; maximumMarks: number }[];
}

export const listRoster = (periodId: string) => get<RosterRow[]>(EP.roster.path, { periodId });
export const saveAttendanceBulk = (rows: { enrollmentId: string; learningComponentId: string; attendedSessions: number; totalSessions: number }[]) =>
  post(EP.saveAttendance.path, { rows });
export const saveAssessmentsBulk = (rows: { enrollmentId: string; learningComponentId: string; obtainedMarks: number; maximumMarks: number }[]) =>
  post(EP.saveAssessments.path, { rows });
