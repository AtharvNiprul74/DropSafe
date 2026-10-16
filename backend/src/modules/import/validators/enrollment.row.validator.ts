import { z } from 'zod';
import { EnrollmentStatus } from '@prisma/client';

export interface EnrollmentRowParsed {
  identifier_value: string;
  identifier_type?: string;
  period_code: string;
  status: EnrollmentStatus;
  enrollment_date?: Date;
}

export const enrollmentRowSchema = z.object({
  identifier_value: z.string().trim().min(1, 'Student identifier (PRN/Roll No) is required'),
  identifier_type: z.string().trim().optional(),
  period_code: z.string().trim().min(1, 'Period code is required'),
  status: z
    .nativeEnum(EnrollmentStatus)
    .optional()
    .default(EnrollmentStatus.ACTIVE),
  enrollment_date: z
    .string()
    .trim()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'enrollment_date must be a valid ISO/calendar date string',
    })
    .optional()
    .or(z.literal('')),
});

export const ENROLLMENT_IDENTIFIER_CANDIDATES = [
  'identifier_value',
  'identifier',
  'prn',
  'roll_no',
  'rollno',
  'student_id',
  'student_identifier',
];

export const ENROLLMENT_PERIOD_CANDIDATES = [
  'period_code',
  'academic_period_code',
  'period',
  'period_id',
];

export function validateEnrollmentHeaders(headers: string[]): { valid: boolean; missing: string[] } {
  const normalized = headers.map((h) => h.toLowerCase().trim().replace(/[\s-]+/g, '_'));
  const missing: string[] = [];

  const hasIdentifier = ENROLLMENT_IDENTIFIER_CANDIDATES.some((c) => normalized.includes(c));
  if (!hasIdentifier) {
    missing.push('identifier_value (or prn / roll_no)');
  }

  const hasPeriod = ENROLLMENT_PERIOD_CANDIDATES.some((c) => normalized.includes(c));
  if (!hasPeriod) {
    missing.push('period_code');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export function mapEnrollmentRow(rawRow: Record<string, string>, defaultIdentifierType = 'PRN'): Record<string, unknown> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const cleanKey = key.toLowerCase().trim().replace(/[\s-]+/g, '_');
    normalized[cleanKey] = (value ?? '').trim();
  }

  let identifierValue = '';
  for (const candidate of ENROLLMENT_IDENTIFIER_CANDIDATES) {
    if (normalized[candidate]) {
      identifierValue = normalized[candidate];
      break;
    }
  }

  let periodCode = '';
  for (const candidate of ENROLLMENT_PERIOD_CANDIDATES) {
    if (normalized[candidate]) {
      periodCode = normalized[candidate];
      break;
    }
  }

  return {
    identifier_value: identifierValue,
    identifier_type: normalized.identifier_type || defaultIdentifierType,
    period_code: periodCode,
    status: normalized.status ? (normalized.status.toUpperCase() as EnrollmentStatus) : EnrollmentStatus.ACTIVE,
    enrollment_date: normalized.enrollment_date || undefined,
  };
}
