import { Request, Response, NextFunction } from 'express';
import { aiModelService } from '../services/aiModel.service';
import { snapshotService } from '../services/snapshot.service';
import { predictionService } from '../services/prediction.service';
import {
  createAiModelSchema,
  updateAiModelStatusSchema,
  generateSnapshotSchema,
  createPredictionSchema,
  createBehaviourSummarySchema,
  listSnapshotsQuerySchema,
  listPredictionHistoryQuerySchema,
} from '../validators/ai.validation';
import { sendCreated, sendSuccess } from '../../../core/utils/response';
import { getTenantId } from '../../../middlewares/tenantIsolation';
import { ModelStatus } from '@prisma/client';

export class AiController {
  // ==========================================
  // 1. AI MODEL METADATA
  // ==========================================

  async registerModel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createAiModelSchema.parse(req.body);
      const model = await aiModelService.registerModel(validated);
      sendCreated(res, model, `AI model '${model.model_version}' registered successfully`);
    } catch (error) {
      next(error);
    }
  }

  async listModels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as ModelStatus | undefined;
      const models = await aiModelService.listModels(status);
      sendSuccess(res, models, 'AI models retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getModel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const version = String(req.params.version);
      const model = await aiModelService.getModel(version);
      sendSuccess(res, model, 'AI model details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateModelStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const version = String(req.params.version);
      const { status } = updateAiModelStatusSchema.parse(req.body);
      const updated = await aiModelService.updateModelStatus(version, status);
      sendSuccess(res, updated, `AI model status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // 2. STUDENT SNAPSHOTS
  // ==========================================

  async generateSnapshots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const validated = generateSnapshotSchema.parse(req.body || {});
      const snapshots = await snapshotService.generateSnapshots(orgId, validated);
      sendCreated(
        res,
        snapshots,
        `Successfully generated ${snapshots.length} student snapshot(s) in GENERATED status`
      );
    } catch (error) {
      next(error);
    }
  }

  async listSnapshots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const query = listSnapshotsQuerySchema.parse(req.query);
      const result = await snapshotService.listSnapshots(orgId, query);
      sendSuccess(res, result.items, 'Student snapshots retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getSnapshot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const snapshot = await snapshotService.getSnapshotById(orgId, id);
      sendSuccess(res, snapshot, 'Student snapshot retrieved');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // 3. PREDICTIONS & INFERENCE
  // ==========================================

  async ingestPrediction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const validated = createPredictionSchema.parse(req.body);
      const prediction = await predictionService.ingestPrediction(orgId, validated, req.user?.userId);
      sendCreated(res, prediction, 'AI risk prediction ingested and historical snapshot recorded');
    } catch (error) {
      next(error);
    }
  }

  async runInference(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const snapshotId = String(req.params.snapshotId);
      const prediction = await predictionService.runPredictionInference(orgId, snapshotId, req.user?.userId);
      sendCreated(res, prediction, 'Automated risk inference executed and prediction attached');
    } catch (error) {
      next(error);
    }
  }

  async getPrediction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const id = String(req.params.id);
      const prediction = await predictionService.getPredictionById(orgId, id);
      sendSuccess(res, prediction, 'Prediction retrieved');
    } catch (error) {
      next(error);
    }
  }

  async listPredictionHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const query = listPredictionHistoryQuerySchema.parse(req.query);
      const result = await predictionService.listPredictionHistory(orgId, query);
      sendSuccess(res, result.items, 'Prediction history records retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // 4. BEHAVIOUR SUMMARIES
  // ==========================================

  async createBehaviourSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const validated = createBehaviourSummarySchema.parse(req.body);
      const summary = await predictionService.createBehaviourSummary(orgId, validated);
      sendCreated(res, summary, 'Behaviour summary created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getBehaviourSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const snapshotId = String(req.params.snapshotId);
      const summary = await predictionService.getBehaviourSummary(orgId, snapshotId);
      sendSuccess(res, summary, 'Behaviour summary retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AiController();
