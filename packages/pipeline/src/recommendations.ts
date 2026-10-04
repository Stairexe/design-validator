import {
  AiProviderError,
  explainIssueGroup,
  recommendationCacheKey,
  buildIssueGroupPayload,
  sameElementGroup,
  PROMPT_VERSION,
  type GroupRecommendation,
} from '@design-validator/ai';
import type { ValidationIssue } from '@design-validator/design-spec';
import { PipelineError } from '@design-validator/jobs';

import type { PipelineDependencies } from './deps';

export interface IssueRecommendationResult extends GroupRecommendation {
  issueIds: string[];
  cached: boolean;
}

function toPipelineFailure(error: unknown): PipelineError {
  if (error instanceof AiProviderError)
    return new PipelineError('AI_PROVIDER_FAILED', error.message, {
      retryable: error.reason === 'rate-limited' || error.reason === 'provider-error',
      cause: error,
    });
  return new PipelineError('AI_PROVIDER_FAILED', 'The recommendation request failed.', {
    cause: error,
  });
}

async function recommendGroup(
  deps: PipelineDependencies,
  auditInputHash: string,
  auditId: string,
  group: ValidationIssue[],
): Promise<IssueRecommendationResult> {
  const model = deps.recommendationModel;
  if (!model)
    throw new PipelineError(
      'AI_PROVIDER_FAILED',
      'AI recommendations are not configured on this server (ANTHROPIC_API_KEY).',
    );
  const cacheKey = recommendationCacheKey({
    auditInputHash,
    payload: buildIssueGroupPayload(group),
    promptVersion: PROMPT_VERSION,
    model: model.model,
  });
  const issueIds = group.map((issue) => issue.id);

  const cached = await deps.repository.getRecommendation(cacheKey);
  if (cached) return { ...(cached.payload as GroupRecommendation), issueIds, cached: true };

  let result: GroupRecommendation;
  try {
    result = await explainIssueGroup(model, group);
  } catch (error) {
    throw toPipelineFailure(error);
  }
  await deps.repository.saveRecommendation({
    cacheKey,
    auditId,
    issueIds,
    payload: result,
    model: result.model,
    promptVersion: result.promptVersion,
  });
  return { ...result, issueIds, cached: false };
}

/**
 * On-demand recommendation for an issue and the other differences of the
 * same element (one request per element). Measured values are untouched.
 */
export async function recommendForIssue(
  deps: PipelineDependencies,
  auditId: string,
  issueId: string,
): Promise<IssueRecommendationResult> {
  const audit = await deps.repository.getAudit(auditId);
  if (!audit || audit.status !== 'COMPLETED')
    throw new PipelineError(
      'INTERNAL_ERROR',
      'Recommendations are available for completed audits only.',
    );
  const issues = await deps.repository.listIssues(auditId);
  const anchor = issues.find((issue) => issue.id === issueId);
  if (!anchor) throw new PipelineError('INTERNAL_ERROR', 'Issue not found.');
  // Structure issues have no element to style; keep the group to measurable properties.
  const group = sameElementGroup(issues, anchor).filter(
    (issue) => issue.category !== 'structure' || issue.id === issueId,
  );
  return recommendGroup(deps, audit.inputHash, auditId, group);
}

/**
 * Optional AI_RECOMMENDATIONS stage: explains the most severe element groups
 * up to `limit`. Returns warnings; never throws for provider failures.
 */
export async function recommendAudit(
  deps: PipelineDependencies,
  auditId: string,
  limit = 10,
): Promise<string[]> {
  const audit = await deps.repository.getAudit(auditId);
  if (!audit || !deps.recommendationModel)
    return deps.recommendationModel ? [] : ['AI recommendations skipped: not configured.'];
  const issues = (await deps.repository.listIssues(auditId)).filter(
    (issue) => issue.category !== 'structure',
  );
  const seen = new Set<string>();
  const groups: ValidationIssue[][] = [];
  for (const issue of issues) {
    const key = `${issue.viewportId}|${issue.element.designId ?? ''}|${issue.element.implementationId ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    groups.push(sameElementGroup(issues, issue));
    if (groups.length >= limit) break;
  }
  const warnings: string[] = [];
  for (const group of groups) {
    try {
      await recommendGroup(deps, audit.inputHash, auditId, group);
    } catch (error) {
      warnings.push(
        `AI recommendations unavailable for ${group[0]?.element.name ?? 'an element'}: ${error instanceof Error ? error.message : String(error)}`,
      );
      break;
    }
  }
  return warnings;
}
