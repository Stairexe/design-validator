import { formatValue, type ValidationIssue } from '@design-validator/design-spec';
import type { AuditRecord } from '@design-validator/database';
import { PipelineError } from '@design-validator/jobs';

import { createAudit } from './audits';
import type { PipelineDependencies } from './deps';

/**
 * Identity of a difference across audits. Implementation IDs (`dom-N`) shift
 * when the page changes, so the design side, viewport and property identify
 * the same difference; website-only issues fall back to their selector.
 */
export function differenceKey(issue: ValidationIssue): string {
  const element =
    issue.element.designId ??
    `impl:${issue.element.selector ?? issue.element.implementationId ?? issue.element.name}`;
  return `${issue.viewportId}|${element}|${issue.property}`;
}

export interface RevalidationDiff {
  resolved: ValidationIssue[];
  persisting: { before: ValidationIssue; after: ValidationIssue; changed: boolean }[];
  introduced: ValidationIssue[];
}

/** Which differences a code change removed, kept or introduced. Deterministic. */
export function diffAudits(before: ValidationIssue[], after: ValidationIssue[]): RevalidationDiff {
  const afterByKey = new Map(after.map((issue) => [differenceKey(issue), issue]));
  const beforeKeys = new Set(before.map(differenceKey));
  const persisting: RevalidationDiff['persisting'] = [];
  const resolved: ValidationIssue[] = [];
  for (const issue of before) {
    const match = afterByKey.get(differenceKey(issue));
    if (match)
      persisting.push({
        before: issue,
        after: match,
        changed: formatValue(issue.current) !== formatValue(match.current),
      });
    else resolved.push(issue);
  }
  return {
    resolved,
    persisting,
    introduced: after.filter((issue) => !beforeKeys.has(differenceKey(issue))),
  };
}

/**
 * Phase 11: re-runs a completed audit with the same design, viewports and
 * settings — optionally against another URL such as the preview deployment
 * of a fix — and links it to the original for comparison.
 */
export async function revalidateAudit(
  deps: PipelineDependencies,
  auditId: string,
  websiteUrl?: string,
): Promise<AuditRecord> {
  const parent = await deps.repository.getAudit(auditId);
  if (!parent) throw new PipelineError('INTERNAL_ERROR', 'Audit not found.');
  if (parent.status !== 'COMPLETED')
    throw new PipelineError('INTERNAL_ERROR', 'Only completed audits can be re-validated.');
  return createAudit(deps, {
    projectId: parent.projectId,
    designSourceId: parent.designSourceId,
    websiteUrl: websiteUrl ?? parent.websiteUrl,
    viewports: parent.viewports,
    settings: parent.settings,
    parentAuditId: parent.id,
  });
}

/** Revalidation diff between an audit and the audit it re-validates, when both are complete. */
export async function revalidationSummary(
  deps: PipelineDependencies,
  auditId: string,
): Promise<(RevalidationDiff & { parent: AuditRecord }) | null> {
  const audit = await deps.repository.getAudit(auditId);
  if (!audit?.parentAuditId || audit.status !== 'COMPLETED') return null;
  const parent = await deps.repository.getAudit(audit.parentAuditId);
  if (!parent || parent.status !== 'COMPLETED') return null;
  const [before, after] = await Promise.all([
    deps.repository.listIssues(parent.id),
    deps.repository.listIssues(audit.id),
  ]);
  return { parent, ...diffAudits(before, after) };
}
