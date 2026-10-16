import { z } from 'zod';

export interface AssessmentRowParsed {
  identifier_value: string;
  identifier_type?: string;
  component_code: string;
  period_code?: string;
  obtained_marks: number;
  maximum_marks?: number;
}

export const assessmentRowSchema = z
  .object({
    identifier_value: z.string().trim().min(1, 'Student identifier (PRN/Roll No) is required'),
    identifier_type: z.string().trim().optional(),
    component_code: z.string().trim().min(1, 'Component code is required'),
    period_code: z.string().trim().optional().or(z.literal('')),
    obtained_marks: z.coerce
      .number()
      .min(0, 'obtained_marks cannot be negative'),
    maximum_marks: z.coerce
      .number()
      .positive('maximum_marks must be greater than zero')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      if (typeof data.maximum_marks === 'number') {
        return data.obtained_marks <= data.maximum_marks;
      }
      return true;
    },
    {
      message: 'Logical limit violation: obtained_marks cannot exceed maximum_marks',
      path: ['obtained_marks'],
    }
  );

export const ASSESSMENT_IDENTIFIER_CANDIDATES = [
  'identifier_value',
  'identifier',
  'prn',
  'roll_no',
  'rollno',
  'student_id',
];

export const ASSESSMENT_COMPONENT_CANDIDATES = [
  'component_code',
  'learning_component_code',
  'subject_code',
  'course_code',
];

export const ASSESSMENT_OBTAINED_CANDIDATES = [
  'obtained_marks',
  'marks_obtained',
  'score',
  'marks',
  'obtained',
];

export const ASSESSMENT_MAX_CANDIDATES = [
  'maximum_marks',
  'max_marks',
  'total_marks',
  'maximum',
];

export function validateAssessmentHeaders(headers: string[]): { valid: boolean; missing: string[] } {
  const normalized = headers.map((h) => h.toLowerCase().trim().replace(/[\s-]+/g, '_'));
  const missing: string[] = [];

  const hasIdentifier = ASSESSMENT_IDENTIFIER_CANDIDATES.some((c) => normalized.includes(c));
  if (!hasIdentifier) {
    missing.push('identifier_value (or prn / roll_no)');
  }

  const hasComponent = ASSESSMENT_COMPONENT_CANDIDATES.some((c) => normalized.includes(c));
  if (!hasComponent) {
    missing.push('component_code');
  }

  const hasObtained = ASSESSMENT_OBTAINED_CANDIDATES.some((c) => normalized.includes(c));
  if (!hasObtained) {
    missing.push('obtained_marks');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export function mapAssessmentRow(rawRow: Record<string, string>, defaultIdentifierType = 'PRN'): Record<string, unknown> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const cleanKey = key.toLowerCase().trim().replace(/[\s-]+/g, '_');
    normalized[cleanKey] = (value ?? '').trim();
  }

  let identifierValue = '';
  for (const candidate of ASSESSMENT_IDENTIFIER_CANDIDATES) {
    if (normalized[candidate]) {
      identifierValue = normalized[candidate];
      break;
    }
  }

  let componentCode = '';
  for (const candidate of ASSESSMENT_COMPONENT_CANDIDATES) {
    if (normalized[candidate]) {
      componentCode = normalized[candidate];
      break;
    }
  }

  let obtainedMarks: string | undefined = undefined;
  for (const candidate of ASSESSMENT_OBTAINED_CANDIDATES) {
    if (normalized[candidate] !== undefined && normalized[candidate] !== '') {
      obtainedMarks = normalized[candidate];
      break;
    }
  }

  let maxMarks: string | undefined = undefined;
  for (const candidate of ASSESSMENT_MAX_CANDIDATES) {
    if (normalized[candidate] !== undefined && normalized[candidate] !== '') {
      maxMarks = normalized[candidate];
      break;
    }
  }

  return {
    identifier_value: identifierValue,
    identifier_type: normalized.identifier_type || defaultIdentifierType,
    component_code: componentCode,
    period_code: normalized.period_code || normalized.academic_period_code || undefined,
    obtained_marks: obtainedMarks,
    maximum_marks: maxMarks,
  };
}
