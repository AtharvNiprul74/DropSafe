import { z } from 'zod';
import {
  InterventionType,
  InterventionPriority,
  InterventionStatus,
  SessionType,
  CounselingSessionStatus,
  FollowUpType,
  FollowUpStatus,
  NotificationType,
  NotificationStatus,
} from '@prisma/client';

// ==========================================
// 1. INTERVENTIONS SCHEMAS
// ==========================================

export const createInterventionSchema = z.object({
  student_id: z.string().uuid({ message: 'student_id must be a valid UUID' }),
  prediction_id: z.string().uuid({ message: 'prediction_id must be a valid UUID' }).optional().nullable(),
  responsible_user_id: z.string().uuid({ message: 'responsible_user_id must be a valid UUID' }),
  intervention_type: z.nativeEnum(InterventionType),
  priority: z.nativeEnum(InterventionPriority).optional().default(InterventionPriority.MEDIUM),
  title: z.string().trim().min(1, { message: 'title is required' }),
  description: z.string().trim().optional().nullable(),
  planned_start_date: z.string().datetime({ message: 'planned_start_date must be a valid ISO-8601 datetime' }).optional().nullable(),
});

export const updateInterventionSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  priority: z.nativeEnum(InterventionPriority).optional(),
  responsible_user_id: z.string().uuid({ message: 'responsible_user_id must be a valid UUID' }).optional(),
  planned_start_date: z.string().datetime().optional().nullable(),
});

export const updateInterventionStatusSchema = z.object({
  status: z.nativeEnum(InterventionStatus),
  completed_at: z.string().datetime().optional().nullable(),
  cancelled_at: z.string().datetime().optional().nullable(),
});

export const listInterventionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  student_id: z.string().uuid().optional(),
  responsible_user_id: z.string().uuid().optional(),
  status: z.nativeEnum(InterventionStatus).optional(),
  intervention_type: z.nativeEnum(InterventionType).optional(),
  priority: z.nativeEnum(InterventionPriority).optional(),
});

// ==========================================
// 2. COUNSELING SESSIONS SCHEMAS
// ==========================================

export const createCounselingSessionSchema = z.object({
  intervention_id: z.string().uuid({ message: 'intervention_id must be a valid UUID' }),
  student_id: z.string().uuid({ message: 'student_id must be a valid UUID' }).optional(),
  responsible_mentor_id: z.string().uuid({ message: 'responsible_mentor_id must be a valid UUID' }).optional(),
  session_type: z.nativeEnum(SessionType).optional().default(SessionType.IN_PERSON),
  scheduled_at: z.string().datetime({ message: 'scheduled_at must be a valid ISO-8601 datetime' }),
  started_at: z.string().datetime().optional().nullable(),
  ended_at: z.string().datetime().optional().nullable(),
  session_notes: z.string().trim().optional().nullable(),
  outcome: z.string().trim().optional().nullable(),
});

export const updateCounselingSessionSchema = z.object({
  session_type: z.nativeEnum(SessionType).optional(),
  scheduled_at: z.string().datetime().optional(),
  started_at: z.string().datetime().optional().nullable(),
  ended_at: z.string().datetime().optional().nullable(),
  session_notes: z.string().trim().optional().nullable(),
  outcome: z.string().trim().optional().nullable(),
});

export const updateCounselingSessionStatusSchema = z.object({
  status: z.nativeEnum(CounselingSessionStatus),
  started_at: z.string().datetime().optional().nullable(),
  ended_at: z.string().datetime().optional().nullable(),
  session_notes: z.string().trim().optional().nullable(),
  outcome: z.string().trim().optional().nullable(),
});

export const listCounselingSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  intervention_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
  responsible_mentor_id: z.string().uuid().optional(),
  status: z.nativeEnum(CounselingSessionStatus).optional(),
  session_type: z.nativeEnum(SessionType).optional(),
});

// ==========================================
// 3. FOLLOW-UPS SCHEMAS
// ==========================================

export const createFollowUpSchema = z.object({
  intervention_id: z.string().uuid({ message: 'intervention_id must be a valid UUID' }),
  counseling_session_id: z.string().uuid({ message: 'counseling_session_id must be a valid UUID' }).optional().nullable(),
  responsible_user_id: z.string().uuid({ message: 'responsible_user_id must be a valid UUID' }).optional(),
  follow_up_type: z.nativeEnum(FollowUpType).optional().default(FollowUpType.CHECK_IN),
  scheduled_date: z.string().datetime({ message: 'scheduled_date must be a valid ISO-8601 datetime' }),
  notes: z.string().trim().optional().nullable(),
  outcome: z.string().trim().optional().nullable(),
  completed_at: z.string().datetime().optional().nullable(),
});

export const updateFollowUpSchema = z.object({
  follow_up_type: z.nativeEnum(FollowUpType).optional(),
  scheduled_date: z.string().datetime().optional(),
  responsible_user_id: z.string().uuid().optional(),
  notes: z.string().trim().optional().nullable(),
  outcome: z.string().trim().optional().nullable(),
});

export const updateFollowUpStatusSchema = z.object({
  status: z.nativeEnum(FollowUpStatus),
  completed_at: z.string().datetime().optional().nullable(),
  cancelled_at: z.string().datetime().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  outcome: z.string().trim().optional().nullable(),
});

export const listFollowUpsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  intervention_id: z.string().uuid().optional(),
  counseling_session_id: z.string().uuid().optional(),
  responsible_user_id: z.string().uuid().optional(),
  status: z.nativeEnum(FollowUpStatus).optional(),
  follow_up_type: z.nativeEnum(FollowUpType).optional(),
});

// ==========================================
// 4. NOTIFICATIONS SCHEMAS
// ==========================================

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  recipient_user_id: z.string().uuid().optional(),
  status: z.nativeEnum(NotificationStatus).optional(),
  notification_type: z.nativeEnum(NotificationType).optional(),
});

// Types
export type CreateInterventionInput = z.infer<typeof createInterventionSchema>;
export type UpdateInterventionInput = z.infer<typeof updateInterventionSchema>;
export type UpdateInterventionStatusInput = z.infer<typeof updateInterventionStatusSchema>;
export type ListInterventionsQuery = z.infer<typeof listInterventionsQuerySchema>;

export type CreateCounselingSessionInput = z.infer<typeof createCounselingSessionSchema>;
export type UpdateCounselingSessionInput = z.infer<typeof updateCounselingSessionSchema>;
export type UpdateCounselingSessionStatusInput = z.infer<typeof updateCounselingSessionStatusSchema>;
export type ListCounselingSessionsQuery = z.infer<typeof listCounselingSessionsQuerySchema>;

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
export type UpdateFollowUpStatusInput = z.infer<typeof updateFollowUpStatusSchema>;
export type ListFollowUpsQuery = z.infer<typeof listFollowUpsQuerySchema>;

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
