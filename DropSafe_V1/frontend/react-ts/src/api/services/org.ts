import { EP } from '../endpoints';
import { get, patch } from '../http';
import type { Organization, OrganizationSettings } from '../../types/models';

export const getOrganization = () => get<Organization>(EP.organization.path);
export const updateOrganization = (body: Partial<Organization>) => patch<Organization>(EP.updateOrganization.path, body);
export const getSettings = () => get<OrganizationSettings>(EP.settings.path);
export const updateSettings = (body: Partial<OrganizationSettings>) => patch<OrganizationSettings>(EP.updateSettings.path, body);
