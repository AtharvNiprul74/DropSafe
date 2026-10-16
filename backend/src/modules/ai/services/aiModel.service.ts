import { prisma } from '../../../config/database';
import { ModelStatus } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../../core/errors/AppError';
import { CreateAiModelInput } from '../validators/ai.validation';

export class AiModelService {
  /**
   * Register new AI Model Metadata
   */
  public async registerModel(input: CreateAiModelInput) {
    const existing = await prisma.aiModelMetadata.findUnique({
      where: { model_version: input.model_version },
    });

    if (existing) {
      throw new ConflictError(`AI model with version '${input.model_version}' is already registered`);
    }

    return prisma.aiModelMetadata.create({
      data: {
        model_name: input.model_name,
        model_version: input.model_version,
        algorithm: input.algorithm,
        feature_version: input.feature_version,
        training_dataset_version: input.training_dataset_version,
        status: input.status || ModelStatus.ACTIVE,
      },
    });
  }

  /**
   * List all AI models
   */
  public async listModels(status?: ModelStatus) {
    return prisma.aiModelMetadata.findMany({
      where: status ? { status } : undefined,
      orderBy: { deployment_timestamp: 'desc' },
    });
  }

  /**
   * Get model by version or ID
   */
  public async getModel(versionOrId: string) {
    const model = await prisma.aiModelMetadata.findFirst({
      where: {
        OR: [{ model_version: versionOrId }, { id: versionOrId }],
      },
    });

    if (!model) {
      throw new NotFoundError(`AI Model '${versionOrId}' not found`);
    }

    return model;
  }

  /**
   * Get currently active AI model
   */
  public async getActiveModel() {
    const model = await prisma.aiModelMetadata.findFirst({
      where: { status: ModelStatus.ACTIVE },
      orderBy: { deployment_timestamp: 'desc' },
    });

    if (!model) {
      throw new NotFoundError('No active AI model is currently deployed');
    }

    return model;
  }

  /**
   * Update AI model status (ACTIVE <-> RETIRED)
   */
  public async updateModelStatus(versionOrId: string, status: ModelStatus) {
    const model = await this.getModel(versionOrId);

    return prisma.aiModelMetadata.update({
      where: { id: model.id },
      data: { status },
    });
  }
}

export const aiModelService = new AiModelService();
