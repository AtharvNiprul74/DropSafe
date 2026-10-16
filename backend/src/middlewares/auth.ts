import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../core/utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../core/errors/AppError';
import { prisma } from '../config/database';
import { UserStatus } from '@prisma/client';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedError('Authorization token is required');
    }

    const payload = verifyAccessToken(token);

    // Fetch user and their complete effective permission tree
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

    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenError(`User account is ${user.status.toLowerCase()}`);
    }

    if (user.organization.status !== 'ACTIVE') {
      throw new ForbiddenError(`Organization is currently ${user.organization.status.toLowerCase()}`);
    }

    // Extract unique role names
    const roles: string[] = user.user_roles.map((ur) => ur.role.name);

    // Extract unique permissions via User -> Role -> PermissionGroup -> Permission
    const permissionsSet = new Set<string>();
    for (const userRole of user.user_roles) {
      for (const roleGroup of userRole.role.role_permission_groups) {
        for (const groupPerm of roleGroup.permission_group.permission_group_permissions) {
          permissionsSet.add(groupPerm.permission.code);
        }
      }
    }

    req.user = {
      userId: user.id,
      email: user.email,
      organizationId: user.organization_id,
      roles,
      permissions: Array.from(permissionsSet),
    };

    req.tenant = {
      organizationId: user.organization_id,
    };

    next();
  } catch (error) {
    next(error);
  }
}
