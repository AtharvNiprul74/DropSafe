import { z } from 'zod';
import { StudentStatus, IdentifierStatus, EnrollmentStatus } from '@prisma/client';

// ==========================================
// 1. STUDENT IDENTITY SCHEMAS
// ==========================================

export const createStudentSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name cannot exceed 100 characters')
    .trim(),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name cannot exceed 100 characters')
    .trim(),
  date_of_birth: z.coerce.date().optional(),
  gender: z.string().max(30).optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().max(30).optional(),
  status: z.nativeEnum(StudentStatus).optional().default(StudentStatus.ACTIVE),
  // Optional inline identifier creation for atomic onboarding
  identifier: z
    .object({
      identifier_type: z.string().min(1, 'Identifier type is required').max(50),
      identifier_value: z.string().min(1, 'Identifier value is required').max(100).trim(),
      is_primary: z.boolean().optional().default(true),
    })
    .optional(),
});

export const updateStudentSchema = z.object({
  first_name: z.string().min(1).max(100).trim().optional(),
  last_name: z.string().min(1).max(100).trim().optional(),
  date_of_birth: z.coerce.date().nullable().optional(),
  gender: z.string().max(30).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
});

export const updateStudentStatusSchema = z.object({
  status: z.nativeEnum(StudentStatus, {
    message: 'Status must be ACTIVE, GRADUATED, TRANSFERRED, or ARCHIVED',
  }),
});

// ==========================================
// 2. STUDENT IDENTIFIER SCHEMAS
// ==========================================

export const createIdentifierSchema = z.object({
  identifier_type: z
    .string()
    .min(1, 'Identifier type is required (e.g., PRN, Roll Number, Enrollment ID)')
    .max(50)
    .trim(),
  identifier_value: z
    .string()
    .min(1, 'Identifier value is required')
    .max(100)
    .trim(),
  is_primary: z.boolean().optional().default(false),
});

export const updateIdentifierSchema = z.object({
  identifier_value: z.string().min(1).max(100).trim().optional(),
  is_primary: z.boolean().optional(),
  status: z.nativeEnum(IdentifierStatus).optional(),
});

// ==========================================
// 3. ENROLLMENT SCHEMAS
// ==========================================

export const createEnrollmentSchema = z.object({
  student_id: z.string().uuid('Valid student_id UUID is required'),
  academic_period_id: z.string().uuid('Valid academic_period_id UUID is required'),
  status: z.nativeEnum(EnrollmentStatus).optional().default(EnrollmentStatus.ACTIVE),
  enrollment_date: z.coerce.date().optional(),
});

export const updateEnrollmentStatusSchema = z.object({
  status: z.nativeEnum(EnrollmentStatus, {
    message: 'Status must be ACTIVE, COMPLETED, WITHDRAWN, TRANSFERRED, or ARCHIVED',
  }),
});

// ==========================================
// 4. ATTENDANCE RECORD SCHEMAS
// ==========================================

export const recordAttendanceSchema = z
  .object({
    learning_component_id: z.string().uuid('Valid learning_component_id UUID is required'),
    attended_sessions: z
      .number()
      .int('attended_sessions must be an integer')
      .min(0, 'attended_sessions cannot be negative'),
    total_sessions: z
      .number()
      .int('total_sessions must be an integer')
      .min(0, 'total_sessions cannot be negative'),
  })
  .refine((data) => data.attended_sessions <= data.total_sessions, {
    message: 'attended_sessions cannot exceed total_sessions',
    path: ['attended_sessions'],
  });

export const updateAttendanceSchema = z.object({
  attended_sessions: z.number().int().min(0).optional(),
  total_sessions: z.number().int().min(0).optional(),
});

// ==========================================
// 5. ASSESSMENT RECORD SCHEMAS
// ==========================================

export const recordAssessmentSchema = z
  .object({
    learning_component_id: z.string().uuid('Valid learning_component_id UUID is required'),
    obtained_marks: z
      .number()
      .min(0, 'obtained_marks cannot be negative')
      .max(1000, 'obtained_marks cannot exceed 1000'),
    maximum_marks: z
      .number()
      .positive('maximum_marks must be greater than 0')
      .max(1000, 'maximum_marks cannot exceed 1000'),
    grading_outcome: z.string().max(50).optional(),
  })
  .refine((data) => data.obtained_marks <= data.maximum_marks, {
    message: 'obtained_marks cannot exceed maximum_marks',
    path: ['obtained_marks'],
  });

export const updateAssessmentSchema = z.object({
  obtained_marks: z.number().min(0).max(1000).optional(),
  maximum_marks: z.number().positive().max(1000).optional(),
  grading_outcome: z.string().max(50).nullable().optional(),
});

// Infer input types
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type CreateIdentifierInput = z.infer<typeof createIdentifierSchema>;
export type UpdateIdentifierInput = z.infer<typeof updateIdentifierSchema>;
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type RecordAttendanceInput = z.infer<typeof recordAttendanceSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
export type RecordAssessmentInput = z.infer<typeof recordAssessmentSchema>;
export type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>;
