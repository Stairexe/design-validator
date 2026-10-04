import { createHash } from 'node:crypto';

import { z } from 'zod';

import { AUDIT_STAGES, type AuditStage } from './audit-status';

/** Fields every job payload carries (api-and-jobs.md, "Job payload"). */
export const jobEnvelopeSchema = z.object({
  auditId: z.string().min(1),
  projectId: z.string().min(1),
  attempt: z.number().int().min(1),
  correlationId: z.string().min(1),
  inputHash: z.string().min(1),
});

export type JobEnvelope = z.infer<typeof jobEnvelopeSchema>;

export interface IdempotencyKeyInput {
  auditId: string;
  stage: AuditStage;
  inputHash: string;
  /** Present for per-viewport work such as website inspection. */
  viewportId?: string;
}

/**
 * Stable key for a unit of stage work: hash(auditId + stage + inputHash + viewportId).
 * Used as the BullMQ job ID and the database uniqueness key so retries never
 * duplicate screenshots, issues or records.
 */
export function idempotencyKey(input: IdempotencyKeyInput): string {
  if (!(AUDIT_STAGES as readonly string[]).includes(input.stage)) {
    throw new Error(`Unknown audit stage: ${input.stage}`);
  }
  const parts = [input.auditId, input.stage, input.inputHash, input.viewportId ?? ''];
  // JSON encoding keeps part boundaries unambiguous ("a"+"bc" !== "ab"+"c").
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
