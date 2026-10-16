import { prisma } from '../../../config/database';
import {
  FollowUpStatus,
  InterventionStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../core/errors/AppError';
import { recordAuditLog } from '../../../middlewares/governanceLog';
import { notificationService } from './notification.service';
import {
  CreateFollowUpInput,
  UpdateFollowUpInput,
  UpdateFollowUpStatusInput,
  ListFollowUpsQuery,
} from '../validators/counseling.validation';

export class FollowUpService {
  /**
   * Create a new follow-up task under an intervention or counseling session
   */
  public async createFollowUp(
    organizationId: string,
    input: CreateFollowUpInput,
    actorUserId?: string
  ) {
    // 1. Verify Intervention exists in organization
    const intervention = await prisma.intervention.findFirst({
      where: { id: input.intervention_id, organization_id: organizationId },
    });
    if (!intervention) {
      throw new NotFoundError(`Intervention '${input.intervention_id}' not found in organization`);
    }

    if (
      intervention.status === InterventionStatus.COMPLETED ||
      intervention.status === InterventionStatus.CANCELLED
    ) {
      throw new ValidationError(
        `Cannot create a follow-up for an intervention in '${intervention.status}' status`
      );
    }

    // 2. Verify Counseling Session (if provided) belongs to this intervention and organization
    if (input.counseling_session_id) {
      const session = await prisma.counselingSession.findFirst({
        where: {
          id: input.counseling_session_id,
          intervention_id: input.intervention_id,
          organization_id: organizationId,
        },
      });
      if (!session) {
        throw new ValidationError(
          `Counseling session '${input.counseling_session_id}' not found for intervention in organization`
        );
      }
    }

    // 3. Verify Responsible User
    const responsibleUserId =
      input.responsible_user_id || actorUserId || intervention.responsible_user_id;
    const responsibleUser = await prisma.user.findFirst({
      where: { id: responsibleUserId, organization_id: organizationId },
    });
    if (!responsibleUser) {
      throw new ValidationError(
        `Responsible user '${responsibleUserId}' not found or does not belong to the same organization`
      );
    }

    // 4. Rule: Pending follow-ups must NOT have completed_at
    if (input.completed_at) {
      throw new ValidationError('Pending follow-up must not have completed_at');
    }

    // 5. Create Follow-Up in PENDING status
    const scheduledDate = new Date(input.scheduled_date);
    const followUp = await prisma.followUp.create({
      data: {
        organization_id: organizationId,
        intervention_id: input.intervention_id,
        counseling_session_id: input.counseling_session_id || null,
        responsible_user_id: responsibleUserId,
        follow_up_type: input.follow_up_type,
        status: FollowUpStatus.PENDING,
        scheduled_date: scheduledDate,
        notes: input.notes || null,
        outcome: input.outcome || null,
      },
      include: {
        intervention: {
          select: { id: true, title: true, student_id: true },
        },
        responsible_user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    // 6. Trigger Notification to Responsible User
    await notificationService.createNotification({
      organizationId,
      recipientUserId: responsibleUserId,
      notificationType: NotificationType.FOLLOW_UP_REMINDER,
      title: `Follow-Up Scheduled: ${followUp.follow_up_type}`,
      message: `A follow-up task (${followUp.follow_up_type}) for intervention '${intervention.title}' is scheduled for ${followUp.scheduled_date.toISOString()}.`,
    });

    // 7. Audit Log
    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'follow_up:create',
      entityType: 'follow_up',
      entityId: followUp.id,
      details: {
        intervention_id: input.intervention_id,
        counseling_session_id: input.counseling_session_id,
        responsible_user_id: responsibleUserId,
        follow_up_type: input.follow_up_type,
        scheduled_date: input.scheduled_date,
      },
    });

    return followUp;
  }

  /**
   * Get Follow-Up by ID
   */
  public async getFollowUpById(organizationId: string, followUpId: string) {
    const followUp = await prisma.followUp.findFirst({
      where: { id: followUpId, organization_id: organizationId },
      include: {
        intervention: {
          select: { id: true, title: true, priority: true, status: true, student_id: true },
        },
        counseling_session: {
          select: { id: true, session_type: true, status: true, scheduled_at: true },
        },
        responsible_user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    if (!followUp) {
      throw new NotFoundError(`Follow-up '${followUpId}' not found in organization`);
    }

    return followUp;
  }

  /**
   * Update Follow-Up details (while PENDING)
   */
  public async updateFollowUp(
    organizationId: string,
    followUpId: string,
    input: UpdateFollowUpInput,
    actorUserId?: string
  ) {
    const followUp = await prisma.followUp.findFirst({
      where: { id: followUpId, organization_id: organizationId },
    });

    if (!followUp) {
      throw new NotFoundError(`Follow-up '${followUpId}' not found in organization`);
    }

    if (followUp.status !== FollowUpStatus.PENDING) {
      throw new ValidationError(
        `Cannot update a follow-up in '${followUp.status}' status. Only PENDING follow-ups can be edited.`
      );
    }

    if (input.responsible_user_id && input.responsible_user_id !== followUp.responsible_user_id) {
      const user = await prisma.user.findFirst({
        where: { id: input.responsible_user_id, organization_id: organizationId },
      });
      if (!user) {
        throw new ValidationError(
          `Responsible user '${input.responsible_user_id}' not found or does not belong to this organization`
        );
      }
    }

    const updated = await prisma.followUp.update({
      where: { id: followUpId },
      data: {
        ...(input.follow_up_type !== undefined ? { follow_up_type: input.follow_up_type } : {}),
        ...(input.scheduled_date !== undefined ? { scheduled_date: new Date(input.scheduled_date) } : {}),
        ...(input.responsible_user_id !== undefined ? { responsible_user_id: input.responsible_user_id } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.outcome !== undefined ? { outcome: input.outcome } : {}),
      },
      include: {
        responsible_user: { select: { id: true, first_name: true, last_name: true } },
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'follow_up:update',
      entityType: 'follow_up',
      entityId: followUpId,
      details: {
        updated: input,
      },
    });

    return updated;
  }

  /**
   * Transition Follow-Up Lifecycle State Machine
   * PENDING -> COMPLETED / MISSED / CANCELLED
   */
  public async updateFollowUpStatus(
    organizationId: string,
    followUpId: string,
    input: UpdateFollowUpStatusInput,
    actorUserId?: string
  ) {
    const followUp = await prisma.followUp.findFirst({
      where: { id: followUpId, organization_id: organizationId },
    });

    if (!followUp) {
      throw new NotFoundError(`Follow-up '${followUpId}' not found in organization`);
    }

    const currentStatus = followUp.status;
    const targetStatus = input.status;

    // Rule: Cancelled follow-ups cannot later be marked completed!
    if (currentStatus === FollowUpStatus.CANCELLED) {
      throw new ValidationError('Cancelled follow-ups cannot later be marked completed');
    }

    if (currentStatus === FollowUpStatus.COMPLETED) {
      throw new ValidationError('Completed follow-ups cannot be updated');
    }

    let completedAt: Date | null = null;
    let cancelledAt: Date | null = null;

    if (targetStatus === FollowUpStatus.COMPLETED) {
      // Completed requires valid completed_at timestamp
      completedAt = input.completed_at ? new Date(input.completed_at) : new Date();
    } else if (targetStatus === FollowUpStatus.CANCELLED) {
      cancelledAt = input.cancelled_at ? new Date(input.cancelled_at) : new Date();
    } else if (targetStatus === FollowUpStatus.PENDING) {
      // Cannot set completed_at while pending
      if (input.completed_at) {
        throw new ValidationError('Pending follow-up must not have completed_at');
      }
    }

    const updated = await prisma.followUp.update({
      where: { id: followUpId },
      data: {
        status: targetStatus,
        completed_at: completedAt,
        cancelled_at: cancelledAt,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.outcome !== undefined ? { outcome: input.outcome } : {}),
      },
      include: {
        responsible_user: { select: { id: true, first_name: true, last_name: true } },
      },
    });

    // Notify responsible user of status change
    await notificationService.createNotification({
      organizationId,
      recipientUserId: followUp.responsible_user_id,
      notificationType: NotificationType.FOLLOW_UP_REMINDER,
      title: `Follow-Up ${targetStatus}`,
      message: `Follow-up (${followUp.follow_up_type}) was marked ${targetStatus}.`,
    });

    // Audit log
    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'follow_up:status_change',
      entityType: 'follow_up',
      entityId: followUpId,
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
   * List Follow-Ups with filtering and pagination
   */
  public async listFollowUps(
    organizationId: string,
    query: ListFollowUpsQuery
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FollowUpWhereInput = {
      organization_id: organizationId,
      ...(query.intervention_id ? { intervention_id: query.intervention_id } : {}),
      ...(query.counseling_session_id ? { counseling_session_id: query.counseling_session_id } : {}),
      ...(query.responsible_user_id ? { responsible_user_id: query.responsible_user_id } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.follow_up_type ? { follow_up_type: query.follow_up_type } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.followUp.count({ where }),
      prisma.followUp.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduled_date: 'asc' },
        include: {
          responsible_user: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          intervention: {
            select: { id: true, title: true, priority: true, status: true, student_id: true },
          },
          counseling_session: {
            select: { id: true, session_type: true, scheduled_at: true },
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

export const followUpService = new FollowUpService();
