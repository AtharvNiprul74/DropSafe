import { z } from 'zod';
import { RetentionAction, OrganizationType, OrganizationStatus } from '@prisma/client';

export const updateSettingsSchema = z.object({
  studentIdentifierLabel: z.string().min(1).max(50).optional(),
  academicCalendarType: z.string().min(1).max(50).optional(),
  defaultUploadFrequency: z.string().min(1).max(50).optional(),
  chatbotEnabled: z.boolean().optional(),
  predictionEnabled: z.boolean().optional(),
  counselingEnabled: z.boolean().optional(),
  graduatedStudentRetentionMonths: z.number().int().min(1).max(120).optional(),
  retentionAction: z.nativeEnum(RetentionAction).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  type: z.nativeEnum(OrganizationType).optional(),
  status: z.nativeEnum(OrganizationStatus).optional(),
});

export const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  roleNames: z.array(z.string()).min(1, 'At least one role name must be assigned'),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
