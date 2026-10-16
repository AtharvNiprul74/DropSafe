import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { ActorType, AuditOutcome, AccessAction, AccessOutcome } from '@prisma/client';

export interface AuditLogInput {
  organizationId: string;
  actorType?: ActorType;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  outcome?: AuditOutcome;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Append-only audit logging helper
 */
export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organization_id: input.organizationId,
        actor_type: input.actorType || (input.actorUserId ? ActorType.USER : ActorType.SYSTEM),
        actor_user_id: input.actorUserId || null,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId || null,
        outcome: input.outcome || AuditOutcome.SUCCESS,
        details: input.details ? (input.details as any) : undefined,
        ip_address: input.ipAddress || null,
        user_agent: input.userAgent || null,
      },
    });
  } catch (error) {
    console.error('[Governance] Failed to record audit log:', error);
  }
}

export interface AccessLogInput {
  organizationId: string;
  actorUserId?: string;
  resource: string;
  action: AccessAction;
  outcome: AccessOutcome;
  denialReason?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Append-only access logging helper
 */
export async function recordAccessLog(input: AccessLogInput): Promise<void> {
  try {
    // Validate that DENIED outcome requires a denial reason
    if (input.outcome === AccessOutcome.DENIED && !input.denialReason) {
      input.denialReason = 'Access denied by security policy';
    }

    await prisma.accessLog.create({
      data: {
        organization_id: input.organizationId,
        actor_user_id: input.actorUserId || null,
        resource: input.resource,
        action: input.action,
        outcome: input.outcome,
        denial_reason: input.denialReason || null,
        ip_address: input.ipAddress || null,
        user_agent: input.userAgent || null,
      },
    });
  } catch (error) {
    console.error('[Governance] Failed to record access log:', error);
  }
}

/**
 * Express middleware to automatically log audit records for state-changing operations (POST, PUT, PATCH, DELETE)
 */
export function autoAuditLogger(entityType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalSend = res.send;

    res.send = function (body?: any): Response {
      res.send = originalSend;

      const orgId = req.tenant?.organizationId || req.user?.organizationId;
      if (orgId && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
        const action = `${req.method}_${req.baseUrl.replace('/api/v1/', '').replace('/', '_').toUpperCase()}`;

        recordAuditLog({
          organizationId: orgId,
          actorUserId: req.user?.userId,
          action,
          entityType,
          entityId: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id || undefined,
          outcome: isSuccess ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE,
          details: {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }).catch((err) => console.error('[autoAuditLogger error]', err));
      }

      return originalSend.call(res, body);
    };

    next();
  };
}

/**
 * Express middleware to track read/export accesses for governance
 */
export function accessTracker(resource: string, action: AccessAction = AccessAction.READ) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      const orgId = req.tenant?.organizationId || req.user?.organizationId;
      if (orgId) {
        const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
        recordAccessLog({
          organizationId: orgId,
          actorUserId: req.user?.userId,
          resource,
          action,
          outcome: isSuccess ? AccessOutcome.ALLOWED : AccessOutcome.DENIED,
          denialReason: !isSuccess ? `HTTP ${res.statusCode}` : undefined,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }).catch((err) => console.error('[accessTracker error]', err));
      }
    });

    next();
  };
}
