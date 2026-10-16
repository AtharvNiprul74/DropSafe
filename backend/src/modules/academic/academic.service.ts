import { prisma } from '../../config/database';
import { NotFoundError, ConflictError, ValidationError } from '../../core/errors/AppError';
import { recordAuditLog } from '../../middlewares/governanceLog';
import {
  CreateProgramInput,
  UpdateProgramInput,
  CreateLevelInput,
  UpdateLevelInput,
  CreatePeriodInput,
  UpdatePeriodInput,
  CreateComponentInput,
  UpdateComponentInput,
} from './academic.validation';
import { ProgramStatus, LevelStatus, PeriodStatus, ComponentStatus, Prisma } from '@prisma/client';

export class AcademicService {
  // ==========================================
  // 1. LEARNING PROGRAMS
  // ==========================================

  async createProgram(organizationId: string, input: CreateProgramInput, actorUserId?: string) {
    // Check uniqueness of program_code within organization
    const existingCode = await prisma.learningProgram.findUnique({
      where: {
        organization_id_program_code: {
          organization_id: organizationId,
          program_code: input.program_code,
        },
      },
    });

    if (existingCode) {
      throw new ConflictError(`Program with code '${input.program_code}' already exists in this organization`);
    }

    // Check uniqueness of program name within organization
    const existingName = await prisma.learningProgram.findUnique({
      where: {
        organization_id_name: {
          organization_id: organizationId,
          name: input.name,
        },
      },
    });

    if (existingName) {
      throw new ConflictError(`Program with name '${input.name}' already exists in this organization`);
    }

    const program = await prisma.learningProgram.create({
      data: {
        organization_id: organizationId,
        program_code: input.program_code,
        name: input.name,
        description: input.description,
        status: input.status,
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'LEARNING_PROGRAM_CREATED',
      entityType: 'learning_program',
      entityId: program.id,
      details: { program_code: program.program_code, name: program.name, status: program.status },
    });

    return program;
  }

  async listPrograms(
    organizationId: string,
    filters?: { status?: ProgramStatus; search?: string; page?: number; limit?: number }
  ) {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.LearningProgramWhereInput = {
      organization_id: organizationId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { program_code: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, programs] = await Promise.all([
      prisma.learningProgram.count({ where }),
      prisma.learningProgram.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: {
              learning_levels: true,
            },
          },
        },
      }),
    ]);

    return {
      items: programs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProgramById(organizationId: string, id: string) {
    const program = await prisma.learningProgram.findFirst({
      where: {
        id,
        organization_id: organizationId,
      },
      include: {
        learning_levels: {
          orderBy: { level_number: 'asc' },
          include: {
            academic_periods: {
              orderBy: { start_date: 'asc' },
              include: {
                _count: {
                  select: {
                    learning_components: true,
                    enrollments: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!program) {
      throw new NotFoundError(`Learning program with ID '${id}' not found`);
    }

    return program;
  }

  async updateProgram(organizationId: string, id: string, input: UpdateProgramInput, actorUserId?: string) {
    const program = await prisma.learningProgram.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!program) {
      throw new NotFoundError(`Learning program with ID '${id}' not found`);
    }

    if (program.status === ProgramStatus.ARCHIVED) {
      throw new ValidationError('Cannot update an ARCHIVED learning program');
    }

    if (input.name && input.name !== program.name) {
      const existingName = await prisma.learningProgram.findUnique({
        where: {
          organization_id_name: {
            organization_id: organizationId,
            name: input.name,
          },
        },
      });
      if (existingName) {
        throw new ConflictError(`Program with name '${input.name}' already exists in this organization`);
      }
    }

    const updated = await prisma.learningProgram.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'LEARNING_PROGRAM_UPDATED',
      entityType: 'learning_program',
      entityId: id,
      details: { previous: { name: program.name }, updated: input },
    });

    return updated;
  }

  async updateProgramStatus(
    organizationId: string,
    id: string,
    targetStatus: ProgramStatus,
    actorUserId?: string
  ) {
    const program = await prisma.learningProgram.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!program) {
      throw new NotFoundError(`Learning program with ID '${id}' not found`);
    }

    if (program.status === targetStatus) {
      return program;
    }

    // State machine validation:
    // ACTIVE <-> INACTIVE -> ARCHIVED
    // ARCHIVED is terminal
    if (program.status === ProgramStatus.ARCHIVED) {
      throw new ValidationError('Cannot transition out of ARCHIVED status. ARCHIVED is a terminal state.');
    }

    const updated = await prisma.learningProgram.update({
      where: { id },
      data: { status: targetStatus },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'LEARNING_PROGRAM_STATUS_CHANGED',
      entityType: 'learning_program',
      entityId: id,
      details: { previousStatus: program.status, newStatus: targetStatus },
    });

    return updated;
  }

  async deleteProgram(organizationId: string, id: string, actorUserId?: string) {
    const program = await prisma.learningProgram.findFirst({
      where: { id, organization_id: organizationId },
      include: {
        learning_levels: {
          include: {
            academic_periods: {
              include: {
                _count: { select: { enrollments: true } },
              },
            },
          },
        },
      },
    });

    if (!program) {
      throw new NotFoundError(`Learning program with ID '${id}' not found`);
    }

    // Check if there are enrollments under any period of this program
    const hasEnrollments = program.learning_levels.some((level) =>
      level.academic_periods.some((p) => p._count.enrollments > 0)
    );

    if (hasEnrollments) {
      throw new ConflictError(
        'Cannot permanently delete learning program with active or historical student enrollments. Archive it instead.'
      );
    }

    await prisma.learningProgram.delete({
      where: { id },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'LEARNING_PROGRAM_DELETED',
      entityType: 'learning_program',
      entityId: id,
      details: { program_code: program.program_code, name: program.name },
    });

    return { id, message: 'Learning program deleted successfully' };
  }

  // ==========================================
  // 2. LEARNING LEVELS
  // ==========================================

  async createLevel(organizationId: string, input: CreateLevelInput, actorUserId?: string) {
    // Verify learning program exists and belongs to this organization
    const program = await prisma.learningProgram.findFirst({
      where: {
        id: input.learning_program_id,
        organization_id: organizationId,
      },
    });

    if (!program) {
      throw new NotFoundError(`Learning program with ID '${input.learning_program_id}' not found in this organization`);
    }

    if (program.status === ProgramStatus.ARCHIVED) {
      throw new ValidationError('Cannot create levels under an ARCHIVED learning program');
    }

    // Check uniqueness of level_number within the program
    const existingLevel = await prisma.learningLevel.findUnique({
      where: {
        organization_id_learning_program_id_level_number: {
          organization_id: organizationId,
          learning_program_id: input.learning_program_id,
          level_number: input.level_number,
        },
      },
    });

    if (existingLevel) {
      throw new ConflictError(
        `Level number ${input.level_number} already exists for program '${program.name}'`
      );
    }

    const level = await prisma.learningLevel.create({
      data: {
        organization_id: organizationId,
        learning_program_id: input.learning_program_id,
        level_number: input.level_number,
        name: input.name,
        status: input.status,
      },
      include: {
        learning_program: {
          select: { id: true, name: true, program_code: true },
        },
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'LEARNING_LEVEL_CREATED',
      entityType: 'learning_level',
      entityId: level.id,
      details: { level_number: level.level_number, name: level.name, program_id: level.learning_program_id },
    });

    return level;
  }

  async listLevels(organizationId: string, filters?: { programId?: string; status?: LevelStatus }) {
    return prisma.learningLevel.findMany({
      where: {
        organization_id: organizationId,
        ...(filters?.programId ? { learning_program_id: filters.programId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: {
        learning_program: {
          select: { id: true, name: true, program_code: true },
        },
        _count: {
          select: { academic_periods: true },
        },
      },
      orderBy: [{ learning_program: { name: 'asc' } }, { level_number: 'asc' }],
    });
  }

  async getLevelById(organizationId: string, id: string) {
    const level = await prisma.learningLevel.findFirst({
      where: { id, organization_id: organizationId },
      include: {
        learning_program: true,
        academic_periods: {
          orderBy: { start_date: 'asc' },
          include: {
            _count: {
              select: { learning_components: true, enrollments: true },
            },
          },
        },
      },
    });

    if (!level) {
      throw new NotFoundError(`Learning level with ID '${id}' not found`);
    }

    return level;
  }

  async updateLevel(organizationId: string, id: string, input: UpdateLevelInput, actorUserId?: string) {
    const level = await prisma.learningLevel.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!level) {
      throw new NotFoundError(`Learning level with ID '${id}' not found`);
    }

    if (level.status === LevelStatus.ARCHIVED) {
      throw new ValidationError('Cannot update an ARCHIVED learning level');
    }

    if (input.level_number && input.level_number !== level.level_number) {
      const conflict = await prisma.learningLevel.findUnique({
        where: {
          organization_id_learning_program_id_level_number: {
            organization_id: organizationId,
            learning_program_id: level.learning_program_id,
            level_number: input.level_number,
          },
        },
      });

      if (conflict) {
        throw new ConflictError(`Level number ${input.level_number} already exists in this program`);
      }
    }

    const updated = await prisma.learningLevel.update({
      where: { id },
      data: {
        ...(input.level_number !== undefined ? { level_number: input.level_number } : {}),
        ...(input.name ? { name: input.name } : {}),
      },
      include: {
        learning_program: { select: { id: true, name: true, program_code: true } },
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'LEARNING_LEVEL_UPDATED',
      entityType: 'learning_level',
      entityId: id,
      details: { updated },
    });

    return updated;
  }

  async updateLevelStatus(
    organizationId: string,
    id: string,
    targetStatus: LevelStatus,
    actorUserId?: string
  ) {
    const level = await prisma.learningLevel.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!level) {
      throw new NotFoundError(`Learning level with ID '${id}' not found`);
    }

    if (level.status === targetStatus) {
      return level;
    }

    if (level.status === LevelStatus.ARCHIVED) {
      throw new ValidationError('Cannot transition out of ARCHIVED status. ARCHIVED is a terminal state.');
    }

    const updated = await prisma.learningLevel.update({
      where: { id },
      data: { status: targetStatus },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'LEARNING_LEVEL_STATUS_CHANGED',
      entityType: 'learning_level',
      entityId: id,
      details: { previousStatus: level.status, newStatus: targetStatus },
    });

    return updated;
  }

  // ==========================================
  // 3. ACADEMIC PERIODS
  // ==========================================

  async createPeriod(organizationId: string, input: CreatePeriodInput, actorUserId?: string) {
    // Verify level exists and belongs to this organization
    const level = await prisma.learningLevel.findFirst({
      where: {
        id: input.learning_level_id,
        organization_id: organizationId,
      },
      include: { learning_program: true },
    });

    if (!level) {
      throw new NotFoundError(`Learning level with ID '${input.learning_level_id}' not found in this organization`);
    }

    if (level.status === LevelStatus.ARCHIVED || level.learning_program.status === ProgramStatus.ARCHIVED) {
      throw new ValidationError('Cannot create an academic period under an ARCHIVED level or program');
    }

    // Check unique period_code within level
    const existingPeriod = await prisma.academicPeriod.findUnique({
      where: {
        organization_id_learning_level_id_period_code: {
          organization_id: organizationId,
          learning_level_id: input.learning_level_id,
          period_code: input.period_code,
        },
      },
    });

    if (existingPeriod) {
      throw new ConflictError(
        `Academic period with code '${input.period_code}' already exists for level '${level.name}'`
      );
    }

    const period = await prisma.academicPeriod.create({
      data: {
        organization_id: organizationId,
        learning_level_id: input.learning_level_id,
        period_code: input.period_code,
        name: input.name,
        start_date: input.start_date,
        end_date: input.end_date,
        status: input.status,
      },
      include: {
        learning_level: {
          include: { learning_program: true },
        },
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'ACADEMIC_PERIOD_CREATED',
      entityType: 'academic_period',
      entityId: period.id,
      details: {
        period_code: period.period_code,
        name: period.name,
        start_date: period.start_date,
        end_date: period.end_date,
        status: period.status,
      },
    });

    return period;
  }

  async listPeriods(
    organizationId: string,
    filters?: {
      levelId?: string;
      programId?: string;
      status?: PeriodStatus;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(100, Math.max(1, filters?.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AcademicPeriodWhereInput = {
      organization_id: organizationId,
      ...(filters?.levelId ? { learning_level_id: filters.levelId } : {}),
      ...(filters?.programId ? { learning_level: { learning_program_id: filters.programId } } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    };

    const [total, periods] = await Promise.all([
      prisma.academicPeriod.count({ where }),
      prisma.academicPeriod.findMany({
        where,
        skip,
        take: limit,
        orderBy: { start_date: 'desc' },
        include: {
          learning_level: {
            include: {
              learning_program: { select: { id: true, name: true, program_code: true } },
            },
          },
          _count: {
            select: {
              learning_components: true,
              enrollments: true,
            },
          },
        },
      }),
    ]);

    return {
      items: periods,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPeriodById(organizationId: string, id: string) {
    const period = await prisma.academicPeriod.findFirst({
      where: { id, organization_id: organizationId },
      include: {
        learning_level: {
          include: { learning_program: true },
        },
        learning_components: {
          orderBy: { component_code: 'asc' },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!period) {
      throw new NotFoundError(`Academic period with ID '${id}' not found`);
    }

    return period;
  }

  async updatePeriod(organizationId: string, id: string, input: UpdatePeriodInput, actorUserId?: string) {
    const period = await prisma.academicPeriod.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!period) {
      throw new NotFoundError(`Academic period with ID '${id}' not found`);
    }

    if (period.status === PeriodStatus.ARCHIVED) {
      throw new ValidationError('Cannot update an ARCHIVED academic period');
    }

    const effectiveStartDate = input.start_date || period.start_date;
    const effectiveEndDate = input.end_date || period.end_date;

    if (effectiveEndDate.getTime() <= effectiveStartDate.getTime()) {
      throw new ValidationError('end_date must be strictly after start_date');
    }

    const updated = await prisma.academicPeriod.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.start_date ? { start_date: input.start_date } : {}),
        ...(input.end_date ? { end_date: input.end_date } : {}),
      },
      include: {
        learning_level: { include: { learning_program: true } },
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'ACADEMIC_PERIOD_UPDATED',
      entityType: 'academic_period',
      entityId: id,
      details: { previous: { name: period.name }, updated: input },
    });

    return updated;
  }

  async updatePeriodStatus(
    organizationId: string,
    id: string,
    targetStatus: PeriodStatus,
    actorUserId?: string
  ) {
    const period = await prisma.academicPeriod.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!period) {
      throw new NotFoundError(`Academic period with ID '${id}' not found`);
    }

    if (period.status === targetStatus) {
      return period;
    }

    // State machine enforcement for AcademicPeriod:
    // PLANNED -> ACTIVE -> COMPLETED -> ARCHIVED
    // Direct archive is allowed from any non-archived state.
    // ARCHIVED is terminal.
    const currentStatus = period.status;
    let isValidTransition = false;

    if (currentStatus === PeriodStatus.PLANNED) {
      isValidTransition = targetStatus === PeriodStatus.ACTIVE || targetStatus === PeriodStatus.ARCHIVED;
    } else if (currentStatus === PeriodStatus.ACTIVE) {
      isValidTransition = targetStatus === PeriodStatus.COMPLETED || targetStatus === PeriodStatus.ARCHIVED;
    } else if (currentStatus === PeriodStatus.COMPLETED) {
      isValidTransition = targetStatus === PeriodStatus.ARCHIVED;
    } else if (currentStatus === PeriodStatus.ARCHIVED) {
      isValidTransition = false;
    }

    if (!isValidTransition) {
      throw new ValidationError(
        `Invalid academic period lifecycle transition from '${currentStatus}' to '${targetStatus}'. Allowed flow: PLANNED -> ACTIVE -> COMPLETED -> ARCHIVED.`
      );
    }

    const updated = await prisma.academicPeriod.update({
      where: { id },
      data: { status: targetStatus },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'ACADEMIC_PERIOD_STATUS_CHANGED',
      entityType: 'academic_period',
      entityId: id,
      details: { previousStatus: currentStatus, newStatus: targetStatus },
    });

    return updated;
  }

  // ==========================================
  // 4. LEARNING COMPONENTS (Subjects / Modules)
  // ==========================================

  async createComponent(organizationId: string, input: CreateComponentInput, actorUserId?: string) {
    // Verify academic period exists in this organization
    const period = await prisma.academicPeriod.findFirst({
      where: { id: input.academic_period_id, organization_id: organizationId },
    });

    if (!period) {
      throw new NotFoundError(
        `Academic period with ID '${input.academic_period_id}' not found in this organization`
      );
    }

    if (period.status === PeriodStatus.ARCHIVED) {
      throw new ValidationError('Cannot add learning components to an ARCHIVED academic period');
    }

    // Check unique component_code within academic period
    const existingComponent = await prisma.learningComponent.findUnique({
      where: {
        organization_id_academic_period_id_component_code: {
          organization_id: organizationId,
          academic_period_id: input.academic_period_id,
          component_code: input.component_code,
        },
      },
    });

    if (existingComponent) {
      throw new ConflictError(
        `Component with code '${input.component_code}' already exists for period '${period.name}'`
      );
    }

    const component = await prisma.learningComponent.create({
      data: {
        organization_id: organizationId,
        academic_period_id: input.academic_period_id,
        component_code: input.component_code,
        name: input.name,
        type: input.type,
        maximum_marks: input.maximum_marks,
        passing_marks: input.passing_marks,
        status: input.status,
      },
      include: {
        academic_period: {
          select: { id: true, name: true, period_code: true },
        },
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'LEARNING_COMPONENT_CREATED',
      entityType: 'learning_component',
      entityId: component.id,
      details: {
        component_code: component.component_code,
        name: component.name,
        type: component.type,
        maximum_marks: Number(component.maximum_marks),
        passing_marks: Number(component.passing_marks),
      },
    });

    return {
      ...component,
      maximum_marks: Number(component.maximum_marks),
      passing_marks: Number(component.passing_marks),
    };
  }

  async listComponents(
    organizationId: string,
    filters?: { periodId?: string; status?: ComponentStatus }
  ) {
    const components = await prisma.learningComponent.findMany({
      where: {
        organization_id: organizationId,
        ...(filters?.periodId ? { academic_period_id: filters.periodId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: {
        academic_period: {
          select: { id: true, name: true, period_code: true },
        },
        _count: {
          select: {
            attendance_records: true,
            assessment_records: true,
          },
        },
      },
      orderBy: { component_code: 'asc' },
    });

    return components.map((c) => ({
      ...c,
      maximum_marks: Number(c.maximum_marks),
      passing_marks: Number(c.passing_marks),
    }));
  }

  async getComponentById(organizationId: string, id: string) {
    const component = await prisma.learningComponent.findFirst({
      where: { id, organization_id: organizationId },
      include: {
        academic_period: {
          include: {
            learning_level: {
              include: { learning_program: true },
            },
          },
        },
        _count: {
          select: {
            attendance_records: true,
            assessment_records: true,
          },
        },
      },
    });

    if (!component) {
      throw new NotFoundError(`Learning component with ID '${id}' not found`);
    }

    return {
      ...component,
      maximum_marks: Number(component.maximum_marks),
      passing_marks: Number(component.passing_marks),
    };
  }

  async updateComponent(organizationId: string, id: string, input: UpdateComponentInput, actorUserId?: string) {
    const component = await prisma.learningComponent.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!component) {
      throw new NotFoundError(`Learning component with ID '${id}' not found`);
    }

    if (component.status === ComponentStatus.ARCHIVED) {
      throw new ValidationError('Cannot update an ARCHIVED learning component');
    }

    const effectiveMaxMarks = input.maximum_marks !== undefined ? input.maximum_marks : Number(component.maximum_marks);
    const effectivePassMarks = input.passing_marks !== undefined ? input.passing_marks : Number(component.passing_marks);

    if (effectivePassMarks > effectiveMaxMarks) {
      throw new ValidationError('passing_marks cannot exceed maximum_marks');
    }

    const updated = await prisma.learningComponent.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.type ? { type: input.type } : {}),
        ...(input.maximum_marks !== undefined ? { maximum_marks: input.maximum_marks } : {}),
        ...(input.passing_marks !== undefined ? { passing_marks: input.passing_marks } : {}),
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'LEARNING_COMPONENT_UPDATED',
      entityType: 'learning_component',
      entityId: id,
      details: { updated: input },
    });

    return {
      ...updated,
      maximum_marks: Number(updated.maximum_marks),
      passing_marks: Number(updated.passing_marks),
    };
  }

  async updateComponentStatus(
    organizationId: string,
    id: string,
    targetStatus: ComponentStatus,
    actorUserId?: string
  ) {
    const component = await prisma.learningComponent.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!component) {
      throw new NotFoundError(`Learning component with ID '${id}' not found`);
    }

    if (component.status === targetStatus) {
      return {
        ...component,
        maximum_marks: Number(component.maximum_marks),
        passing_marks: Number(component.passing_marks),
      };
    }

    if (component.status === ComponentStatus.ARCHIVED) {
      throw new ValidationError('Cannot transition out of ARCHIVED status. ARCHIVED is a terminal state.');
    }

    const updated = await prisma.learningComponent.update({
      where: { id },
      data: { status: targetStatus },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'LEARNING_COMPONENT_STATUS_CHANGED',
      entityType: 'learning_component',
      entityId: id,
      details: { previousStatus: component.status, newStatus: targetStatus },
    });

    return {
      ...updated,
      maximum_marks: Number(updated.maximum_marks),
      passing_marks: Number(updated.passing_marks),
    };
  }

  // ==========================================
  // 5. ACADEMIC HIERARCHY TREE
  // ==========================================

  async getHierarchyTree(organizationId: string, programId?: string) {
    const programs = await prisma.learningProgram.findMany({
      where: {
        organization_id: organizationId,
        ...(programId ? { id: programId } : {}),
      },
      include: {
        learning_levels: {
          orderBy: { level_number: 'asc' },
          include: {
            academic_periods: {
              orderBy: { start_date: 'asc' },
              include: {
                learning_components: {
                  orderBy: { component_code: 'asc' },
                },
                _count: {
                  select: { enrollments: true },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return programs.map((p) => ({
      ...p,
      learning_levels: p.learning_levels.map((lvl) => ({
        ...lvl,
        academic_periods: lvl.academic_periods.map((period) => ({
          ...period,
          learning_components: period.learning_components.map((c) => ({
            ...c,
            maximum_marks: Number(c.maximum_marks),
            passing_marks: Number(c.passing_marks),
          })),
        })),
      })),
    }));
  }
}

export const academicService = new AcademicService();
