import { z } from 'zod';
import { StudentStatus } from '@prisma/client';

export interface StudentRowParsed {
  first_name: string;
  last_name: string;
  identifier_value: string;
  identifier_type: string;
  email?: string;
  date_of_birth?: Date;
  gender?: string;
  phone?: string;
  status: StudentStatus;
}

export const studentRowSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  identifier_value: z.string().trim().min(1, 'Student identifier is required'),
  identifier_type: z.string().trim().min(1).default('PRN'),
  email: z
    .string()
    .trim()
    .email('Invalid email address format')
    .optional()
    .or(z.literal('')),
  date_of_birth: z
    .string()
    .trim()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'date_of_birth must be a valid ISO/calendar date string',
    })
    .optional()
    .or(z.literal('')),
  gender: z.string().trim().optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  status: z
    .nativeEnum(StudentStatus)
    .optional()
    .default(StudentStatus.ACTIVE),
});

export const STUDENT_REQUIRED_HEADERS = ['first_name', 'last_name'];
export const STUDENT_IDENTIFIER_HEADER_CANDIDATES = [
  'identifier_value',
  'identifier',
  'prn',
  'roll_no',
  'rollno',
  'student_id',
];

export function validateStudentHeaders(headers: string[]): { valid: boolean; missing: string[] } {
  const normalized = headers.map((h) => h.toLowerCase().trim().replace(/[\s-]+/g, '_'));
  const missing: string[] = [];

  for (const req of STUDENT_REQUIRED_HEADERS) {
    if (!normalized.includes(req)) {
      missing.push(req);
    }
  }

  const hasIdentifier = STUDENT_IDENTIFIER_HEADER_CANDIDATES.some((c) => normalized.includes(c));
  if (!hasIdentifier) {
    missing.push('identifier_value (or prn / roll_no)');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export function mapStudentRow(rawRow: Record<string, string>, defaultIdentifierType = 'PRN'): Record<string, unknown> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const cleanKey = key.toLowerCase().trim().replace(/[\s-]+/g, '_');
    normalized[cleanKey] = (value ?? '').trim();
  }

  // Resolve identifier
  let identifierValue = '';
  for (const candidate of STUDENT_IDENTIFIER_HEADER_CANDIDATES) {
    if (normalized[candidate]) {
      identifierValue = normalized[candidate];
      break;
    }
  }

  const identifierType = normalized.identifier_type || defaultIdentifierType;

  return {
    first_name: normalized.first_name || normalized.firstname,
    last_name: normalized.last_name || normalized.lastname,
    identifier_value: identifierValue,
    identifier_type: identifierType,
    email: normalized.email || undefined,
    date_of_birth: normalized.date_of_birth || normalized.dob || normalized.birth_date || undefined,
    gender: normalized.gender || undefined,
    phone: normalized.phone || normalized.mobile || undefined,
    status: normalized.status ? (normalized.status.toUpperCase() as StudentStatus) : StudentStatus.ACTIVE,
  };
}
