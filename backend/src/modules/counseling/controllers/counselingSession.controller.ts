import { Request, Response, NextFunction } from 'express';
import { counselingSessionService } from '../services/counselingSession.service';
import {
  createCounselingSessionSchema,
  updateCounselingSessionSchema,
  updateCounselingSessionStatusSchema,
  listCounselingSessionsQuerySchema,
} from '../validators/counseling.validation';
import { sendCreated, sendSuccess } from '../../../core/utils/response';
import { getTenantId } from '../../../middlewares/tenantIsolation';

export class CounselingSessionController {
  /**
   * Schedule a counseling session
   */
  async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const validated = createCounselingSessionSchema.parse(req.body);
      const session = await counselingSessionService.createSession(
        orgId,
        validated,
        req.user?.userId
      );
      sendCreated(res, session, 'Counseling session scheduled successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get counseling session details by ID
   */
  async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const session = await counselingSessionService.getSessionById(orgId, id);
      sendSuccess(res, session, 'Counseling session details retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update counseling session details
   */
  async updateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const validated = updateCounselingSessionSchema.parse(req.body);
      const updated = await counselingSessionService.updateSession(
        orgId,
        id,
        validated,
        req.user?.userId
      );
      sendSuccess(res, updated, 'Counseling session updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Transition session status (SCHEDULED -> COMPLETED / MISSED / CANCELLED)
   */
  async updateSessionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const validated = updateCounselingSessionStatusSchema.parse(req.body);
      const updated = await counselingSessionService.updateSessionStatus(
        orgId,
        id,
        validated,
        req.user?.userId
      );
      sendSuccess(res, updated, `Counseling session status transitioned to ${updated.status}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List counseling sessions with filters and pagination
   */
  async listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const query = listCounselingSessionsQuerySchema.parse(req.query);
      const result = await counselingSessionService.listSessions(orgId, query);
      sendSuccess(res, result.items, 'Counseling sessions retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }
}

export const counselingSessionController = new CounselingSessionController();
