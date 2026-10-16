import { prisma } from '../../../config/database';
import {
  RiskLabel,
  SnapshotStatus,
  Prisma,
} from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../core/errors/AppError';
import { aiModelService } from './aiModel.service';
import { recordAuditLog } from '../../../middlewares/governanceLog';
import {
  CreatePredictionInput,
  CreateBehaviourSummaryInput,
  ListPredictionHistoryQuery,
} from '../validators/ai.validation';

export class PredictionService {
  /**
   * Ingest an AI Risk Prediction for a Student Snapshot
   */
  public async ingestPrediction(
    organizationId: string,
    input: CreatePredictionInput,
    actorUserId?: string
  ) {
    // 1. Verify snapshot exists in this tenant
    const snapshot = await prisma.studentSnapshot.findFirst({
      where: { id: input.student_snapshot_id, organization_id: organizationId },
    });

    if (!snapshot) {
      throw new NotFoundError(`Student snapshot '${input.student_snapshot_id}' not found in organization`);
    }

    if (snapshot.status === SnapshotStatus.SUPERSEDED) {
      throw new ValidationError(
        `Cannot attach predictions to a SUPERSEDED student snapshot. Generate a fresh snapshot first.`
      );
    }

    // 2. Verify AI model exists and is ACTIVE
    const model = await aiModelService.getModel(input.ai_model_version);
    if (model.status !== 'ACTIVE') {
      throw new ValidationError(`AI model '${input.ai_model_version}' is RETIRED and cannot be used for predictions`);
    }

    // 3. Atomically upsert prediction, update snapshot status, and append to prediction_history
    const result = await prisma.$transaction(async (tx) => {
      // Upsert Prediction
      const prediction = await tx.prediction.upsert({
        where: { student_snapshot_id: snapshot.id },
        update: {
          ai_model_version: model.model_version,
          risk_label: input.risk_label,
          prediction_score: new Prisma.Decimal(input.prediction_score),
          generated_at: new Date(),
        },
        create: {
          student_snapshot_id: snapshot.id,
          ai_model_version: model.model_version,
          risk_label: input.risk_label,
          prediction_score: new Prisma.Decimal(input.prediction_score),
        },
      });

      // Update Snapshot status to PREDICTED
      await tx.studentSnapshot.update({
        where: { id: snapshot.id },
        data: {
          status: SnapshotStatus.PREDICTED,
        },
      });

      // Append to PredictionHistory (historical audit trail)
      const riskProb = input.risk_probability !== undefined ? input.risk_probability : input.prediction_score;
      const history = await tx.predictionHistory.create({
        data: {
          organization_id: organizationId,
          student_id: snapshot.student_id,
          student_snapshot_id: snapshot.id,
          ai_model_version: model.model_version,
          risk_label: input.risk_label,
          risk_probability: new Prisma.Decimal(riskProb),
          prediction_confidence: new Prisma.Decimal(input.prediction_score),
          recorded_at: new Date(),
        },
      });

      return { prediction, history };
    });

    // 4. Governance Audit Log
    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'prediction:create',
      entityType: 'prediction',
      entityId: result.prediction.id,
      details: {
        student_id: snapshot.student_id,
        snapshot_id: snapshot.id,
        risk_label: input.risk_label,
        prediction_score: input.prediction_score,
        model_version: input.ai_model_version,
      },
    });

    return result.prediction;
  }

  /**
   * Automated rule-based ML inference trigger using active model
   */
  public async runPredictionInference(
    organizationId: string,
    snapshotId: string,
    actorUserId?: string
  ) {
    const activeModel = await aiModelService.getActiveModel();

    const snapshot = await prisma.studentSnapshot.findFirst({
      where: { id: snapshotId, organization_id: organizationId },
    });

    if (!snapshot) {
      throw new NotFoundError(`Student snapshot '${snapshotId}' not found in organization`);
    }

    const attendance = snapshot.attendance_percentage ? Number(snapshot.attendance_percentage) : 100;
    const marks = snapshot.overall_marks_percentage ? Number(snapshot.overall_marks_percentage) : 100;
    const failedComponents = snapshot.failed_learning_components ?? 0;

    // Rule-based Multi-Factor Early Warning Scoring
    let riskLabel: RiskLabel;
    let confidenceScore: number;

    if (failedComponents >= 2 || attendance < 60 || marks < 35) {
      riskLabel = RiskLabel.HIGH;
      confidenceScore = 92.5;
    } else if (failedComponents >= 1 || attendance < 75 || marks < 50) {
      riskLabel = RiskLabel.MEDIUM;
      confidenceScore = 81.0;
    } else {
      riskLabel = RiskLabel.LOW;
      confidenceScore = 88.0;
    }

    return this.ingestPrediction(
      organizationId,
      {
        student_snapshot_id: snapshotId,
        ai_model_version: activeModel.model_version,
        risk_label: riskLabel,
        prediction_score: confidenceScore,
      },
      actorUserId
    );
  }

  /**
   * Ingest Behaviour Summary for a student snapshot
   */
  public async createBehaviourSummary(
    organizationId: string,
    input: CreateBehaviourSummaryInput
  ) {
    const snapshot = await prisma.studentSnapshot.findFirst({
      where: { id: input.student_snapshot_id, organization_id: organizationId },
    });

    if (!snapshot) {
      throw new NotFoundError(`Student snapshot '${input.student_snapshot_id}' not found in organization`);
    }

    return prisma.behaviourSummary.upsert({
      where: { student_snapshot_id: snapshot.id },
      update: {
        summary: input.summary,
        dominant_sentiment: input.dominant_sentiment,
        confidence_score: new Prisma.Decimal(input.confidence_score),
        ai_model_version: input.ai_model_version,
        generation_timestamp: new Date(),
      },
      create: {
        student_snapshot_id: snapshot.id,
        summary: input.summary,
        dominant_sentiment: input.dominant_sentiment,
        confidence_score: new Prisma.Decimal(input.confidence_score),
        ai_model_version: input.ai_model_version,
      },
    });
  }

  /**
   * Get Behaviour Summary by Snapshot ID
   */
  public async getBehaviourSummary(organizationId: string, snapshotId: string) {
    const snapshot = await prisma.studentSnapshot.findFirst({
      where: { id: snapshotId, organization_id: organizationId },
    });

    if (!snapshot) {
      throw new NotFoundError(`Student snapshot '${snapshotId}' not found in organization`);
    }

    const summary = await prisma.behaviourSummary.findUnique({
      where: { student_snapshot_id: snapshotId },
    });

    if (!summary) {
      throw new NotFoundError(`No behaviour summary found for snapshot '${snapshotId}'`);
    }

    return summary;
  }

  /**
   * Query Prediction History
   */
  public async listPredictionHistory(
    organizationId: string,
    query: ListPredictionHistoryQuery
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PredictionHistoryWhereInput = {
      organization_id: organizationId,
      ...(query.student_id ? { student_id: query.student_id } : {}),
      ...(query.risk_label ? { risk_label: query.risk_label } : {}),
      ...(query.ai_model_version ? { ai_model_version: query.ai_model_version } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.predictionHistory.count({ where }),
      prisma.predictionHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { recorded_at: 'desc' },
        include: {
          student: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Prediction by ID
   */
  public async getPredictionById(organizationId: string, predictionId: string) {
    const prediction = await prisma.prediction.findFirst({
      where: {
        id: predictionId,
        student_snapshot: { organization_id: organizationId },
      },
      include: {
        student_snapshot: {
          include: {
            student: true,
            enrollment: true,
            behaviour_summary: true,
          },
        },
        interventions: true,
      },
    });

    if (!prediction) {
      throw new NotFoundError(`Prediction '${predictionId}' not found in organization`);
    }

    return prediction;
  }
}

export const predictionService = new PredictionService();
