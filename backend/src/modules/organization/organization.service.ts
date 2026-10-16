import { prisma } from '../../config/database';
import { NotFoundError, ConflictError } from '../../core/errors/AppError';
import { UpdateSettingsInput, UpdateOrganizationInput, CreateUserInput } from './organization.validation';
import { hashPassword } from '../../core/utils/password';
import { recordAuditLog } from '../../middlewares/governanceLog';

export class OrganizationService {
  async getOrganizationDetails(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        settings: true,
        _count: {
          select: {
            users: true,
            students: true,
            learning_programs: true,
            academic_periods: true,
            enrollments: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    return org;
  }

  async updateOrganization(organizationId: string, input: UpdateOrganizationInput, actorUserId?: string) {
    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.type ? { type: input.type } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      include: { settings: true },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'ORGANIZATION_UPDATED',
      entityType: 'organization',
      entityId: organizationId,
      details: { updatedFields: input },
    });

    return updated;
  }

  async getSettings(organizationId: string) {
    const settings = await prisma.organizationSettings.findUnique({
      where: { organization_id: organizationId },
    });

    if (!settings) {
      throw new NotFoundError('Organization settings not found');
    }

    return settings;
  }

  async updateSettings(organizationId: string, input: UpdateSettingsInput, actorUserId?: string) {
    const settings = await prisma.organizationSettings.upsert({
      where: { organization_id: organizationId },
      update: {
        student_identifier_label: input.studentIdentifierLabel,
        academic_calendar_type: input.academicCalendarType,
        default_upload_frequency: input.defaultUploadFrequency,
        chatbot_enabled: input.chatbotEnabled,
        prediction_enabled: input.predictionEnabled,
        counseling_enabled: input.counselingEnabled,
        graduated_student_retention_months: input.graduatedStudentRetentionMonths,
        retention_action: input.retentionAction,
      },
      create: {
        organization_id: organizationId,
        student_identifier_label: input.studentIdentifierLabel || 'Student ID',
        academic_calendar_type: input.academicCalendarType || 'SEMESTER',
        default_upload_frequency: input.defaultUploadFrequency || 'WEEKLY',
        chatbot_enabled: input.chatbotEnabled ?? true,
        prediction_enabled: input.predictionEnabled ?? true,
        counseling_enabled: input.counselingEnabled ?? true,
        graduated_student_retention_months: input.graduatedStudentRetentionMonths || 36,
        retention_action: input.retentionAction || 'ARCHIVE',
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'ORGANIZATION_SETTINGS_UPDATED',
      entityType: 'organization_settings',
      entityId: settings.id,
      details: { updatedSettings: input },
    });

    return settings;
  }

  async listUsers(organizationId: string) {
    const users = await prisma.user.findMany({
      where: { organization_id: organizationId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        status: true,
        last_login_at: true,
        created_at: true,
        user_roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                is_system: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      phone: u.phone,
      status: u.status,
      lastLoginAt: u.last_login_at,
      createdAt: u.created_at,
      roles: u.user_roles.map((ur) => ur.role.name),
    }));
  }

  async createUser(organizationId: string, input: CreateUserInput, actorUserId?: string) {
    const existing = await prisma.user.findUnique({
      where: {
        organization_id_email: {
          organization_id: organizationId,
          email: input.email.toLowerCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictError(`User with email '${input.email}' already exists in this organization`);
    }

    // Resolve requested roles (system or org-specific)
    const roles = await prisma.role.findMany({
      where: {
        name: { in: input.roleNames },
        OR: [{ organization_id: null }, { organization_id: organizationId }],
      },
    });

    if (roles.length === 0) {
      throw new NotFoundError('None of the specified roles exist');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        organization_id: organizationId,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email.toLowerCase(),
        password_hash: passwordHash,
        phone: input.phone,
        created_by: actorUserId || null,
        user_roles: {
          create: roles.map((r) => ({
            role_id: r.id,
          })),
        },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        status: true,
        created_at: true,
      },
    });

    await recordAuditLog({
      organizationId,
      actorUserId,
      action: 'USER_CREATED',
      entityType: 'user',
      entityId: user.id,
      details: { email: user.email, roles: roles.map((r) => r.name) },
    });

    return {
      ...user,
      roles: roles.map((r) => r.name),
    };
  }
}

export const organizationService = new OrganizationService();
