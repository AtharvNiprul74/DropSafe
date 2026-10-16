import { prisma } from '../../config/database';
import { NotFoundError, ConflictError, ValidationError } from '../../core/errors/AppError';
import { recordAuditLog } from '../../middlewares/governanceLog';
import {
  CreateStudentInput,
  UpdateStudentInput,
  CreateIdentifierInput,
  UpdateIdentifierInput,
  CreateEnrollmentInput,
  RecordAttendanceInput,
  UpdateAttendanceInput,
  RecordAssessmentInput,
  UpdateAssessmentInput,
} from './student.validation';
import {
  StudentStatus,
  IdentifierStatus,
  EnrollmentStatus,
  PeriodStatus,
  Prisma,
} from '@prisma/client';

export class StudentService {
  // ==========================================
  // 1. STUDENT IDENTITY
  // ==========================================

  async createStudent(organizationId: string, input: CreateStudentInput, actorUserId?: string) {
    // If an initial identifier was provided, verify tenant-uniqueness first
    if (input.identifier) {
      const existingIdentifier = await prisma.studentIdentifier.findUnique({
        where: {
          organization_id_identifier_type_identifier_value: {
            organization_id: organizationId,
            identifier_type: input.identifier.identifier_type,
            identifier_value: input.identifier.identifier_value,
          },
        },
      });

      if (existingIdentifier) {
        throw new ConflictError(
          `Identifier '${input.identifier.identifier_type}: ${input.identifier.identifier_value}' is already registered in this organization`
        );
      }
    }

    // Create student (decoupled from enrollments / academic performance)
    const student = await prisma.student.create({
      data: {
        organization_id: organizationId,
        first_name: input.first_name,
        last_name: input.last_name,
        date_of_birth: input.date_of_birth,
        gender: input.gender,
        email: input.email ? input.email.toLowerCase() : null,
        phone: input.phone,
        status: input.status,
        ...(input.identifier
          ? {
              identifiers: {
                create: {
                  organization_id: organizationId,
                  identifier_type: input.identifier.identifier_type,
                  identifier_value: input.identifier.identifier_value,
                  is_primary: input.identifier.is_primary ?? true,
                },
              },
            }
          : {}),
      },
      include: {
        identifiers: true,
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'STUDENT_CREATED',
      entityType: 'student',
      entityId: student.id,
      details: {
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        identifiers: student.identifiers.map((i) => `${i.identifier_type}:${i.identifier_value}`),
      },
    });

    return student;
  }

  async listStudents(
    organizationId: string,
    filters?: {
      search?: string;
      status?: StudentStatus;
      periodId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.StudentWhereInput = {
      organization_id: organizationId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.periodId
        ? {
            enrollments: {
              some: {
                academic_period_id: filters.periodId,
              },
            },
          }
        : {}),
      ...(filters?.search
        ? {
            OR: [
              { first_name: { contains: filters.search, mode: 'insensitive' } },
              { last_name: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
              { phone: { contains: filters.search, mode: 'insensitive' } },
              {
                identifiers: {
                  some: {
                    identifier_value: { contains: filters.search, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          identifiers: {
            where: { is_primary: true },
            take: 1,
          },
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
      }),
    ]);

    return {
      items: students.map((s) => ({
        ...s,
        primary_identifier: s.identifiers[0] || null,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStudentById(organizationId: string, id: string) {
    const student = await prisma.student.findFirst({
      where: { id, organization_id: organizationId },
      include: {
        identifiers: {
          orderBy: [{ is_primary: 'desc' }, { created_at: 'desc' }],
        },
        enrollments: {
          orderBy: { enrollment_date: 'desc' },
          include: {
            academic_period: {
              include: {
                learning_level: {
                  include: { learning_program: true },
                },
              },
            },
            academic_record: {
              include: {
                attendance_records: {
                  include: { learning_component: true },
                },
                assessment_records: {
                  include: { learning_component: true },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${id}' not found`);
    }

    return student;
  }

  async updateStudent(organizationId: string, id: string, input: UpdateStudentInput, actorUserId?: string) {
    const student = await prisma.student.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${id}' not found`);
    }

    if (student.status === StudentStatus.ARCHIVED) {
      throw new ValidationError('Cannot update an ARCHIVED student record');
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...(input.first_name ? { first_name: input.first_name } : {}),
        ...(input.last_name ? { last_name: input.last_name } : {}),
        ...(input.date_of_birth !== undefined ? { date_of_birth: input.date_of_birth } : {}),
        ...(input.gender !== undefined ? { gender: input.gender } : {}),
        ...(input.email !== undefined ? { email: input.email ? input.email.toLowerCase() : null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
      },
      include: {
        identifiers: true,
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'STUDENT_UPDATED',
      entityType: 'student',
      entityId: id,
      details: { previous: { first_name: student.first_name, last_name: student.last_name }, updated: input },
    });

    return updated;
  }

  async updateStudentStatus(
    organizationId: string,
    id: string,
    targetStatus: StudentStatus,
    actorUserId?: string
  ) {
    const student = await prisma.student.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${id}' not found`);
    }

    if (student.status === targetStatus) {
      return student;
    }

    if (student.status === StudentStatus.ARCHIVED) {
      throw new ValidationError('Cannot transition out of ARCHIVED status. ARCHIVED is a terminal state.');
    }

    const updated = await prisma.student.update({
      where: { id },
      data: { status: targetStatus },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'STUDENT_STATUS_CHANGED',
      entityType: 'student',
      entityId: id,
      details: { previousStatus: student.status, newStatus: targetStatus },
    });

    return updated;
  }

  async deleteStudent(organizationId: string, id: string, actorUserId?: string) {
    const student = await prisma.student.findFirst({
      where: { id, organization_id: organizationId },
      include: {
        _count: { select: { enrollments: true } },
      },
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${id}' not found`);
    }

    if (student._count.enrollments > 0) {
      throw new ConflictError(
        'Cannot permanently delete student with active or historical enrollments. Set status to ARCHIVED instead.'
      );
    }

    await prisma.student.delete({
      where: { id },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'STUDENT_DELETED',
      entityType: 'student',
      entityId: id,
      details: { first_name: student.first_name, last_name: student.last_name },
    });

    return { id, message: 'Student profile deleted successfully' };
  }

  // ==========================================
  // 2. STUDENT IDENTIFIERS
  // ==========================================

  async addIdentifier(
    organizationId: string,
    studentId: string,
    input: CreateIdentifierInput,
    actorUserId?: string
  ) {
    // Verify student exists and belongs to organization
    const student = await prisma.student.findFirst({
      where: { id: studentId, organization_id: organizationId },
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${studentId}' not found in this organization`);
    }

    // Verify tenant-unique business key: [organization_id, identifier_type, identifier_value]
    const existing = await prisma.studentIdentifier.findUnique({
      where: {
        organization_id_identifier_type_identifier_value: {
          organization_id: organizationId,
          identifier_type: input.identifier_type,
          identifier_value: input.identifier_value,
        },
      },
    });

    if (existing) {
      throw new ConflictError(
        `Identifier '${input.identifier_type}: ${input.identifier_value}' is already assigned to a student in this organization`
      );
    }

    // If marked as primary, demote existing primary identifiers for this student
    if (input.is_primary) {
      await prisma.studentIdentifier.updateMany({
        where: { organization_id: organizationId, student_id: studentId, is_primary: true },
        data: { is_primary: false },
      });
    }

    const identifier = await prisma.studentIdentifier.create({
      data: {
        organization_id: organizationId,
        student_id: studentId,
        identifier_type: input.identifier_type,
        identifier_value: input.identifier_value,
        is_primary: input.is_primary ?? false,
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'STUDENT_IDENTIFIER_CREATED',
      entityType: 'student_identifier',
      entityId: identifier.id,
      details: {
        studentId,
        identifier_type: identifier.identifier_type,
        identifier_value: identifier.identifier_value,
        is_primary: identifier.is_primary,
      },
    });

    return identifier;
  }

  async listIdentifiers(organizationId: string, studentId: string) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, organization_id: organizationId },
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${studentId}' not found`);
    }

    return prisma.studentIdentifier.findMany({
      where: { organization_id: organizationId, student_id: studentId },
      orderBy: [{ is_primary: 'desc' }, { created_at: 'desc' }],
    });
  }

  async updateIdentifier(
    organizationId: string,
    studentId: string,
    identifierId: string,
    input: UpdateIdentifierInput,
    actorUserId?: string
  ) {
    const identifier = await prisma.studentIdentifier.findFirst({
      where: { id: identifierId, student_id: studentId, organization_id: organizationId },
    });

    if (!identifier) {
      throw new NotFoundError(`Identifier with ID '${identifierId}' not found for this student`);
    }

    // Check unique key if value changed
    if (input.identifier_value && input.identifier_value !== identifier.identifier_value) {
      const conflict = await prisma.studentIdentifier.findUnique({
        where: {
          organization_id_identifier_type_identifier_value: {
            organization_id: organizationId,
            identifier_type: identifier.identifier_type,
            identifier_value: input.identifier_value,
          },
        },
      });

      if (conflict && conflict.id !== identifierId) {
        throw new ConflictError(
          `Identifier '${identifier.identifier_type}: ${input.identifier_value}' already exists in this organization`
        );
      }
    }

    // Demote existing primary if setting this as primary
    if (input.is_primary && !identifier.is_primary) {
      await prisma.studentIdentifier.updateMany({
        where: { organization_id: organizationId, student_id: studentId, is_primary: true },
        data: { is_primary: false },
      });
    }

    const updated = await prisma.studentIdentifier.update({
      where: { id: identifierId },
      data: {
        ...(input.identifier_value ? { identifier_value: input.identifier_value } : {}),
        ...(input.is_primary !== undefined ? { is_primary: input.is_primary } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'STUDENT_IDENTIFIER_UPDATED',
      entityType: 'student_identifier',
      entityId: identifierId,
      details: { previous: identifier, updated },
    });

    return updated;
  }

  async deleteIdentifier(
    organizationId: string,
    studentId: string,
    identifierId: string,
    actorUserId?: string
  ) {
    const identifier = await prisma.studentIdentifier.findFirst({
      where: { id: identifierId, student_id: studentId, organization_id: organizationId },
    });

    if (!identifier) {
      throw new NotFoundError(`Identifier with ID '${identifierId}' not found for this student`);
    }

    await prisma.studentIdentifier.delete({
      where: { id: identifierId },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'STUDENT_IDENTIFIER_DELETED',
      entityType: 'student_identifier',
      entityId: identifierId,
      details: {
        identifier_type: identifier.identifier_type,
        identifier_value: identifier.identifier_value,
      },
    });

    return { id: identifierId, message: 'Identifier removed successfully' };
  }

  async lookupStudentByIdentifier(organizationId: string, identifierType: string, identifierValue: string) {
    const identifier = await prisma.studentIdentifier.findUnique({
      where: {
        organization_id_identifier_type_identifier_value: {
          organization_id: organizationId,
          identifier_type: identifierType,
          identifier_value: identifierValue,
        },
      },
      include: {
        student: {
          include: {
            identifiers: true,
            enrollments: {
              where: { status: EnrollmentStatus.ACTIVE },
              include: {
                academic_period: {
                  include: {
                    learning_level: {
                      include: { learning_program: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!identifier) {
      throw new NotFoundError(
        `No student found with identifier '${identifierType}: ${identifierValue}' in this organization`
      );
    }

    return identifier.student;
  }

  // ==========================================
  // 3. ENROLLMENTS ENGINE
  // ==========================================

  async createEnrollment(organizationId: string, input: CreateEnrollmentInput, actorUserId?: string) {
    // Verify student exists and belongs to active tenant
    const student = await prisma.student.findFirst({
      where: { id: input.student_id, organization_id: organizationId },
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${input.student_id}' not found in this organization`);
    }

    if (student.status === StudentStatus.ARCHIVED) {
      throw new ValidationError('Cannot enroll an ARCHIVED student');
    }

    // Verify academic period exists and belongs to active tenant
    const period = await prisma.academicPeriod.findFirst({
      where: { id: input.academic_period_id, organization_id: organizationId },
      include: {
        learning_level: {
          include: { learning_program: true },
        },
      },
    });

    if (!period) {
      throw new NotFoundError(
        `Academic period with ID '${input.academic_period_id}' not found in this organization`
      );
    }

    if (period.status === PeriodStatus.ARCHIVED) {
      throw new ValidationError('Cannot enroll student into an ARCHIVED academic period');
    }

    // Check unique constraint: [organization_id, student_id, academic_period_id]
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        organization_id_student_id_academic_period_id: {
          organization_id: organizationId,
          student_id: input.student_id,
          academic_period_id: input.academic_period_id,
        },
      },
    });

    if (existingEnrollment) {
      throw new ConflictError(
        `Student '${student.first_name} ${student.last_name}' is already enrolled in academic period '${period.name}'`
      );
    }

    // Create Enrollment AND atomically provision its linked AcademicRecord!
    const enrollment = await prisma.enrollment.create({
      data: {
        organization_id: organizationId,
        student_id: input.student_id,
        academic_period_id: input.academic_period_id,
        status: input.status ?? EnrollmentStatus.ACTIVE,
        enrollment_date: input.enrollment_date ?? new Date(),
        academic_record: {
          create: {
            organization_id: organizationId,
          },
        },
      },
      include: {
        student: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        academic_period: {
          include: {
            learning_level: {
              include: {
                learning_program: { select: { id: true, name: true, program_code: true } },
              },
            },
          },
        },
        academic_record: true,
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'ENROLLMENT_CREATED',
      entityType: 'enrollment',
      entityId: enrollment.id,
      details: {
        student_id: input.student_id,
        academic_period_id: input.academic_period_id,
        academic_record_id: enrollment.academic_record?.id,
        status: enrollment.status,
      },
    });

    return enrollment;
  }

  async listEnrollments(
    organizationId: string,
    filters?: {
      studentId?: string;
      periodId?: string;
      status?: EnrollmentStatus;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.EnrollmentWhereInput = {
      organization_id: organizationId,
      ...(filters?.studentId ? { student_id: filters.studentId } : {}),
      ...(filters?.periodId ? { academic_period_id: filters.periodId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    };

    const [total, enrollments] = await Promise.all([
      prisma.enrollment.count({ where }),
      prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { enrollment_date: 'desc' },
        include: {
          student: {
            include: {
              identifiers: { where: { is_primary: true }, take: 1 },
            },
          },
          academic_period: {
            include: {
              learning_level: {
                include: {
                  learning_program: { select: { id: true, name: true, program_code: true } },
                },
              },
            },
          },
          academic_record: {
            select: { id: true },
          },
        },
      }),
    ]);

    return {
      items: enrollments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEnrollmentById(organizationId: string, enrollmentId: string) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, organization_id: organizationId },
      include: {
        student: {
          include: { identifiers: true },
        },
        academic_period: {
          include: {
            learning_components: true,
            learning_level: {
              include: { learning_program: true },
            },
          },
        },
        academic_record: {
          include: {
            attendance_records: {
              include: { learning_component: true },
            },
            assessment_records: {
              include: { learning_component: true },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundError(`Enrollment with ID '${enrollmentId}' not found`);
    }

    return enrollment;
  }

  async updateEnrollmentStatus(
    organizationId: string,
    enrollmentId: string,
    targetStatus: EnrollmentStatus,
    actorUserId?: string
  ) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, organization_id: organizationId },
    });

    if (!enrollment) {
      throw new NotFoundError(`Enrollment with ID '${enrollmentId}' not found`);
    }

    if (enrollment.status === targetStatus) {
      return enrollment;
    }

    // State machine:
    // ACTIVE -> COMPLETED / WITHDRAWN / TRANSFERRED / ARCHIVED
    // COMPLETED / WITHDRAWN / TRANSFERRED -> ARCHIVED
    // ARCHIVED is terminal
    const current = enrollment.status;
    let isValid = false;

    if (current === EnrollmentStatus.ACTIVE) {
      isValid =
        targetStatus === EnrollmentStatus.COMPLETED ||
        targetStatus === EnrollmentStatus.WITHDRAWN ||
        targetStatus === EnrollmentStatus.TRANSFERRED ||
        targetStatus === EnrollmentStatus.ARCHIVED;
    } else if (
      current === EnrollmentStatus.COMPLETED ||
      current === EnrollmentStatus.WITHDRAWN ||
      current === EnrollmentStatus.TRANSFERRED
    ) {
      isValid = targetStatus === EnrollmentStatus.ARCHIVED;
    } else if (current === EnrollmentStatus.ARCHIVED) {
      isValid = false;
    }

    if (!isValid) {
      throw new ValidationError(
        `Invalid enrollment status transition from '${current}' to '${targetStatus}'. Allowed flow: ACTIVE -> COMPLETED / WITHDRAWN / TRANSFERRED -> ARCHIVED.`
      );
    }

    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: targetStatus },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'ENROLLMENT_STATUS_CHANGED',
      entityType: 'enrollment',
      entityId: enrollmentId,
      details: { previousStatus: current, newStatus: targetStatus },
    });

    return updated;
  }

  // ==========================================
  // 4. ACADEMIC RECORDS & PERFORMANCE
  // ==========================================

  async getAcademicRecord(organizationId: string, academicRecordId: string) {
    const record = await prisma.academicRecord.findFirst({
      where: { id: academicRecordId, organization_id: organizationId },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                identifiers: { where: { is_primary: true } },
              },
            },
            academic_period: {
              include: {
                learning_components: true,
                learning_level: {
                  include: { learning_program: true },
                },
              },
            },
          },
        },
        attendance_records: {
          include: { learning_component: true },
        },
        assessment_records: {
          include: { learning_component: true },
        },
      },
    });

    if (!record) {
      throw new NotFoundError(`Academic record with ID '${academicRecordId}' not found`);
    }

    // Format and calculate analytical metrics
    const attendanceItems = record.attendance_records.map((att) => ({
      id: att.id,
      component_id: att.learning_component_id,
      component_code: att.learning_component.component_code,
      component_name: att.learning_component.name,
      attended_sessions: att.attended_sessions,
      total_sessions: att.total_sessions,
      attendance_percentage:
        att.total_sessions > 0
          ? Number(((att.attended_sessions / att.total_sessions) * 100).toFixed(2))
          : 0,
    }));

    const totalAttended = attendanceItems.reduce((acc, curr) => acc + curr.attended_sessions, 0);
    const totalScheduled = attendanceItems.reduce((acc, curr) => acc + curr.total_sessions, 0);
    const overallAttendancePercentage =
      totalScheduled > 0 ? Number(((totalAttended / totalScheduled) * 100).toFixed(2)) : 0;

    const assessmentItems = record.assessment_records.map((ass) => {
      const obtained = Number(ass.obtained_marks);
      const maximum = Number(ass.maximum_marks);
      const passing = Number(ass.learning_component.passing_marks);
      const percentage = maximum > 0 ? Number(((obtained / maximum) * 100).toFixed(2)) : 0;
      const outcome = ass.grading_outcome || (obtained >= passing ? 'PASS' : 'FAIL');

      return {
        id: ass.id,
        component_id: ass.learning_component_id,
        component_code: ass.learning_component.component_code,
        component_name: ass.learning_component.name,
        obtained_marks: obtained,
        maximum_marks: maximum,
        passing_marks: passing,
        score_percentage: percentage,
        grading_outcome: outcome,
      };
    });

    const totalObtained = assessmentItems.reduce((acc, curr) => acc + curr.obtained_marks, 0);
    const totalMaximum = assessmentItems.reduce((acc, curr) => acc + curr.maximum_marks, 0);
    const overallScorePercentage =
      totalMaximum > 0 ? Number(((totalObtained / totalMaximum) * 100).toFixed(2)) : 0;

    return {
      id: record.id,
      organization_id: record.organization_id,
      enrollment: {
        id: record.enrollment.id,
        status: record.enrollment.status,
        enrollment_date: record.enrollment.enrollment_date,
        student: {
          id: record.enrollment.student.id,
          name: `${record.enrollment.student.first_name} ${record.enrollment.student.last_name}`,
          email: record.enrollment.student.email,
          primary_identifier: record.enrollment.student.identifiers[0]?.identifier_value || null,
        },
        academic_period: {
          id: record.enrollment.academic_period.id,
          name: record.enrollment.academic_period.name,
          period_code: record.enrollment.academic_period.period_code,
          program_name: record.enrollment.academic_period.learning_level.learning_program.name,
          level_name: record.enrollment.academic_period.learning_level.name,
        },
      },
      summary: {
        overall_attendance_percentage: overallAttendancePercentage,
        total_attended_sessions: totalAttended,
        total_scheduled_sessions: totalScheduled,
        overall_score_percentage: overallScorePercentage,
        total_obtained_marks: totalObtained,
        total_maximum_marks: totalMaximum,
      },
      attendance_records: attendanceItems,
      assessment_records: assessmentItems,
    };
  }

  // ==========================================
  // 5. ATTENDANCE RECORDS
  // ==========================================

  async recordAttendance(
    organizationId: string,
    academicRecordId: string,
    input: RecordAttendanceInput,
    actorUserId?: string
  ) {
    // Domain rule: attended_sessions <= total_sessions
    if (input.attended_sessions > input.total_sessions) {
      throw new ValidationError(
        `Domain constraint violated: attended_sessions (${input.attended_sessions}) cannot exceed total_sessions (${input.total_sessions})`
      );
    }

    // Verify academic record exists and retrieve its linked enrollment
    const academicRecord = await prisma.academicRecord.findFirst({
      where: { id: academicRecordId, organization_id: organizationId },
      include: {
        enrollment: true,
      },
    });

    if (!academicRecord) {
      throw new NotFoundError(`Academic record with ID '${academicRecordId}' not found`);
    }

    // Verify component exists and belongs to active tenant
    const component = await prisma.learningComponent.findFirst({
      where: { id: input.learning_component_id, organization_id: organizationId },
    });

    if (!component) {
      throw new NotFoundError(
        `Learning component with ID '${input.learning_component_id}' not found in this organization`
      );
    }

    // RELATIONAL INTEGRITY CHECK: component must belong to the academic period of the enrollment!
    if (component.academic_period_id !== academicRecord.enrollment.academic_period_id) {
      throw new ValidationError(
        `Component '${component.name}' (${component.component_code}) does not belong to the enrolled academic period of this record`
      );
    }

    // Upsert attendance record: [organization_id, academic_record_id, learning_component_id]
    const attendance = await prisma.attendanceRecord.upsert({
      where: {
        organization_id_academic_record_id_learning_component_id: {
          organization_id: organizationId,
          academic_record_id: academicRecordId,
          learning_component_id: input.learning_component_id,
        },
      },
      update: {
        attended_sessions: input.attended_sessions,
        total_sessions: input.total_sessions,
      },
      create: {
        organization_id: organizationId,
        academic_record_id: academicRecordId,
        learning_component_id: input.learning_component_id,
        attended_sessions: input.attended_sessions,
        total_sessions: input.total_sessions,
      },
      include: {
        learning_component: {
          select: { id: true, component_code: true, name: true },
        },
      },
    });

    const percentage =
      attendance.total_sessions > 0
        ? Number(((attendance.attended_sessions / attendance.total_sessions) * 100).toFixed(2))
        : 0;

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'ATTENDANCE_RECORDED',
      entityType: 'attendance_record',
      entityId: attendance.id,
      details: {
        academic_record_id: academicRecordId,
        component_code: attendance.learning_component.component_code,
        attended_sessions: attendance.attended_sessions,
        total_sessions: attendance.total_sessions,
        attendance_percentage: percentage,
      },
    });

    return {
      ...attendance,
      attendance_percentage: percentage,
    };
  }

  async updateAttendance(
    organizationId: string,
    attendanceId: string,
    input: UpdateAttendanceInput,
    actorUserId?: string
  ) {
    const attendance = await prisma.attendanceRecord.findFirst({
      where: { id: attendanceId, organization_id: organizationId },
    });

    if (!attendance) {
      throw new NotFoundError(`Attendance record with ID '${attendanceId}' not found`);
    }

    const effectiveAttended =
      input.attended_sessions !== undefined ? input.attended_sessions : attendance.attended_sessions;
    const effectiveTotal =
      input.total_sessions !== undefined ? input.total_sessions : attendance.total_sessions;

    if (effectiveAttended > effectiveTotal) {
      throw new ValidationError(
        `Domain constraint violated: attended_sessions (${effectiveAttended}) cannot exceed total_sessions (${effectiveTotal})`
      );
    }

    const updated = await prisma.attendanceRecord.update({
      where: { id: attendanceId },
      data: {
        ...(input.attended_sessions !== undefined ? { attended_sessions: input.attended_sessions } : {}),
        ...(input.total_sessions !== undefined ? { total_sessions: input.total_sessions } : {}),
      },
      include: {
        learning_component: {
          select: { id: true, component_code: true, name: true },
        },
      },
    });

    const percentage =
      updated.total_sessions > 0
        ? Number(((updated.attended_sessions / updated.total_sessions) * 100).toFixed(2))
        : 0;

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'ATTENDANCE_UPDATED',
      entityType: 'attendance_record',
      entityId: attendanceId,
      details: {
        attended_sessions: updated.attended_sessions,
        total_sessions: updated.total_sessions,
        attendance_percentage: percentage,
      },
    });

    return {
      ...updated,
      attendance_percentage: percentage,
    };
  }

  // ==========================================
  // 6. ASSESSMENT RECORDS
  // ==========================================

  async recordAssessment(
    organizationId: string,
    academicRecordId: string,
    input: RecordAssessmentInput,
    actorUserId?: string
  ) {
    // Domain rule: obtained_marks <= maximum_marks
    if (input.obtained_marks > input.maximum_marks) {
      throw new ValidationError(
        `Domain constraint violated: obtained_marks (${input.obtained_marks}) cannot exceed maximum_marks (${input.maximum_marks})`
      );
    }

    // Verify academic record exists and retrieve its linked enrollment
    const academicRecord = await prisma.academicRecord.findFirst({
      where: { id: academicRecordId, organization_id: organizationId },
      include: {
        enrollment: true,
      },
    });

    if (!academicRecord) {
      throw new NotFoundError(`Academic record with ID '${academicRecordId}' not found`);
    }

    // Verify component exists and belongs to active tenant
    const component = await prisma.learningComponent.findFirst({
      where: { id: input.learning_component_id, organization_id: organizationId },
    });

    if (!component) {
      throw new NotFoundError(
        `Learning component with ID '${input.learning_component_id}' not found in this organization`
      );
    }

    // RELATIONAL INTEGRITY CHECK: component must belong to the academic period of the enrollment!
    if (component.academic_period_id !== academicRecord.enrollment.academic_period_id) {
      throw new ValidationError(
        `Component '${component.name}' (${component.component_code}) does not belong to the enrolled academic period of this record`
      );
    }

    // Automated outcome derivation if not provided: compare with component.passing_marks
    const passingMarks = Number(component.passing_marks);
    const gradingOutcome =
      input.grading_outcome || (input.obtained_marks >= passingMarks ? 'PASS' : 'FAIL');

    // Upsert assessment record: [organization_id, academic_record_id, learning_component_id]
    const assessment = await prisma.assessmentRecord.upsert({
      where: {
        organization_id_academic_record_id_learning_component_id: {
          organization_id: organizationId,
          academic_record_id: academicRecordId,
          learning_component_id: input.learning_component_id,
        },
      },
      update: {
        obtained_marks: input.obtained_marks,
        maximum_marks: input.maximum_marks,
        grading_outcome: gradingOutcome,
      },
      create: {
        organization_id: organizationId,
        academic_record_id: academicRecordId,
        learning_component_id: input.learning_component_id,
        obtained_marks: input.obtained_marks,
        maximum_marks: input.maximum_marks,
        grading_outcome: gradingOutcome,
      },
      include: {
        learning_component: {
          select: { id: true, component_code: true, name: true, passing_marks: true },
        },
      },
    });

    const obtainedNum = Number(assessment.obtained_marks);
    const maxNum = Number(assessment.maximum_marks);
    const scorePercentage = maxNum > 0 ? Number(((obtainedNum / maxNum) * 100).toFixed(2)) : 0;

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'ASSESSMENT_RECORDED',
      entityType: 'assessment_record',
      entityId: assessment.id,
      details: {
        academic_record_id: academicRecordId,
        component_code: assessment.learning_component.component_code,
        obtained_marks: obtainedNum,
        maximum_marks: maxNum,
        score_percentage: scorePercentage,
        grading_outcome: assessment.grading_outcome,
      },
    });

    return {
      ...assessment,
      obtained_marks: obtainedNum,
      maximum_marks: maxNum,
      score_percentage: scorePercentage,
    };
  }

  async updateAssessment(
    organizationId: string,
    assessmentId: string,
    input: UpdateAssessmentInput,
    actorUserId?: string
  ) {
    const assessment = await prisma.assessmentRecord.findFirst({
      where: { id: assessmentId, organization_id: organizationId },
      include: {
        learning_component: true,
      },
    });

    if (!assessment) {
      throw new NotFoundError(`Assessment record with ID '${assessmentId}' not found`);
    }

    const effectiveObtained =
      input.obtained_marks !== undefined ? input.obtained_marks : Number(assessment.obtained_marks);
    const effectiveMaximum =
      input.maximum_marks !== undefined ? input.maximum_marks : Number(assessment.maximum_marks);

    if (effectiveObtained > effectiveMaximum) {
      throw new ValidationError(
        `Domain constraint violated: obtained_marks (${effectiveObtained}) cannot exceed maximum_marks (${effectiveMaximum})`
      );
    }

    let effectiveOutcome = input.grading_outcome !== undefined ? input.grading_outcome : assessment.grading_outcome;
    if (effectiveOutcome === null || effectiveOutcome === undefined) {
      const passMarks = Number(assessment.learning_component.passing_marks);
      effectiveOutcome = effectiveObtained >= passMarks ? 'PASS' : 'FAIL';
    }

    const updated = await prisma.assessmentRecord.update({
      where: { id: assessmentId },
      data: {
        ...(input.obtained_marks !== undefined ? { obtained_marks: input.obtained_marks } : {}),
        ...(input.maximum_marks !== undefined ? { maximum_marks: input.maximum_marks } : {}),
        grading_outcome: effectiveOutcome,
      },
      include: {
        learning_component: {
          select: { id: true, component_code: true, name: true, passing_marks: true },
        },
      },
    });

    const obtainedNum = Number(updated.obtained_marks);
    const maxNum = Number(updated.maximum_marks);
    const scorePercentage = maxNum > 0 ? Number(((obtainedNum / maxNum) * 100).toFixed(2)) : 0;

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'ASSESSMENT_UPDATED',
      entityType: 'assessment_record',
      entityId: assessmentId,
      details: {
        obtained_marks: obtainedNum,
        maximum_marks: maxNum,
        score_percentage: scorePercentage,
        grading_outcome: updated.grading_outcome,
      },
    });

    return {
      ...updated,
      obtained_marks: obtainedNum,
      maximum_marks: maxNum,
      score_percentage: scorePercentage,
    };
  }
}

export const studentService = new StudentService();
