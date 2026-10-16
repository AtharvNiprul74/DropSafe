/**
 * API ENDPOINT REGISTRY
 * =====================
 * PRD §28 / §37: exact REST endpoint paths are NOT frozen by the PRD.
 * This file is the single place where the frontend declares the paths it calls.
 *
 * WIRING YOUR EXISTING BACKEND:
 *   1. Set VITE_DEMO_MODE=false and VITE_API_BASE_URL=<your API base> in `.env`.
 *   2. Adjust any path below to match your Express routes.
 *   3. Expected request/response shapes are the types in `src/types/models.ts`.
 *
 * All requests are organization-scoped server-side from the JWT — clients never
 * supply another organization's ID (PRD §28).
 */

export const EP = {
  // Auth
  login: { method: 'POST', path: '/auth/login' },
  logout: { method: 'POST', path: '/auth/logout' },
  me: { method: 'GET', path: '/auth/me' },

  // Organization & settings
  organization: { method: 'GET', path: '/organization' },
  updateOrganization: { method: 'PATCH', path: '/organization' },
  settings: { method: 'GET', path: '/organization/settings' },
  updateSettings: { method: 'PATCH', path: '/organization/settings' },

  // Users, roles, RBAC
  users: { method: 'GET', path: '/users' },
  createUser: { method: 'POST', path: '/users' },
  updateUser: (id: string) => ({ method: 'PATCH', path: `/users/${id}` }),
  roles: { method: 'GET', path: '/roles' },
  createRole: { method: 'POST', path: '/roles' },
  updateRole: (id: string) => ({ method: 'PATCH', path: `/roles/${id}` }),
  permissionGroups: { method: 'GET', path: '/permission-groups' },
  permissions: { method: 'GET', path: '/permissions' },

  // Academic structure
  programs: { method: 'GET', path: '/academic/programs' },
  createProgram: { method: 'POST', path: '/academic/programs' },
  updateProgram: (id: string) => ({ method: 'PATCH', path: `/academic/programs/${id}` }),
  levels: { method: 'GET', path: '/academic/levels' },
  createLevel: { method: 'POST', path: '/academic/levels' },
  updateLevel: (id: string) => ({ method: 'PATCH', path: `/academic/levels/${id}` }),
  periods: { method: 'GET', path: '/academic/periods' },
  createPeriod: { method: 'POST', path: '/academic/periods' },
  updatePeriod: (id: string) => ({ method: 'PATCH', path: `/academic/periods/${id}` }),
  components: { method: 'GET', path: '/academic/components' },
  createComponent: { method: 'POST', path: '/academic/components' },
  updateComponent: (id: string) => ({ method: 'PATCH', path: `/academic/components/${id}` }),

  // Students / enrollments / evidence
  students: { method: 'GET', path: '/students' },
  createStudent: { method: 'POST', path: '/students' },
  student: (id: string) => ({ method: 'GET', path: `/students/${id}` }),
  mentorStudents: { method: 'GET', path: '/mentor/students' },
  roster: { method: 'GET', path: '/academic/roster' },
  saveAttendance: { method: 'POST', path: '/academic/attendance/bulk' },
  saveAssessments: { method: 'POST', path: '/academic/assessments/bulk' },

  // Imports (Upload → Validate → Preview → Process → Commit)
  imports: { method: 'GET', path: '/imports' },
  createImport: { method: 'POST', path: '/imports' },
  importSession: (id: string) => ({ method: 'GET', path: `/imports/${id}` }),
  validateImport: (id: string) => ({ method: 'POST', path: `/imports/${id}/validate` }),
  processImport: (id: string) => ({ method: 'POST', path: `/imports/${id}/process` }),
  cancelImport: (id: string) => ({ method: 'POST', path: `/imports/${id}/cancel` }),

  // AI domain
  riskBoard: { method: 'GET', path: '/predictions/board' },
  studentInsights: (id: string) => ({ method: 'GET', path: `/students/${id}/insights` }),
  aiModels: { method: 'GET', path: '/ai/models' },

  // Counseling domain
  interventions: { method: 'GET', path: '/interventions' },
  createIntervention: { method: 'POST', path: '/interventions' },
  intervention: (id: string) => ({ method: 'GET', path: `/interventions/${id}` }),
  updateIntervention: (id: string) => ({ method: 'PATCH', path: `/interventions/${id}` }),
  createSession: (interventionId: string) => ({
    method: 'POST',
    path: `/interventions/${interventionId}/sessions`,
  }),
  updateSession: (id: string) => ({ method: 'PATCH', path: `/sessions/${id}` }),
  followUps: { method: 'GET', path: '/follow-ups' },
  createFollowUp: (interventionId: string) => ({
    method: 'POST',
    path: `/interventions/${interventionId}/follow-ups`,
  }),
  updateFollowUp: (id: string) => ({ method: 'PATCH', path: `/follow-ups/${id}` }),

  // Mentor access approvals (Admin review of AI recommendation / manual requests)
  mentorAccess: { method: 'GET', path: '/mentor-access' },
  decideMentorAccess: (id: string) => ({ method: 'POST', path: `/mentor-access/${id}/decision` }),

  // Governance
  auditLogs: { method: 'GET', path: '/governance/audit-logs' },
  accessLogs: { method: 'GET', path: '/governance/access-logs' },
  notifications: { method: 'GET', path: '/governance/notifications' },

  // Reports
  reportSummary: { method: 'GET', path: '/reports/summary' },
  reportExport: { method: 'GET', path: '/reports/export' },
} as const;
