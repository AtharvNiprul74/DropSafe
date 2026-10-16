import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../core/errors/AppError';
import { prisma } from '../config/database';
import { AccessAction, AccessOutcome } from '@prisma/client';

/**
 * Record an access log entry to PostgreSQL access_logs table.
 */
export async function logAccessAttempt(params: {
  organizationId: string;
  actorUserId?: string;
  resource: string;
  action: AccessAction;
  outcome: AccessOutcome;
  denialReason?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await prisma.accessLog.create({
      data: {
        organization_id: params.organizationId,
        actor_user_id: params.actorUserId || null,
        resource: params.resource,
        action: params.action,
        outcome: params.outcome,
        denial_reason: params.denialReason || null,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
      },
    });
  } catch (error) {
    console.error('[Governance] Failed to record access log:', error);
  }
}

/**
 * Middleware factory to enforce required permission code(s).
 * Evaluates effective user permissions (User -> Role -> Permission Group -> Permission).
 */
export function requirePermission(permissionCode: string, action: AccessAction = AccessAction.READ) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const hasPermission = req.user.permissions.includes(permissionCode);

      if (!hasPermission) {
        const denialReason = `User lacks required permission: ${permissionCode}`;

        // Asynchronously record security denial in access logs
        await logAccessAttempt({
          organizationId: req.user.organizationId,
          actorUserId: req.user.userId,
          resource: permissionCode.split(':')[0] || permissionCode,
          action,
          outcome: AccessOutcome.DENIED,
          denialReason,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });

        throw new ForbiddenError(denialReason);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to check if user has ANY of the specified permissions.
 */
export function requireAnyPermission(permissionCodes: string[], action: AccessAction = AccessAction.READ) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const hasAny = permissionCodes.some((code) => req.user?.permissions.includes(code));

      if (!hasAny) {
        const denialReason = `User lacks at least one required permission from: [${permissionCodes.join(', ')}]`;

        await logAccessAttempt({
          organizationId: req.user.organizationId,
          actorUserId: req.user.userId,
          resource: permissionCodes[0]?.split(':')[0] || 'multiple',
          action,
          outcome: AccessOutcome.DENIED,
          denialReason,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });

        throw new ForbiddenError(denialReason);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to check specific role name (e.g. 'Organization Admin').
 */
export function requireRole(roleName: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!req.user.roles.includes(roleName)) {
        const denialReason = `User is not assigned the required role: ${roleName}`;

        await logAccessAttempt({
          organizationId: req.user.organizationId,
          actorUserId: req.user.userId,
          resource: 'role_protected_resource',
          action: AccessAction.READ,
          outcome: AccessOutcome.DENIED,
          denialReason,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });

        throw new ForbiddenError(denialReason);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
