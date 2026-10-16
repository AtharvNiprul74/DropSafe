import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { authenticate } from '../../../middlewares/auth';
import { enforceTenantIsolation } from '../../../middlewares/tenantIsolation';
import { requireAnyPermission } from '../../../middlewares/rbac';
import { AccessAction } from '@prisma/client';

const router = Router();

// Enforce authentication & tenant isolation
router.use(authenticate, enforceTenantIsolation);

// Permissions
const canGeneratePredictions = requireAnyPermission(
  ['prediction:generate', 'organization:update'],
  AccessAction.WRITE
);

const canViewPredictions = requireAnyPermission(
  ['prediction:view', 'prediction:generate', 'organization:update', 'report:view'],
  AccessAction.READ
);

const canViewPredictionHistory = requireAnyPermission(
  ['prediction:history', 'prediction:view', 'organization:update'],
  AccessAction.READ
);

// ==========================================
// 1. AI MODELS
// ==========================================
router.post('/models', canGeneratePredictions, (req, res, next) =>
  aiController.registerModel(req, res, next)
);
router.get('/models', canViewPredictions, (req, res, next) =>
  aiController.listModels(req, res, next)
);
router.get('/models/:version', canViewPredictions, (req, res, next) =>
  aiController.getModel(req, res, next)
);
router.patch('/models/:version/status', canGeneratePredictions, (req, res, next) =>
  aiController.updateModelStatus(req, res, next)
);

// ==========================================
// 2. STUDENT SNAPSHOTS
// ==========================================
router.post('/snapshots/generate', canGeneratePredictions, (req, res, next) =>
  aiController.generateSnapshots(req, res, next)
);
router.get('/snapshots', canViewPredictions, (req, res, next) =>
  aiController.listSnapshots(req, res, next)
);
router.get('/snapshots/:id', canViewPredictions, (req, res, next) =>
  aiController.getSnapshot(req, res, next)
);

// ==========================================
// 3. PREDICTIONS & HISTORY
// ==========================================
router.post('/predictions', canGeneratePredictions, (req, res, next) =>
  aiController.ingestPrediction(req, res, next)
);
router.post('/predictions/predict/:snapshotId', canGeneratePredictions, (req, res, next) =>
  aiController.runInference(req, res, next)
);
router.get('/predictions/history', canViewPredictionHistory, (req, res, next) =>
  aiController.listPredictionHistory(req, res, next)
);
router.get('/predictions/:id', canViewPredictions, (req, res, next) =>
  aiController.getPrediction(req, res, next)
);

// ==========================================
// 4. BEHAVIOUR SUMMARIES
// ==========================================
router.post('/behaviour-summaries', canGeneratePredictions, (req, res, next) =>
  aiController.createBehaviourSummary(req, res, next)
);
router.get('/behaviour-summaries/:snapshotId', canViewPredictions, (req, res, next) =>
  aiController.getBehaviourSummary(req, res, next)
);

export default router;
