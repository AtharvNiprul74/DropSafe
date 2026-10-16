import { z } from 'zod';
import { AuditOutcome, AccessAction, AccessOutcome } from '@prisma/client';

export const logQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  actorUserId: z.string().uuid().optional(),
});

export const auditLogQuerySchema = logQuerySchema.extend({
  action: z.string().optional(),
  entityType: z.string().optional(),
  outcome: z.nativeEnum(AuditOutcome).optional(),
});

export const accessLogQuerySchema = logQuerySchema.extend({
  resource: z.string().optional(),
  action: z.nativeEnum(AccessAction).optional(),
  outcome: z.nativeEnum(AccessOutcome).optional(),
});

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
export type AccessLogQueryInput = z.infer<typeof accessLogQuerySchema>;
