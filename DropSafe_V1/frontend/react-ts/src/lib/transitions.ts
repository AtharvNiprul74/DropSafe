/**
 * State machines (PRD §20). UI transition actions are rendered from these maps,
 * so invalid transitions can never be triggered from the interface
 * ("Invalid transitions must be rejected").
 *
 * Keys are entity kinds; values map current status → allowed next statuses.
 */
export const TRANSITIONS: Record<string, Record<string, readonly string[]>> = {
  // ACTIVE → INACTIVE → ARCHIVED (re-activation allowed for operational UI)
  organization: { ACTIVE: ['INACTIVE'], INACTIVE: ['ACTIVE', 'ARCHIVED'], ARCHIVED: [] },
  user: { ACTIVE: ['LOCKED', 'INACTIVE'], LOCKED: ['ACTIVE', 'INACTIVE'], INACTIVE: ['ACTIVE'] },
  program: { ACTIVE: ['INACTIVE'], INACTIVE: ['ACTIVE', 'ARCHIVED'], ARCHIVED: [] },
  level: { ACTIVE: ['INACTIVE'], INACTIVE: ['ACTIVE', 'ARCHIVED'], ARCHIVED: [] },
  component: { ACTIVE: ['INACTIVE'], INACTIVE: ['ACTIVE', 'ARCHIVED'], ARCHIVED: [] },
  // Academic Period: PLANNED → ACTIVE → COMPLETED → ARCHIVED; reopen = COMPLETED → ACTIVE (explicit)
  period: { PLANNED: ['ACTIVE'], ACTIVE: ['COMPLETED'], COMPLETED: ['ARCHIVED', 'ACTIVE'], ARCHIVED: [] },
  enrollment: {
    ACTIVE: ['COMPLETED', 'WITHDRAWN', 'TRANSFERRED'],
    COMPLETED: ['ARCHIVED'],
    WITHDRAWN: ['ARCHIVED'],
    TRANSFERRED: ['ARCHIVED'],
    ARCHIVED: [],
  },
  importSession: {
    CREATED: ['VALIDATING', 'CANCELLED'],
    VALIDATING: ['VALIDATED', 'FAILED', 'CANCELLED'],
    VALIDATED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['COMPLETED', 'FAILED'],
    COMPLETED: [],
    FAILED: [],
    CANCELLED: [],
  },
  snapshot: { GENERATED: ['PREDICTED'], PREDICTED: ['SUPERSEDED'], SUPERSEDED: [] },
  intervention: {
    PLANNED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  },
  session: { SCHEDULED: ['COMPLETED', 'MISSED', 'CANCELLED'], COMPLETED: [], MISSED: [], CANCELLED: [] },
  followUp: { PENDING: ['COMPLETED', 'MISSED', 'CANCELLED'], COMPLETED: [], MISSED: [], CANCELLED: [] },
  model: { ACTIVE: ['RETIRED'], RETIRED: [] },
};

export function allowedTransitions(kind: keyof typeof TRANSITIONS, status: string): readonly string[] {
  return TRANSITIONS[kind]?.[status] ?? [];
}

export function canTransition(kind: keyof typeof TRANSITIONS, from: string, to: string): boolean {
  return allowedTransitions(kind, from).includes(to);
}

/** Human-friendly action labels for transition buttons. */
export const TRANSITION_ACTION_LABEL: Record<string, string> = {
  ACTIVE: 'Activate',
  INACTIVE: 'Deactivate',
  ARCHIVED: 'Archive',
  LOCKED: 'Lock account',
  PLANNED: 'Mark planned',
  COMPLETED: 'Mark completed',
  VALIDATING: 'Start validation',
  VALIDATED: 'Validated',
  PROCESSING: 'Process',
  CANCELLED: 'Cancel',
  FAILED: 'Mark failed',
  IN_PROGRESS: 'Start work',
  MISSED: 'Mark missed',
  WITHDRAWN: 'Withdraw',
  TRANSFERRED: 'Transfer',
  RETIRED: 'Retire',
};
