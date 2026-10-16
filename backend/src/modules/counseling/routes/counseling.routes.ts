import { Router } from 'express';
import { interventionController } from '../controllers/intervention.controller';
import { counselingSessionController } from '../controllers/counselingSession.controller';
import { followUpController } from '../controllers/followUp.controller';
import { authenticate } from '../../../middlewares/auth';
import { enforceTenantIsolation } from '../../../middlewares/tenantIsolation';
import { requireAnyPermission } from '../../../middlewares/rbac';
import { AccessAction } from '@prisma/client';

const router = Router();

// Enforce authentication & tenant isolation for all counseling routes
router.use(authenticate, enforceTenantIsolation);

// Permissions
const canCreateCounseling = requireAnyPermission(
  ['counseling:create', 'mentor:assign', 'organization:update'],
  AccessAction.WRITE
);

const canUpdateCounseling = requireAnyPermission(
  ['counseling:update', 'organization:update'],
  AccessAction.WRITE
);

const canViewCounseling = requireAnyPermission(
  ['counseling:view', 'counseling:create', 'counseling:update', 'organization:update', 'report:view'],
  AccessAction.READ
);

// ==========================================
// 1. INTERVENTIONS
// ==========================================
router.post('/interventions', canCreateCounseling, (req, res, next) =>
  interventionController.createIntervention(req, res, next)
);

router.get('/interventions', canViewCounseling, (req, res, next) =>
  interventionController.listInterventions(req, res, next)
);

router.get('/interventions/:id', canViewCounseling, (req, res, next) =>
  interventionController.getIntervention(req, res, next)
);

router.put('/interventions/:id', canUpdateCounseling, (req, res, next) =>
  interventionController.updateIntervention(req, res, next)
);

router.patch('/interventions/:id/status', canUpdateCounseling, (req, res, next) =>
  interventionController.updateInterventionStatus(req, res, next)
);

// ==========================================
// 2. COUNSELING SESSIONS
// ==========================================
router.post('/sessions', canCreateCounseling, (req, res, next) =>
  counselingSessionController.createSession(req, res, next)
);

router.get('/sessions', canViewCounseling, (req, res, next) =>
  counselingSessionController.listSessions(req, res, next)
);

router.get('/sessions/:id', canViewCounseling, (req, res, next) =>
  counselingSessionController.getSession(req, res, next)
);

router.put('/sessions/:id', canUpdateCounseling, (req, res, next) =>
  counselingSessionController.updateSession(req, res, next)
);

router.patch('/sessions/:id/status', canUpdateCounseling, (req, res, next) =>
  counselingSessionController.updateSessionStatus(req, res, next)
);

// ==========================================
// 3. FOLLOW-UPS
// ==========================================
router.post('/follow-ups', canCreateCounseling, (req, res, next) =>
  followUpController.createFollowUp(req, res, next)
);

router.get('/follow-ups', canViewCounseling, (req, res, next) =>
  followUpController.listFollowUps(req, res, next)
);

router.get('/follow-ups/:id', canViewCounseling, (req, res, next) =>
  followUpController.getFollowUp(req, res, next)
);

router.put('/follow-ups/:id', canUpdateCounseling, (req, res, next) =>
  followUpController.updateFollowUp(req, res, next)
);

router.patch('/follow-ups/:id/status', canUpdateCounseling, (req, res, next) =>
  followUpController.updateFollowUpStatus(req, res, next)
);

// ==========================================
// 4. NOTIFICATIONS
// ==========================================
router.get('/notifications', canViewCounseling, (req, res, next) =>
  followUpController.listNotifications(req, res, next)
);

export default router;
