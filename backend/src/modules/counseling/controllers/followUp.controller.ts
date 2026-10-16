import { Request, Response, NextFunction } from 'express';
import { followUpService } from '../services/followUp.service';
import { notificationService } from '../services/notification.service';
import {
  createFollowUpSchema,
  updateFollowUpSchema,
  updateFollowUpStatusSchema,
  listFollowUpsQuerySchema,
  listNotificationsQuerySchema,
} from '../validators/counseling.validation';
import { sendCreated, sendSuccess } from '../../../core/utils/response';
import { getTenantId } from '../../../middlewares/tenantIsolation';

export class FollowUpController {
  /**
   * Create a follow-up
   */
  async createFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const validated = createFollowUpSchema.parse(req.body);
      const followUp = await followUpService.createFollowUp(
        orgId,
        validated,
        req.user?.userId
      );
      sendCreated(res, followUp, 'Follow-up created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get follow-up by ID
   */
  async getFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const followUp = await followUpService.getFollowUpById(orgId, id);
      sendSuccess(res, followUp, 'Follow-up details retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update follow-up details
   */
  async updateFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const validated = updateFollowUpSchema.parse(req.body);
      const updated = await followUpService.updateFollowUp(
        orgId,
        id,
        validated,
        req.user?.userId
      );
      sendSuccess(res, updated, 'Follow-up updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Transition follow-up status (PENDING -> COMPLETED / MISSED / CANCELLED)
   */
  async updateFollowUpStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const validated = updateFollowUpStatusSchema.parse(req.body);
      const updated = await followUpService.updateFollowUpStatus(
        orgId,
        id,
        validated,
        req.user?.userId
      );
      sendSuccess(res, updated, `Follow-up status transitioned to ${updated.status}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List follow-ups with filters and pagination
   */
  async listFollowUps(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const query = listFollowUpsQuerySchema.parse(req.query);
      const result = await followUpService.listFollowUps(orgId, query);
      sendSuccess(res, result.items, 'Follow-ups retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List notification history for the organization
   */
  async listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const query = listNotificationsQuerySchema.parse(req.query);
      const result = await notificationService.listNotifications(orgId, query);
      sendSuccess(res, result.items, 'Notification history retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }
}

export const followUpController = new FollowUpController();
