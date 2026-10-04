import { PipelineError, type StageProcessor } from '@design-validator/jobs';
import { regenerateVisualDiff, type PipelineDependencies } from '@design-validator/pipeline';

/**
 * Regenerates visual evidence for an existing audit (e.g. after a Figma image
 * export becomes available). Regular audits build it in the comparison stage.
 */
export function createVisualDiffProcessor(deps: PipelineDependencies): StageProcessor {
  return async ({ envelope }) => {
    const summary = await regenerateVisualDiff(deps, envelope.auditId);
    if (!summary)
      throw new PipelineError(
        'VISUAL_DIFF_FAILED',
        `Audit ${envelope.auditId} cannot produce visual evidence.`,
      );
    return summary;
  };
}
