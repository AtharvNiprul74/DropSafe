import { EP } from '../endpoints';
import { get, patch, post } from '../http';
import type { MentorAccessRequest, Permission, PermissionGroup, PortalUser, Role } from '../../types/models';

export const listUsers = () => get<PortalUser[]>(EP.users.path);
export const createUser = (body: { name: string; email: string; password?: string; roleIds: string[] }) =>
  post<PortalUser>(EP.createUser.path, body);
export const updateUser = (id: string, body: { status?: string; roleIds?: string[] }) =>
  patch<PortalUser>(EP.updateUser(id).path, body);

export const listRoles = () => get<Role[]>(EP.roles.path);
export const createRole = (body: { name: string; description?: string; permissionGroupIds: string[] }) =>
  post<Role>(EP.createRole.path, body);
export const updateRole = (id: string, body: { name?: string; description?: string; permissionGroupIds?: string[] }) =>
  patch<Role>(EP.updateRole(id).path, body);

export const listPermissionGroups = () => get<PermissionGroup[]>(EP.permissionGroups.path);
export const listPermissions = () => get<Permission[]>(EP.permissions.path);

export const listMentorAccess = () => get<MentorAccessRequest[]>(EP.mentorAccess.path);
export const decideMentorAccess = (id: string, approve: boolean) =>
  post<MentorAccessRequest>(EP.decideMentorAccess(id).path, { approve });
