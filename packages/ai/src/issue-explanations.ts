import type { ValidationIssue } from '@design-validator/design-spec';

import type { RecommendationModel } from './client';
import { AiProviderError } from './errors';
import { buildIssueGroupPayload } from './payload';
import { PROMPT_VERSION } from './prompts';
import { recommendationOutputSchema, type GroupRecommendation } from './schema';

const MAX_TEXT = 2_000;
const clip = (text: string) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text);

/**
 * Explains one element's measured differences. The returned recommendations
 * reference issues by ID only; measured values are never read back from the
 * model, so it cannot modify or contradict them. Recommendations for unknown
 * issue IDs are discarded.
 */
export async function explainIssueGroup(
  model: RecommendationModel,
  issues: readonly ValidationIssue[],
): Promise<GroupRecommendation> {
  const payload = buildIssueGroupPayload(issues);
  const raw = await model.recommend(payload);
  const parsed = recommendationOutputSchema.safeParse(raw);
  if (!parsed.success)
    throw new AiProviderError(
      'invalid-output',
      'Claude returned output that does not match the schema.',
    );

  const known = new Set(issues.map((issue) => issue.id));
  const seen = new Set<string>();
  const recommendations = parsed.data.recommendations
    .filter(
      (entry) => known.has(entry.issueId) && !seen.has(entry.issueId) && seen.add(entry.issueId),
    )
    .map((entry) => ({
      issueId: entry.issueId,
      explanation: clip(entry.explanation),
      ...(entry.probableCause ? { probableCause: clip(entry.probableCause) } : {}),
      ...(entry.recommendedChange.code
        ? {
            recommendedChange: {
              language: entry.recommendedChange.language,
              code: clip(entry.recommendedChange.code),
            },
          }
        : {}),
      caveats: entry.caveats.map(clip).slice(0, 5),
    }));
  if (recommendations.length === 0)
    throw new AiProviderError('invalid-output', 'Claude returned no usable recommendations.');
  return {
    summary: clip(parsed.data.groupSummary),
    recommendations,
    model: model.model,
    promptVersion: PROMPT_VERSION,
  };
}
