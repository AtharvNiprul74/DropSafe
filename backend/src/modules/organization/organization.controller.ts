import { Request, Response, NextFunction } from 'express';
import { organizationService } from './organization.service';
import { updateSettingsSchema, updateOrganizationSchema, createUserSchema } from './organization.validation';
import { sendSuccess, sendCreated } from '../../core/utils/response';
import { getTenantId } from '../../middlewares/tenantIsolation';

export class OrganizationController {
  async getDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const org = await organizationService.getOrganizationDetails(orgId);
      sendSuccess(res, org, 'Organization details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const validated = updateOrganizationSchema.parse(req.body);
      const updated = await organizationService.updateOrganization(orgId, validated, req.user?.userId);
      sendSuccess(res, updated, 'Organization updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const settings = await organizationService.getSettings(orgId);
      sendSuccess(res, settings, 'Organization settings retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const validated = updateSettingsSchema.parse(req.body);
      const updated = await organizationService.updateSettings(orgId, validated, req.user?.userId);
      sendSuccess(res, updated, 'Organization settings updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const users = await organizationService.listUsers(orgId);
      sendSuccess(res, users, 'Users retrieved');
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const validated = createUserSchema.parse(req.body);
      const user = await organizationService.createUser(orgId, validated, req.user?.userId);
      sendCreated(res, user, 'User created successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const organizationController = new OrganizationController();
