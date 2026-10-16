import { P } from '../lib/permissions';
import type { IconName } from './icons';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /** User needs ANY of these permissions (or roles) to see / access the item. */
  anyOf?: string[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: 'dashboard' }],
  },
  {
    title: 'Administration',
    items: [
      { to: '/admin/organization', label: 'Organization & Settings', icon: 'building', anyOf: [P.organizationUpdate, P.userView] },
      { to: '/admin/users', label: 'Users', icon: 'users', anyOf: [P.userView] },
      { to: '/admin/roles', label: 'Roles & Permissions', icon: 'shield', anyOf: [P.roleView] },
      { to: '/admin/mentor-access', label: 'Mentor Access Approvals', icon: 'key', anyOf: [P.mentorAssign] },
    ],
  },
  {
    title: 'Academic',
    items: [
      { to: '/academic/structure', label: 'Academic Structure', icon: 'layers', anyOf: [P.studentView, P.attendanceView, P.assessmentView] },
      { to: '/academic/students', label: 'Students', icon: 'students', anyOf: [P.studentView] },
      { to: '/academic/records', label: 'Records Entry', icon: 'edit', anyOf: [P.attendanceCreate, P.attendanceUpdate, P.assessmentCreate, P.assessmentUpdate] },
    ],
  },
  {
    title: 'Data Imports',
    items: [{ to: '/imports', label: 'Import Sessions', icon: 'upload', anyOf: [P.importView, P.importCreate, P.importHistory] }],
  },
  {
    title: 'AI & Risk',
    items: [
      { to: '/risk', label: 'Risk Monitoring', icon: 'pulse', anyOf: [P.predictionView] },
      { to: '/risk/models', label: 'AI Models', icon: 'chip', anyOf: [P.predictionView] },
    ],
  },
  {
    title: 'Counseling',
    items: [
      { to: '/counseling/interventions', label: 'Interventions', icon: 'heart', anyOf: [P.counselingView] },
      { to: '/counseling/follow-ups', label: 'Follow-ups', icon: 'check', anyOf: [P.counselingView] },
    ],
  },
  {
    title: 'Mentor',
    items: [{ to: '/mentor/students', label: 'My Students', icon: 'handshake', anyOf: [P.studentView] }],
  },
  {
    title: 'Governance',
    items: [
      { to: '/governance/audit-logs', label: 'Audit Logs', icon: 'clipboard', anyOf: [P.governanceView] },
      { to: '/governance/access-logs', label: 'Access Logs', icon: 'eye', anyOf: [P.governanceView] },
      { to: '/governance/notifications', label: 'Notifications', icon: 'bell', anyOf: [P.governanceView] },
    ],
  },
  {
    title: 'Insights',
    items: [{ to: '/reports', label: 'Reports', icon: 'report', anyOf: [P.reportView] }],
  },
];
