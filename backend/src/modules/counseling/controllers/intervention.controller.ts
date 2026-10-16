import { Request, Response, NextFunction } from 'express';
import { interventionService } from '../services/intervention.service';
import {
  createInterventionSchema,
  updateInterventionSchema,
  updateInterventionStatusSchema,
  listInterventionsQuerySchema,
} from '../validators/counseling.validation';
import { sendCreated, sendSuccess } from '../../../core/utils/response';
import { getTenantId } from '../../../middlewares/tenantIsolation';

export class InterventionController {
  /**
   * Create an intervention
   */
  async createIntervention(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const validated = createInterventionSchema.parse(req.body);
      const intervention = await interventionService.createIntervention(
        orgId,
        validated,
        req.user?.userId
      );
      sendCreated(res, intervention, `Intervention '${intervention.title}' created in PLANNED status`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get intervention by ID
   */
  async getIntervention(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const intervention = await interventionService.getInterventionById(orgId, id);
      sendSuccess(res, intervention, 'Intervention details retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update intervention details
   */
  async updateIntervention(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const validated = updateInterventionSchema.parse(req.body);
      const updated = await interventionService.updateIntervention(
        orgId,
        id,
        validated,
        req.user?.userId
      );
      sendSuccess(res, updated, 'Intervention details updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Transition intervention status (PLANNED -> IN_PROGRESS -> COMPLETED / CANCELLED)
   */
  async updateInterventionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const validated = updateInterventionStatusSchema.parse(req.body);
      const updated = await interventionService.updateInterventionStatus(
        orgId,
        id,
        validated,
        req.user?.userId
      );
      sendSuccess(res, updated, `Intervention status transitioned to ${updated.status}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List interventions with pagination and filters
   */
  async listInterventions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const query = listInterventionsQuerySchema.parse(req.query);
      const result = await interventionService.listInterventions(orgId, query);
      sendSuccess(res, result.items, 'Interventions retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }
}

export const interventionController = new InterventionController();
