import { Router } from 'express';
import { organizationController } from './organization.controller';
import { authenticate } from '../../middlewares/auth';
import { enforceTenantIsolation } from '../../middlewares/tenantIsolation';
import { requirePermission } from '../../middlewares/rbac';
import { AccessAction } from '@prisma/client';

const router = Router();

// All organization routes require authentication and strict tenant isolation
router.use(authenticate, enforceTenantIsolation);

router.get('/', (req, res, next) => organizationController.getDetails(req, res, next));
router.patch(
  '/',
  requirePermission('organization:update', AccessAction.WRITE),
  (req, res, next) => organizationController.updateOrganization(req, res, next)
);

router.get('/settings', (req, res, next) => organizationController.getSettings(req, res, next));
router.patch(
  '/settings',
  requirePermission('organization:update', AccessAction.WRITE),
  (req, res, next) => organizationController.updateSettings(req, res, next)
);

router.get(
  '/users',
  requirePermission('user:view', AccessAction.READ),
  (req, res, next) => organizationController.listUsers(req, res, next)
);

router.post(
  '/users',
  requirePermission('user:create', AccessAction.WRITE),
  (req, res, next) => organizationController.createUser(req, res, next)
);

export default router;
