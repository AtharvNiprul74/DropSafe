import { prisma } from '../../config/database';
import { AuditLogQueryInput, AccessLogQueryInput } from './governance.validation';

export class GovernanceService {
  async getAuditLogs(organizationId: string, query: AuditLogQueryInput) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      organization_id: organizationId,
    };

    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.entityType) where.entity_type = query.entityType;
    if (query.outcome) where.outcome = query.outcome;
    if (query.actorUserId) where.actor_user_id = query.actorUserId;

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = new Date(query.startDate);
      if (query.endDate) where.timestamp.lte = new Date(query.endDate);
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          actor_user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAccessLogs(organizationId: string, query: AccessLogQueryInput) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      organization_id: organizationId,
    };

    if (query.resource) where.resource = { contains: query.resource, mode: 'insensitive' };
    if (query.action) where.action = query.action;
    if (query.outcome) where.outcome = query.outcome;
    if (query.actorUserId) where.actor_user_id = query.actorUserId;

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = new Date(query.startDate);
      if (query.endDate) where.timestamp.lte = new Date(query.endDate);
    }

    const [total, logs] = await Promise.all([
      prisma.accessLog.count({ where }),
      prisma.accessLog.findMany({
        where,
        include: {
          actor_user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const governanceService = new GovernanceService();
