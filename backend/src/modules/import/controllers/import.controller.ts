import { Request, Response, NextFunction } from 'express';
import { importSessionService } from '../services/importSession.service';
import { importStorageService } from '../services/importStorage.service';
import { validationPipelineService } from '../services/validationPipeline.service';
import { importExecutionService } from '../services/importExecution.service';
import {
  createImportSessionSchema,
  commitImportSessionSchema,
  cancelImportSessionSchema,
  listImportSessionsQuerySchema,
} from '../validators/import.validation';
import { sendCreated, sendSuccess } from '../../../core/utils/response';
import { getTenantId } from '../../../middlewares/tenantIsolation';
import { ValidationError, NotFoundError } from '../../../core/errors/AppError';
import { prisma } from '../../../config/database';

export class ImportController {
  /**
   * 1. Create a new Import Session
   * POST /api/v1/import/sessions
   */
  async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User ID is required to initiate an import session');
      }

      const validated = createImportSessionSchema.parse(req.body);
      const session = await importSessionService.createSession(orgId, userId, validated);

      sendCreated(res, session, `Import session created in CREATED status for ${session.import_type}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. Upload file to an existing Import Session
   * POST /api/v1/import/sessions/:sessionId/upload
   */
  async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const sessionId = String(req.params.sessionId);

      // Verify session exists and belongs to this tenant
      const session = await importSessionService.getSessionById(orgId, sessionId);

      if (!req.file) {
        throw new ValidationError('No file uploaded. Please attach a CSV file under the "file" field');
      }

      const fileRecord = await importStorageService.saveImportFile(session.id, {
        originalFilename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer,
      });

      sendCreated(
        res,
        fileRecord,
        `File '${fileRecord.original_filename}' uploaded and SHA-256 integrity verified (${fileRecord.file_hash})`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3. Trigger Two-Stage Validation Pipeline
   * POST /api/v1/import/sessions/:sessionId/validate
   */
  async validateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const sessionId = String(req.params.sessionId);

      const result = await validationPipelineService.validateSession(orgId, sessionId);

      if (result.isFatal) {
        sendSuccess(
          res,
          result,
          `Validation failed with fatal structural error: ${result.fatalError}`,
          422
        );
        return;
      }

      sendSuccess(
        res,
        result,
        `Validation completed: ${result.validRecords} valid records, ${result.rejectedRecords} rejected records`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4. Commit Validated Import Records
   * POST /api/v1/import/sessions/:sessionId/commit
   */
  async commitImport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const sessionId = String(req.params.sessionId);
      const { allow_partial } = commitImportSessionSchema.parse(req.body || {});

      const report = await importExecutionService.commitImport(orgId, sessionId, {
        allowPartial: allow_partial,
        actorUserId: req.user?.userId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });

      sendSuccess(res, report, `Import execution completed with status: ${report.result_status}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 5. Cancel an Import Session
   * POST /api/v1/import/sessions/:sessionId/cancel
   */
  async cancelSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const sessionId = String(req.params.sessionId);
      const { reason } = cancelImportSessionSchema.parse(req.body || {});

      const session = await importSessionService.cancelSession(orgId, sessionId, reason);

      sendSuccess(res, session, 'Import session successfully cancelled');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 6. List Import Sessions with pagination & filters
   * GET /api/v1/import/sessions
   */
  async listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const query = listImportSessionsQuerySchema.parse(req.query);

      const result = await importSessionService.listSessions(orgId, query);
      sendSuccess(res, result.items, 'Import sessions retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 7. Get Import Session Details
   * GET /api/v1/import/sessions/:sessionId
   */
  async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const sessionId = String(req.params.sessionId);

      const session = await importSessionService.getSessionById(orgId, sessionId);
      sendSuccess(res, session, 'Import session retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 8. Get Import Report for Session
   * GET /api/v1/import/sessions/:sessionId/report
   */
  async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const sessionId = String(req.params.sessionId);

      // Verify session belongs to tenant
      await importSessionService.getSessionById(orgId, sessionId);

      const report = await prisma.importReport.findUnique({
        where: { import_session_id: sessionId },
        include: {
          import_session: {
            select: {
              id: true,
              import_type: true,
              status: true,
              started_at: true,
              completed_at: true,
              error_message: true,
            },
          },
        },
      });

      if (!report) {
        throw new NotFoundError(`No import report found for session '${sessionId}'`);
      }

      sendSuccess(res, report, 'Import report retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 9. Quick Import (All-in-one: session creation + file upload + validation + commit)
   * POST /api/v1/import/quick-import
   */
  async quickImport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!req.file) {
        throw new ValidationError('No file uploaded. Please attach a CSV file under the "file" field');
      }

      const validated = createImportSessionSchema.parse(req.body);
      const allowPartial = req.body.allow_partial !== 'false' && req.body.allow_partial !== false;

      // Step A: Create session
      const session = await importSessionService.createSession(orgId, userId, validated);

      // Step B: Save file
      await importStorageService.saveImportFile(session.id, {
        originalFilename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer,
      });

      // Step C: Validate
      const validation = await validationPipelineService.validateSession(orgId, session.id);
      if (validation.isFatal) {
        sendSuccess(
          res,
          {
            session_id: session.id,
            validation,
          },
          `Quick import aborted: Fatal Stage 1 Error: ${validation.fatalError}`,
          422
        );
        return;
      }

      // Step D: Commit
      const report = await importExecutionService.commitImport(orgId, session.id, {
        allowPartial,
        actorUserId: userId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });

      sendSuccess(
        res,
        {
          session_id: session.id,
          report,
        },
        `Quick import completed with result: ${report.result_status}`,
        201
      );
    } catch (error) {
      next(error);
    }
  }
}

export const importController = new ImportController();
