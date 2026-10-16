import { Router } from 'express';
import multer from 'multer';
import { importController } from '../controllers/import.controller';
import { authenticate } from '../../../middlewares/auth';
import { enforceTenantIsolation } from '../../../middlewares/tenantIsolation';
import { requireAnyPermission } from '../../../middlewares/rbac';
import { AccessAction } from '@prisma/client';
import { ValidationError } from '../../../core/errors/AppError';

// Configure Multer for CSV uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const isCsvMime = [
      'text/csv',
      'text/plain',
      'application/csv',
      'application/vnd.ms-excel',
      'application/octet-stream', // Some browsers / test scripts send octet-stream for CSVs
    ].includes(file.mimetype);

    const isCsvExt = file.originalname.toLowerCase().endsWith('.csv') || file.originalname.toLowerCase().endsWith('.txt');

    if (isCsvMime || isCsvExt) {
      cb(null, true);
    } else {
      cb(new ValidationError('Only CSV or plain text files are allowed for data import'));
    }
  },
});

const router = Router();

// Apply authentication and strict multi-tenant isolation
router.use(authenticate, enforceTenantIsolation);

// RBAC Permissions
const canCreateImport = requireAnyPermission(
  ['import:create', 'organization:update'],
  AccessAction.WRITE
);
const canViewImport = requireAnyPermission(
  ['import:view', 'import:history', 'organization:update'],
  AccessAction.READ
);
const canViewHistory = requireAnyPermission(
  ['import:history', 'import:view', 'report:view', 'organization:update'],
  AccessAction.READ
);

// ==========================================
// IMPORT ROUTES
// ==========================================

// 1. Sessions Management
router.post('/sessions', canCreateImport, (req, res, next) =>
  importController.createSession(req, res, next)
);

router.get('/sessions', canViewImport, (req, res, next) =>
  importController.listSessions(req, res, next)
);

router.get('/sessions/:sessionId', canViewImport, (req, res, next) =>
  importController.getSession(req, res, next)
);

// 2. File Upload (Multer middleware)
router.post('/sessions/:sessionId/upload', canCreateImport, upload.single('file'), (req, res, next) =>
  importController.uploadFile(req, res, next)
);

// 3. Trigger Validation Pipeline
router.post('/sessions/:sessionId/validate', canCreateImport, (req, res, next) =>
  importController.validateSession(req, res, next)
);

// 4. Commit Validated Import
router.post('/sessions/:sessionId/commit', canCreateImport, (req, res, next) =>
  importController.commitImport(req, res, next)
);

// 5. Cancel Session
router.post('/sessions/:sessionId/cancel', canCreateImport, (req, res, next) =>
  importController.cancelSession(req, res, next)
);

// 6. View Import Report
router.get('/sessions/:sessionId/report', canViewHistory, (req, res, next) =>
  importController.getReport(req, res, next)
);

// 7. Quick Import (All-in-one flow)
router.post('/quick-import', canCreateImport, upload.single('file'), (req, res, next) =>
  importController.quickImport(req, res, next)
);

export default router;
