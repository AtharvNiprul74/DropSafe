import { EP } from '../endpoints';
import { get } from '../http';
import type { AccessLog, AuditLog, NotificationRecord, ReportResult } from '../../types/models';

export const listAuditLogs = (filter?: { q?: string; outcome?: string }) =>
  get<AuditLog[]>(EP.auditLogs.path, filter);

export const listAccessLogs = (filter?: { result?: string; action?: string }) =>
  get<AccessLog[]>(EP.accessLogs.path, filter);

export const listNotifications = (filter?: { channel?: string; status?: string; type?: string }) =>
  get<NotificationRecord[]>(EP.notifications.path, filter);

export interface ReportSummary {
  students: number;
  activeStudents: number;
  risk: { HIGH: number; MEDIUM: number; LOW: number; UNAVAILABLE: number };
  openInterventions: number;
  pendingFollowUps: number;
  recentImports: import('../../types/models').ImportSession[];
  pendingMentorAccess: number;
}

export const reportSummary = () => get<ReportSummary>(EP.reportSummary.path);
export const exportReport = (kind: string) => get<ReportResult>(EP.reportExport.path, { kind });
