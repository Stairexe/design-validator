import { createHash } from 'node:crypto';

import type { IssueGroupPayload } from './payload';

/**
 * Stable cache key (runtime-ai.md "Cost control"): audit input hash, element,
 * normalized issue set, prompt version and model.
 */
export function recommendationCacheKey(input: {
  auditInputHash: string;
  payload: IssueGroupPayload;
  promptVersion: string;
  model: string;
}): string {
  const issues = [...input.payload.differences].sort((a, b) => a.issueId.localeCompare(b.issueId));
  const canonical = JSON.stringify([
    input.auditInputHash,
    input.payload.element,
    input.payload.viewport,
    issues,
    input.promptVersion,
    input.model,
  ]);
  return createHash('sha256').update(canonical).digest('hex');
}
