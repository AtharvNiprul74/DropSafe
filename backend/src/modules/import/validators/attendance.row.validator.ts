import { z } from 'zod';

export interface AttendanceRowParsed {
  identifier_value: string;
  identifier_type?: string;
  component_code: string;
  period_code?: string;
  attended_sessions: number;
  total_sessions: number;
}

export const attendanceRowSchema = z
  .object({
    identifier_value: z.string().trim().min(1, 'Student identifier (PRN/Roll No) is required'),
    identifier_type: z.string().trim().optional(),
    component_code: z.string().trim().min(1, 'Component code is required'),
    period_code: z.string().trim().optional().or(z.literal('')),
    attended_sessions: z.coerce
      .number()
      .int('attended_sessions must be an integer')
      .min(0, 'attended_sessions cannot be negative'),
    total_sessions: z.coerce
      .number()
      .int('total_sessions must be an integer')
      .min(0, 'total_sessions cannot be negative'),
  })
  .refine((data) => data.attended_sessions <= data.total_sessions, {
    message: 'Logical limit violation: attended_sessions cannot exceed total_sessions',
    path: ['attended_sessions'],
  });

export const ATTENDANCE_IDENTIFIER_CANDIDATES = [
  'identifier_value',
  'identifier',
  'prn',
  'roll_no',
  'rollno',
  'student_id',
];

export const ATTENDANCE_COMPONENT_CANDIDATES = [
  'component_code',
  'learning_component_code',
  'subject_code',
  'course_code',
];

export const ATTENDANCE_ATTENDED_CANDIDATES = [
  'attended_sessions',
  'attended',
  'attended_classes',
  'sessions_attended',
];

export const ATTENDANCE_TOTAL_CANDIDATES = [
  'total_sessions',
  'total',
  'total_classes',
  'sessions_total',
];

export function validateAttendanceHeaders(headers: string[]): { valid: boolean; missing: string[] } {
  const normalized = headers.map((h) => h.toLowerCase().trim().replace(/[\s-]+/g, '_'));
  const missing: string[] = [];

  const hasIdentifier = ATTENDANCE_IDENTIFIER_CANDIDATES.some((c) => normalized.includes(c));
  if (!hasIdentifier) {
    missing.push('identifier_value (or prn / roll_no)');
  }

  const hasComponent = ATTENDANCE_COMPONENT_CANDIDATES.some((c) => normalized.includes(c));
  if (!hasComponent) {
    missing.push('component_code');
  }

  const hasAttended = ATTENDANCE_ATTENDED_CANDIDATES.some((c) => normalized.includes(c));
  if (!hasAttended) {
    missing.push('attended_sessions');
  }

  const hasTotal = ATTENDANCE_TOTAL_CANDIDATES.some((c) => normalized.includes(c));
  if (!hasTotal) {
    missing.push('total_sessions');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export function mapAttendanceRow(rawRow: Record<string, string>, defaultIdentifierType = 'PRN'): Record<string, unknown> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const cleanKey = key.toLowerCase().trim().replace(/[\s-]+/g, '_');
    normalized[cleanKey] = (value ?? '').trim();
  }

  let identifierValue = '';
  for (const candidate of ATTENDANCE_IDENTIFIER_CANDIDATES) {
    if (normalized[candidate]) {
      identifierValue = normalized[candidate];
      break;
    }
  }

  let componentCode = '';
  for (const candidate of ATTENDANCE_COMPONENT_CANDIDATES) {
    if (normalized[candidate]) {
      componentCode = normalized[candidate];
      break;
    }
  }

  let attendedSessions: string | undefined = undefined;
  for (const candidate of ATTENDANCE_ATTENDED_CANDIDATES) {
    if (normalized[candidate] !== undefined && normalized[candidate] !== '') {
      attendedSessions = normalized[candidate];
      break;
    }
  }

  let totalSessions: string | undefined = undefined;
  for (const candidate of ATTENDANCE_TOTAL_CANDIDATES) {
    if (normalized[candidate] !== undefined && normalized[candidate] !== '') {
      totalSessions = normalized[candidate];
      break;
    }
  }

  return {
    identifier_value: identifierValue,
    identifier_type: normalized.identifier_type || defaultIdentifierType,
    component_code: componentCode,
    period_code: normalized.period_code || normalized.academic_period_code || undefined,
    attended_sessions: attendedSessions,
    total_sessions: totalSessions,
  };
}
