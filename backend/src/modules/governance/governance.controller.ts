import { Request, Response, NextFunction } from 'express';
import { governanceService } from './governance.service';
import { auditLogQuerySchema, accessLogQuerySchema } from './governance.validation';
import { sendSuccess } from '../../core/utils/response';
import { getTenantId } from '../../middlewares/tenantIsolation';

export class GovernanceController {
  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const query = auditLogQuerySchema.parse(req.query);
      const result = await governanceService.getAuditLogs(orgId, query);
      sendSuccess(res, result.data, 'Audit logs retrieved', 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getAccessLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const query = accessLogQuerySchema.parse(req.query);
      const result = await governanceService.getAccessLogs(orgId, query);
      sendSuccess(res, result.data, 'Access logs retrieved', 200, result.meta);
    } catch (error) {
      next(error);
    }
  }
}

export const governanceController = new GovernanceController();
