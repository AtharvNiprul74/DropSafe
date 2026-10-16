import { z } from 'zod';
import { ModelStatus, SnapshotStatus, RiskLabel, Sentiment } from '@prisma/client';

export const createAiModelSchema = z.object({
  model_name: z.string().trim().min(1, 'model_name is required'),
  model_version: z.string().trim().min(1, 'model_version is required'),
  algorithm: z.string().trim().min(1, 'algorithm is required'),
  feature_version: z.string().trim().min(1, 'feature_version is required'),
  training_dataset_version: z.string().trim().min(1, 'training_dataset_version is required'),
  status: z.nativeEnum(ModelStatus).optional().default(ModelStatus.ACTIVE),
});

export const updateAiModelStatusSchema = z.object({
  status: z.nativeEnum(ModelStatus),
});

export const generateSnapshotSchema = z.object({
  enrollment_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
  academic_period_id: z.string().uuid().optional(),
  import_session_id: z.string().uuid().optional(),
});

export const createPredictionSchema = z.object({
  student_snapshot_id: z.string().uuid('student_snapshot_id must be a valid UUID'),
  ai_model_version: z.string().trim().min(1, 'ai_model_version is required'),
  risk_label: z.nativeEnum(RiskLabel),
  prediction_score: z.coerce.number().min(0).max(100, 'prediction_score must be between 0 and 100'),
  risk_probability: z.coerce.number().min(0).max(100).optional(),
});

export const createBehaviourSummarySchema = z.object({
  student_snapshot_id: z.string().uuid('student_snapshot_id must be a valid UUID'),
  summary: z.string().trim().min(1, 'summary is required'),
  dominant_sentiment: z.nativeEnum(Sentiment),
  confidence_score: z.coerce.number().min(0).max(100, 'confidence_score must be between 0 and 100'),
  ai_model_version: z.string().trim().min(1, 'ai_model_version is required'),
});

export const listSnapshotsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  student_id: z.string().uuid().optional(),
  enrollment_id: z.string().uuid().optional(),
  status: z.nativeEnum(SnapshotStatus).optional(),
});

export const listPredictionHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  student_id: z.string().uuid().optional(),
  risk_label: z.nativeEnum(RiskLabel).optional(),
  ai_model_version: z.string().optional(),
});

export type CreateAiModelInput = z.infer<typeof createAiModelSchema>;
export type UpdateAiModelStatusInput = z.infer<typeof updateAiModelStatusSchema>;
export type GenerateSnapshotInput = z.infer<typeof generateSnapshotSchema>;
export type CreatePredictionInput = z.infer<typeof createPredictionSchema>;
export type CreateBehaviourSummaryInput = z.infer<typeof createBehaviourSummarySchema>;
export type ListSnapshotsQuery = z.infer<typeof listSnapshotsQuerySchema>;
export type ListPredictionHistoryQuery = z.infer<typeof listPredictionHistoryQuerySchema>;
