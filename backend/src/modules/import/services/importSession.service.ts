import { prisma } from '../../../config/database';
import {
  ImportType,
  ImportSourceType,
  ImportSessionStatus,
  ImportSession,
  Prisma,
} from '@prisma/client';
import {
  NotFoundError,
  ValidationError,
} from '../../../core/errors/AppError';
import {
  CreateImportSessionInput,
  ListImportSessionsQuery,
} from '../validators/import.validation';

export class ImportSessionService {
  /**
   * Allowed state transitions map
   */
  private readonly ALLOWED_TRANSITIONS: Record<ImportSessionStatus, ImportSessionStatus[]> = {
    [ImportSessionStatus.CREATED]: [
      ImportSessionStatus.VALIDATING,
      ImportSessionStatus.CANCELLED,
    ],
    [ImportSessionStatus.VALIDATING]: [
      ImportSessionStatus.VALIDATED,
      ImportSessionStatus.FAILED,
    ],
    [ImportSessionStatus.VALIDATED]: [
      ImportSessionStatus.PROCESSING,
      ImportSessionStatus.VALIDATING,
      ImportSessionStatus.FAILED,
      ImportSessionStatus.CANCELLED,
    ],
    [ImportSessionStatus.PROCESSING]: [
      ImportSessionStatus.COMPLETED,
      ImportSessionStatus.FAILED,
    ],
    // Terminal states cannot transition further
    [ImportSessionStatus.COMPLETED]: [],
    [ImportSessionStatus.FAILED]: [],
    [ImportSessionStatus.CANCELLED]: [],
  };

  /**
   * Validate and transition import session status
   */
  public async transitionStatus(
    organizationId: string,
    sessionId: string,
    newStatus: ImportSessionStatus,
    errorMessage?: string,
    tx?: Prisma.TransactionClient
  ): Promise<ImportSession> {
    const db = tx || prisma;
    const session = await db.importSession.findFirst({
      where: { id: sessionId, organization_id: organizationId },
    });

    if (!session) {
      throw new NotFoundError(`Import session '${sessionId}' not found in this organization`);
    }

    const currentStatus = session.status;

    // Idempotent: same status transition is a no-op
    if (currentStatus === newStatus) {
      return session;
    }

    // Check if transition is allowed
    const allowed = this.ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new ValidationError(
        `Illegal import session state transition: Cannot transition from '${currentStatus}' to '${newStatus}'`
      );
    }

    const updateData: Prisma.ImportSessionUpdateInput = {
      status: newStatus,
    };

    if (newStatus === ImportSessionStatus.VALIDATING && !session.started_at) {
      updateData.started_at = new Date();
    }

    if (newStatus === ImportSessionStatus.COMPLETED || newStatus === ImportSessionStatus.FAILED || newStatus === ImportSessionStatus.CANCELLED) {
      updateData.completed_at = new Date();
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    return db.importSession.update({
      where: { id: sessionId },
      data: updateData,
    });
  }

  /**
   * Create a new Import Session
   */
  public async createSession(
    organizationId: string,
    userId: string,
    input: CreateImportSessionInput
  ): Promise<ImportSession> {
    return prisma.importSession.create({
      data: {
        organization_id: organizationId,
        initiated_by_user_id: userId,
        import_type: input.import_type,
        source_type: input.source_type || ImportSourceType.CSV,
        status: ImportSessionStatus.CREATED,
      },
      include: {
        initiated_by_user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });
  }

  /**
   * Get Import Session by ID with files and report
   */
  public async getSessionById(organizationId: string, sessionId: string) {
    const session = await prisma.importSession.findFirst({
      where: { id: sessionId, organization_id: organizationId },
      include: {
        initiated_by_user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        import_files: {
          orderBy: { created_at: 'desc' },
        },
        import_report: true,
      },
    });

    if (!session) {
      throw new NotFoundError(`Import session '${sessionId}' not found in this organization`);
    }

    return session;
  }

  /**
   * List Import Sessions with pagination and filters
   */
  public async listSessions(organizationId: string, query: ListImportSessionsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ImportSessionWhereInput = {
      organization_id: organizationId,
      ...(query.import_type ? { import_type: query.import_type } : {}),
      ...(query.status ? { status: query.status as ImportSessionStatus } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.importSession.count({ where }),
      prisma.importSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          initiated_by_user: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          import_files: {
            select: {
              id: true,
              original_filename: true,
              file_size: true,
              file_hash: true,
              mime_type: true,
              created_at: true,
            },
          },
          import_report: true,
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
   * Cancel an Import Session
   */
  public async cancelSession(
    organizationId: string,
    sessionId: string,
    reason?: string
  ): Promise<ImportSession> {
    return this.transitionStatus(
      organizationId,
      sessionId,
      ImportSessionStatus.CANCELLED,
      reason ? `Cancelled by user: ${reason}` : 'Cancelled by user'
    );
  }
}

export const importSessionService = new ImportSessionService();
