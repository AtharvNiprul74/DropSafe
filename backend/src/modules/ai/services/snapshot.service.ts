import { prisma } from '../../../config/database';
import {
  SnapshotStatus,
  Prisma,
} from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../core/errors/AppError';
import {
  GenerateSnapshotInput,
  ListSnapshotsQuery,
} from '../validators/ai.validation';

export class SnapshotService {
  /**
   * Generate an immutable student snapshot for a specific enrollment
   */
  public async generateSnapshotForEnrollment(
    organizationId: string,
    enrollmentId: string,
    importSessionId?: string
  ) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, organization_id: organizationId },
      include: {
        student: true,
        academic_period: true,
        academic_record: {
          include: {
            attendance_records: true,
            assessment_records: {
              include: { learning_component: true },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundError(`Enrollment '${enrollmentId}' not found in organization`);
    }

    // 1. Calculate Attendance Percentage
    let attendancePercentage: number | null = null;
    const attRecords = enrollment.academic_record?.attendance_records || [];
    if (attRecords.length > 0) {
      const totalAttended = attRecords.reduce((sum, r) => sum + r.attended_sessions, 0);
      const totalPossible = attRecords.reduce((sum, r) => sum + r.total_sessions, 0);
      if (totalPossible > 0) {
        attendancePercentage = Math.round((totalAttended / totalPossible) * 10000) / 100;
      }
    }

    // 2. Calculate Overall Marks Percentage & Failed Components
    let overallMarksPercentage: number | null = null;
    let failedComponentsCount = 0;
    const assessRecords = enrollment.academic_record?.assessment_records || [];
    if (assessRecords.length > 0) {
      let totalObtained = 0;
      let totalMax = 0;

      for (const r of assessRecords) {
        const obtained = Number(r.obtained_marks);
        const max = Number(r.maximum_marks);
        totalObtained += obtained;
        totalMax += max;

        // Check fail outcome
        if (r.grading_outcome === 'FAIL') {
          failedComponentsCount++;
        } else if (!r.grading_outcome && r.learning_component) {
          if (obtained < Number(r.learning_component.passing_marks)) {
            failedComponentsCount++;
          }
        }
      }

      if (totalMax > 0) {
        overallMarksPercentage = Math.round((totalObtained / totalMax) * 10000) / 100;
      }
    }

    // 3. Compute Behaviour & Engagement Scores from Student Chatbot Activity
    const conversations = await prisma.chatbotConversation.findMany({
      where: {
        organization_id: organizationId,
        student_id: enrollment.student_id,
      },
      include: {
        _count: { select: { messages: true } },
      },
    });

    const totalMessages = conversations.reduce((sum, c) => sum + c._count.messages, 0);
    // Baseline engagement based on interaction volume and attendance
    const engagementScore = Math.min(
      100,
      Math.max(
        10,
        Math.round(((attendancePercentage ?? 70) * 0.7 + Math.min(30, totalMessages * 5)) * 100) / 100
      )
    );

    const behaviourScore = Math.min(
      100,
      Math.max(
        20,
        Math.round(((overallMarksPercentage ?? 70) * 0.5 + (attendancePercentage ?? 70) * 0.5) * 100) / 100
      )
    );

    const sentimentScore = 70.0; // Baseline neutral-to-positive sentiment placeholder

    // 4. Lifecycle transition: Mark previous GENERATED / PREDICTED snapshots as SUPERSEDED
    await prisma.studentSnapshot.updateMany({
      where: {
        organization_id: organizationId,
        enrollment_id: enrollmentId,
        status: { in: [SnapshotStatus.GENERATED, SnapshotStatus.PREDICTED] },
      },
      data: {
        status: SnapshotStatus.SUPERSEDED,
      },
    });

    // 5. Create new snapshot in GENERATED status
    return prisma.studentSnapshot.create({
      data: {
        organization_id: organizationId,
        student_id: enrollment.student_id,
        enrollment_id: enrollmentId,
        import_session_id: importSessionId || null,
        status: SnapshotStatus.GENERATED,
        attendance_percentage: attendancePercentage !== null ? new Prisma.Decimal(attendancePercentage) : null,
        overall_marks_percentage: overallMarksPercentage !== null ? new Prisma.Decimal(overallMarksPercentage) : null,
        failed_learning_components: failedComponentsCount,
        backlog_count: failedComponentsCount,
        behaviour_score: new Prisma.Decimal(behaviourScore),
        engagement_score: new Prisma.Decimal(engagementScore),
        sentiment_score: new Prisma.Decimal(sentimentScore),
        snapshot_generated_at: new Date(),
      },
      include: {
        student: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        enrollment: {
          select: { id: true, academic_period: { select: { id: true, period_code: true, name: true } } },
        },
      },
    });
  }

  /**
   * Dispatcher to generate snapshot(s) by enrollment, student, period, or import session
   */
  public async generateSnapshots(
    organizationId: string,
    input: GenerateSnapshotInput
  ) {
    if (input.enrollment_id) {
      const snapshot = await this.generateSnapshotForEnrollment(
        organizationId,
        input.enrollment_id,
        input.import_session_id
      );
      return [snapshot];
    }

    let enrollmentsToProcess: { id: string }[] = [];

    if (input.student_id) {
      enrollmentsToProcess = await prisma.enrollment.findMany({
        where: { organization_id: organizationId, student_id: input.student_id },
        select: { id: true },
      });
    } else if (input.academic_period_id) {
      enrollmentsToProcess = await prisma.enrollment.findMany({
        where: { organization_id: organizationId, academic_period_id: input.academic_period_id },
        select: { id: true },
      });
    } else {
      // Default: all active enrollments in organization
      enrollmentsToProcess = await prisma.enrollment.findMany({
        where: { organization_id: organizationId, status: 'ACTIVE' },
        select: { id: true },
        take: 100, // batch cap
      });
    }

    if (enrollmentsToProcess.length === 0) {
      throw new ValidationError('No enrollments found matching the criteria for snapshot generation');
    }

    const generatedSnapshots = [];
    for (const enr of enrollmentsToProcess) {
      const snap = await this.generateSnapshotForEnrollment(
        organizationId,
        enr.id,
        input.import_session_id
      );
      generatedSnapshots.push(snap);
    }

    return generatedSnapshots;
  }

  /**
   * List snapshots with pagination and filters
   */
  public async listSnapshots(organizationId: string, query: ListSnapshotsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StudentSnapshotWhereInput = {
      organization_id: organizationId,
      ...(query.student_id ? { student_id: query.student_id } : {}),
      ...(query.enrollment_id ? { enrollment_id: query.enrollment_id } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.studentSnapshot.count({ where }),
      prisma.studentSnapshot.findMany({
        where,
        skip,
        take: limit,
        orderBy: { snapshot_generated_at: 'desc' },
        include: {
          student: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          enrollment: {
            select: { id: true, academic_period: { select: { period_code: true, name: true } } },
          },
          prediction: true,
          behaviour_summary: true,
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
   * Get Snapshot by ID
   */
  public async getSnapshotById(organizationId: string, snapshotId: string) {
    const snapshot = await prisma.studentSnapshot.findFirst({
      where: { id: snapshotId, organization_id: organizationId },
      include: {
        student: {
          include: { identifiers: true },
        },
        enrollment: {
          include: { academic_period: true },
        },
        prediction: true,
        behaviour_summary: true,
        prediction_history: {
          orderBy: { recorded_at: 'desc' },
        },
      },
    });

    if (!snapshot) {
      throw new NotFoundError(`Student snapshot '${snapshotId}' not found in organization`);
    }

    return snapshot;
  }
}

export const snapshotService = new SnapshotService();
