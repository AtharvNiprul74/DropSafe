import { Router } from 'express';
import { academicController } from './academic.controller';
import { authenticate } from '../../middlewares/auth';
import { enforceTenantIsolation } from '../../middlewares/tenantIsolation';
import { requireAnyPermission } from '../../middlewares/rbac';
import { AccessAction } from '@prisma/client';

const router = Router();

// Enforce authentication and strict tenant isolation on all academic routes
router.use(authenticate, enforceTenantIsolation);

const canViewAcademic = requireAnyPermission(
  ['academic:view', 'organization:update', 'student:view'],
  AccessAction.READ
);
const canCreateAcademic = requireAnyPermission(
  ['academic:create', 'organization:update'],
  AccessAction.WRITE
);
const canUpdateAcademic = requireAnyPermission(
  ['academic:update', 'organization:update'],
  AccessAction.WRITE
);

// Hierarchy Tree
router.get('/hierarchy', canViewAcademic, (req, res, next) => academicController.getHierarchyTree(req, res, next));

// ==========================================
// 1. LEARNING PROGRAMS
// ==========================================
router.post('/programs', canCreateAcademic, (req, res, next) => academicController.createProgram(req, res, next));
router.get('/programs', canViewAcademic, (req, res, next) => academicController.listPrograms(req, res, next));
router.get('/programs/:id', canViewAcademic, (req, res, next) => academicController.getProgramById(req, res, next));
router.patch('/programs/:id', canUpdateAcademic, (req, res, next) => academicController.updateProgram(req, res, next));
router.patch('/programs/:id/status', canUpdateAcademic, (req, res, next) =>
  academicController.updateProgramStatus(req, res, next)
);
router.delete('/programs/:id', canUpdateAcademic, (req, res, next) =>
  academicController.deleteProgram(req, res, next)
);

// ==========================================
// 2. LEARNING LEVELS
// ==========================================
router.post('/levels', canCreateAcademic, (req, res, next) => academicController.createLevel(req, res, next));
router.get('/levels', canViewAcademic, (req, res, next) => academicController.listLevels(req, res, next));
router.get('/levels/:id', canViewAcademic, (req, res, next) => academicController.getLevelById(req, res, next));
router.patch('/levels/:id', canUpdateAcademic, (req, res, next) => academicController.updateLevel(req, res, next));
router.patch('/levels/:id/status', canUpdateAcademic, (req, res, next) =>
  academicController.updateLevelStatus(req, res, next)
);

// ==========================================
// 3. ACADEMIC PERIODS
// ==========================================
router.post('/periods', canCreateAcademic, (req, res, next) => academicController.createPeriod(req, res, next));
router.get('/periods', canViewAcademic, (req, res, next) => academicController.listPeriods(req, res, next));
router.get('/periods/:id', canViewAcademic, (req, res, next) => academicController.getPeriodById(req, res, next));
router.patch('/periods/:id', canUpdateAcademic, (req, res, next) => academicController.updatePeriod(req, res, next));
router.patch('/periods/:id/status', canUpdateAcademic, (req, res, next) =>
  academicController.updatePeriodStatus(req, res, next)
);

// ==========================================
// 4. LEARNING COMPONENTS
// ==========================================
router.post('/components', canCreateAcademic, (req, res, next) => academicController.createComponent(req, res, next));
router.get('/components', canViewAcademic, (req, res, next) => academicController.listComponents(req, res, next));
router.get('/components/:id', canViewAcademic, (req, res, next) => academicController.getComponentById(req, res, next));
router.patch('/components/:id', canUpdateAcademic, (req, res, next) => academicController.updateComponent(req, res, next));
router.patch('/components/:id/status', canUpdateAcademic, (req, res, next) =>
  academicController.updateComponentStatus(req, res, next)
);

export default router;
