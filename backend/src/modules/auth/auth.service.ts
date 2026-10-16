import { prisma } from '../../config/database';
import { verifyPassword, hashPassword } from '../../core/utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../core/utils/jwt';
import { UnauthorizedError, NotFoundError, ForbiddenError, ValidationError } from '../../core/errors/AppError';
import { LoginInput, RefreshTokenInput, ChangePasswordInput } from './auth.validation';
import { UserStatus, AccessAction, AccessOutcome } from '@prisma/client';
import { logAccessAttempt } from '../../middlewares/rbac';

export class AuthService {
  async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    let organizationId: string | undefined;

    if (input.organizationCode) {
      const org = await prisma.organization.findUnique({
        where: { code: input.organizationCode },
      });
      if (!org) {
        throw new NotFoundError(`Organization with code '${input.organizationCode}' not found`);
      }
      if (org.status !== 'ACTIVE') {
        throw new ForbiddenError(`Organization is currently ${org.status.toLowerCase()}`);
      }
      organizationId = org.id;
    }

    // Find user by email (and org if supplied)
    const users = await prisma.user.findMany({
      where: {
        email: input.email.toLowerCase(),
        ...(organizationId ? { organization_id: organizationId } : {}),
      },
      include: {
        organization: true,
        user_roles: {
          include: {
            role: {
              include: {
                role_permission_groups: {
                  include: {
                    permission_group: {
                      include: {
                        permission_group_permissions: {
                          include: {
                            permission: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (users.length === 0) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (users.length > 1 && !organizationId) {
      throw new ValidationError(
        'Email exists in multiple organizations. Please supply the organizationCode.'
      );
    }

    const user = users[0];

    // Check user account status
    if (user.status === UserStatus.LOCKED) {
      await logAccessAttempt({
        organizationId: user.organization_id,
        actorUserId: user.id,
        resource: 'auth',
        action: AccessAction.READ,
        outcome: AccessOutcome.DENIED,
        denialReason: 'User account is locked due to security policy or excessive failed attempts',
        ipAddress,
        userAgent,
      });
      throw new ForbiddenError('Account is locked. Please contact your organization administrator.');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenError('Account is inactive.');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(input.password, user.password_hash);

    if (!isPasswordValid) {
      const updatedAttempts = user.failed_login_attempts + 1;
      const willLock = updatedAttempts >= 5;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: updatedAttempts,
          status: willLock ? UserStatus.LOCKED : user.status,
        },
      });

      await logAccessAttempt({
        organizationId: user.organization_id,
        actorUserId: user.id,
        resource: 'auth',
        action: AccessAction.READ,
        outcome: AccessOutcome.DENIED,
        denialReason: willLock
          ? 'Failed login attempt: Account locked after 5 consecutive failures'
          : `Failed login attempt (Attempt ${updatedAttempts}/5)`,
        ipAddress,
        userAgent,
      });

      throw new UnauthorizedError('Invalid credentials');
    }

    // Reset failed login attempts and update last_login_at
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: 0,
        last_login_at: new Date(),
      },
    });

    // Extract roles and permissions
    const roles = user.user_roles.map((ur) => ur.role.name);
    const permissionsSet = new Set<string>();
    for (const ur of user.user_roles) {
      for (const rpg of ur.role.role_permission_groups) {
        for (const pgp of rpg.permission_group.permission_group_permissions) {
          permissionsSet.add(pgp.permission.code);
        }
      }
    }
    const permissions = Array.from(permissionsSet);

    // Issue tokens
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      organizationId: user.organization_id,
    });

    const refreshToken = signRefreshToken({
      userId: user.id,
    });

    // Record successful access log
    await logAccessAttempt({
      organizationId: user.organization_id,
      actorUserId: user.id,
      resource: 'auth',
      action: AccessAction.READ,
      outcome: AccessOutcome.ALLOWED,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        organizationId: user.organization_id,
        organizationName: user.organization.name,
        organizationCode: user.organization.code,
        roles,
        permissions,
      },
    };
  }

  async refreshToken(input: RefreshTokenInput) {
    const payload = verifyRefreshToken(input.refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        organization: true,
        user_roles: {
          include: {
            role: {
              include: {
                role_permission_groups: {
                  include: {
                    permission_group: {
                      include: {
                        permission_group_permissions: {
                          include: {
                            permission: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE || user.organization.status !== 'ACTIVE') {
      throw new UnauthorizedError('Invalid refresh token or inactive user');
    }

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      organizationId: user.organization_id,
    });

    const newRefreshToken = signRefreshToken({
      userId: user.id,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: {
            settings: true,
          },
        },
        user_roles: {
          include: {
            role: {
              include: {
                role_permission_groups: {
                  include: {
                    permission_group: {
                      include: {
                        permission_group_permissions: {
                          include: {
                            permission: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    const roles = user.user_roles.map((ur) => ur.role.name);
    const permissionsSet = new Set<string>();
    for (const ur of user.user_roles) {
      for (const rpg of ur.role.role_permission_groups) {
        for (const pgp of rpg.permission_group.permission_group_permissions) {
          permissionsSet.add(pgp.permission.code);
        }
      }
    }

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        code: user.organization.code,
        type: user.organization.type,
        settings: user.organization.settings,
      },
      roles,
      permissions: Array.from(permissionsSet),
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
    };
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    const isValid = await verifyPassword(input.currentPassword, user.password_hash);
    if (!isValid) throw new UnauthorizedError('Current password is incorrect');

    const newHash = await hashPassword(input.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: newHash },
    });

    return { message: 'Password updated successfully' };
  }
}

export const authService = new AuthService();
