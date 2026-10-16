import { EP } from '../endpoints';
import { get, patch, post } from '../http';
import type {
  AiModelMetadata,
  BehaviourSummary,
  CounselingSession,
  FollowUp,
  Intervention,
  Prediction,
  PredictionHistoryEntry,
  RiskBoardRow,
  StudentSnapshot,
} from '../../types/models';

/* ------------------------------ risk monitoring ---------------------------- */

export const riskBoard = (label?: string) => get<RiskBoardRow[]>(EP.riskBoard.path, label ? { label } : undefined);

export interface StudentInsights {
  snapshots: StudentSnapshot[];
  predictions: Prediction[];
  history: PredictionHistoryEntry[];
  behaviourSummaries: BehaviourSummary[];
}

export const studentInsights = (studentId: string) => get<StudentInsights>(EP.studentInsights(studentId).path);
export const listModels = () => get<AiModelMetadata[]>(EP.aiModels.path);

/* ------------------------------- interventions ----------------------------- */

export const listInterventions = (status?: string) =>
  get<Intervention[]>(EP.interventions.path, status ? { status } : undefined);

export interface InterventionDetail {
  intervention: Intervention;
  student?: { id: string; firstName: string; lastName: string; status: string };
  prediction?: Prediction;
  sessions: CounselingSession[];
  followUps: FollowUp[];
  canSeeNotes: boolean;
}

export const getIntervention = (id: string) => get<InterventionDetail>(EP.intervention(id).path);

/** Human-led creation — AI never auto-creates an Intervention (PRD §15). */
export const createIntervention = (body: {
  studentId: string;
  interventionType: string;
  priority: string;
  title: string;
  description?: string;
  responsibleUserId: string;
  predictionId?: string;
}) => post<Intervention>(EP.createIntervention.path, body);

export const transitionIntervention = (id: string, status: string) =>
  patch<Intervention>(EP.updateIntervention(id).path, { status });

export const scheduleSession = (interventionId: string, body: { sessionType: string; scheduledAt: string; mentorId?: string }) =>
  post<CounselingSession>(EP.createSession(interventionId).path, body);

export const transitionSession = (id: string, body: { status: string; startedAt?: string; endedAt?: string; outcomeSummary?: string }) =>
  patch<CounselingSession>(EP.updateSession(id).path, body);

export const listFollowUps = (opts?: { mine?: boolean; status?: string }) =>
  get<FollowUp[]>(EP.followUps.path, { mine: opts?.mine ? 'true' : undefined, status: opts?.status });

export const createFollowUp = (interventionId: string, body: {
  followUpType: string;
  dueDate: string;
  assignedUserId: string;
  note?: string;
  counselingSessionId?: string;
}) => post<FollowUp>(EP.createFollowUp(interventionId).path, body);

export const transitionFollowUp = (id: string, status: string) =>
  patch<FollowUp>(EP.updateFollowUp(id).path, { status });
