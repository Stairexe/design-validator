/** Audit pipeline stages in execution order (api-and-jobs.md, "Audit state machine"). */
export const AUDIT_STAGES = [
  'QUEUED',
  'INSPECTING_WEBSITE',
  'IMPORTING_DESIGN',
  'NORMALIZING',
  'MATCHING',
  'COMPARING',
  'VISUAL_DIFF',
  'AI_RECOMMENDATIONS',
] as const;

/** Terminal states. `FAILED` and `CANCELLED` can follow any stage. */
export const AUDIT_TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'CANCELLED'] as const;

export const AUDIT_STATUSES = [...AUDIT_STAGES, ...AUDIT_TERMINAL_STATUSES] as const;

export type AuditStage = (typeof AUDIT_STAGES)[number];
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export function isTerminalStatus(status: AuditStatus): boolean {
  return (AUDIT_TERMINAL_STATUSES as readonly AuditStatus[]).includes(status);
}
