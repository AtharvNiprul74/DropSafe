import { prisma } from '../../../config/database';
import {
  CounselingSessionStatus,
  InterventionStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../core/errors/AppError';
import { recordAuditLog } from '../../../middlewares/governanceLog';
import { notificationService } from './notification.service';
import {
  CreateCounselingSessionInput,
  UpdateCounselingSessionInput,
  UpdateCounselingSessionStatusInput,
  ListCounselingSessionsQuery,
} from '../validators/counseling.validation';

export class CounselingSessionService {
  /**
   * Schedule a new Counseling Session under an active Intervention
   */
  public async createSession(
    organizationId: string,
    input: CreateCounselingSessionInput,
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
        `Cannot schedule a counseling session for an intervention in '${intervention.status}' status`
      );
    }

    // 2. Validate Student
    const studentId = input.student_id || intervention.student_id;
    if (studentId !== intervention.student_id) {
      throw new ValidationError(
        `student_id '${input.student_id}' does not match the intervention student '${intervention.student_id}'`
      );
    }

    // 3. Validate Responsible Mentor
    const mentorId = input.responsible_mentor_id || actorUserId || intervention.responsible_user_id;
    const mentor = await prisma.user.findFirst({
      where: { id: mentorId, organization_id: organizationId },
    });
    if (!mentor) {
      throw new ValidationError(
        `Responsible mentor '${mentorId}' not found or does not belong to the same organization`
      );
    }

    // 4. Validate Timestamps if started_at / ended_at provided
    const scheduledAt = new Date(input.scheduled_at);
    const startedAt = input.started_at ? new Date(input.started_at) : null;
    const endedAt = input.ended_at ? new Date(input.ended_at) : null;

    if (startedAt && endedAt && endedAt < startedAt) {
      throw new ValidationError('ended_at cannot precede started_at');
    }

    // 5. Create Session in SCHEDULED status
    const session = await prisma.counselingSession.create({
      data: {
        organization_id: organizationId,
        intervention_id: input.intervention_id,
        student_id: studentId,
        responsible_mentor_id: mentorId,
        session_type: input.session_type,
        status: CounselingSessionStatus.SCHEDULED,
        scheduled_at: scheduledAt,
        started_at: startedAt,
        ended_at: endedAt,
        session_notes: input.session_notes || null,
        outcome: input.outcome || null,
      },
      include: {
        student: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        responsible_mentor: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        intervention: {
          select: { id: true, title: true, priority: true, status: true },
        },
      },
    });

    // 6. Trigger Notification to Mentor
    await notificationService.createNotification({
      organizationId,
      recipientUserId: mentorId,
      notificationType: NotificationType.MENTOR_ALERT,
      title: `Counseling Session Scheduled`,
      message: `A counseling session (${session.session_type}) has been scheduled with student ${session.student.first_name} ${session.student.last_name} on ${session.scheduled_at.toISOString()}.`,
    });

    // 7. Audit Log
    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'counseling_session:schedule',
      entityType: 'counseling_session',
      entityId: session.id,
      details: {
        intervention_id: input.intervention_id,
        student_id: studentId,
        responsible_mentor_id: mentorId,
        session_type: input.session_type,
        scheduled_at: input.scheduled_at,
      },
    });

    return session;
  }

  /**
   * Get Counseling Session by ID
   */
  public async getSessionById(organizationId: string, sessionId: string) {
    const session = await prisma.counselingSession.findFirst({
      where: { id: sessionId, organization_id: organizationId },
      include: {
        student: {
          select: { id: true, first_name: true, last_name: true, email: true, phone: true },
        },
        responsible_mentor: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        intervention: {
          select: { id: true, title: true, intervention_type: true, priority: true, status: true },
        },
        follow_ups: {
          orderBy: { scheduled_date: 'desc' },
          include: {
            responsible_user: {
              select: { id: true, first_name: true, last_name: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError(`Counseling session '${sessionId}' not found in organization`);
    }

    return session;
  }

  /**
   * Update Counseling Session details (while SCHEDULED)
   */
  public async updateSession(
    organizationId: string,
    sessionId: string,
    input: UpdateCounselingSessionInput,
    actorUserId?: string
  ) {
    const session = await prisma.counselingSession.findFirst({
      where: { id: sessionId, organization_id: organizationId },
    });

    if (!session) {
      throw new NotFoundError(`Counseling session '${sessionId}' not found in organization`);
    }

    if (session.status !== CounselingSessionStatus.SCHEDULED) {
      throw new ValidationError(
        `Cannot update a counseling session in '${session.status}' status. Only SCHEDULED sessions can be edited.`
      );
    }

    const startedAt = input.started_at ? new Date(input.started_at) : session.started_at;
    const endedAt = input.ended_at ? new Date(input.ended_at) : session.ended_at;

    if (startedAt && endedAt && endedAt < startedAt) {
      throw new ValidationError('ended_at cannot precede started_at');
    }

    const updated = await prisma.counselingSession.update({
      where: { id: sessionId },
      data: {
        ...(input.session_type !== undefined ? { session_type: input.session_type } : {}),
        ...(input.scheduled_at !== undefined ? { scheduled_at: new Date(input.scheduled_at) } : {}),
        ...(input.started_at !== undefined ? { started_at: startedAt } : {}),
        ...(input.ended_at !== undefined ? { ended_at: endedAt } : {}),
        ...(input.session_notes !== undefined ? { session_notes: input.session_notes } : {}),
        ...(input.outcome !== undefined ? { outcome: input.outcome } : {}),
      },
      include: {
        student: { select: { id: true, first_name: true, last_name: true } },
        responsible_mentor: { select: { id: true, first_name: true, last_name: true } },
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'counseling_session:update',
      entityType: 'counseling_session',
      entityId: sessionId,
      details: {
        updated: input,
      },
    });

    return updated;
  }

  /**
   * Transition Counseling Session Lifecycle State Machine
   * SCHEDULED -> COMPLETED / MISSED / CANCELLED
   */
  public async updateSessionStatus(
    organizationId: string,
    sessionId: string,
    input: UpdateCounselingSessionStatusInput,
    actorUserId?: string
  ) {
    const session = await prisma.counselingSession.findFirst({
      where: { id: sessionId, organization_id: organizationId },
    });

    if (!session) {
      throw new NotFoundError(`Counseling session '${sessionId}' not found in organization`);
    }

    const currentStatus = session.status;
    const targetStatus = input.status;

    if (currentStatus !== CounselingSessionStatus.SCHEDULED) {
      throw new ValidationError(
        `Cannot modify a finalized counseling session currently in '${currentStatus}' status`
      );
    }

    let startedAt = input.started_at ? new Date(input.started_at) : session.started_at;
    let endedAt = input.ended_at ? new Date(input.ended_at) : session.ended_at;

    if (targetStatus === CounselingSessionStatus.COMPLETED) {
      // Completed sessions require started_at and ended_at
      if (!startedAt || !endedAt) {
        throw new ValidationError(
          'Completed counseling sessions require valid started_at and ended_at timestamps'
        );
      }
      if (endedAt < startedAt) {
        throw new ValidationError('ended_at cannot precede started_at');
      }
    }

    const updated = await prisma.counselingSession.update({
      where: { id: sessionId },
      data: {
        status: targetStatus,
        started_at: startedAt,
        ended_at: endedAt,
        ...(input.session_notes !== undefined ? { session_notes: input.session_notes } : {}),
        ...(input.outcome !== undefined ? { outcome: input.outcome } : {}),
      },
      include: {
        student: { select: { id: true, first_name: true, last_name: true } },
        responsible_mentor: { select: { id: true, first_name: true, last_name: true } },
      },
    });

    // Notify mentor of status change
    await notificationService.createNotification({
      organizationId,
      recipientUserId: session.responsible_mentor_id,
      notificationType: NotificationType.MENTOR_ALERT,
      title: `Counseling Session ${targetStatus}`,
      message: `Counseling session for student ${updated.student.first_name} ${updated.student.last_name} was marked ${targetStatus}.`,
    });

    // Audit log
    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'counseling_session:status_change',
      entityType: 'counseling_session',
      entityId: sessionId,
      details: {
        previous_status: currentStatus,
        new_status: targetStatus,
        started_at: startedAt,
        ended_at: endedAt,
        outcome: input.outcome,
      },
    });

    return updated;
  }

  /**
   * List Counseling Sessions with filtering and pagination
   */
  public async listSessions(
    organizationId: string,
    query: ListCounselingSessionsQuery
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CounselingSessionWhereInput = {
      organization_id: organizationId,
      ...(query.intervention_id ? { intervention_id: query.intervention_id } : {}),
      ...(query.student_id ? { student_id: query.student_id } : {}),
      ...(query.responsible_mentor_id ? { responsible_mentor_id: query.responsible_mentor_id } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.session_type ? { session_type: query.session_type } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.counselingSession.count({ where }),
      prisma.counselingSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduled_at: 'desc' },
        include: {
          student: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          responsible_mentor: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          intervention: {
            select: { id: true, title: true, priority: true, status: true },
          },
          _count: {
            select: {
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

export const counselingSessionService = new CounselingSessionService();
