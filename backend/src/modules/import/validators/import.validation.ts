import { z } from 'zod';
import { ImportType, ImportSourceType } from '@prisma/client';

export const createImportSessionSchema = z.object({
  import_type: z.nativeEnum(ImportType),
  source_type: z.nativeEnum(ImportSourceType).optional().default(ImportSourceType.CSV),
});

export const commitImportSessionSchema = z.object({
  allow_partial: z.boolean().optional().default(true),
});

export const cancelImportSessionSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const listImportSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  import_type: z.nativeEnum(ImportType).optional(),
  status: z.enum([
    'CREATED',
    'VALIDATING',
    'VALIDATED',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
  ]).optional(),
});

export type CreateImportSessionInput = z.infer<typeof createImportSessionSchema>;
export type CommitImportSessionInput = z.infer<typeof commitImportSessionSchema>;
export type CancelImportSessionInput = z.infer<typeof cancelImportSessionSchema>;
export type ListImportSessionsQuery = z.infer<typeof listImportSessionsQuerySchema>;
