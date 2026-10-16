import { Router } from 'express';
import { governanceController } from './governance.controller';
import { authenticate } from '../../middlewares/auth';
import { enforceTenantIsolation } from '../../middlewares/tenantIsolation';
import { requirePermission } from '../../middlewares/rbac';
import { AccessAction } from '@prisma/client';

const router = Router();

// Governance routes require authentication and tenant isolation
router.use(authenticate, enforceTenantIsolation);

router.get(
  '/audit-logs',
  requirePermission('audit:view', AccessAction.READ),
  (req, res, next) => governanceController.getAuditLogs(req, res, next)
);

router.get(
  '/access-logs',
  requirePermission('access:view', AccessAction.READ),
  (req, res, next) => governanceController.getAccessLogs(req, res, next)
);

export default router;
