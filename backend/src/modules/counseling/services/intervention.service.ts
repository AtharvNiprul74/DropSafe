import { prisma } from '../../../config/database';
import {
  InterventionStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../core/errors/AppError';
import { recordAuditLog } from '../../../middlewares/governanceLog';
import { notificationService } from './notification.service';
import {
  CreateInterventionInput,
  UpdateInterventionInput,
  UpdateInterventionStatusInput,
  ListInterventionsQuery,
} from '../validators/counseling.validation';

export class InterventionService {
  /**
   * Create a new student intervention
   */
  public async createIntervention(
    organizationId: string,
    input: CreateInterventionInput,
    actorUserId?: string
  ) {
    // 1. Verify student exists in this organization
    const student = await prisma.student.findFirst({
      where: { id: input.student_id, organization_id: organizationId },
    });
    if (!student) {
      throw new NotFoundError(`Student '${input.student_id}' not found in organization`);
    }

    // 2. Verify responsible user exists in this organization
    const responsibleUser = await prisma.user.findFirst({
      where: { id: input.responsible_user_id, organization_id: organizationId },
    });
    if (!responsibleUser) {
      throw new ValidationError(
        `Responsible user '${input.responsible_user_id}' not found or does not belong to the same organization`
      );
    }

    // 3. Verify prediction (if provided) exists and belongs to the same student/organization
    if (input.prediction_id) {
      const prediction = await prisma.prediction.findFirst({
        where: {
          id: input.prediction_id,
          student_snapshot: {
            organization_id: organizationId,
            student_id: input.student_id,
          },
        },
      });
      if (!prediction) {
        throw new ValidationError(
          `Prediction '${input.prediction_id}' not found for student in organization`
        );
      }
    }

    // 4. Create intervention in PLANNED status
    const plannedDate = input.planned_start_date ? new Date(input.planned_start_date) : null;
    const intervention = await prisma.intervention.create({
      data: {
        organization_id: organizationId,
        student_id: input.student_id,
        prediction_id: input.prediction_id || null,
        responsible_user_id: input.responsible_user_id,
        intervention_type: input.intervention_type,
        priority: input.priority,
        status: InterventionStatus.PLANNED,
        title: input.title,
        description: input.description || null,
        planned_start_date: plannedDate,
      },
      include: {
        student: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        responsible_user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        prediction: true,
      },
    });

    // 5. Trigger notification to the responsible user
    await notificationService.createNotification({
      organizationId,
      recipientUserId: input.responsible_user_id,
      notificationType: NotificationType.MENTOR_ALERT,
      title: `New Intervention Assigned: ${intervention.title}`,
      message: `You have been assigned as the responsible mentor for student intervention '${intervention.title}' (${intervention.intervention_type}).`,
    });

    // 6. Record Audit Log
    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'intervention:create',
      entityType: 'intervention',
      entityId: intervention.id,
      details: {
        student_id: input.student_id,
        responsible_user_id: input.responsible_user_id,
        title: input.title,
        type: input.intervention_type,
        priority: input.priority,
      },
    });

    return intervention;
  }

  /**
   * Get Intervention by ID
   */
  public async getInterventionById(organizationId: string, interventionId: string) {
    const intervention = await prisma.intervention.findFirst({
      where: { id: interventionId, organization_id: organizationId },
      include: {
        student: {
          select: { id: true, first_name: true, last_name: true, email: true, phone: true },
        },
        responsible_user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        prediction: {
          include: {
            student_snapshot: {
              select: {
                attendance_percentage: true,
                overall_marks_percentage: true,
                failed_learning_components: true,
              },
            },
          },
        },
        counseling_sessions: {
          orderBy: { scheduled_at: 'desc' },
          include: {
            responsible_mentor: {
              select: { id: true, first_name: true, last_name: true },
            },
          },
        },
        follow_ups: {
          orderBy: { scheduled_date: 'desc' },
          include: {
            responsible_user: {
              select: { id: true, first_name: true, last_name: true },
            },
          },
        },
        _count: {
          select: {
            counseling_sessions: true,
            follow_ups: true,
          },
        },
      },
    });

    if (!intervention) {
      throw new NotFoundError(`Intervention '${interventionId}' not found in organization`);
    }

    return intervention;
  }

  /**
   * Update Intervention details (only if not completed/cancelled)
   */
  public async updateIntervention(
    organizationId: string,
    interventionId: string,
    input: UpdateInterventionInput,
    actorUserId?: string
  ) {
    const intervention = await prisma.intervention.findFirst({
      where: { id: interventionId, organization_id: organizationId },
    });

    if (!intervention) {
      throw new NotFoundError(`Intervention '${interventionId}' not found in organization`);
    }

    if (
      intervention.status === InterventionStatus.COMPLETED ||
      intervention.status === InterventionStatus.CANCELLED
    ) {
      throw new ValidationError(
        `Cannot update an intervention in terminal status '${intervention.status}'`
      );
    }

    let reassigned = false;
    if (input.responsible_user_id && input.responsible_user_id !== intervention.responsible_user_id) {
      const user = await prisma.user.findFirst({
        where: { id: input.responsible_user_id, organization_id: organizationId },
      });
      if (!user) {
        throw new ValidationError(
          `Responsible user '${input.responsible_user_id}' not found or does not belong to this organization`
        );
      }
      reassigned = true;
    }

    const updated = await prisma.intervention.update({
      where: { id: interventionId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.responsible_user_id !== undefined ? { responsible_user_id: input.responsible_user_id } : {}),
        ...(input.planned_start_date !== undefined
          ? { planned_start_date: input.planned_start_date ? new Date(input.planned_start_date) : null }
          : {}),
      },
      include: {
        student: { select: { id: true, first_name: true, last_name: true } },
        responsible_user: { select: { id: true, first_name: true, last_name: true } },
      },
    });

    if (reassigned && input.responsible_user_id) {
      await notificationService.createNotification({
        organizationId,
        recipientUserId: input.responsible_user_id,
        notificationType: NotificationType.MENTOR_ALERT,
        title: `Intervention Reassigned: ${updated.title}`,
        message: `You have been reassigned as the responsible mentor for intervention '${updated.title}'.`,
      });
    }

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'intervention:update',
      entityType: 'intervention',
      entityId: interventionId,
      details: {
        previous: {
          title: intervention.title,
          priority: intervention.priority,
          responsible_user_id: intervention.responsible_user_id,
        },
        updated: input,
      },
    });

    return updated;
  }

  /**
   * Transition Intervention Lifecycle State Machine
   * PLANNED -> IN_PROGRESS -> COMPLETED (or CANCELLED)
   */
  public async updateInterventionStatus(
    organizationId: string,
    interventionId: string,
    input: UpdateInterventionStatusInput,
    actorUserId?: string
  ) {
    const intervention = await prisma.intervention.findFirst({
      where: { id: interventionId, organization_id: organizationId },
    });

    if (!intervention) {
      throw new NotFoundError(`Intervention '${interventionId}' not found in organization`);
    }

    const currentStatus = intervention.status;
    const targetStatus = input.status;

    // Terminal states cannot transition
    if (
      currentStatus === InterventionStatus.COMPLETED ||
      currentStatus === InterventionStatus.CANCELLED
    ) {
      throw new ValidationError(
        `Cannot change status of an intervention that is already '${currentStatus}'`
      );
    }

    let completedAt: Date | null = null;
    let cancelledAt: Date | null = null;

    if (targetStatus === InterventionStatus.COMPLETED) {
      // Completed requires valid completed_at timestamp
      completedAt = input.completed_at ? new Date(input.completed_at) : new Date();
    } else if (targetStatus === InterventionStatus.CANCELLED) {
      cancelledAt = input.cancelled_at ? new Date(input.cancelled_at) : new Date();
    } else if (targetStatus === InterventionStatus.IN_PROGRESS) {
      if (currentStatus !== InterventionStatus.PLANNED) {
        throw new ValidationError(
          `Cannot transition intervention from '${currentStatus}' to '${targetStatus}'`
        );
      }
    }

    const updated = await prisma.intervention.update({
      where: { id: interventionId },
      data: {
        status: targetStatus,
        ...(completedAt ? { completed_at: completedAt } : {}),
        ...(cancelledAt ? { cancelled_at: cancelledAt } : {}),
      },
      include: {
        student: { select: { id: true, first_name: true, last_name: true } },
        responsible_user: { select: { id: true, first_name: true, last_name: true } },
      },
    });

    // Notify responsible user of status change
    await notificationService.createNotification({
      organizationId,
      recipientUserId: intervention.responsible_user_id,
      notificationType: NotificationType.MENTOR_ALERT,
      title: `Intervention Status Changed: ${updated.title}`,
      message: `Intervention status transitioned from ${currentStatus} to ${targetStatus}.`,
    });

    // Record audit log
    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'intervention:status_change',
      entityType: 'intervention',
      entityId: interventionId,
      details: {
        previous_status: currentStatus,
        new_status: targetStatus,
        completed_at: completedAt,
        cancelled_at: cancelledAt,
      },
    });

    return updated;
  }

  /**
   * List interventions with multi-tenant filtering and pagination
   */
  public async listInterventions(
    organizationId: string,
    query: ListInterventionsQuery
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InterventionWhereInput = {
      organization_id: organizationId,
      ...(query.student_id ? { student_id: query.student_id } : {}),
      ...(query.responsible_user_id ? { responsible_user_id: query.responsible_user_id } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.intervention_type ? { intervention_type: query.intervention_type } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.intervention.count({ where }),
      prisma.intervention.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
        include: {
          student: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          responsible_user: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          prediction: {
            select: { id: true, risk_label: true, prediction_score: true },
          },
          _count: {
            select: {
              counseling_sessions: true,
              follow_ups: true,
            },
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
}

export const interventionService = new InterventionService();
