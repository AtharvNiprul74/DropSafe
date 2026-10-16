import { Router } from 'express';
import { behaviourController } from '../controllers/behaviour.controller';
import { authenticate } from '../../../middlewares/auth';
import { enforceTenantIsolation } from '../../../middlewares/tenantIsolation';
import { requireAnyPermission } from '../../../middlewares/rbac';
import { AccessAction } from '@prisma/client';

const router = Router();

// Apply authentication and strict tenant isolation
router.use(authenticate, enforceTenantIsolation);

const canIngestBehaviour = requireAnyPermission(
  ['student:update', 'student:create', 'organization:update'],
  AccessAction.WRITE
);

const canViewBehaviourMetadata = requireAnyPermission(
  ['student:view', 'organization:update'],
  AccessAction.READ
);

// 1. WhatsApp Ingestion Webhook
router.post('/webhook/whatsapp', canIngestBehaviour, (req, res, next) =>
  behaviourController.handleWhatsappWebhook(req, res, next)
);

// 2. Conversation Lifecycle
router.post('/conversations', canIngestBehaviour, (req, res, next) =>
  behaviourController.createConversation(req, res, next)
);

router.get('/conversations', canViewBehaviourMetadata, (req, res, next) =>
  behaviourController.listConversations(req, res, next)
);

router.get('/conversations/:id', canViewBehaviourMetadata, (req, res, next) =>
  behaviourController.getConversation(req, res, next)
);

router.patch('/conversations/:id/status', canIngestBehaviour, (req, res, next) =>
  behaviourController.updateStatus(req, res, next)
);

// 3. Message Ingestion & Privacy-Restricted Message Querying
router.post('/conversations/:id/messages', canIngestBehaviour, (req, res, next) =>
  behaviourController.appendMessage(req, res, next)
);

router.get('/conversations/:id/messages', canViewBehaviourMetadata, (req, res, next) =>
  behaviourController.getMessages(req, res, next)
);

export default router;
