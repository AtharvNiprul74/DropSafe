import { Request, Response, NextFunction } from 'express';
import { academicService } from './academic.service';
import {
  createProgramSchema,
  updateProgramSchema,
  updateProgramStatusSchema,
  createLevelSchema,
  updateLevelSchema,
  updateLevelStatusSchema,
  createPeriodSchema,
  updatePeriodSchema,
  updatePeriodStatusSchema,
  createComponentSchema,
  updateComponentSchema,
  updateComponentStatusSchema,
} from './academic.validation';
import { sendSuccess, sendCreated } from '../../core/utils/response';
import { getTenantId } from '../../middlewares/tenantIsolation';
import { ProgramStatus, LevelStatus, PeriodStatus, ComponentStatus } from '@prisma/client';

export class AcademicController {
  // ==========================================
  // 1. LEARNING PROGRAMS
  // ==========================================

  async createProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const validated = createProgramSchema.parse(req.body);
      const program = await academicService.createProgram(orgId, validated, req.user?.userId);
      sendCreated(res, program, 'Learning program created successfully');
    } catch (error) {
      next(error);
    }
  }

  async listPrograms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const status = req.query.status as ProgramStatus | undefined;
      const search = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const result = await academicService.listPrograms(orgId, { status, search, page, limit });
      sendSuccess(res, result.items, 'Learning programs retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getProgramById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const program = await academicService.getProgramById(orgId, id);
      sendSuccess(res, program, 'Learning program details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const validated = updateProgramSchema.parse(req.body);
      const updated = await academicService.updateProgram(orgId, id, validated, req.user?.userId);
      sendSuccess(res, updated, 'Learning program updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateProgramStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const { status } = updateProgramStatusSchema.parse(req.body);
      const updated = await academicService.updateProgramStatus(orgId, id, status, req.user?.userId);
      sendSuccess(res, updated, `Learning program status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  }

  async deleteProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const result = await academicService.deleteProgram(orgId, id, req.user?.userId);
      sendSuccess(res, result, 'Learning program deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // 2. LEARNING LEVELS
  // ==========================================

  async createLevel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const validated = createLevelSchema.parse(req.body);
      const level = await academicService.createLevel(orgId, validated, req.user?.userId);
      sendCreated(res, level, 'Learning level created successfully');
    } catch (error) {
      next(error);
    }
  }

  async listLevels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const programId = req.query.programId as string | undefined;
      const status = req.query.status as LevelStatus | undefined;

      const levels = await academicService.listLevels(orgId, { programId, status });
      sendSuccess(res, levels, 'Learning levels retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getLevelById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const level = await academicService.getLevelById(orgId, id);
      sendSuccess(res, level, 'Learning level details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateLevel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const validated = updateLevelSchema.parse(req.body);
      const updated = await academicService.updateLevel(orgId, id, validated, req.user?.userId);
      sendSuccess(res, updated, 'Learning level updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateLevelStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const { status } = updateLevelStatusSchema.parse(req.body);
      const updated = await academicService.updateLevelStatus(orgId, id, status, req.user?.userId);
      sendSuccess(res, updated, `Learning level status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // 3. ACADEMIC PERIODS
  // ==========================================

  async createPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const validated = createPeriodSchema.parse(req.body);
      const period = await academicService.createPeriod(orgId, validated, req.user?.userId);
      sendCreated(res, period, 'Academic period created successfully');
    } catch (error) {
      next(error);
    }
  }

  async listPeriods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const levelId = req.query.levelId as string | undefined;
      const programId = req.query.programId as string | undefined;
      const status = req.query.status as PeriodStatus | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const result = await academicService.listPeriods(orgId, { levelId, programId, status, page, limit });
      sendSuccess(res, result.items, 'Academic periods retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getPeriodById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const period = await academicService.getPeriodById(orgId, id);
      sendSuccess(res, period, 'Academic period details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updatePeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const validated = updatePeriodSchema.parse(req.body);
      const updated = await academicService.updatePeriod(orgId, id, validated, req.user?.userId);
      sendSuccess(res, updated, 'Academic period updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async updatePeriodStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const { status } = updatePeriodStatusSchema.parse(req.body);
      const updated = await academicService.updatePeriodStatus(orgId, id, status, req.user?.userId);
      sendSuccess(res, updated, `Academic period status transitioned to ${status}`);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // 4. LEARNING COMPONENTS
  // ==========================================

  async createComponent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const validated = createComponentSchema.parse(req.body);
      const component = await academicService.createComponent(orgId, validated, req.user?.userId);
      sendCreated(res, component, 'Learning component created successfully');
    } catch (error) {
      next(error);
    }
  }

  async listComponents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const periodId = req.query.periodId as string | undefined;
      const status = req.query.status as ComponentStatus | undefined;

      const components = await academicService.listComponents(orgId, { periodId, status });
      sendSuccess(res, components, 'Learning components retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getComponentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const component = await academicService.getComponentById(orgId, id);
      sendSuccess(res, component, 'Learning component details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateComponent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const validated = updateComponentSchema.parse(req.body);
      const updated = await academicService.updateComponent(orgId, id, validated, req.user?.userId);
      sendSuccess(res, updated, 'Learning component updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateComponentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const { status } = updateComponentStatusSchema.parse(req.body);
      const updated = await academicService.updateComponentStatus(orgId, id, status, req.user?.userId);
      sendSuccess(res, updated, `Learning component status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // 5. HIERARCHY TREE
  // ==========================================

  async getHierarchyTree(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const programId = req.query.programId as string | undefined;
      const tree = await academicService.getHierarchyTree(orgId, programId);
      sendSuccess(res, tree, 'Academic hierarchy tree retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const academicController = new AcademicController();
