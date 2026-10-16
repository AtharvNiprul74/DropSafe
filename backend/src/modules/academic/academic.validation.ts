import { z } from 'zod';
import { ProgramStatus, LevelStatus, PeriodStatus, ComponentStatus, ComponentType } from '@prisma/client';

// ==========================================
// 1. LEARNING PROGRAM SCHEMAS
// ==========================================

export const createProgramSchema = z.object({
  program_code: z
    .string()
    .min(1, 'Program code is required')
    .max(50, 'Program code cannot exceed 50 characters')
    .trim()
    .toUpperCase(),
  name: z
    .string()
    .min(2, 'Program name must be at least 2 characters')
    .max(150, 'Program name cannot exceed 150 characters')
    .trim(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  status: z.nativeEnum(ProgramStatus).optional().default(ProgramStatus.ACTIVE),
});

export const updateProgramSchema = z.object({
  name: z
    .string()
    .min(2, 'Program name must be at least 2 characters')
    .max(150, 'Program name cannot exceed 150 characters')
    .trim()
    .optional(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').nullable().optional(),
});

export const updateProgramStatusSchema = z.object({
  status: z.nativeEnum(ProgramStatus, {
    message: 'Status must be ACTIVE, INACTIVE, or ARCHIVED',
  }),
});

// ==========================================
// 2. LEARNING LEVEL SCHEMAS
// ==========================================

export const createLevelSchema = z.object({
  learning_program_id: z.string().uuid('Valid learning_program_id UUID is required'),
  level_number: z
    .number()
    .int('Level number must be an integer')
    .min(1, 'Level number must be at least 1')
    .max(20, 'Level number cannot exceed 20'),
  name: z
    .string()
    .min(1, 'Level name is required')
    .max(100, 'Level name cannot exceed 100 characters')
    .trim(),
  status: z.nativeEnum(LevelStatus).optional().default(LevelStatus.ACTIVE),
});

export const updateLevelSchema = z.object({
  level_number: z
    .number()
    .int('Level number must be an integer')
    .min(1, 'Level number must be at least 1')
    .max(20, 'Level number cannot exceed 20')
    .optional(),
  name: z
    .string()
    .min(1, 'Level name is required')
    .max(100, 'Level name cannot exceed 100 characters')
    .trim()
    .optional(),
});

export const updateLevelStatusSchema = z.object({
  status: z.nativeEnum(LevelStatus, {
    message: 'Status must be ACTIVE, INACTIVE, or ARCHIVED',
  }),
});

// ==========================================
// 3. ACADEMIC PERIOD SCHEMAS
// ==========================================

export const createPeriodSchema = z
  .object({
    learning_level_id: z.string().uuid('Valid learning_level_id UUID is required'),
    period_code: z
      .string()
      .min(1, 'Period code is required')
      .max(50, 'Period code cannot exceed 50 characters')
      .trim()
      .toUpperCase(),
    name: z
      .string()
      .min(2, 'Period name must be at least 2 characters')
      .max(150, 'Period name cannot exceed 150 characters')
      .trim(),
    start_date: z.coerce.date({ message: 'Valid start_date is required' }),
    end_date: z.coerce.date({ message: 'Valid end_date is required' }),
    status: z.nativeEnum(PeriodStatus).optional().default(PeriodStatus.PLANNED),
  })
  .refine((data) => data.end_date.getTime() > data.start_date.getTime(), {
    message: 'end_date must be strictly after start_date',
    path: ['end_date'],
  });

export const updatePeriodSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Period name must be at least 2 characters')
      .max(150, 'Period name cannot exceed 150 characters')
      .trim()
      .optional(),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return data.end_date.getTime() > data.start_date.getTime();
      }
      return true;
    },
    {
      message: 'end_date must be strictly after start_date',
      path: ['end_date'],
    }
  );

export const updatePeriodStatusSchema = z.object({
  status: z.nativeEnum(PeriodStatus, {
    message: 'Status must be PLANNED, ACTIVE, COMPLETED, or ARCHIVED',
  }),
});

// ==========================================
// 4. LEARNING COMPONENT SCHEMAS
// ==========================================

export const createComponentSchema = z
  .object({
    academic_period_id: z.string().uuid('Valid academic_period_id UUID is required'),
    component_code: z
      .string()
      .min(1, 'Component code is required')
      .max(50, 'Component code cannot exceed 50 characters')
      .trim()
      .toUpperCase(),
    name: z
      .string()
      .min(2, 'Component name must be at least 2 characters')
      .max(150, 'Component name cannot exceed 150 characters')
      .trim(),
    type: z.nativeEnum(ComponentType).optional().default(ComponentType.SUBJECT),
    maximum_marks: z
      .number()
      .positive('maximum_marks must be greater than 0')
      .max(1000, 'maximum_marks cannot exceed 1000')
      .optional()
      .default(100),
    passing_marks: z
      .number()
      .min(0, 'passing_marks cannot be negative')
      .max(1000, 'passing_marks cannot exceed 1000')
      .optional()
      .default(40),
    status: z.nativeEnum(ComponentStatus).optional().default(ComponentStatus.ACTIVE),
  })
  .refine((data) => data.passing_marks <= data.maximum_marks, {
    message: 'passing_marks cannot exceed maximum_marks',
    path: ['passing_marks'],
  });

export const updateComponentSchema = z.object({
  name: z
    .string()
    .min(2, 'Component name must be at least 2 characters')
    .max(150, 'Component name cannot exceed 150 characters')
    .trim()
    .optional(),
  type: z.nativeEnum(ComponentType).optional(),
  maximum_marks: z
    .number()
    .positive('maximum_marks must be greater than 0')
    .max(1000, 'maximum_marks cannot exceed 1000')
    .optional(),
  passing_marks: z
    .number()
    .min(0, 'passing_marks cannot be negative')
    .max(1000, 'passing_marks cannot exceed 1000')
    .optional(),
});

export const updateComponentStatusSchema = z.object({
  status: z.nativeEnum(ComponentStatus, {
    message: 'Status must be ACTIVE, INACTIVE, or ARCHIVED',
  }),
});

// Infer input types
export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type CreateLevelInput = z.infer<typeof createLevelSchema>;
export type UpdateLevelInput = z.infer<typeof updateLevelSchema>;
export type CreatePeriodInput = z.infer<typeof createPeriodSchema>;
export type UpdatePeriodInput = z.infer<typeof updatePeriodSchema>;
export type CreateComponentInput = z.infer<typeof createComponentSchema>;
export type UpdateComponentInput = z.infer<typeof updateComponentSchema>;
